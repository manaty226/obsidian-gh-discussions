export interface DiscussionComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  isAnswer: boolean;
  upvoteCount: number;
  url: string;
  replies?: {
    nodes?: DiscussionComment[];
  };
}

export interface Discussion {
  id: string;
  number: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  category: {
    id: string;
    name: string;
    emoji: string;
  };
  comments: {
    totalCount: number;
    nodes?: DiscussionComment[];
  };
  upvoteCount: number;
  url: string;
  locked: boolean;
  answerChosenAt?: string;
  answerChosenBy?: {
    login: string;
  };
}


export interface DiscussionCategory {
  id: string;
  name: string;
  emoji: string;
  description: string;
  isAnswerable: boolean;
}

export interface Repository {
  id: string;
  name: string;
  owner: {
    login: string;
  };
  discussionCategories: {
    nodes: DiscussionCategory[];
  };
}


export interface UpdateDiscussionInput {
  discussionId: string;
  title?: string;
  body?: string;
}


export interface DiscussionConnection {
  nodes: Discussion[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string;
  };
  totalCount: number;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    path?: string[];
  }>;
}