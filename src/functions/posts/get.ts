import { getCaller } from '../../lib/auth';
import { json, withHttp } from '../../lib/http';
import { getManageablePost } from '../../lib/posts';

export const handler = withHttp(async (event) => {
  const post = await getManageablePost(getCaller(event), event.pathParameters!.postId!);
  return json(200, post);
});
