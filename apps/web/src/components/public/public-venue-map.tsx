"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@project/ui/components/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import { Skeleton } from "@project/ui/components/skeleton";
import {
  CircleAlertIcon,
  ListFilterIcon,
  MapPinnedIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import type { VenueRoom } from "@project/domain";
import type React from "react";
import { useDeferredValue, useEffect, useState } from "react";

import { publicVenueMapAtom } from "@/lib/public-venue-atoms";
import {
  describePublishedVenueRoom,
  filterPublishedVenueMapPins,
  resolvePublishedVenueMapSelection,
  sortPublishedVenueMapPins,
} from "@/lib/public-venue-map";

const toImageSource = (input: { readonly contentType: string; readonly contentsBase64: string }): string =>
  `data:${input.contentType};base64,${input.contentsBase64}`;

export function PublicVenueMap(): React.ReactElement {
  const publishedVenueMapResult = useAtomValue(publicVenueMapAtom);
  const refreshPublishedVenueMap = useAtomRefresh(publicVenueMapAtom);
  const [selectedRoomId, setSelectedRoomId] = useState<VenueRoom["id"] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRoomDrawerOpen, setIsRoomDrawerOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const sortedPins = AsyncResult.isSuccess(publishedVenueMapResult)
    ? sortPublishedVenueMapPins(publishedVenueMapResult.value)
    : [];
  const visiblePins = filterPublishedVenueMapPins(sortedPins, deferredSearchQuery);

  useEffect(() => {
    setSelectedRoomId((current) =>
      resolvePublishedVenueMapSelection(visiblePins, current),
    );
  }, [visiblePins]);

  const selectedPin = visiblePins.find((pin) => pin.room.id === selectedRoomId) ?? visiblePins[0] ?? null;

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[var(--s2ee-canvas)] font-mono text-foreground">
      <header className="flex items-center justify-between border-b bg-[var(--s2ee-surface-soft)] px-6 py-3 [border-color:var(--s2ee-border)]">
        <div className="flex items-center gap-8">
          <span className="text-sm font-bold tracking-[-0.04em] text-primary">S2EE 16e edition</span>
          <nav className="hidden items-center gap-6 md:flex">
            <a className="text-sm uppercase tracking-[0.12em] text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary" href="/">
              Accueil
            </a>
            <a className="border-b-2 border-primary pb-1 text-sm font-bold uppercase tracking-[0.12em] text-primary" href="/map">
              Plan du salon
            </a>
            <a className="text-sm uppercase tracking-[0.12em] text-[color:var(--s2ee-muted-foreground)] transition-colors hover:text-primary" href="/auth/sign-in">
              Se connecter
            </a>
          </nav>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 border bg-[var(--s2ee-surface)] px-3 py-1 [border-color:var(--s2ee-border)]">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-900">
              Plan public
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col">
        {AsyncResult.isInitial(publishedVenueMapResult) ? (
          <section className="grid min-h-[calc(100dvh-57px)] gap-0 md:grid-cols-[16rem_minmax(0,1fr)_22rem]">
            <div className="hidden space-y-2 border-r bg-[var(--s2ee-surface-soft)] p-6 [border-color:var(--s2ee-border)] md:block">
              <Skeleton className="h-6 rounded-none" />
              <Skeleton className="h-14 rounded-none" />
              <Skeleton className="h-14 rounded-none" />
              <Skeleton className="h-14 rounded-none" />
            </div>
            <div className="border-r bg-[var(--s2ee-surface-soft)] p-5 md:p-8 [border-color:var(--s2ee-border)]">
              <Skeleton className="h-full min-h-[28rem] w-full rounded-none" />
            </div>
            <div className="space-y-3 bg-[var(--s2ee-surface)] p-6 md:p-8">
              <Skeleton className="h-8 rounded-none" />
              <Skeleton className="h-20 rounded-none" />
              <Skeleton className="h-20 rounded-none" />
            </div>
          </section>
        ) : AsyncResult.isFailure(publishedVenueMapResult) ? (
          <div className="p-6">
            <Alert variant="error">
              <CircleAlertIcon className="size-4" />
              <AlertTitle>Plan indisponible</AlertTitle>
              <AlertDescription>
                Le plan du salon n&apos;a pas pu etre charge. Rechargez la page puis reessayez.
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
                  <EmptyTitle>Aucun plan n&apos;a encore ete publie</EmptyTitle>
                  <EmptyDescription>
                    Le plan du salon sera disponible ici des sa publication.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <button
                    className="inline-flex min-h-12 items-center justify-center border px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)]"
                    type="button"
                    onClick={() => refreshPublishedVenueMap()}
                  >
                    Reessayer
                  </button>
                </EmptyContent>
              </Empty>
            </div>
          </div>
        ) : (
          <section className="grid min-h-[calc(100dvh-57px)] gap-0 md:grid-cols-[16rem_minmax(0,1fr)_24rem]">
            <aside className="hidden border-r bg-[var(--s2ee-surface-soft)] [border-color:var(--s2ee-border)] md:block">
              <div className="border-b px-6 py-6 [border-color:var(--s2ee-border)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Salles
                </p>
              </div>
              <div className="border-b px-4 py-4 [border-color:var(--s2ee-border)]">
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                  <Input
                    autoComplete="off"
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] pl-9 shadow-none"
                    id="public-map-room-search"
                    name="public-map-room-search"
                    onChange={(event) => {
                      setSearchQuery(event.currentTarget.value);
                    }}
                    placeholder="Salle, entreprise ou stand"
                    value={searchQuery}
                  />
                </div>
              </div>
              {visiblePins.length === 0 ? (
                <div className="p-6">
                  <Empty className="items-start text-left">
                    <EmptyHeader className="items-start text-left">
                      <EmptyMedia variant="icon" className="rounded-none">
                        <SearchIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>Aucune salle ne correspond</EmptyTitle>
                      <EmptyDescription>
                        Modifiez la recherche pour retrouver une salle.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div className="max-h-[calc(100dvh-180px)] overflow-y-auto divide-y [divide-color:var(--s2ee-border)]">
                  {visiblePins.map((pin) => {
                    const isSelected = pin.room.id === selectedPin?.room.id;

                    return (
                      <button
                        key={pin.room.id}
                        className={[
                          "flex w-full items-center justify-between px-6 py-4 text-left text-sm transition-colors [content-visibility:auto]",
                          isSelected
                            ? "bg-[color:color-mix(in_srgb,var(--color-primary)_8%,white)] text-primary"
                            : "bg-[var(--s2ee-surface)] text-[color:var(--s2ee-soft-foreground)] hover:bg-[var(--s2ee-canvas)]",
                        ].join(" ")}
                        type="button"
                        onClick={() => setSelectedRoomId(pin.room.id)}
                      >
                        <span className="font-semibold tracking-[-0.04em]">SALLE {pin.room.code}</span>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                          {pin.room.companies.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </aside>

            <div className="relative bg-[var(--s2ee-surface-soft)] p-5 md:border-r md:p-8 [border-color:var(--s2ee-border)]">
              <div className="mb-4 flex items-center gap-2 md:hidden">
                <Button
                  className="min-w-0 flex-1 rounded-none"
                  onClick={() => setIsRoomDrawerOpen(true)}
                  type="button"
                  variant="outline"
                >
                  <ListFilterIcon className="size-4" />
                  <span className="truncate">
                    {selectedPin == null ? "Choisir une salle" : `Salle ${selectedPin.room.code}`}
                  </span>
                </Button>
                <Button className="rounded-none" onClick={() => refreshPublishedVenueMap()} type="button" variant="outline">
                  <RefreshCwIcon className="size-4" />
                  Actualiser
                </Button>
              </div>

              {selectedPin != null ? (
                <div className="mb-4 border border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] p-4 md:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                        Salle
                      </p>
                      <h2 className="text-xl font-black tracking-[-0.07em] text-slate-900">
                        {selectedPin.room.code}
                      </h2>
                      <p className="text-sm leading-6 text-[color:var(--s2ee-soft-foreground)]">
                        {describePublishedVenueRoom(selectedPin)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                      {selectedPin.room.companies.length}
                    </span>
                  </div>
                </div>
              ) : deferredSearchQuery.length > 0 ? (
                <div className="mb-4 border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface)] p-4 md:hidden">
                  <p className="text-sm leading-6 text-[color:var(--s2ee-soft-foreground)]">
                    Aucune salle ne correspond a cette recherche.
                  </p>
                </div>
              ) : null}

              <div className="mb-6 hidden items-center justify-between gap-4 md:flex">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                    Plan
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 border bg-[var(--s2ee-surface)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-soft-foreground)] transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white [border-color:var(--s2ee-border)]"
                  type="button"
                  onClick={() => refreshPublishedVenueMap()}
                >
                  Actualiser
                  <RefreshCwIcon className="size-3.5" />
                </button>
              </div>

              <div className="relative min-h-[24rem] overflow-hidden border bg-[var(--s2ee-surface)] shadow-sm md:min-h-[28rem] [border-color:var(--s2ee-border)]">
                <img
                  alt="Plan du salon"
                  className="block h-full w-full object-contain p-4 md:p-6"
                  src={toImageSource(publishedVenueMapResult.value.image)}
                />

                <div className="s2ee-terminal-grid pointer-events-none absolute inset-0 opacity-10" />

                {visiblePins.map((pin) => {
                  const isSelected = pin.room.id === selectedPin?.room.id;

                  return (
                    <button
                      key={pin.room.id}
                      aria-label={`Ouvrir la salle ${pin.room.code}`}
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

            <aside className="bg-[var(--s2ee-surface)]">
              <div className="space-y-2 border-b px-6 py-6 md:px-8 md:py-8 [border-color:var(--s2ee-border)]">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Salle
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.07em]">
                  {selectedPin == null ? "AUCUNE SALLE" : `SALLE ${selectedPin.room.code}`}
                </h2>
                <p className="text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                  {selectedPin == null
                    ? deferredSearchQuery.length > 0
                      ? "Aucune salle ne correspond a cette recherche."
                      : "Selectionnez une salle."
                    : describePublishedVenueRoom(selectedPin)}
                </p>
              </div>

              <div className="space-y-4 bg-[color:color-mix(in_srgb,var(--s2ee-surface-soft)_45%,white)] px-6 py-6 md:px-8 md:py-8">
                {selectedPin == null ? null : selectedPin.room.companies.length === 0 ? (
                  <Empty className="items-start border border-dashed p-5 text-left [border-color:var(--s2ee-border)]">
                    <EmptyHeader className="items-start text-left">
                      <EmptyTitle>Aucune entreprise</EmptyTitle>
                      <EmptyDescription>
                        Aucune entreprise n&apos;est encore associee a cette salle.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="space-y-3">
                    {selectedPin.room.companies.map((company) => (
                      <div key={company.companyId} className="border bg-[var(--s2ee-surface)] px-4 py-4 [border-color:var(--s2ee-border)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-semibold tracking-[-0.04em]">{company.companyName}</p>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                              Stand {company.standNumber}
                            </p>
                          </div>
                          <span
                            className={[
                              "shrink-0 text-[11px] uppercase tracking-[0.18em]",
                              company.arrivalStatus === "arrived"
                                ? "text-primary"
                                : "text-[color:var(--s2ee-muted-foreground)]",
                            ].join(" ")}
                          >
                            {company.arrivalStatus === "arrived" ? "Arrivee" : "En attente"}
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

      <Drawer onOpenChange={setIsRoomDrawerOpen} open={isRoomDrawerOpen} position="bottom">
        <DrawerPopup
          className="max-h-[85dvh] border bg-[var(--s2ee-surface)] p-0 font-mono [border-color:var(--s2ee-border)] md:hidden"
          showBar
        >
          <DrawerHeader className="border-b bg-[var(--s2ee-surface-soft)] px-5 py-5 [border-color:var(--s2ee-border)]">
            <DrawerTitle className="text-xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
              Salles
            </DrawerTitle>
          </DrawerHeader>
          <DrawerPanel className="p-0">
            <div className="border-b px-5 py-4 [border-color:var(--s2ee-border)]">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  autoComplete="off"
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  id="public-map-room-search-mobile"
                  name="public-map-room-search-mobile"
                  onChange={(event) => {
                    setSearchQuery(event.currentTarget.value);
                  }}
                  placeholder="Salle, entreprise ou stand"
                  value={searchQuery}
                />
              </div>
            </div>
            {visiblePins.length === 0 ? (
              <div className="p-5">
                <Empty className="items-start text-left">
                  <EmptyHeader className="items-start text-left">
                    <EmptyTitle>Aucune salle ne correspond</EmptyTitle>
                    <EmptyDescription>
                      Modifiez la recherche pour retrouver une salle.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </div>
            ) : (
              <div className="max-h-[60dvh] overflow-y-auto divide-y [divide-color:var(--s2ee-border)]">
                {visiblePins.map((pin) => (
                  <button
                    key={pin.room.id}
                    className="flex w-full items-center justify-between bg-[var(--s2ee-surface)] px-5 py-4 text-left text-sm [content-visibility:auto]"
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(pin.room.id);
                      setIsRoomDrawerOpen(false);
                    }}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold tracking-[-0.04em] text-slate-900">
                        SALLE {pin.room.code}
                      </p>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                        {pin.room.companies.length} entreprise{pin.room.companies.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-primary">
                      Voir
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DrawerPanel>
        </DrawerPopup>
      </Drawer>
    </main>
  );
}
