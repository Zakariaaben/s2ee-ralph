import { AuthenticatedActor, type VenueRoom } from "@project/domain";
import { Effect } from "effect";
import { createServerFn } from "@tanstack/react-start";

import type { VenueDirectorySnapshot } from "@/components/venue-directory";
import { authMiddleware } from "@/middleware/auth";
import { VenueService } from "@/server/services/venue-service";
import { serverRuntime } from "@/server/runtime";

const emptyVenueDirectorySnapshot = (): VenueDirectorySnapshot => ({
  actor: null,
  rooms: [],
});

const toVenueDirectorySnapshot = (
  actor: AuthenticatedActor,
  rooms: ReadonlyArray<VenueRoom>,
): VenueDirectorySnapshot => ({
  actor: {
    name: actor.name,
    role: actor.role,
  },
  rooms: rooms.map((room) => ({
    id: room.id,
    code: room.code,
    companies: room.companies.map((company) => ({
      companyId: company.companyId,
      companyName: company.companyName,
      standNumber: company.standNumber,
      arrivalStatus: company.arrivalStatus,
    })),
  })),
});

export const loadVenueDirectory = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const session = context.session;

    if (!session) {
      return emptyVenueDirectorySnapshot();
    }

    const actor = new AuthenticatedActor({
      id: session.user.id as AuthenticatedActor["id"],
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as AuthenticatedActor["role"],
    });

    const rooms = await serverRuntime.runPromise(
      Effect.gen(function*() {
        const venueService = yield* VenueService;

        return yield* venueService.listVenueRooms(actor);
      }).pipe(Effect.provide(VenueService.layer)),
    );

    return toVenueDirectorySnapshot(actor, rooms);
  });
