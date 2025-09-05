import { App, PluginSettingTab, Setting } from 'obsidian';
import GitHubDiscussionsPlugin from '../main';

export class SettingsTab extends PluginSettingTab {
  plugin: GitHubDiscussionsPlugin;

  constructor(app: App, plugin: GitHubDiscussionsPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: 'GitHub Discussions Plugin Settings' });

    new Setting(containerEl)
      .setName('GitHub Personal Access Token')
      .setDesc('Token with repo scope for accessing GitHub API')
      .addText(text => text
        .setPlaceholder('ghp_xxxxxxxxxxxx')
        .setValue(this.plugin.settings.githubToken)
        .onChange(async (value) => {
          this.plugin.settings.githubToken = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Repository Owner')
      .setDesc('GitHub username or organization name')
      .addText(text => text
        .setPlaceholder('octocat')
        .setValue(this.plugin.settings.repositoryOwner)
        .onChange(async (value) => {
          this.plugin.settings.repositoryOwner = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Repository Name')
      .setDesc('Name of the repository containing discussions')
      .addText(text => text
        .setPlaceholder('my-repo')
        .setValue(this.plugin.settings.repositoryName)
        .onChange(async (value) => {
          this.plugin.settings.repositoryName = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Discussions Folder')
      .setDesc('Folder where discussion files will be stored')
      .addText(text => text
        .setPlaceholder('Discussions')
        .setValue(this.plugin.settings.discussionsFolder)
        .onChange(async (value) => {
          this.plugin.settings.discussionsFolder = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Sync on startup')
      .setDesc('Automatically sync discussions when Obsidian starts')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.syncOnStart)
        .onChange(async (value) => {
          this.plugin.settings.syncOnStart = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto-save')
      .setDesc('Automatically save changes to GitHub when editing')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSave)
        .onChange(async (value) => {
          this.plugin.settings.autoSave = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Setup Instructions' });
    
    const instructions = containerEl.createEl('div');
    instructions.innerHTML = `
      <ol>
        <li>Go to <a href="https://github.com/settings/tokens">GitHub Personal Access Tokens</a></li>
        <li>Click "Generate new token (classic)"</li>
        <li>Select the <strong>repo</strong> scope</li>
        <li>Copy the token and paste it above</li>
        <li>Enter your repository owner and name</li>
      </ol>
    `;
  }
}