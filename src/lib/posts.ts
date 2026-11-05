import { GetCommand, PutCommand, QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { coerce, object, string } from 'zod';
import type { Caller } from './auth';
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

// Query parameters shared by the list routes
export const paginationSchema = object({
  limit: coerce.number().int().min(1).max(100).default(20),
  nextToken: string().optional(),
});

export function postNotFound(): HttpError {
  return new HttpError(404, 'POST_NOT_FOUND', 'Post not found');
}

// Editors and admins manage every post, a guest author only their own
export function canManagePost(caller: Caller, post: Post): boolean {
  return caller.role !== 'guest-author' || post.authorId === caller.userId;
}

export async function getPost(postId: string): Promise<Post | undefined> {
  const { Item } = await dynamo.send(new GetCommand({ TableName: POSTS_TABLE, Key: { postId } }));
  return Item as Post | undefined;
}

export async function getManageablePost(caller: Caller, postId: string): Promise<Post> {
  const post = await getPost(postId);
  if (!post) throw postNotFound();
  if (!canManagePost(caller, post)) {
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

function invalidNextToken(): HttpError {
  return new HttpError(400, 'INVALID_NEXT_TOKEN', 'nextToken is invalid');
}

type PageQuery = Omit<QueryCommandInput, 'TableName' | 'Limit' | 'ExclusiveStartKey'>;

// Reads one page of an index. nextToken is the DynamoDB LastEvaluatedKey, base64url-encoded
export async function queryPage(query: PageQuery, limit: number, nextToken?: string) {
  let startKey: Record<string, unknown> | undefined;
  if (nextToken) {
    try {
      startKey = JSON.parse(Buffer.from(nextToken, 'base64url').toString());
    } catch {
      throw invalidNextToken();
    }
  }

  try {
    const { Items = [], LastEvaluatedKey } = await dynamo.send(
      new QueryCommand({ ...query, TableName: POSTS_TABLE, Limit: limit, ExclusiveStartKey: startKey }),
    );
    return {
      items: Items,
      nextToken: LastEvaluatedKey && Buffer.from(JSON.stringify(LastEvaluatedKey)).toString('base64url'),
    };
  } catch (err) {
    // DynamoDB rejects a start key that does not match the queried index
    if (startKey && err instanceof Error && err.name === 'ValidationException') throw invalidNextToken();
    throw err;
  }
}
