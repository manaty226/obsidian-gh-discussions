import { PluginSettings } from '../settings/settings';
import { FileManager } from '../sync/file-manager';
import { GitHubClient } from './github-client';
import {
  AddDiscussionCommentInput,
  CreateDiscussionInput,
  Discussion,
  DiscussionCategory,
  DiscussionComment,
  DiscussionConnection,
  Repository,
  UpdateDiscussionInput
} from './types';

const DISCUSSIONS_QUERY = `
  query GetDiscussions($owner: String!, $name: String!, $first: Int!, $after: String) {
    repository(owner: $owner, name: $name) {
      discussions(first: $first, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          number
          title
          body
          createdAt
          updatedAt
          author {
            login
            avatarUrl
          }
          category {
            id
            name
            emoji
          }
          comments {
            totalCount
          }
          upvoteCount
          url
          locked
          answerChosenAt
          answerChosenBy {
            login
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
        totalCount
      }
    }
  }
`;

const DISCUSSION_QUERY = `
  query GetDiscussion($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
      discussion(number: $number) {
        id
        number
        title
        body
        createdAt
        updatedAt
        author {
          login
          avatarUrl
        }
        category {
          id
          name
          emoji
        }
        comments(first: 50) {
          nodes {
            id
            body
            createdAt
            updatedAt
            author {
              login
              avatarUrl
            }
            isAnswer
            upvoteCount
            url
            replies(first: 20) {
              nodes {
                id
                body
                createdAt
                updatedAt
                author {
                  login
                  avatarUrl
                }
                upvoteCount
                url
              }
            }
          }
        }
        upvoteCount
        url
        locked
        answerChosenAt
        answerChosenBy {
          login
        }
      }
    }
  }
`;

const REPOSITORY_QUERY = `
  query GetRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      name
      owner {
        login
      }
      discussionCategories(first: 20) {
        nodes {
          id
          name
          emoji
          description
          isAnswerable
        }
      }
    }
  }
`;

const CREATE_DISCUSSION_MUTATION = `
  mutation CreateDiscussion($input: CreateDiscussionInput!) {
    createDiscussion(input: $input) {
      discussion {
        id
        number
        title
        body
        url
      }
    }
  }
`;

const UPDATE_DISCUSSION_MUTATION = `
  mutation UpdateDiscussion($input: UpdateDiscussionInput!) {
    updateDiscussion(input: $input) {
      discussion {
        id
        number
        title
        body
        updatedAt
      }
    }
  }
`;

const ADD_DISCUSSION_COMMENT_MUTATION = `
  mutation AddDiscussionComment($input: AddDiscussionCommentInput!) {
    addDiscussionComment(input: $input) {
      comment {
        id
        body
        createdAt
        author {
          login
          avatarUrl
        }
      }
    }
  }
`;

export class DiscussionService {
  private client: GitHubClient;
  public settings: PluginSettings;
  private fileManager: FileManager;
  private repository: Repository | null = null;

  constructor(client: GitHubClient, settings: PluginSettings) {
    this.client = client;
    this.settings = settings;
    this.fileManager = new FileManager(settings);
  }

  async getRepository(): Promise<Repository> {
    if (this.repository) {
      return this.repository;
    }

    const response = await this.client.query<{ repository: Repository }>(
      REPOSITORY_QUERY,
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
      DISCUSSIONS_QUERY,
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
      DISCUSSION_QUERY,
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

  async createDiscussion(input: Omit<CreateDiscussionInput, 'repositoryId'>): Promise<Discussion> {
    const repo = await this.getRepository();
    
    const response = await this.client.mutation<{ createDiscussion: { discussion: Discussion } }>(
      CREATE_DISCUSSION_MUTATION,
      {
        input: {
          ...input,
          repositoryId: repo.id
        }
      }
    );

    const discussion = response.createDiscussion.discussion;
    await this.fileManager.saveDiscussion(discussion);
    
    return discussion;
  }

  async updateDiscussion(input: UpdateDiscussionInput): Promise<Discussion> {
    const response = await this.client.mutation<{ updateDiscussion: { discussion: Discussion } }>(
      UPDATE_DISCUSSION_MUTATION,
      { input }
    );

    const discussion = response.updateDiscussion.discussion;

    return discussion;
  }

  async addComment(input: AddDiscussionCommentInput): Promise<DiscussionComment> {
    const response = await this.client.mutation<{ addDiscussionComment: { comment: DiscussionComment } }>(
      ADD_DISCUSSION_COMMENT_MUTATION,
      { input }
    );

    return response.addDiscussionComment.comment;
  }

  async syncDiscussions(): Promise<void> {
    let hasNextPage = true;
    let after: string | undefined;
    const allDiscussions: Discussion[] = [];

    while (hasNextPage) {
      const connection = await this.getDiscussions(50, after);
      allDiscussions.push(...connection.nodes);
      
      hasNextPage = connection.pageInfo.hasNextPage;
      after = connection.pageInfo.endCursor;
    }

    for (const discussion of allDiscussions) {
      await this.fileManager.saveDiscussion(discussion);
    }

    console.log(`Synced ${allDiscussions.length} discussions`);
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


  updateSettings(settings: PluginSettings): void {
    this.settings = settings;
    this.fileManager = new FileManager(settings);
    this.repository = null;
  }

  async repairDiscussionMetadata(discussionNumber: number): Promise<{ success: boolean; error?: string }> {
    return await this.fileManager.repairDiscussionMetadata(discussionNumber, this);
  }
}