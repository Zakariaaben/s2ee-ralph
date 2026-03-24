"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Badge } from "@project/ui/components/badge";
import { Button } from "@project/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@project/ui/components/card";
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
import { Separator } from "@project/ui/components/separator";
import { Skeleton } from "@project/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@project/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@project/ui/components/tabs";
import { useNavigate } from "@tanstack/react-router";
import type {
  AdminAccessLedgerEntry,
  AdminCompanyLedgerEntry,
  AdminInterviewLedgerEntry,
  Room,
  UserRoleValue,
} from "@project/domain";
import {
  ArrowUpRightIcon,
  BadgeCheckIcon,
  Building2Icon,
  CircleAlertIcon,
  ClipboardListIcon,
  DoorOpenIcon,
  LogOutIcon,
  MapPinnedIcon,
  PencilLineIcon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  UsersRoundIcon,
} from "lucide-react";
import type React from "react";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
} from "react";

import { authClient } from "@/lib/auth-client";
import { adminWorkspaceAtoms, adminWorkspaceReactivity } from "@/lib/admin-atoms";
import {
  buildVenueMapRoomRows,
  calculateVenueMapPinCoordinates,
  formatVenueMapPinPosition,
} from "@/lib/admin-map";
import {
  describeVenueRoomOccupancy,
  filterPlacementManagementCompanies,
  filterVenueRoomSummaries,
} from "@/lib/admin-venue";
import {
  describeAdminAccessSubject,
  describeAdminPlacement,
  filterAdminAccessLedger,
  filterAdminCompanyLedger,
  filterAdminInterviewLedger,
  selectRecentAdminInterviews,
  summarizeAdminWorkspace,
} from "@/lib/admin-workspace";

type AsyncPanelState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

const toAsyncPanelState = <Value,>(
  result: AsyncResult.AsyncResult<Value, unknown>,
  failureMessage: string,
): AsyncPanelState<Value> => {
  if (AsyncResult.isInitial(result)) {
    return { kind: "loading" };
  }

  if (AsyncResult.isFailure(result)) {
    return {
      kind: "failure",
      message: failureMessage,
    };
  }

  return {
    kind: "success",
    value: result.value,
  };
};

const formatMutationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The admin update did not complete. Refresh the workspace and try again.";
};

const companyArrivalOptions = [
  { value: "pending", label: "Pending arrival" },
  { value: "arrived", label: "Arrived" },
  { value: "all", label: "All arrival states" },
] as const;

const companyPlacementOptions = [
  { value: "placed", label: "Placed" },
  { value: "unplaced", label: "Unplaced" },
  { value: "all", label: "All placements" },
] as const;

const accessRoleFilterOptions = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admin" },
  { value: "company", label: "Company" },
  { value: "check-in", label: "Check-in" },
  { value: "student", label: "Student" },
] as const;

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "company", label: "Company" },
  { value: "check-in", label: "Check-in" },
  { value: "student", label: "Student" },
] as const;

