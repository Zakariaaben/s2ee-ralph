import { Schema } from "effect";

export const InterviewStatusValues = ["completed", "cancelled"] as const;

export type InterviewStatusValue = (typeof InterviewStatusValues)[number];

export const InterviewStatus = Schema.Union(
  InterviewStatusValues.map((status) => Schema.Literal(status)),
);
