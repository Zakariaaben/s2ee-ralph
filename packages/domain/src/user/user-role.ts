import { Schema } from "effect";

export const UserRoleValues = ["admin", "student", "company", "check-in"] as const;

export type UserRoleValue = (typeof UserRoleValues)[number];

export const UserRole = Schema.Union(UserRoleValues.map((role) => Schema.Literal(role)));
