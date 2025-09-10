import { GitHubClient } from "src/api/github-client";
import { Discussion, DiscussionConnection } from "src/api/types";

export const listDiscussions = (client: GitHubClient) => (
  owner: string, name: string
) => (
  first: number = 20, after?: string
): Promise<DiscussionConnection> => {
  return null
}

export const getDiscussion = (client: GitHubClient) => (
  owner: string, name: string
) => (
  number: number
): Promise<Discussion> => {
  return null
}

export const pushDiscussion = (client: GitHubClient) => (
  owner: string, name: string
) => (
  id: string, title: string, body: string
): Promise<Discussion> => {
  return null
}

export const createRemoteGitHandler = (client: GitHubClient) => (
  owner: string, name: string
) => ({
  listDiscussions: listDiscussions(client)(owner, name),
  getDiscussion: getDiscussion(client)(owner, name),
  pushDiscussion: pushDiscussion(client)(owner, name),
});