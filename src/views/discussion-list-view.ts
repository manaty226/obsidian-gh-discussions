import { ItemView, WorkspaceLeaf } from 'obsidian';
import { DiscussionService } from '../api/discussion-service';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { DiscussionList } from '../components/DiscussionList';

export const DISCUSSION_LIST_VIEW_TYPE = 'discussion-list';

export class DiscussionListView extends ItemView {
  private discussionService: DiscussionService;
  private root: Root | null = null;

  constructor(leaf: WorkspaceLeaf, discussionService: DiscussionService) {
    super(leaf);
    this.discussionService = discussionService;
  }

  getViewType(): string {
    return DISCUSSION_LIST_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'GitHub Discussions';
  }

  getIcon(): string {
    return 'message-circle';
  }

  async onOpen() {
    this.render();
  }

  async onClose() {
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }
  }

  private render() {
    const { containerEl } = this;
    containerEl.empty();
    
    // Create a container for React
    const reactContainer = containerEl.createDiv();

    if (!this.root) {
      this.root = createRoot(reactContainer);
    }

    this.root.render(
      React.createElement(DiscussionList, {
        discussionService: this.discussionService
      })
    );
  }

  async refresh() {
    this.render();
  }
}