import { object } from 'zod';
import { getCaller } from '../../lib/auth';
import { json, parseBody, withHttp } from '../../lib/http';
import { type Post, contentSchema, getManageablePost, savePost, titleSchema } from '../../lib/posts';

const schema = object({
  title: titleSchema.optional(),
  content: contentSchema.optional(),
}).refine((body) => body.title !== undefined || body.content !== undefined, {
  message: 'Provide title and/or content',
});

export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  const { title, content } = parseBody(event, schema);
  const post = await getManageablePost(caller, event.pathParameters!.postId!);

  const updated: Post = {
    ...post,
    title: title ?? post.title,
    content: content ?? post.content,
    updatedAt: new Date().toISOString(),
  };

  // A guest author cannot publish: editing a published post sends it back to review
  if (caller.role === 'guest-author' && post.status === 'published') {
    updated.status = 'draft';
    delete updated.publishedAt;
  }

  await savePost(updated, post.updatedAt);

  return json(200, updated);
});
