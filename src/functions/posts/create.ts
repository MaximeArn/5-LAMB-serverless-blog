import { randomUUID } from 'node:crypto';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { object } from 'zod';
import { getCaller } from '../../lib/auth';
import { POSTS_TABLE, dynamo } from '../../lib/dynamo';
import { json, parseBody, withHttp } from '../../lib/http';
import { type Post, contentSchema, titleSchema } from '../../lib/posts';

const schema = object({
  title: titleSchema,
  content: contentSchema,
});

export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  const { title, content } = parseBody(event, schema);

  const now = new Date().toISOString();
  const post: Post = {
    postId: randomUUID(),
    title,
    content,
    status: 'draft',
    authorId: caller.userId,
    // Copied from the token: DynamoDB has no joins to fetch it later
    authorName: caller.name ?? caller.email,
    createdAt: now,
    updatedAt: now,
  };

  await dynamo.send(new PutCommand({ TableName: POSTS_TABLE, Item: post }));

  return json(201, post);
});
