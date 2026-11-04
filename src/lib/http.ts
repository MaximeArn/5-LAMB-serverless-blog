import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { ZodType, infer as Infer } from 'zod';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

// AWS SDK exceptions that map to a client error instead of a 500
const AWS_ERRORS: Record<string, { statusCode: number; code: string }> = {
  UsernameExistsException: { statusCode: 409, code: 'USER_ALREADY_EXISTS' },
  InvalidPasswordException: { statusCode: 400, code: 'INVALID_PASSWORD' },
  InvalidParameterException: { statusCode: 400, code: 'INVALID_PARAMETER' },
  CodeMismatchException: { statusCode: 400, code: 'INVALID_CODE' },
  ExpiredCodeException: { statusCode: 400, code: 'EXPIRED_CODE' },
  NotAuthorizedException: { statusCode: 401, code: 'NOT_AUTHORIZED' },
  UserNotConfirmedException: { statusCode: 403, code: 'USER_NOT_CONFIRMED' },
  UserNotFoundException: { statusCode: 404, code: 'USER_NOT_FOUND' },
  TooManyRequestsException: { statusCode: 429, code: 'TOO_MANY_REQUESTS' },
  LimitExceededException: { statusCode: 429, code: 'TOO_MANY_REQUESTS' },
};

export function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

export function parseBody<T extends ZodType>(event: APIGatewayProxyEvent, schema: T): Infer<T> {
  let raw: unknown;
  try {
    raw = event.body ? JSON.parse(event.body) : {};
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body is invalid', details);
  }
  return result.data;
}

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

// Turns thrown errors into JSON responses: { error: { code, message, details? } }
export function withHttp(handler: Handler): Handler {
  return async (event) => {
    try {
      return await handler(event);
    } catch (err) {
      if (err instanceof HttpError) {
        return json(err.statusCode, {
          error: { code: err.code, message: err.message, details: err.details },
        });
      }

      const known = err instanceof Error ? AWS_ERRORS[err.name] : undefined;
      if (known && err instanceof Error) {
        return json(known.statusCode, { error: { code: known.code, message: err.message } });
      }

      console.error(err);
      return json(500, { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
    }
  };
}
