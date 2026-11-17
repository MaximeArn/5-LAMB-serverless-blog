import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getCaller } from "../../lib/auth";
import { HttpError, json, parseQuery, withHttp } from "../../lib/http";
import { mediaUrl } from "../../lib/media";
import { paginationSchema } from "../../lib/pagination";
import { MEDIA_BUCKET, s3 } from "../../lib/s3";

export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  const { limit, nextToken } = parseQuery(event, paginationSchema);

  let page;
  try {
    page = await s3.send(
      new ListObjectsV2Command({
        Bucket: MEDIA_BUCKET,
        Prefix: `media/${caller.userId}/`,
        MaxKeys: limit,
        ContinuationToken: nextToken,
      }),
    );
  } catch (err) {
    if (nextToken && err instanceof Error && err.name === "InvalidArgument") {
      throw new HttpError(400, "INVALID_NEXT_TOKEN", "nextToken is invalid");
    }
    throw err;
  }

  const items = (page.Contents ?? []).map((object) => {
    const mediaId = object.Key!.split("/").pop()!;
    return {
      mediaId,
      ownerId: caller.userId,
      size: object.Size,
      uploadedAt: object.LastModified?.toISOString(),
      url: mediaUrl(event, caller.userId, mediaId),
    };
  });

  return json(200, { items, nextToken: page.NextContinuationToken });
});
