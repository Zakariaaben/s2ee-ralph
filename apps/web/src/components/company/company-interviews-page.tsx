"use client";

import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { Button } from "@project/ui/components/button";
import { Input } from "@project/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@project/ui/components/select";
import { Skeleton } from "@project/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@project/ui/components/table";
import type { Interview } from "@project/domain";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type React from "react";
import { useDeferredValue, useState } from "react";

import { companyWorkspaceAtoms } from "@/lib/company-atoms";
import {
  buildCompanyInterviewListRows,
  filterCompanyInterviewListRows,
} from "@/lib/company-interviews";

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

export function CompanyInterviewsPage(): React.ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "completed">("all");
  const deferredQuery = useDeferredValue(query);

  const activeInterviewsResult = useAtomValue(companyWorkspaceAtoms.activeInterviews);
  const completedInterviewsResult = useAtomValue(companyWorkspaceAtoms.completedInterviews);
  const activeInterviewsState = toAsyncPanelState(
    activeInterviewsResult,
    "The active interview list could not be loaded.",
  );
  const completedInterviewsState = toAsyncPanelState(
    completedInterviewsResult,
    "The completed interview list could not be loaded.",
  );

  if (activeInterviewsState.kind === "loading" || completedInterviewsState.kind === "loading") {
    return (
      <main className="min-h-[100dvh] bg-white font-mono text-[color:var(--s2ee-soft-foreground)]">
        <div className="mx-auto grid max-w-[1600px] gap-4 px-5 py-6 sm:px-8 sm:py-8">
          <Skeleton className="h-14 rounded-none" />
          <Skeleton className="h-[40rem] rounded-none" />
        </div>
      </main>
    );
  }

  const rows =
    activeInterviewsState.kind === "success" && completedInterviewsState.kind === "success"
      ? filterCompanyInterviewListRows(
          buildCompanyInterviewListRows({
            activeInterviews: activeInterviewsState.value,
            completedInterviews: completedInterviewsState.value,
          }),
          {
            query: deferredQuery,
            status,
          },
        )
      : [];

  return (
    <main className="min-h-[100dvh] bg-white font-mono text-[color:var(--s2ee-soft-foreground)]">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <header className="flex flex-col gap-4 border-b border-[var(--s2ee-border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Company interviews
            </p>
            <div className="space-y-1">
              <h1 className="text-[clamp(2rem,4vw,3.2rem)] font-black tracking-[-0.08em]">
                Interview list
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                Filter the active and completed interview history, then open the specific item you
                want to continue or inspect.
              </p>
            </div>
          </div>

          <Button className="rounded-none" onClick={() => navigate({ to: "/company" })} variant="outline">
            <ArrowLeftIcon />
            Back to scanner
          </Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
            onChange={(event) => {
              const { value } = event.currentTarget;
              setQuery(value);
            }}
            placeholder="Search by candidate, recruiter, institution, or score"
            value={query}
          />
          <Select onValueChange={(value) => setStatus(value as "all" | "active" | "completed")} value={status}>
            <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All interviews</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="completed">Completed only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-[var(--s2ee-border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate / Interview</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead>Academic</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell className="py-8 text-sm text-[color:var(--s2ee-muted-foreground)]" colSpan={5}>
                    No interviews match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    className={row.kind === "active" ? "cursor-pointer" : undefined}
                    key={`${row.kind}:${row.id}`}
                    onClick={() =>
                      row.kind === "active"
                        ? navigate({
                            to: "/company/interviews/$interviewId",
                            params: { interviewId: row.id as Interview["id"] },
                          })
                        : undefined
                    }
                  >
                    <TableCell className="font-bold uppercase tracking-[0.12em]">
                      {row.label}
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.recruiterName}</TableCell>
                    <TableCell>{row.institution.length === 0 ? "Active session" : `${row.institution} · ${row.major}`}</TableCell>
                    <TableCell>{row.scoreLabel}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
