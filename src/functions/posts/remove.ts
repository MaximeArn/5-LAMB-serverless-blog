import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getCaller } from '../../lib/auth';
import { POSTS_TABLE, dynamo } from '../../lib/dynamo';
import { noContent, withHttp } from '../../lib/http';
import { getManageablePost } from '../../lib/posts';

export const handler = withHttp(async (event) => {
  const post = await getManageablePost(getCaller(event), event.pathParameters!.postId!);

  await dynamo.send(new DeleteCommand({ TableName: POSTS_TABLE, Key: { postId: post.postId } }));

  return noContent();
});
