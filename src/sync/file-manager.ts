import { TFile, Vault, normalizePath, App } from 'obsidian';
import { Discussion } from '../api/types';
import { PluginSettings } from '../settings/settings';
import { UpdateConfirmModal } from '../components/UpdateConfirmModal';

export class FileManager {
  private settings: PluginSettings;
  private vault: Vault;
  private app: App;

  constructor(settings: PluginSettings, app: App) {
    this.settings = settings;
    this.vault = app.vault;
    this.app = app;
  }

  async saveDiscussion(discussion: Discussion): Promise<TFile> {
    const filePath = this.getDiscussionFilePath(discussion);
    const content = this.generateDiscussionMarkdown(discussion);

    try {
      // Ensure the discussions folder exists
      await this.ensureFolderExists(this.settings.discussionsFolder);

      // Check if file already exists
      const existingFile = this.vault.getAbstractFileByPath(filePath);
      
      let file: TFile;
      if (existingFile instanceof TFile) {
        // File already exists - check if remote is newer
        const shouldUpdate = await this.checkAndConfirmUpdate(existingFile, discussion);
        
        if (shouldUpdate) {
          await this.vault.modify(existingFile, content);
          console.log(`Updated discussion #${discussion.number} from GitHub`);
        } else {
          console.log(`Discussion #${discussion.number} file already exists, keeping local version`);
        }
        file = existingFile;
      } else {
        // Create new file only if it doesn't exist
        file = await this.vault.create(filePath, content);
        console.log(`Created new discussion file #${discussion.number} at ${filePath}`);
      }

      return file;
    } catch (error) {
      console.error(`Failed to save discussion #${discussion.number}:`, error);
      throw error;
    }
  }


  async loadDiscussion(discussionNumber: number): Promise<string | null> {
    const filePath = this.getDiscussionFilePathByNumber(discussionNumber);
    
    try {
      const file = this.vault.getAbstractFileByPath(filePath);
      if (file instanceof TFile) {
        return await this.vault.read(file);
      }
      return null;
    } catch (error) {
      console.error(`Failed to load discussion #${discussionNumber}:`, error);
      return null;
    }
  }

  async getDiscussionFile(discussionNumber: number): Promise<TFile | null> {
    const filePath = this.getDiscussionFilePathByNumber(discussionNumber);
    const file = this.vault.getAbstractFileByPath(filePath);
    return file instanceof TFile ? file : null;
  }

  async openDiscussionInEditor(discussionNumber: number): Promise<void> {
    const file = await this.getDiscussionFile(discussionNumber);
    console.log(`Attempting to open discussion #${discussionNumber}, file found:`, !!file);
    
    if (file) {
      const workspace = this.app.workspace;
      
      // Check if the file is already open in any leaf
      const existingLeaf = workspace.getLeavesOfType('markdown').find((leaf) => {
        return (leaf.view as any).file && (leaf.view as any).file.path === file.path;
      });
      
      if (existingLeaf) {
        // File is already open, focus the existing leaf
        workspace.setActiveLeaf(existingLeaf);
        workspace.revealLeaf(existingLeaf);
        console.log(`Focused existing tab for discussion #${discussionNumber}`);
      } else {
        // File is not open, create new leaf
        const leaf = workspace.getLeaf(true);
        await leaf.openFile(file);
        console.log(`Opened discussion #${discussionNumber} in new tab`);
      }
    } else {
      console.error(`No file found for discussion #${discussionNumber}`);
    }
  }




  private getDiscussionFilePath(discussion: Discussion): string {
    const filename = `discussion-${discussion.number}.md`;
    return normalizePath(`${this.settings.discussionsFolder}/${filename}`);
  }

  private getDiscussionFilePathByNumber(discussionNumber: number): string {
    const filename = `discussion-${discussionNumber}.md`;
    return normalizePath(`${this.settings.discussionsFolder}/${filename}`);
  }

