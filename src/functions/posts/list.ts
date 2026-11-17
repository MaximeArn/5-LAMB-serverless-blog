import { enum as zodEnum } from "zod";
import { getCaller } from "../../lib/auth";
import { POSTS_TABLE } from "../../lib/dynamo";
import { json, parseQuery, withHttp } from "../../lib/http";
import { paginationSchema, queryPage } from "../../lib/pagination";
import { POST_STATUSES } from "../../lib/posts";

const schema = paginationSchema.extend({
  status: zodEnum(POST_STATUSES).optional(),
});

export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  const { limit, nextToken, status } = parseQuery(event, schema);

  // A guest author lists their own posts, optionally filtered by status
  if (caller.role === "guest-author") {
    const byAuthor = status
      ? {
          FilterExpression: "#status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":authorId": caller.userId,
            ":status": status,
          },
        }
      : { ExpressionAttributeValues: { ":authorId": caller.userId } };

    const page = await queryPage(
      {
        TableName: POSTS_TABLE,
        IndexName: "byAuthor",
        KeyConditionExpression: "authorId = :authorId",
        ScanIndexForward: false,
        ...byAuthor,
      },
      limit,
      nextToken,
    );
    return json(200, page);
  }

  // Editors and admins list every post of a status, drafts (the review queue) by default
  const page = await queryPage(
    {
      TableName: POSTS_TABLE,
      IndexName: "byStatus",
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": status ?? "draft" },
      ScanIndexForward: false,
    },
    limit,
    nextToken,
  );
  return json(200, page);
});
