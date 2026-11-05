import { enum as zodEnum, object } from "zod";
import { getCaller, requireRole } from "../../lib/auth";
import { json, parseBody, withHttp } from "../../lib/http";
import {
  POST_STATUSES,
  type Post,
  getManageablePost,
  savePost,
} from "../../lib/posts";

const schema = object({
  status: zodEnum(POST_STATUSES),
});

export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  requireRole(caller, "editor", "admin");

  const { status } = parseBody(event, schema);
  const post = await getManageablePost(caller, event.pathParameters!.postId!);

  const updated: Post = {
    ...post,
    status,
    updatedAt: new Date().toISOString(),
  };
  if (status === "published") {
    // Republishing keeps the original publication date
    updated.publishedAt = post.publishedAt ?? updated.updatedAt;
  } else {
    delete updated.publishedAt;
  }

  await savePost(updated, post.updatedAt);

  return json(200, updated);
});
