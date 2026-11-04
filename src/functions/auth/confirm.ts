import { ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import * as z from 'zod';
import { USER_POOL_CLIENT_ID, cognito } from '../../lib/cognito';
import { json, parseBody, withHttp } from '../../lib/http';

const schema = z.object({
  email: z.email(),
  code: z.string().trim().min(1),
});

export const handler = withHttp(async (event) => {
  const { email, code } = parseBody(event, schema);

  await cognito.send(
    new ConfirmSignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }),
  );

  return json(200, { message: 'Account confirmed. You can now log in.' });
});
