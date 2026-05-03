import { describe, expect, it } from "vitest";

import {
  adminSections,
  getAdminIndexRedirectPath,
} from "@/lib/admin-routing";

describe("admin-routing", () => {
  it("redirects the admin root to the overview route only", () => {
    expect(getAdminIndexRedirectPath("/admin")).toBe("/admin/overview");
    expect(getAdminIndexRedirectPath("/admin/")).toBe("/admin/overview");
    expect(getAdminIndexRedirectPath("/admin/companies")).toBeNull();
    expect(getAdminIndexRedirectPath("/student")).toBeNull();
  });

  it("defines the admin section map as stable route targets", () => {
    expect(adminSections.map((section) => section.to)).toEqual([
      "/admin/overview",
      "/admin/companies",
      "/admin/venue",
      "/admin/vocabularies",
      "/admin/map",
      "/admin/access",
      "/admin/interviews",
    ]);
  });
});
