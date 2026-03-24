"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Skeleton } from "@project/ui/components/skeleton";
import { CircleAlertIcon, MapPinnedIcon, RefreshCwIcon } from "lucide-react";
import type { VenueRoom } from "@project/domain";
import type React from "react";
import { useEffect, useState } from "react";

import { publicVenueMapAtom } from "@/lib/public-venue-atoms";
import {
  describePublishedVenueRoom,
  resolvePublishedVenueMapSelection,
  sortPublishedVenueMapPins,
} from "@/lib/public-venue-map";

const toImageSource = (input: { readonly contentType: string; readonly contentsBase64: string }): string =>
  `data:${input.contentType};base64,${input.contentsBase64}`;

export function PublicVenueMap(): React.ReactElement {
  const publishedVenueMapResult = useAtomValue(publicVenueMapAtom);
  const refreshPublishedVenueMap = useAtomRefresh(publicVenueMapAtom);
  const [selectedRoomId, setSelectedRoomId] = useState<VenueRoom["id"] | null>(null);

  const sortedPins = AsyncResult.isSuccess(publishedVenueMapResult)
    ? sortPublishedVenueMapPins(publishedVenueMapResult.value)
    : [];

  useEffect(() => {
    setSelectedRoomId((current) =>
      resolvePublishedVenueMapSelection(sortedPins, current),
    );
  }, [sortedPins]);

  const selectedPin = sortedPins.find((pin) => pin.room.id === selectedRoomId) ?? sortedPins[0] ?? null;

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[var(--s2ee-canvas)] font-mono text-foreground">
      <header className="flex items-center justify-between border-b bg-[var(--s2ee-surface-soft)] px-6 py-3 [border-color:var(--s2ee-border)]">
        <div className="flex items-center gap-8">
          <span className="text-sm font-bold tracking-[-0.04em] text-primary">S2EE Edition 16</span>
          <nav className="hidden items-center gap-6 md:flex">
            <a className="text-sm uppercase tracking-[0.12em] text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary" href="/">
              Public entry
            </a>
            <a className="border-b-2 border-primary pb-1 text-sm font-bold uppercase tracking-[0.12em] text-primary" href="/map">
              Venue map
            </a>
            <a className="text-sm uppercase tracking-[0.12em] text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary" href="/auth/sign-in">
              Sign in
            </a>
          </nav>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 border bg-[var(--s2ee-surface)] px-3 py-1 [border-color:var(--s2ee-border)]">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-900">
              Live map active
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col">
        {AsyncResult.isInitial(publishedVenueMapResult) ? (
          <section className="grid min-h-[calc(100dvh-57px)] gap-0 md:grid-cols-[16rem_minmax(0,1fr)_22rem]">
            <div className="space-y-2 border-r bg-[var(--s2ee-surface-soft)] p-6 [border-color:var(--s2ee-border)]">
              <Skeleton className="h-6 rounded-none" />
              <Skeleton className="h-14 rounded-none" />
              <Skeleton className="h-14 rounded-none" />
              <Skeleton className="h-14 rounded-none" />
            </div>
            <div className="border-r bg-[var(--s2ee-surface-soft)] p-8 [border-color:var(--s2ee-border)]">
              <Skeleton className="h-full min-h-[28rem] w-full rounded-none" />
            </div>
            <div className="space-y-3 bg-[var(--s2ee-surface)] p-8">
              <Skeleton className="h-8 rounded-none" />
              <Skeleton className="h-20 rounded-none" />
              <Skeleton className="h-20 rounded-none" />
            </div>
          </section>
        ) : AsyncResult.isFailure(publishedVenueMapResult) ? (
          <div className="p-6">
            <Alert variant="error">
              <CircleAlertIcon className="size-4" />
              <AlertTitle>Venue map unavailable</AlertTitle>
              <AlertDescription>
                The published venue map could not be loaded. Refresh the page and try again.
              </AlertDescription>
            </Alert>
          </div>
        ) : publishedVenueMapResult.value == null ? (
          <div className="p-6">
            <div className="border bg-[var(--s2ee-surface)] p-6 [border-color:var(--s2ee-border)]">
              <Empty className="border border-dashed p-8 [border-color:var(--s2ee-border)]">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="size-14 rounded-none">
                    <MapPinnedIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No public map has been published yet</EmptyTitle>
                  <EmptyDescription>
                    Publish the venue image and room pins before this route can be used.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <button
                    className="inline-flex min-h-12 items-center justify-center border px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)]"
                    type="button"
                    onClick={() => refreshPublishedVenueMap()}
                  >
                    Check again
                  </button>
                </EmptyContent>
              </Empty>
            </div>
          </div>
        ) : (
          <section className="grid min-h-[calc(100dvh-57px)] gap-0 md:grid-cols-[16rem_minmax(0,1fr)_24rem]">
            <aside className="s2ee-fade-up border-r bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)]">
              <div className="border-b px-6 py-6 [border-color:var(--s2ee-border)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Room index
                </p>
              </div>
              <div className="divide-y [divide-color:var(--s2ee-border)]">
                {sortedPins.map((pin) => {
                  const isSelected = pin.room.id === selectedPin?.room.id;

                  return (
                    <button
                      key={pin.room.id}
                      className={[
                        "flex w-full items-center justify-between px-6 py-4 text-left text-sm transition-colors",
                        isSelected
                          ? "bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] text-primary"
                          : "bg-[var(--s2ee-surface)] text-[color:var(--s2ee-soft-foreground)] hover:bg-[var(--s2ee-canvas)]",
                      ].join(" ")}
                      type="button"
                      onClick={() => setSelectedRoomId(pin.room.id)}
                    >
                      <span className="font-semibold tracking-[-0.04em]">ROOM {pin.room.code}</span>
                      <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                        {pin.room.companies.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="s2ee-fade-up relative bg-[var(--s2ee-surface-soft)] p-8 md:border-r [border-color:var(--s2ee-border)]">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                    Published canvas
                  </p>
                  <p className="text-sm text-[color:var(--s2ee-soft-foreground)]">
                    Select a room from the index or the plan to update the inspector.
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 border bg-[var(--s2ee-surface)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white [border-color:var(--s2ee-border)]"
                  type="button"
                  onClick={() => refreshPublishedVenueMap()}
                >
                  Refresh
                  <RefreshCwIcon className="size-3.5" />
                </button>
              </div>

              <div className="relative h-full min-h-[28rem] overflow-hidden border bg-[var(--s2ee-surface)] shadow-sm [border-color:var(--s2ee-border)]">
                <img
                  alt="Published event venue map"
                  className="block h-full w-full object-contain p-6"
                  src={toImageSource(publishedVenueMapResult.value.image)}
                />

                <div className="s2ee-terminal-grid pointer-events-none absolute inset-0 opacity-10" />

                {sortedPins.map((pin) => {
                  const isSelected = pin.room.id === selectedPin?.room.id;

                  return (
                    <button
                      key={pin.room.id}
                      aria-label={`Open room ${pin.room.code}`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-105"
                      style={{
                        left: `${pin.xPercent}%`,
                        top: `${pin.yPercent}%`,
                      }}
                      type="button"
                      onClick={() => setSelectedRoomId(pin.room.id)}
                    >
                      <span
                        className={[
                          "flex min-h-11 min-w-11 items-center justify-center border px-3 text-[11px] font-semibold uppercase tracking-[0.16em]",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_6px_color-mix(in_srgb,var(--color-primary)_14%,transparent)]"
                            : "border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] text-foreground",
                        ].join(" ")}
                      >
                        {pin.room.code}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <aside className="s2ee-fade-up bg-[var(--s2ee-surface)]">
              <div className="space-y-2 border-b px-8 py-8 [border-color:var(--s2ee-border)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Inspector
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.07em]">
                  {selectedPin == null ? "NO ROOM" : `ROOM ${selectedPin.room.code}`}
                </h2>
                <p className="text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                  {selectedPin == null
                    ? "Select a room from the index or map plane."
                    : describePublishedVenueRoom(selectedPin)}
                </p>
              </div>

              <div className="space-y-4 bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_45%,white)] px-8 py-8">
                {selectedPin == null ? null : selectedPin.room.companies.length === 0 ? (
                  <Empty className="items-start border border-dashed p-5 text-left [border-color:var(--s2ee-border)]">
                    <EmptyHeader className="items-start text-left">
                      <EmptyTitle>No companies assigned</EmptyTitle>
                      <EmptyDescription>
                        This room is published on the map, but no company placement has been attached yet.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-3">
                    {selectedPin.room.companies.map((company) => (
                      <div key={company.companyId} className="border bg-[var(--s2ee-surface)] px-4 py-4 [border-color:var(--s2ee-border)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold tracking-[-0.04em]">{company.companyName}</p>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                              Stand {company.standNumber}
                            </p>
                          </div>
                          <span
                            className={[
                              "text-[11px] uppercase tracking-[0.18em]",
                              company.arrivalStatus === "arrived"
                                ? "text-primary"
                                : "text-[color:var(--s2ee-muted-foreground)]",
                            ].join(" ")}
                          >
                            {company.arrivalStatus === "arrived" ? "Arrived" : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
