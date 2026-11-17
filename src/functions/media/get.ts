import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { redirect, withHttp } from "../../lib/http";
import { mediaKey, mediaNotFound } from "../../lib/media";
import { MEDIA_BUCKET, s3 } from "../../lib/s3";

const READ_URL_TTL_SECONDS = 900;
// Browsers may reuse the redirect: it must expire before the signed URL
const REDIRECT_MAX_AGE_SECONDS = 600;

export const handler = withHttp(async (event) => {
  const { ownerId, mediaId } = event.pathParameters!;
  const key = mediaKey(ownerId!, mediaId!);

  // Answers our own 404 rather than redirecting to an S3 error
  try {
    await s3.send(new HeadObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }));
  } catch (err) {
    if (err instanceof Error && err.name === "NotFound") throw mediaNotFound();
    throw err;
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: key }),
    { expiresIn: READ_URL_TTL_SECONDS },
  );

  return redirect(url, REDIRECT_MAX_AGE_SECONDS);
});
