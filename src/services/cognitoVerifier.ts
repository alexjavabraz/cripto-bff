import { CognitoJwtVerifier } from 'aws-jwt-verify';

const userPoolId = process.env['COGNITO_USER_POOL_ID'];
const clientId = process.env['COGNITO_APP_CLIENT_ID'];

if (!userPoolId || !clientId) {
  throw new Error(
    'Missing required env vars: COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID must be set.'
  );
}

/**
 * Singleton verifier — caches JWKS in-process after first call.
 * Verifies Cognito ID tokens (tokenUse: 'id').
 */
export const cognitoVerifier = CognitoJwtVerifier.create({
  userPoolId,
  clientId,
  tokenUse: 'id',
});
