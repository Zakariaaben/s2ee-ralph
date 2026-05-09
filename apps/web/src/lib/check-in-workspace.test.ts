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
  readonly arrivalStatus: "arrived" | "not-arrived";
}) =>
  new VenueCompany({
    companyId: input.id as VenueCompany["companyId"],
    companyName: input.name,
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
    zone: null,
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
          arrivalStatus: "not-arrived",
        }),
        makeVenueCompany({
          id: "company_2",
          name: "Beacon Labs",
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
    expect(summary.nextArrivalLabel).toBe("Atlas Systems est la prochaine entreprise a accueillir.");
  });

  it("flattens room placements into searchable company entries", () => {
    const companies = flattenCheckInCompanies(rooms);

    expect(companies).toEqual([
      {
        roomId: "room_a",
        roomCode: "A1",
        companyId: "company_1",
        companyName: "Atlas Systems",
        arrivalStatus: "not-arrived",
      },
      {
        roomId: "room_a",
        roomCode: "A1",
        companyId: "company_2",
        companyName: "Beacon Labs",
        arrivalStatus: "arrived",
      },
      {
        roomId: "room_b",
        roomCode: "B3",
        companyId: "company_3",
        companyName: "Northwind Works",
        arrivalStatus: "not-arrived",
      },
    ]);
  });

  it("filters by status and search terms across company and room labels", () => {
    const companies = flattenCheckInCompanies(rooms);

    expect(
      filterCheckInCompanies(companies, {
        query: "",
        roomId: null,
        status: "pending",
      }).map((company) => company.companyName),
    ).toEqual(["Atlas Systems", "Northwind Works"]);

    expect(
      filterCheckInCompanies(companies, {
        query: "b3",
        roomId: null,
        status: "all",
      }).map((company) => company.companyName),
    ).toEqual(["Northwind Works"]);

    expect(
      filterCheckInCompanies(companies, {
        query: "beacon",
        roomId: null,
        status: "arrived",
      }).map((company) => company.companyName),
    ).toEqual(["Beacon Labs"]);
  });

  it("composes room filtering with search and arrival status", () => {
    const companies = flattenCheckInCompanies(rooms);

    expect(
      filterCheckInCompanies(companies, {
        query: "",
        roomId: "room_a" as VenueRoom["id"],
        status: "all",
      }).map((company) => company.companyName),
    ).toEqual(["Atlas Systems", "Beacon Labs"]);

    expect(
      filterCheckInCompanies(companies, {
        query: "atlas",
        roomId: "room_a" as VenueRoom["id"],
        status: "pending",
      }).map((company) => company.companyName),
    ).toEqual(["Atlas Systems"]);

    expect(
      filterCheckInCompanies(companies, {
        query: "atlas",
        roomId: "room_b" as VenueRoom["id"],
        status: "pending",
      }),
    ).toEqual([]);
  });
});
