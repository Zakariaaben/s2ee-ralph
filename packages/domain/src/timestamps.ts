import { Schema } from "effect";

export const Timestamp = Schema.DateTimeUtcFromString;

export const AuditFields = Schema.Struct({
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