const interviewStatusOptions = [
  { value: "all", label: "All interview states" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const roleBadgeVariant = (role: UserRoleValue): React.ComponentProps<typeof Badge>["variant"] => {
  switch (role) {
    case "admin":
      return "warning";
    case "company":
      return "default";
    case "check-in":
      return "info";
    case "student":
      return "secondary";
  }
};

const arrivalBadgeVariant = (
  status: AdminCompanyLedgerEntry["arrivalStatus"],
): React.ComponentProps<typeof Badge>["variant"] =>
  status === "arrived" ? "success" : "outline";

const interviewStatusBadgeVariant = (
  status: AdminInterviewLedgerEntry["interview"]["status"],
): React.ComponentProps<typeof Badge>["variant"] =>
  status === "completed" ? "success" : "outline";

function LoadingCard(): React.ReactElement {
  return (
    <Card>
      <CardHeader className="gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </CardContent>
    </Card>
  );
}

function FailureCard(props: {
  readonly title: string;
  readonly description: string;
}): React.ReactElement {
  return (
    <Card>
      <CardContent className="pt-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlertIcon className="size-5" />
            </EmptyMedia>
            <EmptyTitle>{props.title}</EmptyTitle>
            <EmptyDescription>{props.description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </CardContent>
    </Card>
  );
}

export function AdminWorkspace(): React.ReactElement {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingVenueActionId, setPendingVenueActionId] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyArrivalFilter, setCompanyArrivalFilter] =
    useState<(typeof companyArrivalOptions)[number]["value"]>("pending");
  const [companyPlacementFilter, setCompanyPlacementFilter] =
    useState<(typeof companyPlacementOptions)[number]["value"]>("all");
  const [venueQuery, setVenueQuery] = useState("");
  const [placementQuery, setPlacementQuery] = useState("");
  const [newRoomCode, setNewRoomCode] = useState("");
  const [selectedVenueMapFile, setSelectedVenueMapFile] = useState<File | null>(null);
  const [venueMapFileInputResetKey, setVenueMapFileInputResetKey] = useState(0);
  const [selectedVenueMapRoomId, setSelectedVenueMapRoomId] = useState<Room["id"] | null>(null);
  const [accessQuery, setAccessQuery] = useState("");
  const [accessRoleFilter, setAccessRoleFilter] =
    useState<(typeof accessRoleFilterOptions)[number]["value"]>("all");
  const [interviewQuery, setInterviewQuery] = useState("");
  const [interviewStatusFilter, setInterviewStatusFilter] =
    useState<(typeof interviewStatusOptions)[number]["value"]>("all");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, UserRoleValue>>({});
  const [roomCodeDrafts, setRoomCodeDrafts] = useState<Record<string, string>>({});
  const [placementRoomDrafts, setPlacementRoomDrafts] = useState<Record<string, string>>({});
  const [placementStandDrafts, setPlacementStandDrafts] = useState<Record<string, string>>({});

  const deferredCompanyQuery = useDeferredValue(companyQuery);
  const deferredVenueQuery = useDeferredValue(venueQuery);
  const deferredPlacementQuery = useDeferredValue(placementQuery);
  const deferredAccessQuery = useDeferredValue(accessQuery);
  const deferredInterviewQuery = useDeferredValue(interviewQuery);

  const companyLedgerResult = useAtomValue(adminWorkspaceAtoms.companyLedger);
  const accessLedgerResult = useAtomValue(adminWorkspaceAtoms.accessLedger);
  const interviewLedgerResult = useAtomValue(adminWorkspaceAtoms.interviewLedger);
  const publishedVenueMapResult = useAtomValue(adminWorkspaceAtoms.publishedVenueMap);
  const venueRoomsResult = useAtomValue(adminWorkspaceAtoms.venueRooms);

  const refreshCompanyLedger = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const refreshAccessLedger = useAtomRefresh(adminWorkspaceAtoms.accessLedger);
  const refreshInterviewLedger = useAtomRefresh(adminWorkspaceAtoms.interviewLedger);
  const refreshPublishedVenueMap = useAtomRefresh(adminWorkspaceAtoms.publishedVenueMap);
  const refreshVenueRooms = useAtomRefresh(adminWorkspaceAtoms.venueRooms);

  const changeUserRole = useAtomSet(adminWorkspaceAtoms.changeUserRole, {
    mode: "promise",
  });
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
  const publishVenueMap = useAtomSet(adminWorkspaceAtoms.publishVenueMap, {
    mode: "promise",
  });
  const clearPublishedVenueMap = useAtomSet(adminWorkspaceAtoms.clearPublishedVenueMap, {
    mode: "promise",
  });
  const upsertVenueMapRoomPin = useAtomSet(adminWorkspaceAtoms.upsertVenueMapRoomPin, {
    mode: "promise",
  });
  const deleteVenueMapRoomPin = useAtomSet(adminWorkspaceAtoms.deleteVenueMapRoomPin, {
    mode: "promise",
  });

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      await navigate({ replace: true, to: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  const companyLedgerState = toAsyncPanelState(
    companyLedgerResult,
    "The company oversight ledger could not be loaded from the admin contract.",
  );
  const accessLedgerState = toAsyncPanelState(
    accessLedgerResult,
    "The access ledger could not be loaded from the admin contract.",
  );
  const interviewLedgerState = toAsyncPanelState(
    interviewLedgerResult,
    "The interview ledger could not be loaded from the admin contract.",
  );
  const publishedVenueMapState = toAsyncPanelState(
    publishedVenueMapResult,
    "The published venue map could not be loaded from the venue contract.",
  );
  const venueRoomsState = toAsyncPanelState(
    venueRoomsResult,
    "Venue rooms could not be loaded from the venue contract.",
  );

  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const accessLedger = accessLedgerState.kind === "success" ? accessLedgerState.value : [];
  const interviewLedger = interviewLedgerState.kind === "success" ? interviewLedgerState.value : [];
  const publishedVenueMap =
    publishedVenueMapState.kind === "success" ? publishedVenueMapState.value : null;
  const venueRooms = venueRoomsState.kind === "success" ? venueRoomsState.value : [];

  useEffect(() => {
    if (accessLedgerState.kind !== "success") {
      return;
    }

    setRoleDrafts(
      Object.fromEntries(accessLedgerState.value.map((entry) => [entry.user.id, entry.user.role])),
    );
  }, [accessLedgerState]);

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
    if (companyLedgerState.kind !== "success") {
      return;
    }

    setPlacementRoomDrafts(
      Object.fromEntries(
        companyLedgerState.value.map((entry) => [entry.company.id, entry.room?.id ?? "unplaced"]),
      ),
    );
    setPlacementStandDrafts(
      Object.fromEntries(
        companyLedgerState.value.map((entry) => [
          entry.company.id,
          entry.standNumber == null ? "" : String(entry.standNumber),
        ]),
      ),
    );
  }, [companyLedgerState]);

  const summary = summarizeAdminWorkspace({
    companyLedger,
    accessLedger,
    interviewLedger,
  });

  const visibleCompanies = filterAdminCompanyLedger(companyLedger, {
    query: deferredCompanyQuery,
    arrival: companyArrivalFilter,
    placement: companyPlacementFilter,
  });
  const visibleAccessEntries = filterAdminAccessLedger(accessLedger, {
    query: deferredAccessQuery,
    role: accessRoleFilter,
  });
  const visibleVenueRooms = filterVenueRoomSummaries(venueRooms, deferredVenueQuery);
  const manageableCompanies = filterPlacementManagementCompanies(
    companyLedger,
    deferredPlacementQuery,
  );
  const visibleInterviews = filterAdminInterviewLedger(interviewLedger, {
    query: deferredInterviewQuery,
    status: interviewStatusFilter,
  });
  const recentInterviews = selectRecentAdminInterviews(interviewLedger);
  const venueMapRoomRows = buildVenueMapRoomRows(venueRooms, publishedVenueMap);
  const selectedVenueMapRoom =
    selectedVenueMapRoomId == null
      ? null
      : venueMapRoomRows.find((row) => row.room.id === selectedVenueMapRoomId) ?? null;
  const publishedVenueMapImageSrc =
    publishedVenueMap == null
      ? null
      : `data:${publishedVenueMap.image.contentType};base64,${publishedVenueMap.image.contentsBase64}`;

  const refreshWorkspace = () => {
    refreshCompanyLedger();
    refreshAccessLedger();
    refreshInterviewLedger();
    refreshPublishedVenueMap();
    refreshVenueRooms();
  };

  const applyRoleChange = async (entry: AdminAccessLedgerEntry) => {
    const nextRole = roleDrafts[entry.user.id] ?? entry.user.role;

    if (nextRole === entry.user.role) {
      return;
    }

    setPendingUserId(entry.user.id);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await changeUserRole({
        payload: {
          userId: entry.user.id,
          role: nextRole,
        },
        reactivityKeys: adminWorkspaceReactivity.accessLedger,
      });
      startTransition(() => {
        setWorkspaceMessage(`${entry.user.email} now uses the ${nextRole} role.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingUserId(null);
    }
  };

  const submitNewRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const code = newRoomCode.trim();

    if (code.length === 0) {
      setWorkspaceError("Room code cannot be blank.");
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
      startTransition(() => {
        setNewRoomCode("");
        setWorkspaceMessage(`Room ${code} created.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const saveRoomCode = async (roomId: Room["id"], currentCode: string) => {
    const nextCode = (roomCodeDrafts[roomId] ?? "").trim();

    if (nextCode.length === 0) {
      setWorkspaceError("Room code cannot be blank.");
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
        payload: { roomId, code: nextCode },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      startTransition(() => {
        setWorkspaceMessage(`Room ${currentCode} renamed to ${nextCode}.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
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
        payload: { roomId },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      startTransition(() => {
        setWorkspaceMessage(`Room ${roomCode} deleted and linked placements cleared.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const savePlacement = async (entry: AdminCompanyLedgerEntry) => {
    const selectedRoomId = placementRoomDrafts[entry.company.id] ?? "unplaced";
    const standValue = (placementStandDrafts[entry.company.id] ?? "").trim();

    if (selectedRoomId === "unplaced") {
      setWorkspaceError("Choose a room before saving a placement.");
      return;
    }

    const roomId = selectedRoomId as Room["id"];

    const standNumber = Number(standValue);

    if (!Number.isInteger(standNumber) || standNumber <= 0) {
      setWorkspaceError("Stand number must be a positive whole number.");
      return;
    }

    setPendingVenueActionId(`placement:save:${entry.company.id}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await assignCompanyPlacement({
        payload: {
          companyId: entry.company.id,
          roomId,
          standNumber,
        },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      startTransition(() => {
        setWorkspaceMessage(`Placement saved for ${entry.company.name}.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
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
        payload: { companyId: entry.company.id },
        reactivityKeys: {
          venueRooms: adminWorkspaceReactivity.venueRooms,
          companyLedger: adminWorkspaceReactivity.companyLedger,
        },
      });
      startTransition(() => {
        setWorkspaceMessage(`Placement cleared for ${entry.company.name}.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

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

  const publishSelectedVenueMap = async () => {
    if (!selectedVenueMapFile) {
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
      startTransition(() => {
        setSelectedVenueMapFile(null);
        setVenueMapFileInputResetKey((current) => current + 1);
        setWorkspaceMessage(`${selectedVenueMapFile.name} published as the venue map.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
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
      startTransition(() => {
        setWorkspaceMessage("Published venue map cleared.");
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const saveVenueMapPinFromClick = async (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!selectedVenueMapRoom) {
      setWorkspaceError("Choose a room before placing a venue map pin.");
      return;
    }

    if (publishedVenueMap == null) {
      setWorkspaceError("Publish the venue map image before placing room pins.");
      return;
    }

    const { xPercent, yPercent } = calculateVenueMapPinCoordinates({
      clientX: event.clientX,
      clientY: event.clientY,
      bounds: event.currentTarget.getBoundingClientRect(),
    });

    setPendingVenueActionId(`map:pin:${selectedVenueMapRoom.room.id}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await upsertVenueMapRoomPin({
        payload: {
          roomId: selectedVenueMapRoom.room.id,
          xPercent,
          yPercent,
        },
        reactivityKeys: {
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      startTransition(() => {
        setWorkspaceMessage(`Pin saved for room ${selectedVenueMapRoom.room.code}.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const removeVenueMapPin = async (roomEntry: (typeof venueMapRoomRows)[number]) => {
    setPendingVenueActionId(`map:pin:clear:${roomEntry.room.id}`);
    setWorkspaceError(null);
    setWorkspaceMessage(null);

    try {
      await deleteVenueMapRoomPin({
        payload: {
          roomId: roomEntry.room.id,
        },
        reactivityKeys: {
          publishedVenueMap: adminWorkspaceReactivity.publishedVenueMap,
        },
      });
      startTransition(() => {
        setWorkspaceMessage(`Pin cleared for room ${roomEntry.room.code}.`);
      });
    } catch (error) {
      setWorkspaceError(formatMutationError(error));
    } finally {
      setPendingVenueActionId(null);
    }
  };

  const ledgersLoading =
    companyLedgerState.kind === "loading" &&
    accessLedgerState.kind === "loading" &&
    interviewLedgerState.kind === "loading";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.10),_transparent_42%),linear-gradient(180deg,_hsl(var(--background)),_hsl(var(--muted)/0.45))]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border bg-card/95 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 p-5 sm:p-6 xl:flex-row xl:items-end xl:justify-between xl:p-8">
            <div className="max-w-4xl space-y-4">
              <Badge className="w-fit gap-2 bg-primary/10 text-primary hover:bg-primary/10">
                <ShieldCheckIcon className="size-3.5" />
                Admin operations
              </Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Event oversight and access control
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Monitor event readiness, inspect company placement and interview flow, and adjust
                  account roles without leaving the admin surface.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Companies placed</CardDescription>
                    <CardTitle className="text-3xl">
                      {summary.placedCompanyCount}
                      <span className="ml-2 text-base font-medium text-muted-foreground">
                        / {summary.companyCount}
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Pending arrivals</CardDescription>
                    <CardTitle className="text-3xl">{summary.pendingArrivalCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Logged interviews</CardDescription>
                    <CardTitle className="text-3xl">{summary.interviewCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-dashed bg-background/70 shadow-none">
                  <CardHeader className="space-y-1 pb-2">
                    <CardDescription>Provisioned accounts</CardDescription>
                    <CardTitle className="text-3xl">{summary.accessEntryCount}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3">
              <Card className="border-primary/20 bg-primary/5 shadow-none">
                <CardHeader className="gap-2 pb-4">
                  <CardDescription className="text-primary">Next focus</CardDescription>
                  <CardTitle className="text-base leading-6">{summary.nextOperationalLabel}</CardTitle>
                </CardHeader>
              </Card>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="flex-1" onClick={refreshWorkspace} type="button" variant="outline">
                  <RefreshCwIcon className="size-4" />
                  Refresh ledgers
                </Button>
                <Button
                  className="flex-1"
                  disabled={isSigningOut}
                  onClick={() => {
                    void handleSignOut();
                  }}
                  type="button"
                  variant="ghost"
                >
                  <LogOutIcon className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </section>

        {workspaceMessage ? (
          <Alert variant="success">
            <BadgeCheckIcon className="size-4" />
            <AlertTitle>Admin update saved</AlertTitle>
            <AlertDescription>{workspaceMessage}</AlertDescription>
          </Alert>
        ) : null}

        {workspaceError ? (
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Admin update failed</AlertTitle>
            <AlertDescription>{workspaceError}</AlertDescription>
          </Alert>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
          <Tabs className="gap-4" defaultValue="companies">
            <TabsList className="w-full justify-start overflow-x-auto rounded-2xl bg-card p-1">
              <TabsTrigger value="companies">Company oversight</TabsTrigger>
              <TabsTrigger value="venue">Venue management</TabsTrigger>
              <TabsTrigger value="map">Map publishing</TabsTrigger>
              <TabsTrigger value="access">Access ledger</TabsTrigger>
              <TabsTrigger value="interviews">Interview ledger</TabsTrigger>
            </TabsList>

            <TabsContent value="companies">
              {companyLedgerState.kind === "loading" ? <LoadingCard /> : null}
              {companyLedgerState.kind === "failure" ? (
                <FailureCard
                  description={companyLedgerState.message}
                  title="Company ledger unavailable"
                />
              ) : null}
              {companyLedgerState.kind === "success" ? (
                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Company placement and arrival</CardTitle>
                      <CardDescription>
                        Track which companies are placed, which have arrived, and which recruiter
                        rosters are attached to each account.
                      </CardDescription>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
                      <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          onChange={(event) => {
                            setCompanyQuery(event.target.value);
                          }}
                          placeholder="Search company, room, stand, recruiter"
                          value={companyQuery}
                        />
                      </div>
                      <Select
                        onValueChange={(value) => {
                          setCompanyArrivalFilter(
                            value as (typeof companyArrivalOptions)[number]["value"],
                          );
                        }}
                        value={companyArrivalFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {companyArrivalOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        onValueChange={(value) => {
                          setCompanyPlacementFilter(
                            value as (typeof companyPlacementOptions)[number]["value"],
                          );
                        }}
                        value={companyPlacementFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {companyPlacementOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleCompanies.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Building2Icon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No companies match these filters</EmptyTitle>
                          <EmptyDescription>
                            Adjust the placement or arrival filters to inspect the full company
                            ledger.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <>
                        <div className="hidden lg:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Company</TableHead>
                                <TableHead>Placement</TableHead>
                                <TableHead>Arrival</TableHead>
                                <TableHead>Recruiters</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {visibleCompanies.map((entry) => (
                                <TableRow key={entry.company.id}>
                                  <TableCell className="align-top">
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{entry.company.name}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {entry.company.recruiters.length} recruiter
                                        {entry.company.recruiters.length === 1 ? "" : "s"}
                                      </p>
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <span className="text-sm text-muted-foreground">
                                      {describeAdminPlacement(entry)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                                      {entry.arrivalStatus === "arrived" ? "Arrived" : "Pending"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <div className="flex flex-wrap gap-2">
                                      {entry.company.recruiters.length === 0 ? (
                                        <Badge variant="outline">No recruiters</Badge>
                                      ) : (
                                        entry.company.recruiters.map((recruiter) => (
                                          <Badge key={recruiter.id} variant="outline">
                                            {recruiter.name}
                                          </Badge>
                                        ))
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        <div className="grid gap-3 lg:hidden">
                          {visibleCompanies.map((entry) => (
                            <Card key={entry.company.id} className="border-dashed shadow-none">
                              <CardContent className="space-y-3 pt-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{entry.company.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {describeAdminPlacement(entry)}
                                    </p>
                                  </div>
                                  <Badge variant={arrivalBadgeVariant(entry.arrivalStatus)}>
                                    {entry.arrivalStatus === "arrived" ? "Arrived" : "Pending"}
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {entry.company.recruiters.length === 0 ? (
                                    <Badge variant="outline">No recruiters</Badge>
                                  ) : (
                                    entry.company.recruiters.map((recruiter) => (
                                      <Badge key={recruiter.id} variant="outline">
                                        {recruiter.name}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="map">
              <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Published venue map</CardTitle>
                      <CardDescription>
                        Upload the single public map image, then keep room pins aligned with the
                        real room registry used elsewhere in admin operations.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="venue-map-upload">Map image</Label>
                      <Input
                        key={venueMapFileInputResetKey}
                        accept="image/*"
                        id="venue-map-upload"
                        onChange={(event) => {
                          setSelectedVenueMapFile(event.currentTarget.files?.[0] ?? null);
                        }}
                        type="file"
                      />
                      <p className="text-sm text-muted-foreground">
                        Re-publishing replaces the current map image and keeps existing room pins in
                        place for downstream public-map work.
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

                    {publishedVenueMapState.kind === "loading" ? (
                      <Skeleton className="h-40 w-full rounded-2xl" />
                    ) : null}
                    {publishedVenueMapState.kind === "failure" ? (
                      <FailureCard
                        description={publishedVenueMapState.message}
                        title="Published venue map unavailable"
                      />
                    ) : null}
                    {publishedVenueMapState.kind === "success" && publishedVenueMap == null ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <MapPinnedIcon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No venue map published yet</EmptyTitle>
                          <EmptyDescription>
                            Upload the floor map first, then click the preview to place room pins.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : null}
                    {publishedVenueMap ? (
                      <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                        <p className="font-medium text-sm text-foreground">
                          {publishedVenueMap.image.fileName}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {publishedVenueMap.pins.length} room pin
                          {publishedVenueMap.pins.length === 1 ? "" : "s"} currently published.
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Room pin console</CardTitle>
                      <CardDescription>
                        Select a room, then click the map preview to save or update its pin
                        coordinates.
                      </CardDescription>
                    </div>
                    {selectedVenueMapRoom ? (
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                        Active room: {selectedVenueMapRoom.room.code}. Click the map preview to place
                        the pin.
                      </div>
                    ) : null}
                  </CardHeader>
                  <CardContent className="grid gap-6 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
                    <div className="space-y-3">
                      {venueRoomsState.kind === "loading" ? (
                        <>
                          <Skeleton className="h-20 w-full rounded-2xl" />
                          <Skeleton className="h-20 w-full rounded-2xl" />
                        </>
                      ) : null}
                      {venueRoomsState.kind === "failure" ? (
                        <FailureCard
                          description={venueRoomsState.message}
                          title="Venue rooms unavailable"
                        />
                      ) : null}
                      {venueRoomsState.kind === "success" && venueMapRoomRows.length === 0 ? (
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <DoorOpenIcon className="size-5" />
                            </EmptyMedia>
                            <EmptyTitle>No rooms available for pinning</EmptyTitle>
                            <EmptyDescription>
                              Create rooms in venue management before publishing room pins.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      ) : null}
                      {venueRoomsState.kind === "success" && venueMapRoomRows.length > 0 ? (
                        <div className="grid gap-3">
                          {venueMapRoomRows.map((entry) => {
                            const isSelected = entry.room.id === selectedVenueMapRoomId;
                            const pendingClear =
                              pendingVenueActionId === `map:pin:clear:${entry.room.id}`;

                            return (
                              <Card
                                key={entry.room.id}
                                className={
                                  isSelected
                                    ? "border-primary/40 bg-primary/5 shadow-none"
                                    : "border-dashed shadow-none"
                                }
                              >
                                <CardContent className="space-y-3 pt-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="font-medium text-foreground">{entry.room.code}</p>
                                      <p className="text-sm text-muted-foreground">
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
                                    <Badge variant={entry.pin ? "success" : "outline"}>
                                      {entry.pin ? "Pinned" : "Unpinned"}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {entry.pin ? formatVenueMapPinPosition(entry.pin) : "No pin saved yet."}
                                  </p>
                                  <div className="flex flex-col gap-2 sm:flex-row">
                                    <Button
                                      onClick={() => {
                                        setSelectedVenueMapRoomId(entry.room.id);
                                      }}
                                      type="button"
                                      variant={isSelected ? "default" : "outline"}
                                    >
                                      {isSelected ? "Ready to place" : "Select room"}
                                    </Button>
                                    <Button
                                      disabled={entry.pin == null || pendingClear}
                                      onClick={() => {
                                        void removeVenueMapPin(entry);
                                      }}
                                      type="button"
                                      variant="ghost"
                                    >
                                      {pendingClear ? "Clearing..." : "Clear pin"}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-4">
                      {publishedVenueMap ? (
                        <div
                          className="relative overflow-hidden rounded-3xl border border-border/70 bg-muted/40"
                          onClick={(event) => {
                            void saveVenueMapPinFromClick(event);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <img
                            alt="Published venue map preview"
                            className="block max-h-[720px] w-full object-contain"
                            src={publishedVenueMapImageSrc ?? undefined}
                          />
                          {publishedVenueMap.pins.map((pin) => (
                            <button
                              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground shadow"
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
                      ) : (
                        <div className="flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm leading-6 text-muted-foreground">
                          Publish a venue map image to unlock interactive room pin placement.
                        </div>
                      )}
                      <p className="text-sm leading-6 text-muted-foreground">
                        Published pins are exposed through the shared venue contract with room and
                        company placement context so the public map slice can consume the data
                        directly.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="venue">
              <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.3fr)]">
                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Room registry</CardTitle>
                      <CardDescription>
                        Create, rename, and retire rooms while keeping the placement ledger in sync.
                      </CardDescription>
                    </div>
                    <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={(event) => {
                      void submitNewRoom(event);
                    }}>
                      <div className="space-y-2">
                        <Label htmlFor="new-room-code">New room code</Label>
                        <Input
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
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        onChange={(event) => {
                          setVenueQuery(event.target.value);
                        }}
                        placeholder="Search room, company, or stand"
                        value={venueQuery}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {venueRoomsState.kind === "loading" ? (
                      <>
                        <Skeleton className="h-24 w-full rounded-2xl" />
                        <Skeleton className="h-24 w-full rounded-2xl" />
                      </>
                    ) : null}
                    {venueRoomsState.kind === "failure" ? (
                      <FailureCard
                        description={venueRoomsState.message}
                        title="Venue registry unavailable"
                      />
                    ) : null}
                    {venueRoomsState.kind === "success" && visibleVenueRooms.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <MapPinnedIcon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No rooms match these filters</EmptyTitle>
                          <EmptyDescription>
                            Adjust the room query or create the first room for placement work.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : null}
                    {venueRoomsState.kind === "success" && visibleVenueRooms.length > 0 ? (
                      <div className="grid gap-3">
                        {visibleVenueRooms.map((summary) => {
                          const pendingRename = pendingVenueActionId === `room:update:${summary.room.id}`;
                          const pendingDelete = pendingVenueActionId === `room:delete:${summary.room.id}`;
                          const roomCodeDraft = roomCodeDrafts[summary.room.id] ?? summary.room.code;

                          return (
                            <Card key={summary.room.id} className="border-dashed shadow-none">
                              <CardContent className="space-y-4 pt-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">{summary.room.code}</p>
                                    <p className="text-sm text-muted-foreground">
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
                                    disabled={pendingRename || roomCodeDraft.trim() === summary.room.code}
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
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Placement console</CardTitle>
                      <CardDescription>
                        Assign companies to rooms and stands from the same admin surface that shows
                        operational arrival state.
                      </CardDescription>
                    </div>
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        onChange={(event) => {
                          setPlacementQuery(event.target.value);
                        }}
                        placeholder="Search company, recruiter, room, or stand"
                        value={placementQuery}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {companyLedgerState.kind === "loading" || venueRoomsState.kind === "loading" ? (
                      <>
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-28 w-full rounded-2xl" />
                      </>
                    ) : null}
                    {companyLedgerState.kind === "failure" ? (
                      <FailureCard
                        description={companyLedgerState.message}
                        title="Company placement ledger unavailable"
                      />
                    ) : null}
                    {venueRoomsState.kind === "failure" ? (
                      <FailureCard
                        description={venueRoomsState.message}
                        title="Venue room list unavailable"
                      />
                    ) : null}
                    {companyLedgerState.kind === "success" &&
                    venueRoomsState.kind === "success" &&
                    manageableCompanies.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Building2Icon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No companies match these filters</EmptyTitle>
                          <EmptyDescription>
                            Broaden the search query to continue venue placement work.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : null}
                    {companyLedgerState.kind === "success" &&
                    venueRoomsState.kind === "success" &&
                    manageableCompanies.length > 0 ? (
                      <div className="grid gap-3">
                        {manageableCompanies.map((entry) => {
                          const roomDraft = placementRoomDrafts[entry.company.id] ?? "unplaced";
                          const standDraft = placementStandDrafts[entry.company.id] ?? "";
                          const pendingSave =
                            pendingVenueActionId === `placement:save:${entry.company.id}`;
                          const pendingClear =
                            pendingVenueActionId === `placement:clear:${entry.company.id}`;

                          return (
                            <Card key={entry.company.id} className="border-dashed shadow-none">
                              <CardContent className="space-y-4 pt-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="font-medium text-foreground">{entry.company.name}</p>
                                    <p className="text-sm text-muted-foreground">
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
                                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_140px_auto_auto] xl:items-end">
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
                                      <SelectTrigger id={`placement-room-${entry.company.id}`}>
                                        <SelectValue />
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
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="access">
              {accessLedgerState.kind === "loading" ? <LoadingCard /> : null}
              {accessLedgerState.kind === "failure" ? (
                <FailureCard description={accessLedgerState.message} title="Access ledger unavailable" />
              ) : null}
              {accessLedgerState.kind === "success" ? (
                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Account role management</CardTitle>
                      <CardDescription>
                        Review provisioned users, inspect linked student or company context, and
                        apply admin-only role changes through the shared admin contract.
                      </CardDescription>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          onChange={(event) => {
                            setAccessQuery(event.target.value);
                          }}
                          placeholder="Search account, email, or linked profile"
                          value={accessQuery}
                        />
                      </div>
                      <Select
                        onValueChange={(value) => {
                          setAccessRoleFilter(
                            value as (typeof accessRoleFilterOptions)[number]["value"],
                          );
                        }}
                        value={accessRoleFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {accessRoleFilterOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleAccessEntries.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <UsersRoundIcon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No accounts match these filters</EmptyTitle>
                          <EmptyDescription>
                            Broaden the query or role filter to inspect the full access ledger.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <div className="grid gap-3">
                        {visibleAccessEntries.map((entry) => {
                          const draftRole = roleDrafts[entry.user.id] ?? entry.user.role;
                          const hasPendingChange = draftRole !== entry.user.role;
                          const isPending = pendingUserId === entry.user.id;

                          return (
                            <Card key={entry.user.id} className="border-dashed shadow-none">
                              <CardContent className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.9fr)] xl:items-center">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-medium text-foreground">{entry.user.name}</p>
                                    <Badge variant={roleBadgeVariant(entry.user.role)}>
                                      {entry.user.role}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{entry.user.email}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Linked subject: {describeAdminAccessSubject(entry)}
                                  </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                                  <Select
                                    onValueChange={(value) => {
                                      setRoleDrafts((current) => ({
                                        ...current,
                                        [entry.user.id]: value as UserRoleValue,
                                      }));
                                    }}
                                    value={draftRole}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {roleOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    disabled={!hasPendingChange || isPending}
                                    onClick={() => {
                                      void applyRoleChange(entry);
                                    }}
                                    type="button"
                                  >
                                    {isPending ? "Saving..." : "Apply role"}
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="interviews">
              {interviewLedgerState.kind === "loading" ? <LoadingCard /> : null}
              {interviewLedgerState.kind === "failure" ? (
                <FailureCard
                  description={interviewLedgerState.message}
                  title="Interview ledger unavailable"
                />
              ) : null}
              {interviewLedgerState.kind === "success" ? (
                <Card>
                  <CardHeader className="gap-4">
                    <div className="space-y-1">
                      <CardTitle>Interview activity ledger</CardTitle>
                      <CardDescription>
                        Inspect cross-company interview execution, recruiter attribution, and
                        student/CV context from one admin view.
                      </CardDescription>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          onChange={(event) => {
                            setInterviewQuery(event.target.value);
                          }}
                          placeholder="Search company, student, recruiter, CV"
                          value={interviewQuery}
                        />
                      </div>
                      <Select
                        onValueChange={(value) => {
                          setInterviewStatusFilter(
                            value as (typeof interviewStatusOptions)[number]["value"],
                          );
                        }}
                        value={interviewStatusFilter}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {interviewStatusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {visibleInterviews.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <ClipboardListIcon className="size-5" />
                          </EmptyMedia>
                          <EmptyTitle>No interviews match these filters</EmptyTitle>
                          <EmptyDescription>
                            Adjust the query or status filter to inspect the full interview ledger.
                          </EmptyDescription>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      <div className="grid gap-3">
                        {visibleInterviews.map((entry) => (
                          <Card key={entry.interview.id} className="border-dashed shadow-none">
                            <CardContent className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] xl:items-center">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-foreground">{entry.company.name}</p>
                                  <Badge variant={interviewStatusBadgeVariant(entry.interview.status)}>
                                    {entry.interview.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Student: {entry.student.firstName} {entry.student.lastName} ·{" "}
                                  {entry.student.academicYear} · {entry.student.major}
                                </p>
                              </div>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>Recruiter: {entry.interview.recruiterName}</p>
                                <p>
                                  CV: {entry.cvProfile.profileType.label} · {entry.cvProfile.fileName}
                                </p>
                              </div>
                              <div className="text-sm font-medium text-foreground">
                                {entry.interview.score == null
                                  ? "No score"
                                  : `${entry.interview.score.toFixed(1)} / 5`}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          </Tabs>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Operational monitor</CardTitle>
                <CardDescription>
                  A compact read on event readiness pulled directly from the three admin ledgers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ledgersLoading ? (
                  <>
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                  </>
                ) : (
                  <>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="flex items-start gap-3">
                        <SparklesIcon className="mt-0.5 size-4 text-primary" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Placement coverage</p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {summary.placedCompanyCount} of {summary.companyCount} companies have room
                            placement recorded.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="flex items-start gap-3">
                        <ArrowUpRightIcon className="mt-0.5 size-4 text-primary" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Arrival progress</p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {summary.arrivedCompanyCount} companies are marked arrived, with{" "}
                            {summary.pendingArrivalCount} placed companies still pending.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="flex items-start gap-3">
                        <UsersRoundIcon className="mt-0.5 size-4 text-primary" />
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Role coverage</p>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {summary.adminCount} admin, {summary.companyAccountCount} company,{" "}
                            {summary.checkInCount} check-in, and {summary.studentCount} student
                            accounts are currently provisioned.
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent interview flow</CardTitle>
                <CardDescription>
                  Latest interviews across companies, useful for quick operational spot checks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {interviewLedgerState.kind === "loading" ? (
                  <>
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                  </>
                ) : null}

                {interviewLedgerState.kind === "failure" ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    {interviewLedgerState.message}
                  </p>
                ) : null}

                {interviewLedgerState.kind === "success" && recentInterviews.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    No interview activity has been recorded yet.
                  </p>
                ) : null}

                {interviewLedgerState.kind === "success" && recentInterviews.length > 0 ? (
                  <div className="space-y-3">
                    {recentInterviews.map((entry, index) => (
                      <div key={entry.interview.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-foreground">{entry.company.name}</p>
                              <Badge variant={interviewStatusBadgeVariant(entry.interview.status)}>
                                {entry.interview.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entry.student.firstName} {entry.student.lastName} ·{" "}
                              {entry.interview.recruiterName}
                            </p>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {entry.interview.score == null
                              ? "No score"
                              : `${entry.interview.score.toFixed(1)} / 5`}
                          </p>
                        </div>
                        {index < recentInterviews.length - 1 ? <Separator className="mt-3" /> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
