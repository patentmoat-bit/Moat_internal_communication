/** True whenever sign-in must be real: any production build, or when REQUIRE_SSO=true.
 *  Only a local `next dev` run without REQUIRE_SSO gets the development fallback, so a
 *  missing environment variable on a server can never open the app to everyone. */
export const authEnforced = () => process.env.NODE_ENV === "production" || process.env.REQUIRE_SSO === "true";
