"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@project/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Skeleton } from "@project/ui/components/skeleton";
import {
  ArrowLeftIcon,
  Building2Icon,
  CircleAlertIcon,
  CompassIcon,
  MapPinnedIcon,
  RefreshCwIcon,
  SparklesIcon,
} from "lucide-react";
import type { VenueRoom } from "@project/domain";
import type React from "react";
import { useEffect, useState } from "react";

import { publicVenueMapAtom } from "@/lib/public-venue-atoms";
import {
  describePublishedVenueRoom,
  resolvePublishedVenueMapSelection,
  sortPublishedVenueMapPins,
  summarizePublishedVenueMap,
} from "@/lib/public-venue-map";

const toImageSource = (input: { readonly contentType: string; readonly contentsBase64: string }): string =>
  `data:${input.contentType};base64,${input.contentsBase64}`;

const arrivalBadgeVariant = (
  arrivalStatus: "arrived" | "not-arrived",
): React.ComponentProps<typeof Badge>["variant"] =>
  arrivalStatus === "arrived" ? "success" : "outline";

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
  const summary = AsyncResult.isSuccess(publishedVenueMapResult)
    ? summarizePublishedVenueMap(publishedVenueMapResult.value)
    : null;

  return (
    <main
      className="min-h-screen overflow-hidden bg-background px-6 py-8 text-foreground sm:px-8"
      style={{
        ["--font-heading" as string]: '"Fraunces", "Times New Roman", serif',
        ["--font-sans" as string]: '"Manrope", "Segoe UI", sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.2),transparent_58%)]" />
        <div className="absolute left-[-6rem] top-40 size-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-8rem] top-72 size-80 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col gap-6">
        <header className="grid gap-4 rounded-[2rem] border border-border/60 bg-card/75 p-6 shadow-sm backdrop-blur sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <Badge variant="outline" size="lg" className="rounded-full px-4">
              Public venue map
            </Badge>
            <div className="max-w-3xl space-y-3">
              <h1 className="font-heading text-4xl leading-none tracking-tight sm:text-5xl lg:text-6xl">
                Find the room.
                <br />
                See who is live there.
              </h1>
              <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                Explore the published event floor plan, open room pins, and inspect company placement
                plus arrival state before you head across the venue.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" size="lg" onClick={() => window.location.assign("/")}>
              <ArrowLeftIcon />
              Back to sign-in
            </Button>
            <Button variant="secondary" size="lg" onClick={() => refreshPublishedVenueMap()}>
              <RefreshCwIcon />
              Refresh map
            </Button>
          </div>
        </header>

        {AsyncResult.isInitial(publishedVenueMapResult) ? (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <Card className="overflow-hidden border-border/60 bg-card/85">
              <CardContent className="p-0">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="gap-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </CardContent>
            </Card>
          </section>
        ) : AsyncResult.isFailure(publishedVenueMapResult) ? (
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Venue map unavailable</AlertTitle>
            <AlertDescription>
              The published venue map could not be loaded. Refresh the page and try again.
            </AlertDescription>
          </Alert>
        ) : publishedVenueMapResult.value == null ? (
          <Card>
            <CardContent className="pt-6">
              <Empty className="rounded-[2rem] border border-dashed border-border/70 bg-background/70 p-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="size-14 rounded-3xl">
                    <MapPinnedIcon className="size-6" />
                  </EmptyMedia>
                  <EmptyTitle>No public map has been published yet</EmptyTitle>
                  <EmptyDescription>
                    Admin operations still need to publish the venue image and room pins before the
                    public map can be explored here.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={() => refreshPublishedVenueMap()}>
                    <RefreshCwIcon />
                    Check again
                  </Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-4">
                <Card className="border-border/60 bg-card/75">
                  <CardHeader className="gap-2">
                    <CardDescription>Pinned rooms</CardDescription>
                    <CardTitle className="font-heading text-3xl">{summary?.pinnedRoomCount ?? 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-border/60 bg-card/75">
                  <CardHeader className="gap-2">
                    <CardDescription>Placed companies</CardDescription>
                    <CardTitle className="font-heading text-3xl">{summary?.placedCompanyCount ?? 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-border/60 bg-card/75">
                  <CardHeader className="gap-2">
                    <CardDescription>Arrived</CardDescription>
                    <CardTitle className="font-heading text-3xl">{summary?.arrivedCompanyCount ?? 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-border/60 bg-card/75">
                  <CardHeader className="gap-2">
                    <CardDescription>Still pending</CardDescription>
                    <CardTitle className="font-heading text-3xl">{summary?.pendingCompanyCount ?? 0}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              <Card className="overflow-hidden border-border/60 bg-card/85 shadow-sm">
                <CardHeader className="gap-2 border-b border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)]">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <CompassIcon className="size-5" />
                    Interactive floor plan
                  </CardTitle>
                  <CardDescription>
                    Click any pinned room to inspect company placement and operational status.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      alt="Published event venue map"
                      className="block h-auto w-full"
                      src={toImageSource(publishedVenueMapResult.value.image)}
                    />

                    {sortedPins.map((pin) => {
                      const isSelected = pin.room.id === selectedPin?.room.id;

                      return (
                        <button
                          key={pin.room.id}
                          aria-label={`Open room ${pin.room.code}`}
                          className="group absolute -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: `${pin.xPercent}%`,
                            top: `${pin.yPercent}%`,
                          }}
                          type="button"
                          onClick={() => setSelectedRoomId(pin.room.id)}
                        >
                          <span
                            className={[
                              "flex size-11 items-center justify-center rounded-full border text-sm font-semibold shadow-lg transition",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-background/70 bg-background/90 text-foreground hover:scale-105 hover:bg-background",
                            ].join(" ")}
                          >
                            {pin.room.code}
                          </span>
                          <span
                            className={[
                              "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-1 text-xs shadow-sm transition",
                              isSelected
                                ? "border-primary/30 bg-primary/12 text-primary"
                                : "border-border/70 bg-card/90 text-muted-foreground opacity-0 group-hover:opacity-100",
                            ].join(" ")}
                          >
                            {pin.room.companies.length === 0
                              ? "Open room"
                              : `${pin.room.companies.length} ${pin.room.companies.length === 1 ? "company" : "companies"}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border/60 bg-card/85">
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Badge variant="secondary" size="lg" className="rounded-full px-3">
                        {selectedPin == null ? "No room selected" : `Room ${selectedPin.room.code}`}
                      </Badge>
                      <CardTitle className="font-heading text-3xl">
                        {selectedPin == null ? "Published pins will appear here" : `Room ${selectedPin.room.code}`}
                      </CardTitle>
                      <CardDescription>
                        {selectedPin == null
                          ? "Select a pin from the map to inspect placement details."
                          : describePublishedVenueRoom(selectedPin)}
                      </CardDescription>
                    </div>
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPinnedIcon className="size-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedPin == null ? null : selectedPin.room.companies.length === 0 ? (
                    <Empty className="items-start rounded-[1.5rem] border border-dashed border-border/70 bg-background/70 p-5 text-left">
                      <EmptyHeader className="items-start text-left">
                        <EmptyMedia variant="icon" className="size-12 rounded-2xl">
                          <SparklesIcon className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>No companies assigned here yet</EmptyTitle>
                        <EmptyDescription>
                          This room is pinned on the public map, but operations have not published any
                          company placement for it yet.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    selectedPin.room.companies.map((company) => (
                      <Card key={company.companyId} className="border-border/60 bg-background/70">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="font-medium">{company.companyName}</p>
                              <p className="text-sm text-muted-foreground">
                                Stand {company.standNumber} in room {selectedPin.room.code}
                              </p>
                            </div>
                            <Building2Icon className="mt-1 size-4 text-muted-foreground" />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">Stand {company.standNumber}</Badge>
                            <Badge variant={arrivalBadgeVariant(company.arrivalStatus)}>
                              {company.arrivalStatus === "arrived" ? "Arrived" : "Not arrived"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/85">
                <CardHeader>
                  <CardTitle className="text-base">Pinned rooms</CardTitle>
                  <CardDescription>Fast room selection for smaller screens and quick jumps.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {sortedPins.map((pin) => (
                    <button
                      key={pin.room.id}
                      className={[
                        "rounded-2xl border px-4 py-3 text-left transition",
                        pin.room.id === selectedPin?.room.id
                          ? "border-primary/40 bg-primary/8"
                          : "border-border/60 bg-background/70 hover:bg-accent/50",
                      ].join(" ")}
                      type="button"
                      onClick={() => setSelectedRoomId(pin.room.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">Room {pin.room.code}</span>
                        <Badge variant="secondary">
                          {pin.room.companies.length} {pin.room.companies.length === 1 ? "company" : "companies"}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
