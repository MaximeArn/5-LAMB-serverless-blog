import { AdminAddUserToGroupCommand, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { email, object, string } from 'zod';
import { DEFAULT_ROLE } from '../../lib/auth';
import { USER_POOL_CLIENT_ID, USER_POOL_ID, cognito } from '../../lib/cognito';
import { json, parseBody, withHttp } from '../../lib/http';

const schema = object({
  email: email(),
  password: string().min(8),
  name: string().trim().min(1).max(100),
});

export const handler = withHttp(async (event) => {
  const { email, password, name } = parseBody(event, schema);

  // Cognito emails a verification code to the user
  const { UserSub } = await cognito.send(
    new SignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
      ],
    }),
  );

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: UserSub,
      GroupName: DEFAULT_ROLE,
    }),
  );

  return json(201, {
    userId: UserSub,
    email,
    name,
    role: DEFAULT_ROLE,
    message: 'Account created. A verification code has been sent by email.',
  });
});
