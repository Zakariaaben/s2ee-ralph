import { Schema } from "effect";

export const RequiredText = Schema.Trim.pipe(
  Schema.check(Schema.isNonEmpty()),
);
