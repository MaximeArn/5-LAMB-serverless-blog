import { json, withHttp } from '../../lib/http';
import { getPost, postNotFound } from '../../lib/posts';

export const handler = withHttp(async (event) => {
  const post = await getPost(event.pathParameters!.postId!);

  // Drafts are not visible to the public
  if (!post || post.status !== 'published') throw postNotFound();

  return json(200, post);
});
