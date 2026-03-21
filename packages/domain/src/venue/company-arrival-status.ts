import { Schema } from "effect";

export const CompanyArrivalStatusValues = ["not-arrived", "arrived"] as const;

export type CompanyArrivalStatusValue = (typeof CompanyArrivalStatusValues)[number];

export const CompanyArrivalStatus = Schema.Union(
  CompanyArrivalStatusValues.map((status) => Schema.Literal(status)),
);
