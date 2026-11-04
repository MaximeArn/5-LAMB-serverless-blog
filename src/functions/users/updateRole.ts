import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
// `enum` is a reserved word, hence the alias
import { enum as zodEnum, object } from 'zod';
import { ROLES, getCaller, requireRole } from '../../lib/auth';
import { USER_POOL_ID, cognito } from '../../lib/cognito';
import { HttpError, json, parseBody, withHttp } from '../../lib/http';

const schema = object({
  role: zodEnum(ROLES),
});

export const handler = withHttp(async (event) => {
  const caller = getCaller(event);
  requireRole(caller, 'admin');

  const userId = event.pathParameters!.userId!;
  const { role } = parseBody(event, schema);

  // Prevents the last admin from locking everyone out of user management
  if (userId === caller.userId) {
    throw new HttpError(400, 'CANNOT_CHANGE_OWN_ROLE', 'Admins cannot change their own role');
  }

  // With email as username attribute, the Cognito username is the user's `sub`
  const { Groups = [] } = await cognito.send(
    new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: userId }),
  );

  // Add the new group before removing the old ones so the user is never left without a role
  if (!Groups.some((group) => group.GroupName === role)) {
    await cognito.send(
      new AdminAddUserToGroupCommand({ UserPoolId: USER_POOL_ID, Username: userId, GroupName: role }),
    );
  }
  for (const group of Groups) {
    if (group.GroupName && group.GroupName !== role) {
      await cognito.send(
        new AdminRemoveUserFromGroupCommand({
          UserPoolId: USER_POOL_ID,
          Username: userId,
          GroupName: group.GroupName,
        }),
      );
    }
  }

  return json(200, {
    userId,
    role,
    message: 'Role updated. It applies to tokens issued from now on (next login or refresh).',
  });
});
