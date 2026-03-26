"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button, buttonVariants } from "@project/ui/components/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import { Label } from "@project/ui/components/label";
import { Link } from "@tanstack/react-router";
import {
  BadgeCheckIcon,
  Building2Icon,
  CircleAlertIcon,
  MapPinnedIcon,
} from "lucide-react";
import type React from "react";
import { startTransition, useState } from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  formatAdminMutationError,
  useAdminPublishedVenueMapState,
  useAdminVenueRoomsState,
} from "@/lib/admin-page-data";
import {
  adminWorkspaceAtoms,
  adminWorkspaceReactivity,
} from "@/lib/admin-atoms";
import { buildVenueMapRoomRows } from "@/lib/admin-map";

const toImageSource = (input: { readonly contentType: string; readonly contentsBase64: string }): string =>
  `data:${input.contentType};base64,${input.contentsBase64}`;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Impossible de lire l'image selectionnee."));
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Le fichier selectionne ne peut pas etre utilise."));
        return;
      }

      resolve(reader.result);
    };

    reader.readAsDataURL(file);
  });

export function AdminMapPage(): React.ReactElement {
  const publishedVenueMapState = useAdminPublishedVenueMapState();
  const venueRoomsState = useAdminVenueRoomsState();
  const refreshPublishedVenueMap = useAtomRefresh(adminWorkspaceAtoms.publishedVenueMap);
  const refreshVenueRooms = useAtomRefresh(adminWorkspaceAtoms.venueRooms);
  const publishVenueMap = useAtomSet(adminWorkspaceAtoms.publishVenueMap, {
    mode: "promise",
  });
  const clearPublishedVenueMap = useAtomSet(adminWorkspaceAtoms.clearPublishedVenueMap, {
    mode: "promise",
  });
  const [selectedVenueMapFile, setSelectedVenueMapFile] = useState<File | null>(null);
  const [venueMapFileInputResetKey, setVenueMapFileInputResetKey] = useState(0);
  const [pendingVenueActionId, setPendingVenueActionId] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  const venueRooms = venueRoomsState.kind === "success" ? venueRoomsState.value : [];
  const publishedVenueMap = publishedVenueMapState.kind === "success" ? publishedVenueMapState.value : null;
  const venueMapRoomRows = buildVenueMapRoomRows(venueRooms, publishedVenueMap);
  const publishedVenueMapImageSrc =
    publishedVenueMap == null ? null : toImageSource(publishedVenueMap.image);
  const pinnedRoomCount = venueMapRoomRows.filter((entry) => entry.pin != null).length;
  const unpinnedRoomCount = venueMapRoomRows.length - pinnedRoomCount;

  const refreshMapPage = () => {
    refreshPublishedVenueMap();
    refreshVenueRooms();
  };

  const publishSelectedVenueMap = async () => {
    if (selectedVenueMapFile == null) {
      setWorkspaceError("Choisissez une image avant de publier le plan.");
      return;
    }

    if (!selectedVenueMapFile.type.startsWith("image/")) {
      setWorkspaceError("Le plan doit etre une image.");
      return;
    }

    setPendingVenueActionId("map:publish");
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      const dataUrl = await readFileAsDataUrl(selectedVenueMapFile);
      const [metadata, contentsBase64] = dataUrl.split(",", 2);
      const contentType = metadata?.match(/^data:(.+);base64$/)?.[1] ?? selectedVenueMapFile.type;

      if (!contentsBase64 || contentsBase64.trim().length === 0) {
        throw new Error("Le fichier selectionne ne contient pas de donnees utilisables.");
      }

      await publishVenueMap({
        payload: {
          fileName: selectedVenueMapFile.name,
          contentType,
          contentsBase64,
        },
        reactivityKeys: {
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      refreshMapPage();
      setSelectedVenueMapFile(null);
      setVenueMapFileInputResetKey((current) => current + 1);
      startTransition(() => {
        setWorkspaceMessage(`${selectedVenueMapFile.name} publie comme plan public.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const resetPublishedVenueMap = async () => {
    setPendingVenueActionId("map:clear");
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await clearPublishedVenueMap({
        payload: undefined,
        reactivityKeys: {
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      refreshMapPage();
      startTransition(() => {
        setWorkspaceMessage("Plan public retire.");
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        actions={
          <Button onClick={refreshMapPage} type="button" variant="outline">
            Actualiser
          </Button>
        }
        description=""
        eyebrow="Admin"
        title="Plan"
      />

      {workspaceMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Plan mis a jour</AlertTitle>
          <AlertDescription>{workspaceMessage}</AlertDescription>
        </Alert>
      ) : null}

      {workspaceError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Echec de mise a jour</AlertTitle>
          <AlertDescription>{workspaceError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Plan public
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-map-upload">Image du plan</Label>
              <Input
                accept="image/*"
                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                id="venue-map-upload"
                key={venueMapFileInputResetKey}
                onChange={(event) => {
                  setSelectedVenueMapFile(event.currentTarget.files?.[0] ?? null);
                }}
                type="file"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={pendingVenueActionId === "map:publish"}
                onClick={() => {
                  void publishSelectedVenueMap();
                }}
                type="button"
              >
                {pendingVenueActionId === "map:publish" ? "Publication..." : "Publier le plan"}
              </Button>
              <Button
                disabled={publishedVenueMap == null || pendingVenueActionId === "map:clear"}
                onClick={() => {
                  void resetPublishedVenueMap();
                }}
                type="button"
                variant="ghost"
              >
                {pendingVenueActionId === "map:clear" ? "Suppression..." : "Retirer le plan"}
              </Button>
            </div>
          </div>

          {publishedVenueMapState.kind === "loading" ? <AdminLoadingPanel /> : null}
          {publishedVenueMapState.kind === "failure" ? (
            <AdminFailurePanel
              description={publishedVenueMapState.message}
              title="Plan indisponible"
            />
          ) : null}
          {publishedVenueMapState.kind === "success" && publishedVenueMap == null ? (
            <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
              <EmptyHeader>
                <EmptyMedia className="rounded-none" variant="icon">
                  <MapPinnedIcon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucun plan publie</EmptyTitle>
                <EmptyDescription>
                  Publiez d'abord l'image du plan.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          {publishedVenueMap != null ? (
            <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4">
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                {publishedVenueMap.image.fileName}
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                {publishedVenueMap.pins.length} repere
                {publishedVenueMap.pins.length === 1 ? "" : "s"} publie
                {publishedVenueMap.pins.length === 1 ? "" : "s"}.
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Etat du plan
              </p>
            </div>
            <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
              {[
                ["Salles", venueMapRoomRows.length],
                ["Reperees", pinnedRoomCount],
                ["Sans repere", unpinnedRoomCount],
              ].map(([label, value]) => (
                <div className="bg-white p-5" key={label}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                    {label}
                  </p>
                  <p className="mt-4 text-4xl font-black tracking-[-0.08em] text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
            <div className="space-y-3">
              {venueRoomsState.kind === "loading" ? <AdminLoadingPanel /> : null}
              {venueRoomsState.kind === "failure" ? (
                <AdminFailurePanel
                  description={venueRoomsState.message}
                  title="Salles indisponibles"
                />
              ) : null}
              {venueRoomsState.kind === "success" && venueMapRoomRows.length === 0 ? (
                <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                  <EmptyHeader>
                    <EmptyMedia className="rounded-none" variant="icon">
                      <Building2Icon className="size-5" />
                    </EmptyMedia>
                    <EmptyTitle>Aucune salle</EmptyTitle>
                    <EmptyDescription>
                      Creez d'abord les salles.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
              {venueRoomsState.kind === "success" && venueMapRoomRows.length > 0 ? (
                <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                  {venueMapRoomRows.map((entry) => {
                    return (
                      <div className="bg-white p-4" key={entry.room.id}>
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                                {entry.room.code}
                              </p>
                              <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                                {entry.room.companies.length === 0
                                  ? "Aucune entreprise."
                                  : entry.room.companies.length === 1
                                    ? "1 entreprise."
                                    : `${entry.room.companies.length} entreprises.`}
                              </p>
                            </div>
                            <Badge variant={entry.pin ? "success" : "outline"}>
                              {entry.pin ? "Reperee" : "Sans repere"}
                            </Badge>
                          </div>
                          {entry.room.companies.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {entry.room.companies.map((company) => (
                                <Badge key={company.companyId} variant="outline">
                                  {company.companyName} · Stand {company.standNumber}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              {publishedVenueMap != null ? (
                <div className="relative overflow-hidden border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)]">
                  <img
                    alt="Apercu du plan"
                    className="block max-h-[760px] w-full object-contain"
                    src={publishedVenueMapImageSrc ?? undefined}
                  />
                  {publishedVenueMap.pins.map((pin) => (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 border border-[var(--s2ee-border)] bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900"
                      key={pin.room.id}
                      style={{
                        left: `${pin.xPercent}%`,
                        top: `${pin.yPercent}%`,
                      }}
                    >
                      {pin.room.code}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-80 place-items-center border border-dashed border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-6 text-center text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Publiez un plan pour afficher les reperes.
                </div>
              )}
              <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                <div className="mt-4">
                  <Link className={buttonVariants({ variant: "outline" })} to="/admin/venue">
                    Ouvrir Salles
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
