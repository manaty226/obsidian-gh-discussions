import { MarkdownPostProcessorContext, Component } from 'obsidian';
import { DiscussionService } from '../api/discussion-service';
import { DiscussionComment } from '../api/types';

export class CommentBlockProcessor extends Component {
  constructor(
    private discussionService: DiscussionService
  ) {
    super();
  }

  async processCommentBlock(
    source: string,
    el: HTMLElement,
    ctx: MarkdownPostProcessorContext
  ): Promise<void> {
    try {
      const params = this.parseBlockContent(source);
      if (!params.discussionNumber) {
        el.createEl('div', { 
          text: 'Error: Discussion number is required',
          cls: 'gh-discussion-error'
        });
        return;
      }

      const discussion = await this.discussionService.getDiscussion(params.discussionNumber);
      if (!discussion) {
        el.createEl('div', { 
          text: `Discussion #${params.discussionNumber} not found`,
          cls: 'gh-discussion-error'
        });
        return;
      }

      this.renderComments(el, discussion.comments.nodes || [], params.discussionNumber);
    } catch (error) {
      console.error('Error processing comment block:', error);
      el.createEl('div', { 
        text: 'Error loading comments',
        cls: 'gh-discussion-error'
      });
    }
  }

  private parseBlockContent(source: string): { discussionNumber?: number } {
    const lines = source.trim().split('\n');
    const params: { discussionNumber?: number } = {};
    
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key === 'discussion' && value) {
        params.discussionNumber = parseInt(value, 10);
      }
    }
    
    return params;
  }

  private renderComments(el: HTMLElement, comments: DiscussionComment[], discussionNumber: number): void {
    const container = el.createEl('div', { cls: 'gh-comments-container' });
    
    // Header
    const header = container.createEl('div', { cls: 'gh-comments-header' });
    header.createEl('h3', { text: `Comments (${comments.length})` });
    
    // New comment form
    this.renderNewCommentForm(container, discussionNumber);
    
    // Comments list
    const commentsList = container.createEl('div', { cls: 'gh-comments-list' });
    
    if (comments.length === 0) {
      commentsList.createEl('div', { 
        text: 'No comments yet',
        cls: 'gh-no-comments'
      });
      return;
    }

    comments.forEach((comment, index) => {
      this.renderComment(commentsList, comment, discussionNumber, index < comments.length - 1);
    });
  }

  private renderComment(
    container: HTMLElement, 
    comment: DiscussionComment, 
    discussionNumber: number,
    showSeparator: boolean
  ): void {
    const commentEl = container.createEl('div', { cls: 'gh-comment' });
    
    // Comment header
    const headerEl = commentEl.createEl('div', { cls: 'gh-comment-header' });
    headerEl.createEl('img', { 
      attr: { src: comment.author.avatarUrl, alt: comment.author.login },
      cls: 'gh-comment-avatar'
    });
    
    const authorEl = headerEl.createEl('span', { cls: 'gh-comment-author' });
    authorEl.createEl('strong', { text: comment.author.login });
    authorEl.createEl('span', { 
      text: ` • ${new Date(comment.createdAt).toLocaleDateString()}`,
      cls: 'gh-comment-date'
    });
    
    if (comment.isAnswer) {
      headerEl.createEl('span', { 
        text: '✓ Answer',
        cls: 'gh-comment-answer-badge'
      });
    }
    
    if (comment.upvoteCount > 0) {
      headerEl.createEl('span', { 
        text: `👍 ${comment.upvoteCount}`,
        cls: 'gh-comment-upvotes'
      });
    }

    // Comment body
    const bodyEl = commentEl.createEl('div', { cls: 'gh-comment-body' });
    bodyEl.innerHTML = this.markdownToHtml(comment.body);

    // Reply button
    const actionsEl = commentEl.createEl('div', { cls: 'gh-comment-actions' });
    const replyBtn = actionsEl.createEl('button', { 
      text: 'Reply',
      cls: 'gh-reply-button'
    });
    replyBtn.addEventListener('click', () => {
      this.toggleReplyForm(commentEl, comment.id, discussionNumber);
    });

    // Replies
    if (comment.replies?.nodes && comment.replies.nodes.length > 0) {
      const repliesContainer = commentEl.createEl('div', { cls: 'gh-comment-replies' });
      repliesContainer.createEl('div', { 
        text: '---',
        cls: 'gh-replies-separator'
      });
      
      comment.replies.nodes.forEach(reply => {
        if (reply) {
          this.renderReply(repliesContainer, reply);
        }
      });
    }

    // Separator between main comments
    if (showSeparator) {
      container.createEl('div', { cls: 'gh-comment-separator' });
    }
  }

  private renderReply(container: HTMLElement, reply: DiscussionComment): void {
    const replyEl = container.createEl('div', { cls: 'gh-reply' });
    
    // Reply header
    const headerEl = replyEl.createEl('div', { cls: 'gh-reply-header' });
    headerEl.createEl('img', { 
      attr: { src: reply.author.avatarUrl, alt: reply.author.login },
      cls: 'gh-reply-avatar'
    });
    
    const authorEl = headerEl.createEl('span', { cls: 'gh-reply-author' });
    authorEl.createEl('strong', { text: reply.author.login });
    authorEl.createEl('span', { 
      text: ` • ${new Date(reply.createdAt).toLocaleDateString()}`,
      cls: 'gh-reply-date'
    });
    
    if (reply.upvoteCount > 0) {
      headerEl.createEl('span', { 
        text: `👍 ${reply.upvoteCount}`,
        cls: 'gh-reply-upvotes'
      });
    }

    // Reply body
    const bodyEl = replyEl.createEl('div', { cls: 'gh-reply-body' });
    bodyEl.innerHTML = this.markdownToHtml(reply.body);
  }

  private renderNewCommentForm(container: HTMLElement, discussionNumber: number): void {
    const formContainer = container.createEl('div', { cls: 'gh-new-comment-form' });
    
    const textarea = formContainer.createEl('textarea', {
      attr: { 
        placeholder: 'Write a comment...',
        rows: '3'
      },
      cls: 'gh-comment-textarea'
    });

    const buttonContainer = formContainer.createEl('div', { cls: 'gh-form-buttons' });
    const submitBtn = buttonContainer.createEl('button', { 
      text: 'Post Comment',
      cls: 'gh-submit-button'
    });

    submitBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        await this.postComment(discussionNumber, content);
        textarea.value = '';
        
        // Refresh the entire block
        await this.refreshComments(container.parentElement!, discussionNumber);
      } catch (error) {
        console.error('Error posting comment:', error);
        alert('Failed to post comment');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Comment';
      }
    });
  }

  private toggleReplyForm(commentEl: HTMLElement, parentCommentId: string, discussionNumber: number): void {
    // Remove existing reply form if any
    const existingForm = commentEl.querySelector('.gh-reply-form');
    if (existingForm) {
      existingForm.remove();
      return;
    }

    const formContainer = commentEl.createEl('div', { cls: 'gh-reply-form' });
    
    const textarea = formContainer.createEl('textarea', {
      attr: { 
        placeholder: 'Write a reply...',
        rows: '2'
      },
      cls: 'gh-reply-textarea'
    });

    const buttonContainer = formContainer.createEl('div', { cls: 'gh-form-buttons' });
    const submitBtn = buttonContainer.createEl('button', { 
      text: 'Post Reply',
      cls: 'gh-submit-button'
    });
    const cancelBtn = buttonContainer.createEl('button', { 
      text: 'Cancel',
      cls: 'gh-cancel-button'
    });

    submitBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content) return;

      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
        
        await this.postReply(discussionNumber, parentCommentId, content);
        
        // Refresh the entire block
        await this.refreshComments(commentEl.closest('.gh-comments-container')!.parentElement!, discussionNumber);
      } catch (error) {
        console.error('Error posting reply:', error);
        alert('Failed to post reply');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Post Reply';
      }
    });

    cancelBtn.addEventListener('click', () => {
      formContainer.remove();
    });

    textarea.focus();
  }

  private async postComment(discussionNumber: number, body: string): Promise<void> {
    const discussion = await this.discussionService.getDiscussion(discussionNumber);
    if (!discussion) {
      throw new Error('Discussion not found');
    }
    
    await this.discussionService.addComment(discussion.id, body);
  }

  private async postReply(discussionNumber: number, parentCommentId: string, body: string): Promise<void> {
    const discussion = await this.discussionService.getDiscussion(discussionNumber);
    if (!discussion) {
      throw new Error('Discussion not found');
    }
    
    await this.discussionService.addComment(discussion.id, body, parentCommentId);
  }

  private async refreshComments(container: HTMLElement, discussionNumber: number): Promise<void> {
    // Clear and re-render
    container.empty();
    await this.processCommentBlock(`discussion: ${discussionNumber}`, container, {} as MarkdownPostProcessorContext);
  }

  private markdownToHtml(markdown: string): string {
    // Basic markdown to HTML conversion
    return markdown
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }
}