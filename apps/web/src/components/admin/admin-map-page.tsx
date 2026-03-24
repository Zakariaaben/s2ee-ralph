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
      reject(new Error("The selected map image could not be read."));
    };
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected map image did not produce uploadable contents."));
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
      setWorkspaceError("Choose a venue map image before publishing.");
      return;
    }

    if (!selectedVenueMapFile.type.startsWith("image/")) {
      setWorkspaceError("The venue map must be an image file.");
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
        throw new Error("The selected map image did not contain publishable contents.");
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
        setWorkspaceMessage(`${selectedVenueMapFile.name} published as the public map.`);
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
        setWorkspaceMessage("Published venue map cleared.");
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
            Refresh
          </Button>
        }
        description="Publish the public venue image and align room pins to the room registry. General logistics stay on the venue page."
        eyebrow="Admin map"
        title="Public venue map publication"
      />

      {workspaceMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Map update saved</AlertTitle>
          <AlertDescription>{workspaceMessage}</AlertDescription>
        </Alert>
      ) : null}

      {workspaceError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Map update failed</AlertTitle>
          <AlertDescription>{workspaceError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Published map
              </p>
              <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                Upload the single public map image, then keep room pins aligned with the current room
                registry.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue-map-upload">Map image</Label>
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
              <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                Re-publishing replaces the current image while keeping existing room pins in place.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                disabled={pendingVenueActionId === "map:publish"}
                onClick={() => {
                  void publishSelectedVenueMap();
                }}
                type="button"
              >
                {pendingVenueActionId === "map:publish" ? "Publishing..." : "Publish map"}
              </Button>
              <Button
                disabled={publishedVenueMap == null || pendingVenueActionId === "map:clear"}
                onClick={() => {
                  void resetPublishedVenueMap();
                }}
                type="button"
                variant="ghost"
              >
                {pendingVenueActionId === "map:clear" ? "Clearing..." : "Clear map"}
              </Button>
            </div>
          </div>

          {publishedVenueMapState.kind === "loading" ? <AdminLoadingPanel /> : null}
          {publishedVenueMapState.kind === "failure" ? (
            <AdminFailurePanel
              description={publishedVenueMapState.message}
              title="Published map unavailable"
            />
          ) : null}
          {publishedVenueMapState.kind === "success" && publishedVenueMap == null ? (
            <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
              <EmptyHeader>
                <EmptyMedia className="rounded-none" variant="icon">
                  <MapPinnedIcon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No public map published yet</EmptyTitle>
                <EmptyDescription>
                  Upload the venue image first, then place room pins from the venue page.
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
                {publishedVenueMap.pins.length} room pin
                {publishedVenueMap.pins.length === 1 ? "" : "s"} currently published.
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                Publication status
              </p>
              <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                Keep the public artifact stable here. Room placement and pin alignment now happen from
                the tabbed venue workflow.
              </p>
            </div>
            <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
              {[
                ["Rooms", venueMapRoomRows.length],
                ["Pinned", pinnedRoomCount],
                ["Unpinned", unpinnedRoomCount],
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
                  title="Venue rooms unavailable"
                />
              ) : null}
              {venueRoomsState.kind === "success" && venueMapRoomRows.length === 0 ? (
                <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                  <EmptyHeader>
                    <EmptyMedia className="rounded-none" variant="icon">
                      <Building2Icon className="size-5" />
                    </EmptyMedia>
                    <EmptyTitle>No rooms available yet</EmptyTitle>
                    <EmptyDescription>
                      Build the room registry on the venue page before publishing the public map.
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
                                  ? "No companies assigned yet."
                                  : entry.room.companies.length === 1
                                    ? "1 company assigned."
                                    : `${entry.room.companies.length} companies assigned.`}
                              </p>
                            </div>
                            <Badge variant={entry.pin ? "success" : "outline"}>
                              {entry.pin ? "Pinned" : "Unpinned"}
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
                    alt="Published venue map preview"
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
                  Publish a venue map image to unlock room pin placement on the venue page.
                </div>
              )}
              <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                The public map stays read-only for visitors. Use the venue page for room assignment and
                pin alignment, then return here to verify the published artifact.
                <div className="mt-4">
                  <Link className={buttonVariants({ variant: "outline" })} to="/admin/venue">
                    Open venue tabs
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
