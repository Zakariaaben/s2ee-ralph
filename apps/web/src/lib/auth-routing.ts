import type { UserRoleValue } from "@project/domain";

export const roleHomePaths = {
  admin: "/admin",
  student: "/student",
  company: "/company",
  "check-in": "/check-in",
} as const satisfies Record<UserRoleValue, string>;

export const getRoleHomePath = (role: UserRoleValue): (typeof roleHomePaths)[UserRoleValue] =>
  roleHomePaths[role];

export const isRoleHomePath = (pathname: string): boolean =>
  Object.values(roleHomePaths).includes(pathname as (typeof roleHomePaths)[UserRoleValue]);
