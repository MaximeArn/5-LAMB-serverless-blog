import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { object, string } from 'zod';
import { USER_POOL_CLIENT_ID, cognito } from '../../lib/cognito';
import { HttpError, json, parseBody, withHttp } from '../../lib/http';

const schema = object({
  refreshToken: string().min(1),
});

export const handler = withHttp(async (event) => {
  const { refreshToken } = parseBody(event, schema);

  const { AuthenticationResult } = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: { REFRESH_TOKEN: refreshToken },
    }),
  );

  if (!AuthenticationResult) {
    throw new HttpError(401, 'NOT_AUTHORIZED', 'Refresh token rejected');
  }

  return json(200, {
    idToken: AuthenticationResult.IdToken,
    expiresIn: AuthenticationResult.ExpiresIn,
  });
});
