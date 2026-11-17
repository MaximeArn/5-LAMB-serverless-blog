import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { canManage, getCaller } from "../../lib/auth";
import { HttpError, noContent, withHttp } from "../../lib/http";
import { mediaKey } from "../../lib/media";
import { MEDIA_BUCKET, s3 } from "../../lib/s3";

export const handler = withHttp(async (event) => {
  const { ownerId, mediaId } = event.pathParameters!;

  // The owner is part of the key: no lookup needed to check permissions
  if (!canManage(getCaller(event), ownerId!)) {
    throw new HttpError(403, "FORBIDDEN", "You can only manage your own media");
  }

  // Deleting a missing file succeeds too: the call can safely be retried
  await s3.send(
    new DeleteObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: mediaKey(ownerId!, mediaId!),
    }),
  );

  return noContent();
});
