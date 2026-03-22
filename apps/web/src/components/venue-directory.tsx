type VenueDirectoryActorRole = "admin" | "check-in" | "company" | "student";
type VenueDirectoryCompanyArrivalStatus = "arrived" | "not-arrived";

export interface VenueDirectoryActorSnapshot {
  readonly name: string;
  readonly role: VenueDirectoryActorRole;
}

export interface VenueDirectoryCompanySnapshot {
  readonly companyId: string;
  readonly companyName: string;
  readonly standNumber: number;
  readonly arrivalStatus: VenueDirectoryCompanyArrivalStatus;
}

export interface VenueDirectoryRoomSnapshot {
  readonly id: string;
  readonly code: string;
  readonly companies: ReadonlyArray<VenueDirectoryCompanySnapshot>;
}

export interface VenueDirectorySnapshot {
  readonly actor: VenueDirectoryActorSnapshot | null;
  readonly rooms: ReadonlyArray<VenueDirectoryRoomSnapshot>;
}

const actorLabels: Record<VenueDirectoryActorRole, string> = {
  admin: "Admin view",
  "check-in": "Check-in view",
  company: "Company view",
  student: "Student view",
};

const arrivalLabels: Record<VenueDirectoryCompanyArrivalStatus, string> = {
  arrived: "Arrived",
  "not-arrived": "Not arrived",
};

export function VenueDirectoryPage({
  snapshot,
}: {
  readonly snapshot: VenueDirectorySnapshot;
}) {
  const totalCompanies = snapshot.rooms.reduce(
    (count, room) => count + room.companies.length,
    0,
  );
  const arrivedCompanies = snapshot.rooms.reduce(
    (count, room) =>
      count + room.companies.filter((company) => company.arrivalStatus === "arrived").length,
    0,
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8f3ea_0%,#f2eee7_52%,#ebe5dc_100%)] px-5 py-8 text-slate-900 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-black/10 bg-[radial-gradient(circle_at_top_left,rgba(186,230,253,0.4),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.92),rgba(241,245,249,0.78))] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_48%,rgba(15,23,42,0.06)_49%,transparent_50%,transparent_100%)] opacity-30" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-slate-500">
                Single-event fair directory
              </p>
              <div className="space-y-3">
                <h1
                  className="text-4xl leading-none sm:text-5xl"
                  style={{
                    fontFamily:
                      '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
                  }}
                >
                  Find the room, then the stand.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  The fair stays navigable room by room, with each company pinned to a stand and
                  its live arrival state left visible.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {snapshot.actor ? (
                <div className="rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  {actorLabels[snapshot.actor.role]}
                </div>
              ) : null}
              <div className="rounded-full border border-slate-900/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-50 shadow-sm">
                {snapshot.rooms.length} rooms
              </div>
              <div className="rounded-full border border-slate-900/10 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                {totalCompanies} companies
              </div>
              <div className="rounded-full border border-emerald-950/10 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 shadow-sm">
                {arrivedCompanies} arrived
              </div>
            </div>
          </div>
        </section>

        {snapshot.actor === null ? (
          <section className="rounded-[1.75rem] border border-dashed border-slate-900/15 bg-white/70 p-8 text-center shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
              Session required
            </p>
            <p
              className="mt-3 text-2xl text-slate-900"
              style={{
                fontFamily:
                  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
              }}
            >
              Sign in to inspect the fair floor.
            </p>
          </section>
        ) : null}

        {snapshot.actor !== null && snapshot.rooms.length === 0 ? (
          <section className="rounded-[1.75rem] border border-dashed border-slate-900/15 bg-white/70 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">No rooms yet</p>
            <p
              className="mt-3 text-2xl text-slate-900"
              style={{
                fontFamily:
                  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
              }}
            >
              Room assignments will appear here as soon as the fair floor is seeded.
            </p>
          </section>
        ) : null}

        {snapshot.rooms.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {snapshot.rooms.map((room) => (
              <article
                key={room.id}
                className="rounded-[1.75rem] border border-slate-900/10 bg-white/80 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4 border-b border-slate-900/8 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Room</p>
                    <h2 className="mt-2 font-mono text-3xl font-semibold tracking-[0.18em] text-slate-900">
                      {room.code}
                    </h2>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-600">
                    {room.companies.length} stand{room.companies.length === 1 ? "" : "s"}
                  </div>
                </div>

                {room.companies.length > 0 ? (
                  <div className="mt-4 grid gap-3">
                    {room.companies.map((company) => (
                      <div
                        key={company.companyId}
                        className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-slate-900/8 bg-slate-50/80 px-4 py-4"
                      >
                        <div className="space-y-2">
                          <p className="text-lg font-medium text-slate-900">{company.companyName}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                            Stand {company.standNumber}
                          </p>
                        </div>
                        <div
                          className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                            company.arrivalStatus === "arrived"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {arrivalLabels[company.arrivalStatus]}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No company placements in this room yet.</p>
                )}
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
