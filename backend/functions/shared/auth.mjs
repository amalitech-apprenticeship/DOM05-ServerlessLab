export const getUser = (event) => {
  const claims = event.requestContext.authorizer.jwt.claims;
  const groups = String(claims["cognito:groups"] ?? "")
    .replace(/[[\]]/g, "")
    .split(/[\s,]+/)
    .filter(Boolean);
  return { id: claims.sub, isAdmin: groups.includes("admin") };
};