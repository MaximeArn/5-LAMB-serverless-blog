import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { email, object, string } from 'zod';
import { USER_POOL_CLIENT_ID, cognito } from '../../lib/cognito';
import { HttpError, json, parseBody, withHttp } from '../../lib/http';

const schema = object({
  email: email(),
  password: string().min(1),
});

export const handler = withHttp(async (event) => {
  const { email, password } = parseBody(event, schema);

  const { AuthenticationResult } = await cognito.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );

  // Only returned empty when Cognito asks for an extra challenge, which this pool never configures
  if (!AuthenticationResult) {
    throw new HttpError(401, 'NOT_AUTHORIZED', 'Additional authentication challenge required');
  }

  return json(200, {
    idToken: AuthenticationResult.IdToken,
    refreshToken: AuthenticationResult.RefreshToken,
    expiresIn: AuthenticationResult.ExpiresIn,
  });
});
