import { Discussion } from "src/api/types";

export type LocalWritableDiscussion = {
  id: string;
  number: number;
  title: string;
  body: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt: Date;
  url: string;
  category: string;
}

export type RemoteReadDiscussion = Discussion

export const toLocalWriteDiscussion = (
  discussion: RemoteReadDiscussion
): LocalWritableDiscussion => ({
  id: discussion.id,
  number: discussion.number,
  title: discussion.title,
  body: discussion.body,
  author: discussion.author.login,
  createdAt: new Date(discussion.createdAt),
  updatedAt: new Date(discussion.updatedAt),
  syncedAt: new Date(Date.now()),
  url: discussion.url,
  category: discussion.category.name,
});

export type RemoteWriteDiscussion = {
  id: string;
  title: string;
  body: string;
}

export const toRemoteWriteDiscussion = (
  discussion: LocalWritableDiscussion
): RemoteWriteDiscussion => ({
  id: discussion.id,
  title: discussion.title,
  body: discussion.body,
});