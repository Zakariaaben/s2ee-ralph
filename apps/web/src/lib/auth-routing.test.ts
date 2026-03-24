import { describe, expect, it } from "vitest";

import { authPaths, getRoleHomePath, isRoleHomePath, roleHomePaths } from "@/lib/auth-routing";

describe("auth-routing", () => {
  it("maps each platform role to one stable home path", () => {
    expect(getRoleHomePath("student")).toBe("/student");
    expect(getRoleHomePath("company")).toBe("/company");
    expect(getRoleHomePath("admin")).toBe("/admin");
    expect(getRoleHomePath("check-in")).toBe("/check-in");
    expect(roleHomePaths).toMatchInlineSnapshot(`
      {
        "admin": "/admin",
        "check-in": "/check-in",
        "company": "/company",
        "student": "/student",
      }
    `);
  });

  it("recognizes only dedicated role home paths", () => {
    expect(isRoleHomePath("/student")).toBe(true);
    expect(isRoleHomePath("/company")).toBe(true);
    expect(isRoleHomePath("/")).toBe(false);
    expect(isRoleHomePath("/auth")).toBe(false);
    expect(isRoleHomePath("/auth/sign-in")).toBe(false);
    expect(authPaths).toEqual({
      root: "/auth",
      signIn: "/auth/sign-in",
      signUp: "/auth/sign-up",
    });
  });
});
