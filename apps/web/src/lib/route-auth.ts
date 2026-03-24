import { UserRoleValues, type UserRoleValue } from "@project/domain";

import { getRoleHomePath } from "@/lib/auth-routing";

type SessionLike = unknown;

export const getSessionRole = (session: SessionLike): UserRoleValue | null => {
  const role =
    typeof session === "object" &&
    session !== null &&
    "user" in session &&
    typeof session.user === "object" &&
    session.user !== null &&
    "role" in session.user
      ? session.user.role
      : null;

  return role != null && UserRoleValues.includes(role as UserRoleValue)
    ? (role as UserRoleValue)
    : null;
};

export const getRedirectPathForSession = (session: SessionLike): string | null => {
  const role = getSessionRole(session);

  return role == null ? null : getRoleHomePath(role);
};

export const getProtectedRouteRedirect = (
  session: SessionLike,
  requiredRole: UserRoleValue,
): string | null => {
  const role = getSessionRole(session);

  if (role == null) {
    return "/auth/sign-in";
  }

  return role === requiredRole ? null : getRoleHomePath(role);
};
