import type { APIGatewayProxyEvent } from 'aws-lambda';
import { HttpError } from './http';

// Ordered from most to least privileged
export const ROLES = ['admin', 'editor', 'guest-author'] as const;
export type Role = (typeof ROLES)[number];
export const DEFAULT_ROLE: Role = 'guest-author';

export interface Caller {
  userId: string;
  email: string;
  name?: string;
  role: Role;
}

// The Cognito authorizer flattens `cognito:groups` into a string such as "admin" or "[admin, editor]"
function parseGroups(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string') return [];
  return raw
    .replace(/^\[|\]$/g, '')
    .split(/[,\s]+/)
    .filter(Boolean);
}

export function roleFromGroups(groups: string[]): Role {
  // A user without any role group falls back to the least privileged role
  return ROLES.find((role) => groups.includes(role)) ?? DEFAULT_ROLE;
}

export function getCaller(event: APIGatewayProxyEvent): Caller {
  const claims = event.requestContext.authorizer?.claims;
  if (!claims?.sub) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  return {
    userId: claims.sub,
    email: claims.email,
    name: claims.name,
    role: roleFromGroups(parseGroups(claims['cognito:groups'])),
  };
}

export function requireRole(caller: Caller, ...allowed: Role[]): void {
  if (!allowed.includes(caller.role)) {
    throw new HttpError(403, 'FORBIDDEN', `This action requires the role: ${allowed.join(' or ')}`);
  }
}
