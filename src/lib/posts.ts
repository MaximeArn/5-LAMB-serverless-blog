import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { string } from 'zod';
import { type Caller, canManage } from './auth';
import { POSTS_TABLE, dynamo } from './dynamo';
import { HttpError } from './http';

export const POST_STATUSES = ['draft', 'published'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface Post {
  postId: string;
  title: string;
  content: string;
  status: PostStatus;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export const titleSchema = string().trim().min(1).max(200);
// Keeps posts well under the 400 KB DynamoDB item limit
export const contentSchema = string().max(100_000);

export function postNotFound(): HttpError {
  return new HttpError(404, 'POST_NOT_FOUND', 'Post not found');
}

export async function getPost(postId: string): Promise<Post | undefined> {
  const { Item } = await dynamo.send(new GetCommand({ TableName: POSTS_TABLE, Key: { postId } }));
  return Item as Post | undefined;
}

export async function getManageablePost(caller: Caller, postId: string): Promise<Post> {
  const post = await getPost(postId);
  if (!post) throw postNotFound();
  if (!canManage(caller, post.authorId)) {
    throw new HttpError(403, 'FORBIDDEN', 'You can only manage your own posts');
  }
  return post;
}

// Optimistic locking: the write fails if the post was modified or deleted since it was read
export async function savePost(post: Post, previousUpdatedAt: string): Promise<void> {
  try {
    await dynamo.send(
      new PutCommand({
        TableName: POSTS_TABLE,
        Item: post,
        ConditionExpression: 'updatedAt = :previousUpdatedAt',
        ExpressionAttributeValues: { ':previousUpdatedAt': previousUpdatedAt },
      }),
    );
  } catch (err) {
    if (err instanceof Error && err.name === 'ConditionalCheckFailedException') {
      throw new HttpError(409, 'POST_CONFLICT', 'The post was modified or deleted meanwhile, reload it and retry');
    }
    throw err;
  }
}
