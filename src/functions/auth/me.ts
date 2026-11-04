import { getCaller } from '../../lib/auth';
import { json, withHttp } from '../../lib/http';

// Everything comes from the token claims validated by API Gateway: no call to Cognito
export const handler = withHttp(async (event) => json(200, getCaller(event)));
