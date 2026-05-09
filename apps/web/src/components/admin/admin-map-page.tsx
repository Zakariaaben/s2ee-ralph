"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
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
import {
  Sheet,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@project/ui/components/sheet";
import {
  BadgeCheckIcon,
  CircleAlertIcon,
  MapPinnedIcon,
  Trash2Icon,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type React from "react";
import { useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  formatAdminMutationError,
  useAdminCompanyLedgerState,
  useAdminVenueRoomsState,
  useAdminZonesState,
} from "@/lib/admin-page-data";
import { adminWorkspaceAtoms, adminWorkspaceReactivity } from "@/lib/admin-atoms";

const defaultMapCenter: [number, number] = [36.7051, 3.1739];
const defaultZoom = 15;

const createZoneMarkerIcon = (selected: boolean) =>
  L.divIcon({
    className: "zone-marker-shell",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <span style="display:block;width:16px;height:16px;border-radius:9999px;background:${selected ? "#2563eb" : "#0f172a"};border:3px solid white;box-shadow:0 0 0 1px rgba(15,23,42,0.12);"></span>
      <span style="display:block;width:2px;height:12px;background:${selected ? "#2563eb" : "#0f172a"};"></span>
    </div>`,
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    tooltipAnchor: [0, -24],
  });

export function AdminMapPage(): React.ReactElement {
  const zonesState = useAdminZonesState();
  const roomsState = useAdminVenueRoomsState();
  const companyLedgerState = useAdminCompanyLedgerState();
  const refreshZones = useAtomRefresh(adminWorkspaceAtoms.zones);
  const refreshRooms = useAtomRefresh(adminWorkspaceAtoms.venueRooms);
  const refreshCompanies = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const createAdminZone = useAtomSet(adminWorkspaceAtoms.createAdminZone, { mode: "promise" });
  const updateAdminZone = useAtomSet(adminWorkspaceAtoms.updateAdminZone, { mode: "promise" });
  const deleteAdminZone = useAtomSet(adminWorkspaceAtoms.deleteAdminZone, { mode: "promise" });
  const createRoom = useAtomSet(adminWorkspaceAtoms.createRoom, { mode: "promise" });
  const updateRoom = useAtomSet(adminWorkspaceAtoms.updateRoom, { mode: "promise" });
  const deleteRoom = useAtomSet(adminWorkspaceAtoms.deleteRoom, { mode: "promise" });
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>("all");
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [zoneDraft, setZoneDraft] = useState({
    code: "",
    label: "",
    latitude: "",
    longitude: "",
  });
  const [roomDraft, setRoomDraft] = useState({
    id: "",
    code: "",
    zoneId: "" as string | null,
  });
  const [roomManagementTab, setRoomManagementTab] = useState<"zones" | "salles">("zones");

  const zones = zonesState.kind === "success" ? zonesState.value : [];
  const rooms = roomsState.kind === "success" ? roomsState.value : [];
  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const mapZones = zones.filter((zone) => zone.latitude != null && zone.longitude != null);
  const selectedZoneCompanies = companyLedger.filter((entry) => entry.zone?.id === selectedZoneId);
  const availableRoomCodes = Array.from(
    new Set(selectedZoneCompanies.map((entry) => entry.room?.code).filter((code) => code != null)),
  );
  const visibleZoneCompanies =
    selectedRoomCode === "all"
      ? selectedZoneCompanies
      : selectedZoneCompanies.filter((entry) => entry.room?.code === selectedRoomCode);

  const mapCenter = useMemo<[number, number]>(() => {
    const firstZone = mapZones[0];

    if (!firstZone || firstZone.latitude == null || firstZone.longitude == null) {
      return defaultMapCenter;
    }

    return [firstZone.latitude, firstZone.longitude];
  }, [mapZones]);

  const resetDraft = () => {
    setZoneDraft({ code: "", label: "", latitude: "", longitude: "" });
    setRoomDraft({ id: "", code: "", zoneId: "" });
    setSelectedZoneId(null);
  };

  const refreshPage = () => {
    refreshZones();
    refreshRooms();
    refreshCompanies();
  };

  const submitZone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = zoneDraft.code.trim().toUpperCase();
    const label = zoneDraft.label.trim();

    if (code.length === 0 || label.length === 0) {
      setWorkspaceError("Le code et le label de zone sont obligatoires.");
      return;
    }

    const latitude = zoneDraft.latitude.trim().length === 0 ? undefined : Number(zoneDraft.latitude);
    const longitude = zoneDraft.longitude.trim().length === 0 ? undefined : Number(zoneDraft.longitude);

    if (
      (latitude !== undefined && Number.isNaN(latitude)) ||
      (longitude !== undefined && Number.isNaN(longitude))
    ) {
      setWorkspaceError("Latitude et longitude doivent etre numeriques.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setPendingAction(selectedZone == null ? "create-zone" : `update-zone:${selectedZone.id}`);

    try {
      if (selectedZone == null) {
        await createAdminZone({
          payload: { code, label, latitude, longitude },
          reactivityKeys: { zones: adminWorkspaceReactivity.zones },
        });
        setWorkspaceMessage(`Zone ${code} creee.`);
      } else {
        await updateAdminZone({
          payload: { zoneId: selectedZone.id, code, label, latitude, longitude },
          reactivityKeys: { zones: adminWorkspaceReactivity.zones },
        });
        setWorkspaceMessage(`Zone ${code} mise a jour.`);
      }

      refreshPage();
      resetDraft();
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const removeZone = async (zoneId: string, zoneCode: string) => {
    if (!window.confirm(`Supprimer la zone ${zoneCode} ?`)) {
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setPendingAction(`delete-zone:${zoneId}`);

    try {
      await deleteAdminZone({
        payload: { zoneId: zoneId as never },
        reactivityKeys: { zones: adminWorkspaceReactivity.zones, companyLedger: adminWorkspaceReactivity.companyLedger },
      });
      refreshPage();
      if (selectedZoneId === zoneId) {
        resetDraft();
      }
      setWorkspaceMessage(`Zone ${zoneCode} supprimee.`);
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const submitRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = roomDraft.code.trim().toUpperCase();

    if (code.length === 0) {
      setWorkspaceError("Le code de la salle est obligatoire.");
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setPendingAction(roomDraft.id ? `update-room:${roomDraft.id}` : "create-room");

    try {
      if (roomDraft.id) {
        await updateRoom({
          payload: { roomId: roomDraft.id as never, code, zoneId: (roomDraft.zoneId || undefined) as never },
          reactivityKeys: { venueRooms: adminWorkspaceReactivity.venueRooms },
        });
        setWorkspaceMessage(`Salle ${code} mise a jour.`);
      } else {
        await createRoom({
          payload: { code, zoneId: (roomDraft.zoneId || undefined) as never },
          reactivityKeys: { venueRooms: adminWorkspaceReactivity.venueRooms },
        });
        setWorkspaceMessage(`Salle ${code} creee.`);
      }

      refreshPage();
      setRoomDraft({ id: "", code: "", zoneId: null });
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingAction(null);
    }
  };

  const removeRoom = async (roomId: string, roomCode: string) => {
    if (!window.confirm(`Supprimer la salle ${roomCode} ?`)) {
      return;
    }

    setWorkspaceError(null);
    setWorkspaceMessage(null);
    setPendingAction(`delete-room:${roomId}`);

    try {
      await deleteRoom({
        payload: { roomId: roomId as never },
        reactivityKeys: { venueRooms: adminWorkspaceReactivity.venueRooms },
      });
      refreshPage();
      if (roomDraft.id === roomId) {
        setRoomDraft({ id: "", code: "", zoneId: "" });
      }
      setWorkspaceMessage(`Salle ${roomCode} supprimee.`);
    } catch (error) {
      setWorkspaceError(formatAdminMutationError(error));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        actions={
          <Button onClick={refreshPage} type="button" variant="outline">
            Actualiser
          </Button>
        }
        description="Carte OpenStreetMap par zones avec detail des entreprises par salle."
        eyebrow="Admin"
        title="Carte des zones"
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

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
              Zones et salles
            </p>
          </div>

          <div className="flex gap-1 border-b border-[var(--s2ee-border)]">
            <button
              className={`rounded-t px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${roomManagementTab === "zones" ? "bg-white text-slate-900" : "text-[color:var(--s2ee-muted-foreground)] hover:text-slate-700"}`}
              onClick={() => setRoomManagementTab("zones")}
              type="button"
            >
              Zones
            </button>
            <button
              className={`rounded-t px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${roomManagementTab === "salles" ? "bg-white text-slate-900" : "text-[color:var(--s2ee-muted-foreground)] hover:text-slate-700"}`}
              onClick={() => setRoomManagementTab("salles")}
              type="button"
            >
              Salles
            </button>
          </div>

          {roomManagementTab === "zones" ? (
            <div className="space-y-4">
              <form className="space-y-4" onSubmit={submitZone}>
                <div className="space-y-2">
                  <Label htmlFor="zone-code">Code</Label>
                  <Input id="zone-code" value={zoneDraft.code} onChange={(event) => setZoneDraft((current) => ({ ...current, code: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone-label">Label</Label>
                  <Input id="zone-label" value={zoneDraft.label} onChange={(event) => setZoneDraft((current) => ({ ...current, label: event.target.value }))} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="zone-latitude">Latitude</Label>
                    <Input id="zone-latitude" value={zoneDraft.latitude} onChange={(event) => setZoneDraft((current) => ({ ...current, latitude: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zone-longitude">Longitude</Label>
                    <Input id="zone-longitude" value={zoneDraft.longitude} onChange={(event) => setZoneDraft((current) => ({ ...current, longitude: event.target.value }))} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button disabled={pendingAction != null} type="submit">
                    {selectedZone == null ? "Creer la zone" : "Mettre a jour la zone"}
                  </Button>
                  <Button onClick={resetDraft} type="button" variant="ghost">
                    Reinitialiser
                  </Button>
                </div>
              </form>

              {zonesState.kind === "loading" ? <AdminLoadingPanel /> : null}
              {zonesState.kind === "failure" ? (
                <AdminFailurePanel title="Zones indisponibles" description={zonesState.message} />
              ) : null}
              {zonesState.kind === "success" && zones.length > 0 ? (
                <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                  {zones.map((zone) => (
                    <div className="bg-white p-4" key={zone.id}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="min-w-0 text-left"
                          onClick={() => {
                            setSelectedZoneId(zone.id);
                            setZoneDraft({
                              code: zone.code,
                              label: zone.label,
                              latitude: zone.latitude == null ? "" : String(zone.latitude),
                              longitude: zone.longitude == null ? "" : String(zone.longitude),
                            });
                          }}
                          type="button"
                        >
                          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">{zone.code}</p>
                          <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">{zone.label}</p>
                        </button>
                        <Button
                          className="size-8"
                          disabled={pendingAction === `delete-zone:${zone.id}`}
                          onClick={() => {
                            void removeZone(zone.id as string, zone.code);
                          }}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon className="size-4 text-red-600" />
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {zone.latitude == null || zone.longitude == null ? "Sans coordonnees" : "Geo-localisee"}
                        </Badge>
                        <Badge variant="outline">
                          {companyLedger.filter((entry) => entry.zone?.id === zone.id).length} entreprise(s)
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <form className="space-y-4" onSubmit={submitRoom}>
                <div className="space-y-2">
                  <Label htmlFor="room-code">Code</Label>
                  <Input id="room-code" value={roomDraft.code} onChange={(event) => setRoomDraft((current) => ({ ...current, code: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-zone">Zone (optionnelle)</Label>
                  <Select onValueChange={(value) => setRoomDraft((current) => ({ ...current, zoneId: value === "" ? null : value }))} value={roomDraft.zoneId ?? ""}>
                    <SelectTrigger id="room-zone">
                      <SelectValue placeholder="Aucune zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucune zone</SelectItem>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.code} - {zone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button disabled={pendingAction != null} type="submit">
                    {roomDraft.id ? "Mettre a jour la salle" : "Creer la salle"}
                  </Button>
                  <Button onClick={() => setRoomDraft({ id: "", code: "", zoneId: null })} type="button" variant="ghost">
                    Reinitialiser
                  </Button>
                </div>
              </form>

              {roomsState.kind === "loading" ? <AdminLoadingPanel /> : null}
              {roomsState.kind === "failure" ? (
                <AdminFailurePanel title="Salles indisponibles" description={roomsState.message} />
              ) : null}
              {roomsState.kind === "success" && rooms.length > 0 ? (
                <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                  {rooms.map((room) => (
                    <div className="bg-white p-4" key={room.id}>
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="min-w-0 text-left"
                          onClick={() => {
                            setRoomDraft({
                              id: room.id,
                              code: room.code,
                              zoneId: room.zone?.id ?? "",
                            });
                          }}
                          type="button"
                        >
                          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">{room.code}</p>
                          <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                            {room.zone ? `Zone: ${room.zone.code}` : "Sans zone"}
                          </p>
                        </button>
                        <Button
                          className="size-8"
                          disabled={pendingAction === `delete-room:${room.id}`}
                          onClick={() => {
                            void removeRoom(room.id as string, room.code);
                          }}
                          size="icon"
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon className="size-4 text-red-600" />
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {companyLedger.filter((entry) => entry.room?.id === room.id).length} entreprise(s)
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
          <div className="space-y-2 border-b border-[var(--s2ee-border)] pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
              OpenStreetMap
            </p>
          </div>

          {zonesState.kind === "success" && mapZones.length === 0 ? (
            <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
              <EmptyHeader>
                <EmptyMedia className="rounded-none" variant="icon">
                  <MapPinnedIcon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucune zone positionnee</EmptyTitle>
                <EmptyDescription>Ajoutez latitude/longitude sur une zone pour l'afficher sur la carte.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {mapZones.length > 0 ? (
            <div className="h-[640px] overflow-hidden border border-[var(--s2ee-border)]">
              <MapContainer center={mapCenter} className="h-full w-full" zoom={defaultZoom} style={{ zIndex: 0 }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mapZones.map((zone) => (
                  <Marker
                    eventHandlers={{
                      click: () => {
                        setSelectedZoneId(zone.id);
                        setSelectedRoomCode("all");
                      },
                    }}
                    icon={createZoneMarkerIcon(zone.id === selectedZoneId)}
                    key={zone.id}
                    position={[zone.latitude!, zone.longitude!]}
                  >
                    <Tooltip direction="top" offset={[0, -20]} opacity={1}>
                      <div>
                        <p className="text-xs font-semibold">{zone.code}</p>
                        <p className="text-xs">{zone.label}</p>
                      </div>
                    </Tooltip>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : null}
        </section>
      </div>

      <Sheet onOpenChange={(open) => !open && setSelectedZoneId(null)} open={selectedZone != null}>
        <SheetPopup side="bottom">
          <SheetHeader>
            <SheetTitle>{selectedZone?.label ?? "Zone"}</SheetTitle>
            <SheetDescription>
              {selectedZone?.code ?? ""} · {selectedZoneCompanies.length} entreprise(s)
            </SheetDescription>
          </SheetHeader>
          <SheetPanel>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zone-room-filter">Salle</Label>
                <Select onValueChange={(value) => setSelectedRoomCode(value ?? "all")} value={selectedRoomCode}>
                  <SelectTrigger id="zone-room-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les salles</SelectItem>
                    {availableRoomCodes.map((roomCode) => (
                      <SelectItem key={roomCode} value={roomCode}>
                        {roomCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {visibleZoneCompanies.length === 0 ? (
                <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                  <EmptyHeader>
                    <EmptyTitle>Aucune entreprise</EmptyTitle>
                    <EmptyDescription>Aucune entreprise ne correspond aux filtres de cette zone.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                  {visibleZoneCompanies.map((entry) => (
                    <div className="bg-white p-4" key={entry.company.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">{entry.company.name}</p>
                          <p className="text-sm text-[color:var(--s2ee-muted-foreground)]">
                            Salle: {entry.room?.code ?? "Non assignee"}
                          </p>
                          {entry.company.logoUrl ? (
                            <a className="text-sm text-primary underline" href={entry.company.logoUrl} rel="noreferrer" target="_blank">
                              Logo
                            </a>
                          ) : null}
                        </div>
                        <Badge variant={entry.arrivalStatus === "arrived" ? "success" : "outline"}>
                          {entry.arrivalStatus === "arrived" ? "Arrivee" : "En attente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SheetPanel>
        </SheetPopup>
      </Sheet>
    </div>
  );
}
