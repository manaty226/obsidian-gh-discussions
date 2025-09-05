import React, { useState, useEffect } from 'react';
import { Discussion, DiscussionCategory } from '../api/types';
import { DiscussionService } from '../api/discussion-service';
import { DiscussionCard } from './DiscussionCard';
import { Notice } from 'obsidian';

interface DiscussionListProps {
  discussionService: DiscussionService;
}

export const DiscussionList: React.FC<DiscussionListProps> = ({ discussionService }) => {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [categories, setCategories] = useState<DiscussionCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const [discussionsResponse, categoriesData] = await Promise.all([
        discussionService.getDiscussions(50),
        discussionService.getCategories()
      ]);

      setDiscussions(discussionsResponse.nodes);
      setCategories(categoriesData);
    } catch (err: any) {
      console.error('Failed to load discussions:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenMarkdown = async (discussion: Discussion) => {
    try {
      const fileManager = (discussionService as any).fileManager;
      await fileManager.saveDiscussion(discussion);
      await fileManager.openDiscussionInEditor(discussion.number);
    } catch (error: any) {
      console.error('Failed to open discussion as markdown:', error);
    }
  };

  const handlePushChanges = async (discussion: Discussion) => {
    try {
      new Notice(`Pushing discussion #${discussion.number} to GitHub...`);
      
      const result = await discussionService.pushMarkdownToGitHub(discussion.number);
      
      if (result.success) {
        new Notice(`✅ Discussion #${discussion.number} pushed successfully!`);
      } else {
        new Notice(`❌ Failed to push discussion #${discussion.number}: ${result.error}`);
      }
    } catch (error: any) {
      new Notice(`❌ Error pushing discussion #${discussion.number}: ${error.message}`);
    }
  };

  const handleOpenGitHub = (discussion: Discussion) => {
    window.open(discussion.url, '_blank');
  };


  const handleNewDiscussion = () => {
    const settings = discussionService.settings;
    window.open(`https://github.com/${settings?.repositoryOwner}/${settings?.repositoryName}/discussions/new`, '_blank');
  };

  const filteredDiscussions = selectedCategory 
    ? discussions.filter(d => d.category.id === selectedCategory)
    : discussions;

  if (isLoading) {
    return (
      <div className="discussion-list-container">
        <div className="loading">Loading discussions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="discussion-list-container">
        <div className="error">
          <p>Error loading discussions: {error}</p>
          <button className="mod-cta retry-btn" onClick={loadData}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="discussion-list-container">
      <div className="discussion-list-header">
        <h2>GitHub Discussions</h2>
        
        <div className="discussion-toolbar">
          <button className="mod-cta" onClick={loadData}>
            ↻ Refresh
          </button>
          <button className="mod-cta" onClick={handleNewDiscussion}>
            + New Discussion
          </button>
          
          {categories.length > 0 && (
            <select 
              className="category-filter" 
              value={selectedCategory || ''} 
              onChange={(e) => setSelectedCategory(e.target.value || null)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.emoji} {category.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="discussion-list-content">
        {filteredDiscussions.length === 0 ? (
          <div className="no-discussions">
            <p>No discussions found.</p>
          </div>
        ) : (
          <div className="discussion-cards">
            {filteredDiscussions.map(discussion => (
              <DiscussionCard
                key={discussion.id}
                discussion={discussion}
                onOpenMarkdown={handleOpenMarkdown}
                onPushChanges={handlePushChanges}
                onOpenGitHub={handleOpenGitHub}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};