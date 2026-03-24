"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@project/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import { Label } from "@project/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@project/ui/components/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@project/ui/components/tabs";
import type { AdminCompanyLedgerEntry, Room } from "@project/domain";
import {
  BadgeCheckIcon,
  Building2Icon,
  CircleAlertIcon,
  DoorOpenIcon,
  MapPinnedIcon,
  PencilLineIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  formatAdminMutationError,
  useAdminCompanyLedgerState,
  useAdminPublishedVenueMapState,
  useAdminVenueRoomsState,
} from "@/lib/admin-page-data";
import {
  adminWorkspaceAtoms,
  adminWorkspaceReactivity,
} from "@/lib/admin-atoms";
import {
  buildVenueMapRoomRows,
  buildVenueMapPinDraftRecord,
  calculateVenueMapPinCoordinates,
  countVenueMapPinDraftChanges,
  diffVenueMapPinDraftRecord,
  type VenueMapPinDraftRecord,
} from "@/lib/admin-map";
import { describeAdminPlacement } from "@/lib/admin-workspace";
import {
  describeVenueRoomOccupancy,
  filterPlacementManagementCompanies,
  filterVenueRoomSummaries,
} from "@/lib/admin-venue";

const toImageSource = (input: { readonly contentType: string; readonly contentsBase64: string }): string =>
  `data:${input.contentType};base64,${input.contentsBase64}`;

const arrivalBadgeVariant = (status: "arrived" | "not-arrived"): React.ComponentProps<typeof Badge>["variant"] =>
  status === "arrived" ? "success" : "outline";

const formatDraftVenueMapPinPosition = (pin: {
  readonly xPercent: number;
  readonly yPercent: number;
}): string => `${pin.xPercent.toFixed(2)}% x, ${pin.yPercent.toFixed(2)}% y`;

