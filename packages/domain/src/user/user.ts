import { Schema } from "effect";

import { Timestamp } from "../timestamps";
import { UserId } from "./user-id";
import { UserRole } from "./user-role";

export class User extends Schema.Class<User>("User")({
  id: UserId,
  name: Schema.String,
  email: Schema.String,
  role: UserRole,
  emailVerified: Schema.Boolean,
  image: Schema.NullOr(Schema.String),
  createdAt: Timestamp,
  updatedAt: Timestamp,
}) {}
