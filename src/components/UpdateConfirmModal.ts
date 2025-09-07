import { App, Modal, Setting } from 'obsidian';

export class UpdateConfirmModal extends Modal {
  private result: boolean = false;
  private discussionNumber: number;
  private localDate: Date;
  private remoteDate: Date;
  private customMessage?: string;

  constructor(app: App, discussionNumber: number, localDate: Date, remoteDate: Date, customMessage?: string) {
    super(app);
    this.discussionNumber = discussionNumber;
    this.localDate = localDate;
    this.remoteDate = remoteDate;
    this.customMessage = customMessage;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', { text: 'Discussion Update Available' });

    const infoEl = contentEl.createDiv();
    infoEl.createEl('p', { 
      text: `Discussion #${this.discussionNumber} has been updated on GitHub.`
    });

    const datesEl = infoEl.createDiv({ cls: 'update-dates' });
    datesEl.createEl('p', {
      text: `Local file last synced: ${this.localDate.toLocaleString()}`
    });
    datesEl.createEl('p', {
      text: `GitHub last updated: ${this.remoteDate.toLocaleString()}`
    });

    const warningEl = contentEl.createDiv({ cls: 'update-warning' });
    const warningText = this.customMessage || 
      '⚠️ Warning: Updating will overwrite any local changes you may have made to this file.';
    
    warningEl.createEl('p', {
      text: warningText
    });

    const buttonsEl = contentEl.createDiv({ cls: 'update-buttons' });
    
    // Change button labels based on whether this is a push or pull operation
    const isPushOperation = this.customMessage?.includes('Pushing your changes');
    
    new Setting(buttonsEl)
      .addButton(btn => btn
        .setButtonText(isPushOperation ? 'Cancel Push' : 'Keep Local Version')
        .onClick(() => {
          this.result = false;
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText(isPushOperation ? 'Continue Push' : 'Update from GitHub')
        .setClass('mod-cta')
        .onClick(() => {
          this.result = true;
          this.close();
        }));
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  async waitForResult(): Promise<boolean> {
    return new Promise((resolve) => {
      const originalOnClose = this.onClose.bind(this);
      this.onClose = () => {
        originalOnClose();
        resolve(this.result);
      };
    });
  }
}