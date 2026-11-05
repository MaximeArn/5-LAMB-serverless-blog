import { json, parseQuery, withHttp } from '../../lib/http';
import { paginationSchema, queryPage } from '../../lib/posts';

export const handler = withHttp(async (event) => {
  const { limit, nextToken } = parseQuery(event, paginationSchema);

  // The index does not project `content`: lists stay light, the full post is read by id
  const page = await queryPage(
    {
      IndexName: 'byStatus',
      KeyConditionExpression: '#status = :published',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':published': 'published' },
      ScanIndexForward: false,
    },
    limit,
    nextToken,
  );

  return json(200, page);
});
