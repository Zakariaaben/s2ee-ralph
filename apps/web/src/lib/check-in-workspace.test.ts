import { VenueCompany, VenueRoom } from "@project/domain";
import { describe, expect, it } from "vitest";

import {
  filterCheckInCompanies,
  flattenCheckInCompanies,
  summarizeCheckInWorkspace,
} from "@/lib/check-in-workspace";

const makeVenueCompany = (input: {
  readonly id: string;
  readonly name: string;
  readonly standNumber: number;
  readonly arrivalStatus: "arrived" | "not-arrived";
}) =>
  new VenueCompany({
    companyId: input.id as VenueCompany["companyId"],
    companyName: input.name,
    standNumber: input.standNumber,
    arrivalStatus: input.arrivalStatus,
  });

const makeVenueRoom = (input: {
  readonly id: string;
  readonly code: string;
  readonly companies: ReadonlyArray<VenueCompany>;
}) =>
  new VenueRoom({
    id: input.id as VenueRoom["id"],
    code: input.code,
    companies: [...input.companies],
  });

describe("check-in workspace helper", () => {
  const rooms = [
    makeVenueRoom({
      id: "room_a",
      code: "A1",
      companies: [
        makeVenueCompany({
          id: "company_1",
          name: "Atlas Systems",
          standNumber: 12,
          arrivalStatus: "not-arrived",
        }),
        makeVenueCompany({
          id: "company_2",
          name: "Beacon Labs",
          standNumber: 14,
          arrivalStatus: "arrived",
        }),
      ],
    }),
    makeVenueRoom({
      id: "room_b",
      code: "B3",
      companies: [
        makeVenueCompany({
          id: "company_3",
          name: "Northwind Works",
          standNumber: 3,
          arrivalStatus: "not-arrived",
        }),
      ],
    }),
  ];

  it("summarizes pending versus arrived placements for the arrival console", () => {
    const summary = summarizeCheckInWorkspace(rooms);

    expect(summary.roomCount).toBe(2);
    expect(summary.placedCompanyCount).toBe(3);
    expect(summary.arrivedCount).toBe(1);
    expect(summary.pendingCount).toBe(2);
    expect(summary.nextArrivalLabel).toBe("Atlas Systems is next for arrival check-in.");
  });

  it("flattens room placements into searchable company entries", () => {
    const companies = flattenCheckInCompanies(rooms);

    expect(companies).toEqual([
      {
        roomId: "room_a",
        roomCode: "A1",
        companyId: "company_1",
        companyName: "Atlas Systems",
        standNumber: 12,
        arrivalStatus: "not-arrived",
      },
      {
        roomId: "room_a",
        roomCode: "A1",
        companyId: "company_2",
        companyName: "Beacon Labs",
        standNumber: 14,
        arrivalStatus: "arrived",
      },
      {
        roomId: "room_b",
        roomCode: "B3",
        companyId: "company_3",
        companyName: "Northwind Works",
        standNumber: 3,
        arrivalStatus: "not-arrived",
      },
    ]);
  });

  it("filters by status and search terms across company, room, and stand labels", () => {
    const companies = flattenCheckInCompanies(rooms);

    expect(
      filterCheckInCompanies(companies, {
        query: "",
        status: "pending",
      }).map((company) => company.companyName),
    ).toEqual(["Atlas Systems", "Northwind Works"]);

    expect(
      filterCheckInCompanies(companies, {
        query: "b3",
        status: "all",
      }).map((company) => company.companyName),
    ).toEqual(["Northwind Works"]);

    expect(
      filterCheckInCompanies(companies, {
        query: "14",
        status: "arrived",
      }).map((company) => company.companyName),
    ).toEqual(["Beacon Labs"]);
  });
});
