"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cognitoVerifier = void 0;
const aws_jwt_verify_1 = require("aws-jwt-verify");
const userPoolId = process.env['COGNITO_USER_POOL_ID'];
const clientId = process.env['COGNITO_APP_CLIENT_ID'];
if (!userPoolId || !clientId) {
    throw new Error('Missing required env vars: COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID must be set.');
}
/**
 * Singleton verifier — caches JWKS in-process after first call.
 * Verifies Cognito ID tokens (tokenUse: 'id').
 */
exports.cognitoVerifier = aws_jwt_verify_1.CognitoJwtVerifier.create({
    userPoolId,
    clientId,
    tokenUse: 'id',
});
