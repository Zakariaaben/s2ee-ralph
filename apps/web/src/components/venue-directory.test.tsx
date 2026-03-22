// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  VenueDirectoryPage,
  type VenueDirectorySnapshot,
} from "./venue-directory";

describe("VenueDirectoryPage", () => {
  it("renders a room-first fair directory with stand numbers and arrival status", () => {
    const snapshot: VenueDirectorySnapshot = {
      actor: {
        name: "Student Actor",
        role: "student",
      },
      rooms: [
        {
          id: "room-s27",
          code: "S27",
          companies: [
            {
              companyId: "company-acme",
              companyName: "Acme Systems",
              standNumber: 12,
              arrivalStatus: "not-arrived",
            },
          ],
        },
      ],
    };

    render(<VenueDirectoryPage snapshot={snapshot} />);

    expect(
      screen.getByRole("heading", {
        name: "Find the room, then the stand.",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Student view")).toBeTruthy();
    expect(screen.getByText("S27")).toBeTruthy();
    expect(screen.getByText("Acme Systems")).toBeTruthy();
    expect(screen.getByText("Stand 12")).toBeTruthy();
    expect(screen.getByText("Not arrived")).toBeTruthy();
  });

  it("shows a guarded empty state when no authenticated actor is present", () => {
    const snapshot: VenueDirectorySnapshot = {
      actor: null,
      rooms: [],
    };

    render(<VenueDirectoryPage snapshot={snapshot} />);

    expect(screen.getByText("Session required")).toBeTruthy();
    expect(screen.getByText("Sign in to inspect the fair floor.")).toBeTruthy();
    expect(screen.queryByText("Student view")).toBeNull();
  });
});
