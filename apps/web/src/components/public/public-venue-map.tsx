"use client";

import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Badge } from "@project/ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
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
import { AppRpcClient } from "@/lib/rpc-client";
import { MapPinnedIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type React from "react";
import { useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip } from "react-leaflet";

const publicZonesAtom = AppRpcClient.query("listPublicVenueZones", undefined, {
  reactivityKeys: ["public", "zones"],
  timeToLive: "30 seconds",
});

const publicCompaniesAtom = AppRpcClient.query("listPublicVenueCompanies", undefined, {
  reactivityKeys: ["public", "companies"],
  timeToLive: "30 seconds",
});

type PublicVenueMapProps = {
  readonly embedded?: boolean;
};

const defaultMapCenter: [number, number] = [36.7051, 3.1739];

const createZoneMarkerIcon = (selected: boolean) =>
  L.divIcon({
    className: "public-zone-marker-shell",
    html: `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
      <span style="display:block;width:16px;height:16px;border-radius:9999px;background:${selected ? "#2563eb" : "#0f172a"};border:3px solid white;box-shadow:0 0 0 1px rgba(15,23,42,0.12);"></span>
      <span style="display:block;width:2px;height:12px;background:${selected ? "#2563eb" : "#0f172a"};"></span>
    </div>`,
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    tooltipAnchor: [0, -24],
  });

export function PublicVenueMap({ embedded = false }: PublicVenueMapProps = {}): React.ReactElement {
  const zonesResult = useAtomValue(publicZonesAtom);
  const companiesResult = useAtomValue(publicCompaniesAtom);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>("all");

  const zones = AsyncResult.isSuccess(zonesResult) ? zonesResult.value : [];
  const companies = AsyncResult.isSuccess(companiesResult) ? companiesResult.value : [];
  const mappableZones = zones.filter((zone) => zone.latitude != null && zone.longitude != null);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const selectedZoneCompanies = companies.filter((entry) => entry.zone?.id === selectedZoneId);
  const roomCodes = Array.from(
    new Set(selectedZoneCompanies.map((entry) => entry.room?.code).filter((value) => value != null)),
  );
  const visibleCompanies =
    selectedRoomCode === "all"
      ? selectedZoneCompanies
      : selectedZoneCompanies.filter((entry) => entry.room?.code === selectedRoomCode);

  const mapCenter = useMemo<[number, number]>(() => {
    const firstZone = mappableZones[0];

    if (!firstZone || firstZone.latitude == null || firstZone.longitude == null) {
      return defaultMapCenter;
    }

    return [firstZone.latitude, firstZone.longitude];
  }, [mappableZones]);
  const Root = embedded ? "section" : "main";

  return (
    <Root
      className={[
        "bg-[var(--s2ee-canvas)] font-mono text-[color:var(--s2ee-soft-foreground)]",
        embedded ? "min-h-0" : "min-h-[100dvh]",
      ].join(" ")}
    >
      <div className="mx-auto max-w-[1480px] px-5 py-6 sm:px-8 sm:py-8">
        <div className="space-y-6">
          <header className="space-y-3 border-b border-[var(--s2ee-border)] pb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
              Carte
            </p>
            <h1 className="text-3xl font-black tracking-[-0.08em] text-slate-900 sm:text-4xl">
              Zones et entreprises
            </h1>
          </header>

          {AsyncResult.isInitial(zonesResult) || AsyncResult.isInitial(companiesResult) ? (
            <div className="border border-[var(--s2ee-border)] bg-white p-8 text-sm text-[color:var(--s2ee-muted-foreground)]">
              Chargement de la carte...
            </div>
          ) : null}

          {AsyncResult.isFailure(zonesResult) || AsyncResult.isFailure(companiesResult) ? (
            <div className="border border-[var(--s2ee-border)] bg-white p-8 text-sm text-red-600">
              Impossible de charger la carte publique.
            </div>
          ) : null}

          {!AsyncResult.isFailure(zonesResult) && !AsyncResult.isFailure(companiesResult) && mappableZones.length === 0 ? (
            <Empty className="border border-dashed border-[var(--s2ee-border)] bg-white p-8">
              <EmptyHeader>
                <EmptyMedia className="rounded-none" variant="icon">
                  <MapPinnedIcon className="size-5" />
                </EmptyMedia>
                <EmptyTitle>Aucune zone disponible</EmptyTitle>
                <EmptyDescription>Les zones geo-localisees apparaitront ici.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}

          {mappableZones.length > 0 ? (
            <div
              className={[
                "overflow-hidden border border-[var(--s2ee-border)] bg-white",
                embedded ? "h-[42rem]" : "h-[72vh]",
              ].join(" ")}
            >
              <MapContainer center={mapCenter} className="h-full w-full" zoom={15} style={{ zIndex: 0 }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableZones.map((zone) => (
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
                    <Tooltip direction="top" offset={[0, -24]} opacity={1}>
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
        </div>
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
                <Label htmlFor="public-room-filter">Salle</Label>
                <Select onValueChange={(value) => setSelectedRoomCode(value ?? "all")} value={selectedRoomCode}>
                  <SelectTrigger id="public-room-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les salles</SelectItem>
                    {roomCodes.map((roomCode) => (
                      <SelectItem key={roomCode} value={roomCode}>
                        {roomCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {visibleCompanies.length === 0 ? (
                <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
                  <EmptyHeader>
                    <EmptyTitle>Aucune entreprise</EmptyTitle>
                    <EmptyDescription>Aucune entreprise ne correspond a cette selection.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
                  {visibleCompanies.map((entry) => (
                    <div className="bg-white p-4" key={entry.company.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                            {entry.company.name}
                          </p>
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
    </Root>
  );
}
