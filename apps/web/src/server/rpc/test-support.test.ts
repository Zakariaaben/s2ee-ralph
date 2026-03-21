import { describe, expect, it } from "@effect/vitest";

import { getComposeTestInfraAvailability } from "./test-support";

describe("rpc test support", () => {
  it("reports compose-backed infra as available when docker info succeeds", () => {
    const availability = getComposeTestInfraAvailability(() => {});

    expect(availability).toEqual({
      available: true,
    });
  });

  it("reports docker daemon failures as unavailable with a readable reason", () => {
    const availability = getComposeTestInfraAvailability(() => {
      const error = new Error("docker info failed") as Error & {
        stderr?: Buffer;
      };

      error.stderr = Buffer.from(
        "Cannot connect to the Docker daemon at unix:///var/run/docker.sock.\n",
        "utf8",
      );

      throw error;
    });

    expect(availability.available).toBe(false);

    if (availability.available) {
      throw new Error("expected compose-backed test infra to be unavailable");
    }

    expect(availability.reason).toContain(
      "Cannot connect to the Docker daemon at unix:///var/run/docker.sock.",
    );
  });
});
