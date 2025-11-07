import { App } from 'obsidian';
import { PluginSettings } from '../settings/settings';
import { FileManager } from '../sync/file-manager';
import { GitHubClient } from './github-client';
import {
  Discussion,
  DiscussionCategory,
  DiscussionConnection,
  Repository,
  UpdateDiscussionInput
} from './types';
import {
  GetDiscussionsDocument,
  GetDiscussionDocument,
  GetRepositoryDocument,
  UpdateDiscussionDocument,
  AddDiscussionCommentDocument
} from '../generated/graphql';


export class DiscussionService {
  private client: GitHubClient;
  public settings: PluginSettings;
  private fileManager: FileManager;
  private repository: Repository | null = null;

  constructor(client: GitHubClient, settings: PluginSettings, app: App) {
    this.client = client;
    this.settings = settings;
    this.fileManager = new FileManager(settings, app);
  }

  async getRepository(): Promise<Repository> {
    if (this.repository) {
      return this.repository;
    }

    const response = await this.client.query<{ repository: Repository }>(
      GetRepositoryDocument,
      {
        owner: this.settings.repositoryOwner,
        name: this.settings.repositoryName
      }
    );

    this.repository = response.repository;
    return this.repository;
  }

  async getDiscussions(first: number = 20, after?: string): Promise<DiscussionConnection> {
    const response = await this.client.query<{ repository: { discussions: DiscussionConnection } }>(
      GetDiscussionsDocument,
      {
        owner: this.settings.repositoryOwner,
        name: this.settings.repositoryName,
        first,
        after
      }
    );

    return response.repository.discussions;
  }

  async getDiscussion(number: number): Promise<Discussion | null> {
    const response = await this.client.query<{ repository: { discussion: Discussion } }>(
      GetDiscussionDocument,
      {
        owner: this.settings.repositoryOwner,
        name: this.settings.repositoryName,
        number
      }
    );

    return response.repository.discussion;
  }

  async getCategories(): Promise<DiscussionCategory[]> {
    const repo = await this.getRepository();
    return repo.discussionCategories.nodes;
  }


  async updateDiscussion(input: UpdateDiscussionInput): Promise<Discussion> {
    const response = await this.client.mutation<{ updateDiscussion: { discussion: Discussion } }>(
      UpdateDiscussionDocument,
      { input }
    );

    const discussion = response.updateDiscussion.discussion;

    return discussion;
  }


  async syncDiscussions(): Promise<void> {
    // Refreshes discussion data in memory only
    // Markdown files will be created on-demand when "Open" is clicked
    console.log('Discussion data refreshed - markdown files will be created when opened');
  }

  async pushMarkdownToGitHub(discussionNumber: number): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.fileManager.updateDiscussionFromMarkdown(discussionNumber, this);
      if (result.success) {
        console.log(`Successfully pushed discussion #${discussionNumber} to GitHub`);
      }
      return result;
    } catch (error) {
      console.error(`Failed to push discussion #${discussionNumber} to GitHub:`, error);
      return { success: false, error: error.message };
    }
  }


  updateSettings(settings: PluginSettings, app: App): void {
    this.settings = settings;
    this.fileManager = new FileManager(settings, app);
    this.repository = null;
  }

  async repairDiscussionMetadata(discussionNumber: number): Promise<{ success: boolean; error?: string }> {
    return await this.fileManager.repairDiscussionMetadata(discussionNumber, this);
  }

  async addComment(discussionId: string, body: string, replyToId?: string): Promise<any> {
    const response = await this.client.mutation<{ addDiscussionComment: { comment: any } }>(
      AddDiscussionCommentDocument,
      {
        input: {
          discussionId,
          body,
          replyToId
        }
      }
    );

    return response.addDiscussionComment.comment;
  }
}