import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { enum as zodEnum, object, string } from "zod";
import { getCaller } from "../../lib/auth";
import { json, parseBody, withHttp } from "../../lib/http";
import {
  MEDIA_TYPES,
  maxSize,
  mediaKey,
  mediaUrl,
  newMediaId,
} from "../../lib/media";
import { MEDIA_BUCKET, s3 } from "../../lib/s3";

const UPLOAD_URL_TTL_SECONDS = 300;

const schema = object({
  fileName: string().trim().min(1).max(255),
  contentType: zodEnum(MEDIA_TYPES),
});

// Nothing is stored here: the media only exists once the client has sent its
// file to S3, which answers 204
export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  const { fileName, contentType } = parseBody(event, schema);
  const mediaId = newMediaId();

  // Every field is part of the signed policy: S3 rejects another content type,
  // another file name or a file above the size limit
  const upload = await createPresignedPost(s3, {
    Bucket: MEDIA_BUCKET,
    Key: mediaKey(caller.userId, mediaId),
    Fields: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
    Conditions: [["content-length-range", 1, maxSize(contentType)]],
    Expires: UPLOAD_URL_TTL_SECONDS,
  });

  return json(201, {
    mediaId,
    ownerId: caller.userId,
    fileName,
    contentType,
    url: mediaUrl(event, caller.userId, mediaId),
    upload: { ...upload, expiresIn: UPLOAD_URL_TTL_SECONDS },
  });
});
