import { Schema } from "effect";

import { UserId } from "./user-id";
import { UserRole } from "./user-role";

export class AuthenticatedActor extends Schema.Class<AuthenticatedActor>("AuthenticatedActor")({
  id: UserId,
  email: Schema.String,
  name: Schema.String,
  role: UserRole,
}) {}
