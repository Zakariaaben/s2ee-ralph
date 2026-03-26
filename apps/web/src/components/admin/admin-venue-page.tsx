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
  RotateCcwIcon,
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
  const resetCompanyArrival = useAtomSet(adminWorkspaceAtoms.resetCompanyArrival, {
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
      setWorkspaceError("Renseignez un code de salle.");
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
        setWorkspaceMessage(`Salle ${code} ajoutee.`);
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
      setWorkspaceError("Le code de salle est obligatoire.");
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
        setWorkspaceMessage(`Salle ${currentCode} renommee en ${nextCode}.`);
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
        setWorkspaceMessage(`Salle ${roomCode} supprimee.`);
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
      setWorkspaceError("Choisissez une salle.");
      return;
    }

    if (standDraft.length === 0) {
      setWorkspaceError("Renseignez un numero de stand.");
      return;
    }

    const standNumber = Number(standDraft);

    if (!Number.isInteger(standNumber) || standNumber <= 0) {
      setWorkspaceError("Le numero de stand doit etre un entier positif.");
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
        setWorkspaceMessage(`Placement enregistre pour ${entry.company.name}.`);
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
        setWorkspaceMessage(`Placement retire pour ${entry.company.name}.`);
      });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const resetArrival = async (entry: AdminCompanyLedgerEntry) => {
    setPendingVenueActionId(`placement:arrival-reset:${entry.company.id}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await resetCompanyArrival({
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
        setWorkspaceMessage(`${entry.company.name} remise en attente.`);
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
      setWorkspaceError("Publiez d'abord le plan.");
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
        setWorkspaceMessage("Aucun changement a enregistrer.");
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
          `${diff.upserts.length + diff.deletes.length} changement${diff.upserts.length + diff.deletes.length === 1 ? "" : "s"} enregistre${diff.upserts.length + diff.deletes.length === 1 ? "" : "s"}.`,
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
            Actualiser
          </Button>
        }
        description=""
        eyebrow="Admin"
        title="Salles"
      />

      {workspaceMessage ? (
        <Alert>
          <BadgeCheckIcon className="size-4" />
          <AlertTitle>Mise a jour enregistree</AlertTitle>
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

      <Tabs className="gap-6" defaultValue="rooms">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-1">
          <TabsTrigger value="rooms">Salles</TabsTrigger>
          <TabsTrigger value="placements">Placements</TabsTrigger>
          <TabsTrigger value="pins">Reperes</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms">
          <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
            <div className="space-y-4 border-b border-[var(--s2ee-border)] pb-5">
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                  Salles
                </p>
              </div>

              <form
                className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                onSubmit={(event) => {
                  void submitNewRoom(event);
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="new-room-code">Code de la salle</Label>
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
                  {pendingVenueActionId === "room:create" ? "Creation..." : "Ajouter"}
                </Button>
              </form>

              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  onChange={(event) => {
                    setVenueQuery(event.target.value);
                  }}
                  placeholder="Rechercher une salle, une entreprise ou un stand"
                  value={venueQuery}
                />
              </div>
            </div>

            {venueRoomsState.kind === "loading" ? <AdminLoadingPanel /> : null}
            {venueRoomsState.kind === "failure" ? (
              <AdminFailurePanel
                description={venueRoomsState.message}
                title="Salles indisponibles"
              />
            ) : null}
            {venueRoomsState.kind === "success" && visibleVenueRooms.length === 0 ? (
              <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                <EmptyHeader>
                  <EmptyMedia className="rounded-none" variant="icon">
                    <DoorOpenIcon className="size-5" />
                  </EmptyMedia>
                  <EmptyTitle>Aucune salle ne correspond</EmptyTitle>
                  <EmptyDescription>
                    Modifiez la recherche ou ajoutez une salle.
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
                                ? "1 entreprise"
                                : `${summary.companyCount} entreprises`}
                            </Badge>
                            <Badge variant="outline">{summary.arrivedCount} arrivees</Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`room-code-${summary.room.id}`}>Code</Label>
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
                            {pendingRename ? "Enregistrement..." : "Renommer"}
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
                            {pendingDelete ? "Suppression..." : "Supprimer"}
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
                  Placements
                </p>
              </div>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
                <Input
                  className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
                  onChange={(event) => {
                    setPlacementQuery(event.target.value);
                  }}
                  placeholder="Rechercher une entreprise, un recruteur, une salle ou un stand"
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
                title="Placements indisponibles"
              />
            ) : null}
            {venueRoomsState.kind === "failure" ? (
              <AdminFailurePanel
                description={venueRoomsState.message}
                title="Salles indisponibles"
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
                  <EmptyTitle>Aucune entreprise ne correspond</EmptyTitle>
                  <EmptyDescription>
                    Modifiez la recherche.
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
                      ? "Aucune salle"
                      : venueRooms.find((room) => room.id === roomDraft)?.code ?? "Salle inconnue";
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
                              {entry.arrivalStatus === "arrived" ? "Arrivee" : "En attente"}
                            </Badge>
                            <Badge variant="outline">
                              {entry.company.recruiters.length} recruteur
                              {entry.company.recruiters.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_160px_auto_auto_auto] xl:items-end">
                          <div className="space-y-2">
                            <Label htmlFor={`placement-room-${entry.company.id}`}>Salle</Label>
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
                                <SelectItem value="unplaced">Aucune salle</SelectItem>
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
                            {pendingSave ? "Enregistrement..." : "Enregistrer"}
                          </Button>
                          <Button
                            disabled={
                              pendingVenueActionId === `placement:arrival-reset:${entry.company.id}` ||
                              entry.arrivalStatus !== "arrived"
                            }
                            onClick={() => {
                              void resetArrival(entry);
                            }}
                            type="button"
                            variant="outline"
                          >
                            <RotateCcwIcon className="size-4" />
                            {pendingVenueActionId === `placement:arrival-reset:${entry.company.id}`
                              ? "Reinitialisation..."
                              : "Remettre en attente"}
                          </Button>
                          <Button
                            disabled={pendingClear || entry.room == null}
                            onClick={() => {
                              void removePlacement(entry);
                            }}
                            type="button"
                            variant="ghost"
                          >
                            {pendingClear ? "Suppression..." : "Retirer"}
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
                  Reperes
                </p>
              </div>
              <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)] md:grid-cols-3">
                {[
                  ["Salles", venueMapRoomRows.length],
                  ["Reperees", publishedVenueMap?.pins.length ?? 0],
                  ["Non enregistres", draftVenueMapPinChangeCount],
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
                  Ouvrir l'editeur
                </Button>
                <Button
                  disabled={draftVenueMapPinChangeCount === 0}
                  onClick={resetVenueMapPinDrafts}
                  type="button"
                  variant="ghost"
                >
                  Reinitialiser
                </Button>
              </div>
              {selectedVenueMapRoom ? (
                <div className="border border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] p-4 text-sm leading-6 text-[color:var(--s2ee-soft-foreground)]">
                  Salle active : {selectedVenueMapRoom.room.code}.{" "}
                  {selectedDraftVenueMapPin
                    ? `Repere provisoire : ${formatDraftVenueMapPinPosition(selectedDraftVenueMapPin)}.`
                    : "Aucun repere provisoire."}
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
                    title="Salles indisponibles"
                  />
                ) : null}
                {publishedVenueMapState.kind === "failure" ? (
                  <AdminFailurePanel
                    description={publishedVenueMapState.message}
                    title="Plan indisponible"
                  />
                ) : null}
                {venueRoomsState.kind === "success" && venueMapRoomRows.length === 0 ? (
                  <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                    <EmptyHeader>
                      <EmptyMedia className="rounded-none" variant="icon">
                        <DoorOpenIcon className="size-5" />
                      </EmptyMedia>
                      <EmptyTitle>Aucune salle a reperer</EmptyTitle>
                      <EmptyDescription>
                        Creez d'abord des salles.
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
                                  {isSelected ? "Selectionnee" : "Disponible"}
                                </Badge>
                                <Badge variant={draftPin ? "success" : "outline"}>
                                  {draftPin ? "Reperee" : "Sans repere"}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                              {draftPin ? formatDraftVenueMapPinPosition(draftPin) : "Aucun repere."}
                            </p>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                onClick={() => {
                                  setSelectedVenueMapRoomId(entry.room.id);
                                }}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                              >
                                  {isSelected ? "Selectionnee" : "Selectionner"}
                              </Button>
                              <Button
                                disabled={draftPin == null}
                                onClick={() => {
                                  clearDraftVenueMapPin(entry.room.id);
                                }}
                                type="button"
                                variant="ghost"
                              >
                                Retirer le repere
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
                      <EmptyTitle>Aucun plan publie</EmptyTitle>
                      <EmptyDescription>
                        Publiez le plan depuis l'espace Plan.
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
                <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">Le plan public se verifie ici.</p>
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
                  Editeur de reperes
                </DialogTitle>
                <DialogDescription className="max-w-3xl text-sm leading-7 text-[color:var(--s2ee-soft-foreground)]">
                  Selectionnez une salle, placez son repere sur le plan, puis enregistrez.
                </DialogDescription>
              </DialogHeader>

              <DialogPanel className="p-0" scrollFade={false}>
                <div className="grid gap-0 xl:grid-cols-[22rem_minmax(0,1fr)]">
                  <section className="border-b bg-white xl:border-b-0 xl:border-r [border-color:var(--s2ee-border)]">
                    <div className="space-y-4 border-b px-5 py-5 sm:px-6 [border-color:var(--s2ee-border)]">
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
                          Salle active
                        </p>
                        <p className="text-lg font-black tracking-[-0.05em] text-slate-900">
                          {selectedVenueMapRoom?.room.code ?? "Aucune salle"}
                        </p>
                      </div>
                      <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                        {selectedDraftVenueMapPin
                          ? `Repere provisoire : ${formatDraftVenueMapPinPosition(selectedDraftVenueMapPin)}`
                          : "Cliquez sur le plan pour placer le repere."}
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
                                      : "Aucun repere provisoire."}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                <Badge variant={isActive ? "default" : "outline"}>
                                    {isActive ? "Selectionnee" : "Disponible"}
                                  </Badge>
                                  <Badge variant={draftPin ? "success" : "outline"}>
                                    {draftPin ? "Repere" : "Sans repere"}
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
                                  {isActive ? "Selectionnee" : "Selectionner"}
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
                                  Retirer
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
                          <EmptyTitle>Aucun plan publie</EmptyTitle>
                          <EmptyDescription>
                            Publiez le plan avant de modifier les reperes.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <div
                        className="relative overflow-hidden border border-[var(--s2ee-border)] bg-white"
                        onClick={(event) => {
                          if (selectedVenueMapRoomId == null) {
                            setWorkspaceError("Choisissez une salle avant de placer un repere.");
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
                          alt="Editeur de reperes"
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
                  {draftPinnedRoomCount} salle{draftPinnedRoomCount === 1 ? "" : "s"} reperee{draftPinnedRoomCount === 1 ? "" : "s"}.{" "}
                  {draftVenueMapPinChangeCount} changement{draftVenueMapPinChangeCount === 1 ? "" : "s"} non enregistre{draftVenueMapPinChangeCount === 1 ? "" : "s"}.
                </p>
                <Button
                  onClick={() => {
                    resetVenueMapPinDrafts();
                    setIsPinEditorOpen(false);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Annuler
                </Button>
                <Button
                  disabled={publishedVenueMap == null || pendingVenueActionId === "map:pin:commit"}
                  onClick={() => {
                    void saveVenueMapPinDrafts();
                  }}
                  type="button"
                >
                  {pendingVenueActionId === "map:pin:commit" ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogPopup>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
