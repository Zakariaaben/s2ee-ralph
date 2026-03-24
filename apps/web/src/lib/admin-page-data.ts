import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { adminWorkspaceAtoms } from "@/lib/admin-atoms";
import {
  selectRecentAdminInterviews,
  summarizeAdminWorkspace,
} from "@/lib/admin-workspace";

export type AdminAsyncState<Value> =
  | { readonly kind: "loading" }
  | { readonly kind: "failure"; readonly message: string }
  | { readonly kind: "success"; readonly value: Value };

const toAdminAsyncState = <Value,>(
  result: AsyncResult.AsyncResult<Value, unknown>,
  failureMessage: string,
): AdminAsyncState<Value> => {
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

export const formatAdminMutationError = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return "The admin update did not complete. Refresh the page and try again.";
};

export const useAdminCompanyLedgerState = () =>
  toAdminAsyncState(
    useAtomValue(adminWorkspaceAtoms.companyLedger),
    "The company ledger could not be loaded.",
  );

export const useAdminInterviewLedgerState = () =>
  toAdminAsyncState(
    useAtomValue(adminWorkspaceAtoms.interviewLedger),
    "The interview ledger could not be loaded.",
  );

export const useAdminAccessLedgerState = () =>
  toAdminAsyncState(
    useAtomValue(adminWorkspaceAtoms.accessLedger),
    "The access ledger could not be loaded.",
  );

export const useAdminVenueRoomsState = () =>
  toAdminAsyncState(
    useAtomValue(adminWorkspaceAtoms.venueRooms),
    "The venue rooms could not be loaded.",
  );

export const useAdminPublishedVenueMapState = () =>
  toAdminAsyncState(
    useAtomValue(adminWorkspaceAtoms.publishedVenueMap),
    "The published venue map could not be loaded.",
  );

export const useAdminOverviewData = () => {
  const companyLedgerState = useAdminCompanyLedgerState();
  const interviewLedgerState = useAdminInterviewLedgerState();
  const accessLedgerState = useAdminAccessLedgerState();

  const companyLedger = companyLedgerState.kind === "success" ? companyLedgerState.value : [];
  const interviewLedger = interviewLedgerState.kind === "success" ? interviewLedgerState.value : [];
  const accessLedger = accessLedgerState.kind === "success" ? accessLedgerState.value : [];

  return {
    companyLedgerState,
    interviewLedgerState,
    accessLedgerState,
    summary: summarizeAdminWorkspace({
      companyLedger,
      interviewLedger,
      accessLedger,
    }),
    recentInterviews: selectRecentAdminInterviews(interviewLedger),
  };
};

export const useRefreshAdminOverview = (): (() => void) => {
  const refreshCompanyLedger = useAtomRefresh(adminWorkspaceAtoms.companyLedger);
  const refreshInterviewLedger = useAtomRefresh(adminWorkspaceAtoms.interviewLedger);
  const refreshAccessLedger = useAtomRefresh(adminWorkspaceAtoms.accessLedger);

  return () => {
    refreshCompanyLedger();
    refreshInterviewLedger();
    refreshAccessLedger();
  };
};

export const useAdminSignOut = (): {
  readonly isSigningOut: boolean;
  readonly signOut: () => Promise<void>;
} => {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);

  return {
    isSigningOut,
    signOut: async () => {
      setIsSigningOut(true);

      try {
        await authClient.signOut();
        await navigate({ replace: true, to: "/" });
      } finally {
        setIsSigningOut(false);
      }
    },
  };
};
