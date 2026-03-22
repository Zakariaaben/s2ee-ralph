import { cleanup } from "@testing-library/react";
import { addEqualityTesters } from "@effect/vitest";
import { afterEach } from "vitest";

addEqualityTesters();

afterEach(() => {
  cleanup();
});