  private generateDiscussionMarkdown(discussion: Discussion): string {
    const frontmatter = {
      id: discussion.id,
      number: discussion.number,
      title: discussion.title,
      author: discussion.author.login,
      created: discussion.createdAt,
      updated: discussion.updatedAt,
      githubUrl: discussion.url,
      category: discussion.category.name,
      categoryId: discussion.category.id,
      upvoteCount: discussion.upvoteCount,
      commentCount: discussion.comments.totalCount,
      locked: discussion.locked,
      answered: !!discussion.answerChosenAt,
      lastSynced: new Date().toISOString()
    };

    const frontmatterText = Object.entries(frontmatter)
      .map(([key, value]) => {
        if (typeof value === 'string' && value.includes('\n')) {
          return `${key}: |\n  ${value.replace(/\n/g, '\n  ')}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join('\n');

    return `---
${frontmatterText}
---

# ${discussion.title}

${discussion.body}
`;
  }

  private parseDiscussionMetadata(content: string): any | null {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return null;

    try {
      const frontmatter = match[1];
      const metadata: any = {};
      
      const lines = frontmatter.split('\n');
      let currentKey = '';
      let isMultiline = false;
      let multilineValue = '';

      for (const line of lines) {
        if (isMultiline) {
          if (line.startsWith('  ')) {
            multilineValue += line.substring(2) + '\n';
          } else {
            metadata[currentKey] = multilineValue.trim();
            isMultiline = false;
            multilineValue = '';
          }
        }
        
        if (!isMultiline) {
          const colonIndex = line.indexOf(':');
          if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            
            if (value === '|') {
              currentKey = key;
              isMultiline = true;
              multilineValue = '';
            } else {
              try {
                metadata[key] = JSON.parse(value);
              } catch {
                metadata[key] = value;
              }
            }
          }
        }
      }

      // Handle case where multiline is the last property
      if (isMultiline && multilineValue) {
        metadata[currentKey] = multilineValue.trim();
      }

      return metadata;
    } catch (error) {
      console.error('Failed to parse discussion metadata:', error);
      return null;
    }
  }

  private async ensureFolderExists(folderPath: string): Promise<void> {
    const normalizedPath = normalizePath(folderPath);
    const folder = this.vault.getAbstractFileByPath(normalizedPath);
    
    if (!folder) {
      await this.vault.createFolder(normalizedPath);
    }
  }

  async updateDiscussionFromMarkdown(discussionNumber: number, discussionService?: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Starting push for discussion #${discussionNumber}`);
      
      const content = await this.loadDiscussion(discussionNumber);
      if (!content) {
        return { success: false, error: 'Discussion file not found' };
      }

      console.log('Loaded discussion content:', content.substring(0, 200) + '...');

      const parsed = this.parseDiscussionFromMarkdown(content);
      if (!parsed) {
        console.error('Failed to parse markdown content');
        return { success: false, error: 'Failed to parse markdown content' };
      }

      console.log('Parsed discussion:', {
        title: parsed.title,
        bodyLength: parsed.body.length,
        discussionId: parsed.metadata.id
      });

      // If metadata is missing essential fields, try to restore from GitHub API
      if (!parsed.metadata.id && discussionService) {
        console.log('Missing discussion ID, attempting to restore metadata from GitHub');
        const originalDiscussion = await discussionService.getDiscussion(discussionNumber);
        
        if (!originalDiscussion) {
          return { success: false, error: `Discussion #${discussionNumber} not found on GitHub` };
        }

        // Merge restored metadata with existing metadata
        parsed.metadata = {
          id: originalDiscussion.id,
          number: originalDiscussion.number,
          title: originalDiscussion.title,
          author: originalDiscussion.author.login,
          created: originalDiscussion.createdAt,
          updated: originalDiscussion.updatedAt,
          githubUrl: originalDiscussion.url,
          category: originalDiscussion.category.name,
          categoryId: originalDiscussion.category.id,
          upvoteCount: originalDiscussion.upvoteCount,
          commentCount: originalDiscussion.comments.totalCount,
          locked: originalDiscussion.locked,
          answered: !!originalDiscussion.answerChosenAt,
          ...parsed.metadata, // Keep any existing metadata
          lastSynced: new Date().toISOString()
        };

        console.log('Restored metadata:', parsed.metadata);
      }

      if (!parsed.metadata.id) {
        return { success: false, error: 'Discussion ID not found in metadata and could not be restored' };
      }

      if (discussionService) {
        // Check if there's a newer version on GitHub before updating
        const currentRemoteDiscussion = await discussionService.getDiscussion(discussionNumber);
        if (!currentRemoteDiscussion) {
          return { success: false, error: `Discussion #${discussionNumber} not found on GitHub` };
        }

        // Check if remote version is newer than last sync
        if (parsed.metadata.lastSynced) {
          const lastSynced = new Date(parsed.metadata.lastSynced);
          const remoteUpdated = new Date(currentRemoteDiscussion.updatedAt);
          
          if (remoteUpdated > lastSynced) {
            console.log(`Remote discussion #${discussionNumber} has been updated since last sync`);
            console.log(`Local last synced: ${lastSynced.toISOString()}`);
            console.log(`Remote updated: ${remoteUpdated.toISOString()}`);
            
            // Show confirmation modal
            const modal = new UpdateConfirmModal(
              this.app,
              discussionNumber,
              lastSynced,
              remoteUpdated,
              `⚠️ Warning: The discussion on GitHub has been updated since your last sync. 
              
Pushing your changes will overwrite the remote version. Do you want to continue?`
            );
            modal.open();
            const shouldProceed = await modal.waitForResult();
            
            if (!shouldProceed) {
              return { success: false, error: 'Push cancelled by user' };
            }
          }
        }

        // Update the discussion via GitHub API
        const updateInput = {
          discussionId: parsed.metadata.id,
          title: parsed.title,
          body: parsed.body
        };

        console.log('Updating discussion with:', updateInput);

        const updatedDiscussion = await discussionService.updateDiscussion(updateInput);
        console.log('Discussion updated successfully:', updatedDiscussion.number);

        // Update the metadata with latest information
        const updatedMetadata = {
          ...parsed.metadata,
          title: updatedDiscussion.title,
          updated: updatedDiscussion.updatedAt,
          lastSynced: new Date().toISOString()
        };

        const updatedContent = this.generateUpdatedMarkdown(parsed.title, parsed.body, updatedMetadata);
        const file = await this.getDiscussionFile(discussionNumber);
        if (file) {
          await this.vault.modify(file, updatedContent);
          console.log('Updated markdown file with complete metadata');
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Failed to update discussion from markdown:`, error);
      return { success: false, error: error.message || String(error) };
    }
  }

  private generateUpdatedMarkdown(title: string, body: string, metadata: any): string {
    const frontmatterText = Object.entries(metadata)
      .map(([key, value]) => {
        if (typeof value === 'string' && value.includes('\n')) {
          return `${key}: |\n  ${value.replace(/\n/g, '\n  ')}`;
        }
        return `${key}: ${JSON.stringify(value)}`;
      })
      .join('\n');

    return `---
${frontmatterText}
---

# ${title}

${body}
`;
  }

  private parseDiscussionFromMarkdown(content: string): { title: string; body: string; metadata: any } | null {
    try {
      // Extract frontmatter
      const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
      const match = content.match(frontmatterRegex);
      
      if (!match) return null;

      const markdownContent = match[2];

      // Parse frontmatter using the same method as parseDiscussionMetadata
      const metadata = this.parseDiscussionMetadata(content);
      if (!metadata) {
        return null;
      }

      // Extract title from first heading
      let title = 'Untitled';
      const titleMatch = markdownContent.match(/^# (.+)$/m);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Extract discussion body - everything after the title heading
      const bodyRegex = /^# .+?\n\n([\s\S]*)$/;
      const bodyMatch = markdownContent.match(bodyRegex);
      let body = '';
      
      if (bodyMatch) {
        body = bodyMatch[1].trim();
      } else {
        // Fallback: remove title line and get the rest
        const lines = markdownContent.split('\n');
        const titleLineIndex = lines.findIndex(line => line.startsWith('# '));
        if (titleLineIndex !== -1) {
          body = lines.slice(titleLineIndex + 1).join('\n').trim();
          // Remove empty lines at the beginning
          body = body.replace(/^\n+/, '');
        }
      }

      return { title, body, metadata };
    } catch (error) {
      console.error('Failed to parse discussion markdown:', error);
      return null;
    }
  }


  private async checkAndConfirmUpdate(existingFile: TFile, discussion: Discussion): Promise<boolean> {
    try {
      // Read existing file to get last sync date from frontmatter
      const existingContent = await this.vault.read(existingFile);
      const existingMetadata = this.parseDiscussionMetadata(existingContent);
      
      if (!existingMetadata || !existingMetadata.lastSynced) {
        // No sync date found, assume local file is older
        console.log('No lastSynced found in existing file, showing update confirmation');
        
        const modal = new UpdateConfirmModal(
          this.app,
          discussion.number,
          new Date(0), // Unknown local date
          new Date(discussion.updatedAt)
        );
        modal.open();
        return await modal.waitForResult();
      }
      
      const lastSynced = new Date(existingMetadata.lastSynced);
      const remoteUpdated = new Date(discussion.updatedAt);
      
      // Check if remote is newer than last sync
      if (remoteUpdated > lastSynced) {
        console.log(`Discussion #${discussion.number} has newer version on GitHub`);
        console.log(`Local last synced: ${lastSynced.toISOString()}`);
        console.log(`Remote updated: ${remoteUpdated.toISOString()}`);
        
        const modal = new UpdateConfirmModal(
          this.app,
          discussion.number,
          lastSynced,
          remoteUpdated
        );
        modal.open();
        return await modal.waitForResult();
      }
      
      // Local is up to date
      return false;
      
    } catch (error) {
      console.error('Error checking update status:', error);
      // If we can't determine, ask the user
      const modal = new UpdateConfirmModal(
        this.app,
        discussion.number,
        new Date(0),
        new Date(discussion.updatedAt)
      );
      modal.open();
      return await modal.waitForResult();
    }
  }

  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
  }

  async repairDiscussionMetadata(discussionNumber: number, discussionService: any): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Repairing metadata for discussion #${discussionNumber}`);

      // Get the original discussion from GitHub
      const originalDiscussion = await discussionService.getDiscussion(discussionNumber);
      if (!originalDiscussion) {
        return { success: false, error: `Discussion #${discussionNumber} not found on GitHub` };
      }

      // Load existing content
      const existingContent = await this.loadDiscussion(discussionNumber);
      let title = originalDiscussion.title;
      let body = originalDiscussion.body;

      // If file exists, try to preserve user edits
      if (existingContent) {
        const parsed = this.parseDiscussionFromMarkdown(existingContent);
        if (parsed) {
          title = parsed.title;
          body = parsed.body;
        }
      }

      // Create complete metadata
      const completeMetadata = {
        id: originalDiscussion.id,
        number: originalDiscussion.number,
        title: originalDiscussion.title, // Use original title for metadata
        author: originalDiscussion.author.login,
        created: originalDiscussion.createdAt,
        updated: originalDiscussion.updatedAt,
        githubUrl: originalDiscussion.url,
        category: originalDiscussion.category.name,
        categoryId: originalDiscussion.category.id,
        upvoteCount: originalDiscussion.upvoteCount,
        commentCount: originalDiscussion.comments.totalCount,
        locked: originalDiscussion.locked,
        answered: !!originalDiscussion.answerChosenAt,
        lastSynced: new Date().toISOString()
      };

      // Generate new content with complete metadata
      const repairedContent = this.generateUpdatedMarkdown(title, body, completeMetadata);

      // Save the repaired file
      const file = await this.getDiscussionFile(discussionNumber);
      if (file) {
        await this.vault.modify(file, repairedContent);
      } else {
        const filePath = this.getDiscussionFilePathByNumber(discussionNumber);
        await this.ensureFolderExists(this.settings.discussionsFolder);
        await this.vault.create(filePath, repairedContent);
      }

      console.log(`Successfully repaired metadata for discussion #${discussionNumber}`);
      return { success: true };
    } catch (error: any) {
      console.error(`Failed to repair metadata for discussion #${discussionNumber}:`, error);
      return { success: false, error: error.message || String(error) };
    }
  }
}