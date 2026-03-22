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
  useEffectEvent,
  useState,
} from "react";

import { authClient } from "@/lib/auth-client";
import { getRoleHomePath } from "@/lib/auth-routing";
import { adminWorkspaceAtoms, adminWorkspaceReactivity } from "@/lib/admin-atoms";
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
  const session = authClient.useSession();
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
  const venueRoomsResult = useAtomValue(adminWorkspaceAtoms.venueRooms);

  const refreshCompanyLedger = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const refreshAccessLedger = useAtomRefresh(adminWorkspaceAtoms.accessLedger);
  const refreshInterviewLedger = useAtomRefresh(adminWorkspaceAtoms.interviewLedger);
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

  const redirectTo = useEffectEvent((role: UserRoleValue | undefined | null) => {
    window.location.replace(role ? getRoleHomePath(role) : "/");
  });

  const currentRole = (session.data?.user as { role?: UserRoleValue } | undefined)?.role;

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (!currentRole) {
      redirectTo(null);
      return;
    }

    if (currentRole !== "admin") {
      redirectTo(currentRole);
    }
  }, [currentRole, redirectTo, session.isPending]);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await authClient.signOut();
      redirectTo(null);
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
  const venueRoomsState = toAsyncPanelState(
    venueRoomsResult,
    "Venue rooms could not be loaded from the venue contract.",
  );

  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const accessLedger = accessLedgerState.kind === "success" ? accessLedgerState.value : [];
  const interviewLedger = interviewLedgerState.kind === "success" ? interviewLedgerState.value : [];
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

  const refreshWorkspace = () => {
    refreshCompanyLedger();
    refreshAccessLedger();
    refreshInterviewLedger();
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
                                  {entry.student.course}
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
