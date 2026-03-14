import { Schema } from "effect";

export const makeId = <const Brand extends string>(brand: Brand) =>
  Schema.String.pipe(Schema.brand(brand));

export const makeUuidId = <const Brand extends string>(brand: Brand) =>
  Schema.String.pipe(
    Schema.check(Schema.isUUID()),
    Schema.brand(brand),
  );
