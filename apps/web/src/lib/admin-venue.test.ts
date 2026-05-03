import { AdminCompanyLedgerEntry, Company, Recruiter, Room, VenueRoom } from "@project/domain";
import { describe, expect, it } from "vitest";

import {
  describeVenueRoomOccupancy,
  filterPlacementManagementCompanies,
  filterVenueRoomSummaries,
  sortPlacementManagementCompanies,
  sortVenueRoomSummaries,
} from "@/lib/admin-venue";

const makeRecruiter = (input: { readonly id: string; readonly name: string }) =>
  new Recruiter({
    id: input.id as Recruiter["id"],
    name: input.name,
  });

const makeCompany = (input: {
  readonly id: string;
  readonly name: string;
  readonly recruiters?: ReadonlyArray<Recruiter>;
}) =>
  new Company({
    id: input.id as Company["id"],
    name: input.name,
    recruiters: [...(input.recruiters ?? [])],
  });

const makeRoom = (input: { readonly id: string; readonly code: string }) =>
  new Room({
    id: input.id as Room["id"],
    code: input.code,
  });

const atlas = makeCompany({
  id: "company_1",
  name: "Atlas Systems",
  recruiters: [makeRecruiter({ id: "recruiter_1", name: "Nora Recruiter" })],
});
const beacon = makeCompany({
  id: "company_2",
  name: "Beacon Labs",
  recruiters: [makeRecruiter({ id: "recruiter_2", name: "Iris Recruiter" })],
});
const cypher = makeCompany({
  id: "company_3",
  name: "Cypher Works",
});

const roomA = makeRoom({ id: "room_a", code: "A1" });
const roomB = makeRoom({ id: "room_b", code: "B4" });

const companyLedger = [
  new AdminCompanyLedgerEntry({
    company: atlas,
    room: roomB,
    standNumber: 9,
    arrivalStatus: "not-arrived",
  }),
  new AdminCompanyLedgerEntry({
    company: beacon,
    room: null,
    standNumber: null,
    arrivalStatus: "not-arrived",
  }),
  new AdminCompanyLedgerEntry({
    company: cypher,
    room: roomA,
    standNumber: 3,
    arrivalStatus: "arrived",
  }),
];

const venueRooms = [
  new VenueRoom({
    id: roomB.id,
    code: roomB.code,
    companies: [
      {
        companyId: atlas.id,
        companyName: atlas.name,
        standNumber: 9,
        arrivalStatus: "not-arrived",
      },
    ],
  }),
  new VenueRoom({
    id: roomA.id,
    code: roomA.code,
    companies: [
      {
        companyId: cypher.id,
        companyName: cypher.name,
        standNumber: 3,
        arrivalStatus: "arrived",
      },
    ],
  }),
];

describe("admin venue helper", () => {
  it("sorts room summaries by room code and exposes occupancy labels", () => {
    const summaries = sortVenueRoomSummaries(venueRooms);

    expect(summaries.map((summary) => summary.room.code)).toEqual(["A1", "B4"]);
    expect(describeVenueRoomOccupancy(summaries[0]!)).toBe("1 entreprise arrivee");
    expect(describeVenueRoomOccupancy(summaries[1]!)).toBe("1 entreprise");
  });

  it("filters rooms by room code, company name, and stand number", () => {
    expect(filterVenueRoomSummaries(venueRooms, "a1").map((summary) => summary.room.code)).toEqual([
      "A1",
    ]);
    expect(filterVenueRoomSummaries(venueRooms, "atlas").map((summary) => summary.room.code)).toEqual([
      "B4",
    ]);
    expect(filterVenueRoomSummaries(venueRooms, "3").map((summary) => summary.room.code)).toEqual([
      "A1",
    ]);
  });

  it("sorts placement rows with unplaced companies first, then room and stand", () => {
    expect(sortPlacementManagementCompanies(companyLedger).map((entry) => entry.company.name)).toEqual([
      "Beacon Labs",
      "Cypher Works",
      "Atlas Systems",
    ]);
  });

  it("filters placement rows by company, recruiter, and placement fields", () => {
    expect(
      filterPlacementManagementCompanies(companyLedger, "iris").map((entry) => entry.company.name),
    ).toEqual(["Beacon Labs"]);
    expect(
      filterPlacementManagementCompanies(companyLedger, "b4").map((entry) => entry.company.name),
    ).toEqual(["Atlas Systems"]);
    expect(
      filterPlacementManagementCompanies(companyLedger, "3").map((entry) => entry.company.name),
    ).toEqual(["Cypher Works"]);
  });
});
