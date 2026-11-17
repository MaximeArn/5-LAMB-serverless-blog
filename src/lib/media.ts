import { randomUUID } from "node:crypto";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { HttpError } from "./http";

// S3 is the only store of the media: a media exists if and only if its file
// exists, under media/{ownerId}/{mediaId}

export const MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

const MB = 1024 * 1024;

// Enforced by S3 itself through the presigned upload policy
export function maxSize(contentType: MediaType): number {
  return contentType.startsWith("video/") ? 100 * MB : 10 * MB;
}

// S3 lists keys in ascending order: ids starting with a reversed timestamp are
// listed newest first. The UUID keeps them impossible to guess
export function newMediaId(): string {
  const reversedTime = (Number.MAX_SAFE_INTEGER - Date.now()).toString(36);
  return `${reversedTime}-${randomUUID()}`;
}

export function mediaKey(ownerId: string, mediaId: string): string {
  return `media/${ownerId}/${mediaId}`;
}

// Public URL of a media, usable as is in <img src> or in Markdown
export function mediaUrl(
  event: APIGatewayProxyEvent,
  ownerId: string,
  mediaId: string,
): string {
  const { domainName, stage } = event.requestContext;
  return `https://${domainName}/${stage}/media/${ownerId}/${mediaId}`;
}

export function mediaNotFound(): HttpError {
  return new HttpError(404, "MEDIA_NOT_FOUND", "Media not found");
}
