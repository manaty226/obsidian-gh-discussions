import React from "react";
import { Discussion } from "../api/types";

interface DiscussionCardProps {
  discussion: Discussion;
  onOpenMarkdown: (discussion: Discussion) => void;
  onPushChanges: (discussion: Discussion) => void;
  onOpenGitHub: (discussion: Discussion) => void;
}

export const DiscussionCard: React.FC<DiscussionCardProps> = ({
  discussion,
  onOpenMarkdown,
  onPushChanges,
  onOpenGitHub,
}) => {
  const getBodyPreview = (body: string): string => {
    if (!body) return "";
    const lines = body.split("\n").filter((line) => line.trim() !== "");
    return lines.slice(0, 3).join("\n");
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="discussion-card">
      <div className="discussion-card-header">
        <h3
          className="discussion-card-title"
          onClick={() => onOpenMarkdown(discussion)}
        >
          {discussion.title}
        </h3>
        <div className="discussion-card-meta">
          <span className="discussion-author">
            Author: {discussion.author.login}
          </span>
          <span className="discussion-date">
            Last Updated: {formatDate(discussion.updatedAt)}
          </span>
        </div>
      </div>

      <div className="discussion-card-preview">
        {getBodyPreview(discussion.body)}
      </div>

      <div className="discussion-card-stats">
        <span className="discussion-upvotes">👍 {discussion.upvoteCount}</span>
        <span className="discussion-comments">
          💬 {discussion.comments.totalCount}
        </span>
      </div>

      <div className="discussion-card-actions">
        <button
          className="discussion-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenMarkdown(discussion);
          }}
        >
          Open
        </button>
        <button
          className="discussion-action-btn push-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPushChanges(discussion);
          }}
        >
          Push Changes
        </button>
        <button
          className="discussion-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onOpenGitHub(discussion);
          }}
        >
          Open in GitHub
        </button>
      </div>
    </div>
  );
};
