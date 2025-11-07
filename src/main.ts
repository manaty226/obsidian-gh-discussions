import { Plugin } from 'obsidian';
import { PluginSettings } from './settings/settings';
import { SettingsTab } from './settings/settings-tab';
import { DiscussionListView } from './views/discussion-list-view';
import { GitHubClient } from './api/github-client';
import { DiscussionService } from './api/discussion-service';
import { CommentBlockProcessor } from './components/CommentBlockProcessor';

const DEFAULT_SETTINGS: PluginSettings = {
  githubToken: '',
  repositoryOwner: '',
  repositoryName: '',
  syncOnStart: true,
  autoSave: false,
  discussionsFolder: 'Discussions'
};

export default class GitHubDiscussionsPlugin extends Plugin {
  settings: PluginSettings;
  githubClient: GitHubClient;
  discussionService: DiscussionService;
  commentProcessor: CommentBlockProcessor;

  async onload() {
    console.log('Loading GitHub Discussions plugin');

    await this.loadSettings();

    this.githubClient = new GitHubClient(this.settings.githubToken);
    this.discussionService = new DiscussionService(this.githubClient, this.settings, this.app);
    this.commentProcessor = new CommentBlockProcessor(this.discussionService);

    this.registerView(
      'discussion-list',
      (leaf) => new DiscussionListView(leaf, this.discussionService)
    );

    this.addRibbonIcon('message-circle', 'GitHub Discussions', () => {
      this.activateDiscussionListView();
    });

    this.addCommand({
      id: 'open-discussion-list',
      name: 'Open Discussion List',
      callback: () => {
        this.activateDiscussionListView();
      }
    });


    this.addCommand({
      id: 'sync-discussions',
      name: 'Sync Discussions',
      callback: async () => {
        await this.syncDiscussions();
      }
    });

    // Register comment block processor
    this.registerMarkdownCodeBlockProcessor('gh-comments', (source, el, ctx) => {
      this.commentProcessor.processCommentBlock(source, el, ctx);
    });

    this.addSettingTab(new SettingsTab(this.app, this));

    if (this.settings.syncOnStart && this.isConfigured()) {
      await this.syncDiscussions();
    }
  }

  onunload() {
    console.log('Unloading GitHub Discussions plugin');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.githubClient = new GitHubClient(this.settings.githubToken);
    this.discussionService = new DiscussionService(this.githubClient, this.settings, this.app);
    this.commentProcessor = new CommentBlockProcessor(this.discussionService);
  }

  private isConfigured(): boolean {
    return !!(this.settings.githubToken && 
              this.settings.repositoryOwner && 
              this.settings.repositoryName);
  }

  async activateDiscussionListView() {
    const { workspace } = this.app;
    
    let leaf = workspace.getLeavesOfType('discussion-list')[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: 'discussion-list', active: true });
    }
    
    workspace.revealLeaf(leaf);
  }


  async syncDiscussions() {
    if (!this.isConfigured()) {
      console.warn('GitHub Discussions plugin not configured');
      return;
    }

    try {
      await this.discussionService.syncDiscussions();
      console.log('Discussion data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh discussion data:', error);
    }
  }


}