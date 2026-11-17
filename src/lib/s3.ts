import { S3Client } from "@aws-sdk/client-s3";

// Created once per execution environment and reused across invocations
export const s3 = new S3Client({});

export const MEDIA_BUCKET = process.env.MEDIA_BUCKET!;
