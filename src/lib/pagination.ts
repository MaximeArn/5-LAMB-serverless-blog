import { QueryCommand, type QueryCommandInput } from "@aws-sdk/lib-dynamodb";
import { coerce, object, string } from "zod";
import { dynamo } from "./dynamo";
import { HttpError } from "./http";

// Query parameters shared by the list routes
export const paginationSchema = object({
  limit: coerce.number().int().min(1).max(100).default(20),
  nextToken: string().optional(),
});

function invalidNextToken(): HttpError {
  return new HttpError(400, "INVALID_NEXT_TOKEN", "nextToken is invalid");
}

type PageQuery = Omit<QueryCommandInput, "Limit" | "ExclusiveStartKey">;

// Reads one page of an index. nextToken is the DynamoDB LastEvaluatedKey,
// base64url-encoded
export async function queryPage(
  query: PageQuery,
  limit: number,
  nextToken?: string,
) {
  let startKey: Record<string, unknown> | undefined;
  if (nextToken) {
    try {
      startKey = JSON.parse(Buffer.from(nextToken, "base64url").toString());
    } catch {
      throw invalidNextToken();
    }
  }

  try {
    const { Items = [], LastEvaluatedKey } = await dynamo.send(
      new QueryCommand({ ...query, Limit: limit, ExclusiveStartKey: startKey }),
    );
    return {
      items: Items,
      nextToken:
        LastEvaluatedKey &&
        Buffer.from(JSON.stringify(LastEvaluatedKey)).toString("base64url"),
    };
  } catch (err) {
    // DynamoDB rejects a start key that does not match the queried index
    if (startKey && err instanceof Error && err.name === "ValidationException") {
      throw invalidNextToken();
    }
    throw err;
  }
}
