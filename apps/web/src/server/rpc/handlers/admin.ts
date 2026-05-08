import { AdminRpcGroup, CurrentActor } from "@project/rpc";
import { Effect, Option } from "effect";

import { AdminService } from "../../services/admin-service";

export const makeAdminRpcHandlers = Effect.gen(function*() {
  const adminService = yield* AdminService;

  return AdminRpcGroup.of({
    listAdminCompanyLedger: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminCompanyLedger(actor);
      }),
    listAdminInterviewLedger: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminInterviewLedger(actor);
      }),
    listAdminAccessLedger: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminAccessLedger(actor);
      }),
    listAdminZones: () =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.listAdminZones(actor);
      }),
    changeAdminUserRole: ({ userId, role }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.changeAdminUserRole({
          actor,
          userId,
          role,
        });
      }),
    createAdminCompanyAccount: ({ companyName, email, password, logoUrl, zoneCode, roomCode }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.createAdminCompanyAccount({
          actor,
          companyName,
          email,
          password,
          logoUrl,
          zoneCode,
          roomCode,
        });
      }),
    updateAdminCompany: ({ companyId, name, email, password, logoUrl, zoneCode, roomCode }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.updateAdminCompany({
          actor,
          companyId,
          name: name ? Option.some(name) : Option.none(),
          email: email ? Option.some(email) : Option.none(),
          password: password ? Option.some(password) : Option.none(),
          logoUrl: logoUrl ? Option.some(logoUrl) : Option.none(),
          zoneCode: zoneCode ? Option.some(zoneCode) : Option.none(),
          roomCode: roomCode ? Option.some(roomCode) : Option.none(),
        });
      }),
    deleteAdminCompany: ({ companyId }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.deleteAdminCompany({
          actor,
          companyId,
        });
      }),
    createAdminZone: ({ code, label, latitude, longitude }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.createAdminZone({
          actor,
          code,
          label,
          latitude,
          longitude,
        });
      }),
    updateAdminZone: ({ zoneId, code, label, latitude, longitude }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.updateAdminZone({
          actor,
          zoneId,
          code,
          label,
          latitude,
          longitude,
        });
      }),
    deleteAdminZone: ({ zoneId }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.deleteAdminZone({
          actor,
          zoneId,
        });
      }),
    importAdminCompaniesCsv: ({ csvContents }) =>
      Effect.gen(function*() {
        const actor = yield* CurrentActor;

        return yield* adminService.importAdminCompaniesCsv({
          actor,
          csvContents,
        });
      }),
  });
});
