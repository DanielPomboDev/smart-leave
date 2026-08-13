// Central JWT secret.
// Fail hard instead of falling back to a hardcoded default: if JWT_SECRET is
// missing, the server refuses to boot rather than silently signing/verifying
// tokens with a publicly-known key that would let anyone forge sessions.
if (!process.env.JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Refusing to start: without it, authentication tokens ' +
    'can be forged. Set JWT_SECRET in server/.env (see server/.env.example).'
  );
}

const JWT_SECRET = process.env.JWT_SECRET;

module.exports = { JWT_SECRET };
