import { ListUsersInGroupCommand, type UserType } from '@aws-sdk/client-cognito-identity-provider';
import { ROLES, type Role, getCaller, requireRole } from '../../lib/auth';
import { USER_POOL_ID, cognito } from '../../lib/cognito';
import { json, withHttp } from '../../lib/http';

function toUser(user: UserType, role: Role) {
  const attribute = (name: string) => user.Attributes?.find((a) => a.Name === name)?.Value;
  return {
    userId: attribute('sub'),
    email: attribute('email'),
    name: attribute('name'),
    role,
    status: user.UserStatus,
    enabled: user.Enabled,
    createdAt: user.UserCreateDate?.toISOString(),
  };
}

export const handler = withHttp(async (event) => {
  requireRole(getCaller(event), 'admin');

  const users = new Map<string, ReturnType<typeof toUser>>();
  for (const role of ROLES) {
    let nextToken: string | undefined;
    do {
      const page = await cognito.send(
        new ListUsersInGroupCommand({ UserPoolId: USER_POOL_ID, GroupName: role, NextToken: nextToken }),
      );
      for (const user of page.Users ?? []) {
        // ROLES is ordered by privilege, so a user found in several groups keeps the highest role
        if (user.Username && !users.has(user.Username)) {
          users.set(user.Username, toUser(user, role));
        }
      }
      nextToken = page.NextToken;
    } while (nextToken);
  }

  return json(200, { items: [...users.values()] });
});
