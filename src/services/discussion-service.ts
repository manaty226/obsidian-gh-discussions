import path from "path"
import { LocalWritableDiscussion } from "src/model/discussion"

export const toFilePath = (discussion: LocalWritableDiscussion): string => {
  return path.join('discussions', `${discussion.number}.md`)
}

export const toMarkdownContent = (discussion: LocalWritableDiscussion): string => {

  return `---
id: ${discussion.id}
number: ${discussion.number}
title: "${discussion.title.replace(/"/g, '\\"')}"
author: ${discussion.author}
createdAt: ${discussion.createdAt.toISOString()}
updatedAt: ${discussion.updatedAt.toISOString()}
syncedAt: ${discussion.syncedAt.toISOString()}
url: ${discussion.url}
category: ${discussion.category}
---
# ${discussion.title}

${discussion.body}
`
}