export function AdminVenuePage(): React.ReactElement {
  const companyLedgerState = useAdminCompanyLedgerState();
  const venueRoomsState = useAdminVenueRoomsState();
  const publishedVenueMapState = useAdminPublishedVenueMapState();
  const refreshCompanyLedger = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const refreshVenueRooms = useAtomRefresh(adminWorkspaceAtoms.venueRooms);
  const refreshPublishedVenueMap = useAtomRefresh(adminWorkspaceAtoms.publishedVenueMap);
  const createRoom = useAtomSet(adminWorkspaceAtoms.createRoom, {
    mode: "promise",
  });
  const updateRoom = useAtomSet(adminWorkspaceAtoms.updateRoom, {
    mode: "promise",
  });
  const deleteRoom = useAtomSet(adminWorkspaceAtoms.deleteRoom, {
    mode: "promise",
  });
  const assignCompanyPlacement = useAtomSet(adminWorkspaceAtoms.assignCompanyPlacement, {
    mode: "promise",
  });
  const clearCompanyPlacement = useAtomSet(adminWorkspaceAtoms.clearCompanyPlacement, {
    mode: "promise",
  });
  const upsertVenueMapRoomPin = useAtomSet(adminWorkspaceAtoms.upsertVenueMapRoomPin, {
    mode: "promise",
  });
  const deleteVenueMapRoomPin = useAtomSet(adminWorkspaceAtoms.deleteVenueMapRoomPin, {
    mode: "promise",
  });
  const [newRoomCode, setNewRoomCode] = useState("");
  const [venueQuery, setVenueQuery] = useState("");
  const [placementQuery, setPlacementQuery] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingVenueActionId, setPendingVenueActionId] = useState<string | null>(null);
  const [roomCodeDrafts, setRoomCodeDrafts] = useState<Record<string, string>>({});
  const [placementRoomDrafts, setPlacementRoomDrafts] = useState<Record<string, string>>({});
  const [placementStandDrafts, setPlacementStandDrafts] = useState<Record<string, string>>({});
  const [selectedVenueMapRoomId, setSelectedVenueMapRoomId] = useState<Room["id"] | null>(null);
  const [isPinEditorOpen, setIsPinEditorOpen] = useState(false);
  const [draftVenueMapPins, setDraftVenueMapPins] = useState<VenueMapPinDraftRecord>({});
  const [draggingVenueMapRoomId, setDraggingVenueMapRoomId] = useState<Room["id"] | null>(null);
  const venueMapEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (venueRoomsState.kind !== "success") {
      return;
    }

    setRoomCodeDrafts(
      Object.fromEntries(venueRoomsState.value.map((room) => [room.id, room.code])),
    );
  }, [venueRoomsState]);

  useEffect(() => {
    if (venueRoomsState.kind !== "success") {
      return;
    }

    if (
      selectedVenueMapRoomId != null &&
      venueRoomsState.value.some((room) => room.id === selectedVenueMapRoomId)
    ) {
      return;
    }

    setSelectedVenueMapRoomId(venueRoomsState.value[0]?.id ?? null);
  }, [selectedVenueMapRoomId, venueRoomsState]);

  useEffect(() => {
    if (isPinEditorOpen) {
      return;
    }

    setDraftVenueMapPins(buildVenueMapPinDraftRecord(publishedVenueMapState.kind === "success" ? publishedVenueMapState.value : null));
  }, [isPinEditorOpen, publishedVenueMapState]);

  const venueRooms = venueRoomsState.kind === "success" ? venueRoomsState.value : [];
  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const publishedVenueMap = publishedVenueMapState.kind === "success" ? publishedVenueMapState.value : null;
  const visibleVenueRooms = filterVenueRoomSummaries(venueRooms, useDeferredValue(venueQuery));
  const manageableCompanies = filterPlacementManagementCompanies(
    companyLedger,
    useDeferredValue(placementQuery),
  );
  const venueMapRoomRows = buildVenueMapRoomRows(venueRooms, publishedVenueMap);
  const selectedVenueMapRoom =
    selectedVenueMapRoomId == null
      ? null
      : venueMapRoomRows.find((entry) => entry.room.id === selectedVenueMapRoomId) ?? null;
  const draftVenueMapPinChangeCount = countVenueMapPinDraftChanges({
    roomRows: venueMapRoomRows,
    publishedVenueMap,
    draftPins: draftVenueMapPins,
  });
  const selectedDraftVenueMapPin =
    selectedVenueMapRoomId == null
      ? null
      : draftVenueMapPins[selectedVenueMapRoomId as string] ?? null;
  const draftPinnedRoomCount = venueMapRoomRows.filter(
    (entry) => draftVenueMapPins[entry.room.id as string] != null,
  ).length;

  const refreshVenuePage = () => {
    refreshVenueRooms();
    refreshCompanyLedger();
    refreshPublishedVenueMap();
  };

  const resetVenueMapPinDrafts = () => {
    setDraftVenueMapPins(buildVenueMapPinDraftRecord(publishedVenueMap));
  };

  const submitNewRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = newRoomCode.trim().toUpperCase();

    if (code.length === 0) {
      setWorkspaceError("Provide a room code before creating the room.");
      return;
    }

    setPendingVenueActionId("room:create");
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await createRoom({
        payload: { code },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
        },
      });
      refreshVenuePage();
      setNewRoomCode("");
      startTransition(() => {
        setWorkspaceMessage(`Room ${code} created.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const saveRoomCode = async (roomId: Room["id"], currentCode: string) => {
    const nextCode = (roomCodeDrafts[roomId] ?? currentCode).trim().toUpperCase();

    if (nextCode.length === 0) {
      setWorkspaceError("Room code cannot be empty.");
      return;
    }

    if (nextCode === currentCode) {
      return;
    }

    setPendingVenueActionId(`room:update:${roomId}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await updateRoom({
        payload: {
          roomId,
          code: nextCode,
        },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
          companyLedger: adminWorkspaceReactivity.companyLedger,
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      refreshVenuePage();
      startTransition(() => {
        setWorkspaceMessage(`Room ${currentCode} renamed to ${nextCode}.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const removeRoom = async (roomId: Room["id"], roomCode: string) => {
    setPendingVenueActionId(`room:delete:${roomId}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await deleteRoom({
        payload: {
          roomId,
        },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
          companyLedger: adminWorkspaceReactivity.companyLedger,
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      refreshVenuePage();
      startTransition(() => {
        setWorkspaceMessage(`Room ${roomCode} deleted.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const savePlacement = async (entry: AdminCompanyLedgerEntry) => {
    const roomIdDraft =
      placementRoomDrafts[entry.company.id] ??
      (entry.room?.id as string | undefined) ??
      "unplaced";
    const standDraft =
      (
        placementStandDrafts[entry.company.id] ??
        (entry.standNumber == null ? "" : String(entry.standNumber))
      ).trim();

    if (roomIdDraft === "unplaced") {
      setWorkspaceError("Choose a room before saving the placement.");
      return;
    }

    if (standDraft.length === 0) {
      setWorkspaceError("Provide a stand number before saving the placement.");
      return;
    }

    const standNumber = Number(standDraft);

    if (!Number.isInteger(standNumber) || standNumber <= 0) {
      setWorkspaceError("Stand number must be a positive integer.");
      return;
    }

    setPendingVenueActionId(`placement:save:${entry.company.id}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await assignCompanyPlacement({
        payload: {
          companyId: entry.company.id,
          roomId: roomIdDraft as Room["id"],
          standNumber,
        },
        reactivityKeys: {
          companyLedger: adminWorkspaceReactivity.companyLedger,
          venueRooms: adminWorkspaceReactivity.venueRooms,
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      refreshVenuePage();
      startTransition(() => {
        setWorkspaceMessage(`${entry.company.name} placement saved.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const removePlacement = async (entry: AdminCompanyLedgerEntry) => {
    setPendingVenueActionId(`placement:clear:${entry.company.id}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await clearCompanyPlacement({
        payload: {
          companyId: entry.company.id,
        },
        reactivityKeys: {
          companyLedger: adminWorkspaceReactivity.companyLedger,
          venueRooms: adminWorkspaceReactivity.venueRooms,
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      refreshVenuePage();
      startTransition(() => {
        setWorkspaceMessage(`${entry.company.name} placement cleared.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const openPinEditor = () => {
    resetVenueMapPinDrafts();
    setWorkspaceError(null);
    setIsPinEditorOpen(true);
  };

  const placeDraftVenueMapPin = (roomId: Room["id"], xPercent: number, yPercent: number) => {
    setDraftVenueMapPins((current) => ({
      ...current,
      [roomId]: {
        xPercent,
        yPercent,
      },
    }));
  };

  const clearDraftVenueMapPin = (roomId: Room["id"]) => {
    setDraftVenueMapPins((current) => {
      const next = { ...current };

      delete next[roomId as string];
      return next;
    });
  };

  const updateDraftVenueMapPinFromPointer = (
    roomId: Room["id"],
    clientX: number,
    clientY: number,
  ) => {
    const bounds = venueMapEditorRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    const coordinates = calculateVenueMapPinCoordinates({
      clientX,
      clientY,
      bounds,
    });

    placeDraftVenueMapPin(roomId, coordinates.xPercent, coordinates.yPercent);
  };

  const saveVenueMapPinDrafts = async () => {
    if (publishedVenueMap == null) {
      setWorkspaceError("Publish the venue map image before placing room pins.");
      return;
    }

    const diff = diffVenueMapPinDraftRecord({
      roomRows: venueMapRoomRows,
      publishedVenueMap,
      draftPins: draftVenueMapPins,
    });

    if (diff.upserts.length === 0 && diff.deletes.length === 0) {
      setIsPinEditorOpen(false);
      startTransition(() => {
        setWorkspaceMessage("No map pin changes to save.");
      });
      return;
    }

    setPendingVenueActionId("map:pin:commit");
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      for (const roomId of diff.deletes) {
        await deleteVenueMapRoomPin({
          payload: { roomId },
          reactivityKeys: {
            publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
          },
        });
      }

      for (const upsert of diff.upserts) {
        await upsertVenueMapRoomPin({
          payload: upsert,
          reactivityKeys: {
            publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
          },
        });
      }

      refreshVenuePage();
      setIsPinEditorOpen(false);
      startTransition(() => {
        setWorkspaceMessage(
          `${diff.upserts.length + diff.deletes.length} map pin change${diff.upserts.length + diff.deletes.length === 1 ? "" : "s"} saved.`,
        );
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
          <Button onClick={refreshVenuePage} type="button" variant="outline">
            Refresh
          </Button>
        }
        description="This page is split into room registry, company assignment, and map pinning so each venue task stays narrower."
        eyebrow="Admin venue"
        title="Venue logistics"
      />

      {workspaceMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Venue update saved</AlertTitle>
          <AlertDescription>{workspaceMessage}</AlertDescription>
        </Alert>
      ) : null}

      {workspaceError ? (
        <Alert variant="error">
          <CircleAlertIcon className="size-4" />
          <AlertTitle>Venue update failed</AlertTitle>
          <AlertDescription>{workspaceError}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs className="gap-6" defaultValue="rooms">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-1">
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="placements">Assign companies</TabsTrigger>
          <TabsTrigger value="pins">Pin on map</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
            <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Room registry
                </p>
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Create, rename, and retire rooms while keeping placement work synchronized.
                </p>
              </div>

              <form
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                onSubmit={(event) => {
                  void submitNewRoom(event);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="new-room-code">New room code</Label>
                  <Input
                    className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                    id="new-room-code"
                    onChange={(event) => {
                      setNewRoomCode(event.target.value);
                    }}
                    placeholder="A1"
                    value={newRoomCode}
                  />
                </div>
                <Button
                  className="sm:self-end"
                  disabled={pendingVenueActionId === "room:create"}
                  type="submit"
                >
                  <DoorOpenIcon className="size-4" />
                  {pendingVenueActionId === "room:create" ? "Creating..." : "Add room"}
                </Button>
              </form>

              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  onChange={(event) => {
                    setVenueQuery(event.target.value);
                  }}
                  placeholder="Search room, company, or stand"
                  value={venueQuery}
                />
              </div>
            </div>

            {venueRoomsState.kind === "loading" ? <AdminLoadingPanel /> : null}
            {venueRoomsState.kind === "failure" ? (
              <AdminFailurePanel
                description={venueRoomsState.message}
                title="Venue registry unavailable"
              />
            ) : null}
            {venueRoomsState.kind === "success" && visibleVenueRooms.length === 0 ? (
              <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                <EmptyHeader>
                  <EmptyMedia className="rounded-none" variant="icon">
                    <DoorOpenIcon className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No rooms match this query</EmptyTitle>
                  <EmptyDescription>
                    Adjust the room query or create the first room for placement work.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {venueRoomsState.kind === "success" && visibleVenueRooms.length > 0 ? (
              <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                {visibleVenueRooms.map((summary) => {
                  const pendingRename = pendingVenueActionId === `room:update:${summary.room.id}`;
                  const pendingDelete = pendingVenueActionId === `room:delete:${summary.room.id}`;
                  const roomCodeDraft = roomCodeDrafts[summary.room.id] ?? summary.room.code;

                  return (
                    <div className="bg-white p-5" key={summary.room.id}>
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                              {summary.room.code}
                            </p>
                            <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                              {describeVenueRoomOccupancy(summary)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={summary.pendingCount === 0 ? "success" : "outline"}>
                              {summary.companyCount === 1
                                ? "1 company"
                                : `${summary.companyCount} companies`}
                            </Badge>
                            <Badge variant="outline">{summary.arrivedCount} arrived</Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`room-code-${summary.room.id}`}>Room code</Label>
                            <Input
                              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                              id={`room-code-${summary.room.id}`}
                              onChange={(event) => {
                                setRoomCodeDrafts((current) => ({
                                  ...current,
                                  [summary.room.id]: event.target.value,
                                }));
                              }}
                              value={roomCodeDraft}
                            />
                          </div>
                          <Button
                            disabled={
                              pendingRename || roomCodeDraft.trim().toUpperCase() === summary.room.code
                            }
                            onClick={() => {
                              void saveRoomCode(summary.room.id, summary.room.code);
                            }}
                            type="button"
                            variant="outline"
                          >
                            <PencilLineIcon className="size-4" />
                            {pendingRename ? "Saving..." : "Rename"}
                          </Button>
                          <Button
                            disabled={pendingDelete}
                            onClick={() => {
                              void removeRoom(summary.room.id, summary.room.code);
                            }}
                            type="button"
                            variant="ghost"
                          >
                            <Trash2Icon className="size-4" />
                            {pendingDelete ? "Deleting..." : "Delete"}
                          </Button>
                        </div>

                        {summary.room.companies.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {summary.room.companies.map((company) => (
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
          </section>
        </TabsContent>

        <TabsContent value="placements">
          <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
            <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Company assignment
                </p>
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Assign companies to rooms and stands while keeping arrival context visible.
                </p>
              </div>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  onChange={(event) => {
                    setPlacementQuery(event.target.value);
                  }}
                  placeholder="Search company, recruiter, room, or stand"
                  value={placementQuery}
                />
              </div>
            </div>

            {companyLedgerState.kind === "loading" || venueRoomsState.kind === "loading" ? (
              <AdminLoadingPanel />
            ) : null}
            {companyLedgerState.kind === "failure" ? (
              <AdminFailurePanel
                description={companyLedgerState.message}
                title="Company placement ledger unavailable"
              />
            ) : null}
            {venueRoomsState.kind === "failure" ? (
              <AdminFailurePanel
                description={venueRoomsState.message}
                title="Venue rooms unavailable"
              />
            ) : null}
            {companyLedgerState.kind === "success" &&
            venueRoomsState.kind === "success" &&
            manageableCompanies.length === 0 ? (
              <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                <EmptyHeader>
                  <EmptyMedia className="rounded-none" variant="icon">
                    <Building2Icon className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>No companies match this query</EmptyTitle>
                  <EmptyDescription>
                    Broaden the search query to continue placement work.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {companyLedgerState.kind === "success" &&
            venueRoomsState.kind === "success" &&
            manageableCompanies.length > 0 ? (
              <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                {manageableCompanies.map((entry) => {
                  const roomDraft =
                    placementRoomDrafts[entry.company.id] ??
                    (entry.room?.id as string | undefined) ??
                    "unplaced";
                  const roomDraftLabel =
                    roomDraft === "unplaced"
                      ? "No room selected"
                      : venueRooms.find((room) => room.id === roomDraft)?.code ?? "Unknown room";
                  const standDraft =
                    placementStandDrafts[entry.company.id] ??
                    (entry.standNumber == null ? "" : String(entry.standNumber));
                  const pendingSave =
                    pendingVenueActionId === `placement:save:${entry.company.id}`;
                  const pendingClear =
                    pendingVenueActionId === `placement:clear:${entry.company.id}`;

                  return (
                    <div className="bg-white p-5" key={entry.company.id}>
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                              {entry.company.name}
                            </p>
                            <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                              {describeAdminPlacement(entry)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                              {entry.arrivalStatus === "arrived" ? "Arrived" : "Pending"}
                            </Badge>
                            <Badge variant="outline">
                              {entry.company.recruiters.length} recruiter
                              {entry.company.recruiters.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_auto_auto] xl:items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`placement-room-${entry.company.id}`}>Room</Label>
                            <Select
                              onValueChange={(value) => {
                                setPlacementRoomDrafts((current) => ({
                                  ...current,
                                  [entry.company.id]: value ?? "unplaced",
                                }));
                              }}
                              value={roomDraft}
                            >
                              <SelectTrigger
                                className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                                id={`placement-room-${entry.company.id}`}
                              >
                                <SelectValue>{roomDraftLabel}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unplaced">No room selected</SelectItem>
                                {venueRooms.map((room) => (
                                  <SelectItem key={room.id} value={room.id as string}>
                                    {room.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`placement-stand-${entry.company.id}`}>Stand</Label>
                            <Input
                              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
                              id={`placement-stand-${entry.company.id}`}
                              inputMode="numeric"
                              onChange={(event) => {
                                setPlacementStandDrafts((current) => ({
                                  ...current,
                                  [entry.company.id]: event.target.value,
                                }));
                              }}
                              placeholder="12"
                              value={standDraft}
                            />
                          </div>

                          <Button
                            disabled={pendingSave || venueRooms.length === 0}
                            onClick={() => {
                              void savePlacement(entry);
                            }}
                            type="button"
                          >
                            {pendingSave ? "Saving..." : "Save placement"}
                          </Button>
                          <Button
                            disabled={pendingClear || entry.room == null}
                            onClick={() => {
                              void removePlacement(entry);
                            }}
                            type="button"
                            variant="ghost"
                          >
                            {pendingClear ? "Clearing..." : "Clear"}
                          </Button>
                        </div>

                        {entry.company.recruiters.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {entry.company.recruiters.map((recruiter) => (
                              <Badge key={recruiter.id} variant="outline">
                                {recruiter.name}
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
          </section>
        </TabsContent>

        <TabsContent value="pins">
          <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
            <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Room pin placement
                </p>
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Pin positions are saved in the database by room id with normalized map coordinates,
                  so the public map can render them in the same place later.
                </p>
              </div>
              <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
                {[
                  ["Rooms", venueMapRoomRows.length],
                  ["Pinned", publishedVenueMap?.pins.length ?? 0],
                  ["Unsaved", draftVenueMapPinChangeCount],
                ].map(([label, value]) => (
                  <div className="bg-white p-5" key={label}>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                      {label}
                    </p>
                    <p className="mt-4 text-4xl font-black tracking-[-0.08em] text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  disabled={publishedVenueMap == null || venueMapRoomRows.length === 0}
                  onClick={openPinEditor}
                  type="button"
                >
                  Open pin editor
                </Button>
                <Button
                  disabled={draftVenueMapPinChangeCount === 0}
                  onClick={resetVenueMapPinDrafts}
                  type="button"
                  variant="ghost"
                >
                  Reset staged changes
                </Button>
              </div>
              {selectedVenueMapRoom ? (
                <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4 text-sm leading-6 text-[color:var(--s2ee-soft-foreground)]">
                  Active room: {selectedVenueMapRoom.room.code}.{" "}
                  {selectedDraftVenueMapPin
                    ? `Draft pin at ${formatDraftVenueMapPinPosition(selectedDraftVenueMapPin)}.`
                    : "No draft pin staged yet."}
                </div>
              ) : null}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
              <div className="space-y-3">
                {venueRoomsState.kind === "loading" || publishedVenueMapState.kind === "loading" ? (
                  <AdminLoadingPanel />
                ) : null}
                {venueRoomsState.kind === "failure" ? (
                  <AdminFailurePanel
                    description={venueRoomsState.message}
                    title="Venue rooms unavailable"
                  />
                ) : null}
                {publishedVenueMapState.kind === "failure" ? (
                  <AdminFailurePanel
                    description={publishedVenueMapState.message}
                    title="Published map unavailable"
                  />
                ) : null}
                {venueRoomsState.kind === "success" && venueMapRoomRows.length === 0 ? (
                  <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                    <EmptyHeader>
                      <EmptyMedia className="rounded-none" variant="icon">
                        <DoorOpenIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No rooms available for pinning</EmptyTitle>
                      <EmptyDescription>
                        Create rooms before placing them on the public map.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : null}
                {venueRoomsState.kind === "success" && venueMapRoomRows.length > 0 ? (
                  <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                    {venueMapRoomRows.map((entry) => {
                      const isSelected = entry.room.id === selectedVenueMapRoomId;
                      const draftPin = draftVenueMapPins[entry.room.id as string] ?? null;

                      return (
                        <div className="bg-white p-4" key={entry.room.id}>
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                                  {entry.room.code}
                                </p>
                                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                                  {describeVenueRoomOccupancy({
                                    room: entry.room,
                                    companyCount: entry.room.companies.length,
                                    arrivedCount: entry.room.companies.filter(
                                      (company) => company.arrivalStatus === "arrived",
                                    ).length,
                                    pendingCount: entry.room.companies.filter(
                                      (company) => company.arrivalStatus !== "arrived",
                                    ).length,
                                  })}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Badge variant={isSelected ? "default" : "outline"}>
                                  {isSelected ? "Active" : "Inactive"}
                                </Badge>
                                <Badge variant={draftPin ? "success" : "outline"}>
                                  {draftPin ? "Pinned" : "Unpinned"}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                              {draftPin ? formatDraftVenueMapPinPosition(draftPin) : "No pin saved yet."}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                onClick={() => {
                                  setSelectedVenueMapRoomId(entry.room.id);
                                }}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                              >
                                {isSelected ? "Selected" : "Select room"}
                              </Button>
                              <Button
                                disabled={draftPin == null}
                                onClick={() => {
                                  clearDraftVenueMapPin(entry.room.id);
                                }}
                                type="button"
                                variant="ghost"
                              >
                                Clear staged pin
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                {publishedVenueMap == null ? (
                  <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                    <EmptyHeader>
                      <EmptyMedia className="rounded-none" variant="icon">
                        <MapPinnedIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>No public map published yet</EmptyTitle>
                      <EmptyDescription>
                        Publish the venue map on `/admin/map` before placing room pins here.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div className="relative overflow-hidden border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)]">
                    <img
                      alt="Published venue map preview"
                      className="block max-h-[760px] w-full object-contain"
                      src={toImageSource(publishedVenueMap.image)}
                    />
                    {publishedVenueMap.pins.map((pin) => (
                      <button
                        className="absolute -translate-x-1/2 -translate-y-1/2 border border-[var(--s2ee-border)] bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-900"
                        key={pin.room.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedVenueMapRoomId(pin.room.id);
                        }}
                        style={{
                          left: `${pin.xPercent}%`,
                          top: `${pin.yPercent}%`,
                        }}
                        type="button"
                      >
                        {pin.room.code}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  Map publication still lives on `/admin/map`. Use the large editor to drag pins in
                  real time, then save the staged layout.
                </p>
              </div>
            </div>
          </section>

          <Dialog
            onOpenChange={(open) => {
              setIsPinEditorOpen(open);
              setDraggingVenueMapRoomId(null);

              if (!open) {
                resetVenueMapPinDrafts();
              }
            }}
            open={isPinEditorOpen}
          >
            <DialogPopup
              bottomStickOnMobile={false}
              className="max-w-[min(1380px,calc(100vw-2rem))] border bg-[var(--s2ee-surface)] p-0 font-mono [border-color:var(--s2ee-border)]"
            >
              <DialogHeader className="border-b bg-[var(--s2ee-surface-soft)] px-5 py-5 sm:px-8 sm:py-6 [border-color:var(--s2ee-border)]">
                <DialogTitle className="text-2xl font-black tracking-[-0.06em] text-[color:var(--s2ee-soft-foreground)]">
                  Venue pin editor
                </DialogTitle>
                <DialogDescription className="max-w-3xl text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                  Select one active room, click anywhere on the map to place it, drag pins in real
                  time, then save once the layout looks right.
                </DialogDescription>
              </DialogHeader>

              <DialogPanel className="p-0" scrollFade={false}>
                <div className="grid gap-0 xl:grid-cols-[22rem_minmax(0,1fr)]">
                  <section className="border-b bg-white xl:border-b-0 xl:border-r [border-color:var(--s2ee-border)]">
                    <div className="space-y-4 border-b px-5 py-5 sm:px-6 [border-color:var(--s2ee-border)]">
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                          Active room
                        </p>
                        <p className="text-lg font-black tracking-[-0.05em] text-slate-900">
                          {selectedVenueMapRoom?.room.code ?? "No room selected"}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                        {selectedDraftVenueMapPin
                          ? `Current draft: ${formatDraftVenueMapPinPosition(selectedDraftVenueMapPin)}`
                          : "Click the map to place the selected room for the first time."}
                      </p>
                    </div>

                    <div className="grid gap-px border-t border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                      {venueMapRoomRows.map((entry) => {
                        const isActive = entry.room.id === selectedVenueMapRoomId;
                        const draftPin = draftVenueMapPins[entry.room.id as string] ?? null;

                        return (
                          <div
                            className={`bg-white px-5 py-4 transition-colors ${
                              isActive ? "bg-[var(--s2ee-surface-soft)]" : ""
                            }`}
                            key={entry.room.id}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                                    {entry.room.code}
                                  </p>
                                  <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                                    {draftPin
                                      ? formatDraftVenueMapPinPosition(draftPin)
                                      : "No draft pin placed."}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant={isActive ? "default" : "outline"}>
                                    {isActive ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant={draftPin ? "success" : "outline"}>
                                    {draftPin ? "Pinned" : "Unpinned"}
                                  </Badge>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  onClick={() => {
                                    setSelectedVenueMapRoomId(entry.room.id);
                                  }}
                                  size="sm"
                                  type="button"
                                  variant={isActive ? "default" : "outline"}
                                >
                                  {isActive ? "Selected" : "Select"}
                                </Button>
                                <Button
                                  disabled={draftPin == null}
                                  onClick={() => {
                                    clearDraftVenueMapPin(entry.room.id);
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="bg-[var(--s2ee-surface-soft)] p-4 sm:p-6">
                    {publishedVenueMap == null ? (
                      <Empty className="border border-dashed border-[var(--s2ee-border)] bg-white p-8">
                        <EmptyHeader>
                          <EmptyMedia className="rounded-none" variant="icon">
                            <MapPinnedIcon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No public map published yet</EmptyTitle>
                          <EmptyDescription>
                            Publish the venue map on `/admin/map` before editing room pins.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <div
                        className="relative overflow-hidden border border-[var(--s2ee-border)] bg-white"
                        onClick={(event) => {
                          if (selectedVenueMapRoomId == null) {
                            setWorkspaceError("Choose a room before placing a map pin.");
                            return;
                          }

                          if (event.target instanceof Element && event.target.closest("[data-venue-map-pin='true']")) {
                            return;
                          }

                          const coordinates = calculateVenueMapPinCoordinates({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            bounds: event.currentTarget.getBoundingClientRect(),
                          });

                          placeDraftVenueMapPin(
                            selectedVenueMapRoomId,
                            coordinates.xPercent,
                            coordinates.yPercent,
                          );
                        }}
                        ref={venueMapEditorRef}
                      >
                        <img
                          alt="Venue pin editor"
                          className="block max-h-[76vh] min-h-[420px] w-full object-contain"
                          src={toImageSource(publishedVenueMap.image)}
                        />
                        {venueMapRoomRows.map((entry) => {
                          const draftPin = draftVenueMapPins[entry.room.id as string] ?? null;

                          if (!draftPin) {
                            return null;
                          }

                          const isActive = entry.room.id === selectedVenueMapRoomId;
                          const isDragging = draggingVenueMapRoomId === entry.room.id;

                          return (
                            <button
                              className={`absolute -translate-x-1/2 -translate-y-1/2 border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-transform ${
                                isActive
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-[var(--s2ee-border)] bg-white text-slate-900"
                              } ${isDragging ? "scale-105" : ""}`}
                              data-venue-map-pin="true"
                              key={entry.room.id}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedVenueMapRoomId(entry.room.id);
                              }}
                              onPointerCancel={(event) => {
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  event.currentTarget.releasePointerCapture(event.pointerId);
                                }
                                setDraggingVenueMapRoomId(null);
                              }}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                                setSelectedVenueMapRoomId(entry.room.id);
                                setDraggingVenueMapRoomId(entry.room.id);
                                event.currentTarget.setPointerCapture(event.pointerId);
                                updateDraftVenueMapPinFromPointer(entry.room.id, event.clientX, event.clientY);
                              }}
                              onPointerMove={(event) => {
                                if (draggingVenueMapRoomId !== entry.room.id) {
                                  return;
                                }

                                updateDraftVenueMapPinFromPointer(entry.room.id, event.clientX, event.clientY);
                              }}
                              onPointerUp={(event) => {
                                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                  event.currentTarget.releasePointerCapture(event.pointerId);
                                }
                                setDraggingVenueMapRoomId(null);
                              }}
                              style={{
                                left: `${draftPin.xPercent}%`,
                                top: `${draftPin.yPercent}%`,
                              }}
                              type="button"
                            >
                              {entry.room.code}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </DialogPanel>

              <DialogFooter className="items-center border-t bg-[var(--s2ee-surface-soft)] px-5 py-4 sm:px-8 [border-color:var(--s2ee-border)]">
                <p className="mr-auto text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                  {draftPinnedRoomCount} pinned room{draftPinnedRoomCount === 1 ? "" : "s"} staged.{" "}
                  {draftVenueMapPinChangeCount} unsaved change{draftVenueMapPinChangeCount === 1 ? "" : "s"}.
                </p>
                <Button
                  onClick={() => {
                    resetVenueMapPinDrafts();
                    setIsPinEditorOpen(false);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  disabled={publishedVenueMap == null || pendingVenueActionId === "map:pin:commit"}
                  onClick={() => {
                    void saveVenueMapPinDrafts();
                  }}
                  type="button"
                >
                  {pendingVenueActionId === "map:pin:commit" ? "Saving..." : "Save pin layout"}
                </Button>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
