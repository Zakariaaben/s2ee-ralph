"use client";

import { Badge } from "@project/ui/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@project/ui/components/empty";
import { Input } from "@project/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@project/ui/components/select";
import { ClipboardListIcon, SearchIcon } from "lucide-react";
import type React from "react";
import { useDeferredValue, useState } from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import { useAdminInterviewLedgerState } from "@/lib/admin-page-data";
import { filterAdminInterviewLedger } from "@/lib/admin-workspace";

const interviewStatusOptions = [
  { value: "all", label: "Tous les etats" },
  { value: "completed", label: "Termines" },
  { value: "cancelled", label: "Annules" },
] as const;

const interviewStatusBadgeVariant = (
  status: "active" | "completed" | "cancelled",
): React.ComponentProps<typeof Badge>["variant"] =>
  status === "completed" ? "success" : status === "active" ? "default" : "outline";

export function AdminInterviewsPage(): React.ReactElement {
  const interviewLedgerState = useAdminInterviewLedgerState();
  const [interviewQuery, setInterviewQuery] = useState("");
  const [interviewStatusFilter, setInterviewStatusFilter] =
    useState<(typeof interviewStatusOptions)[number]["value"]>("all");

  const visibleInterviews = filterAdminInterviewLedger(
    interviewLedgerState.kind === "success" ? interviewLedgerState.value : [],
    {
      query: useDeferredValue(interviewQuery),
      status: interviewStatusFilter,
    },
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader
        description=""
        eyebrow="Admin"
        title="Entretiens"
      />

      <section className="space-y-6 border border-[var(--s2ee-border)] bg-white p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--s2ee-muted-foreground)]" />
            <Input
              className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] pl-9 shadow-none"
              onChange={(event) => {
                setInterviewQuery(event.target.value);
              }}
              placeholder="Rechercher une entreprise, un etudiant, un recruteur ou un CV"
              value={interviewQuery}
            />
          </div>
          <Select
            onValueChange={(value) => {
              setInterviewStatusFilter(value as (typeof interviewStatusOptions)[number]["value"]);
            }}
            value={interviewStatusFilter}
          >
            <SelectTrigger className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none">
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

        {interviewLedgerState.kind === "loading" ? <AdminLoadingPanel /> : null}
        {interviewLedgerState.kind === "failure" ? (
          <AdminFailurePanel
            description={interviewLedgerState.message}
            title="Entretiens indisponibles"
          />
        ) : null}
        {interviewLedgerState.kind === "success" && visibleInterviews.length === 0 ? (
          <Empty className="border border-dashed border-[var(--s2ee-border)] p-8">
            <EmptyHeader>
              <EmptyMedia className="rounded-none" variant="icon">
                <ClipboardListIcon className="size-5" />
              </EmptyMedia>
              <EmptyTitle>Aucun entretien ne correspond</EmptyTitle>
              <EmptyDescription>
                Modifiez les filtres pour afficher plus de resultats.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {interviewLedgerState.kind === "success" && visibleInterviews.length > 0 ? (
          <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
            {visibleInterviews.map((entry) => (
              <div className="bg-white p-5" key={entry.interview.id}>
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] xl:items-center">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                        {entry.company.name}
                      </p>
                      <Badge variant={interviewStatusBadgeVariant(entry.interview.status)}>
                        {entry.interview.status}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
                      {entry.student.firstName} {entry.student.lastName} · {entry.student.academicYear} ·{" "}
                      {entry.student.major}
                    </p>
                  </div>
                  <div className="space-y-1 text-sm text-[color:var(--s2ee-muted-foreground)]">
                    <p>Recruteur : {entry.interview.recruiterName}</p>
                    <p>
                      CV: {entry.cvProfile.profileType.label} · {entry.cvProfile.fileName}
                    </p>
                  </div>
                  <div className="text-sm font-medium text-slate-900">
                    {entry.interview.score == null
                      ? "Sans note"
                      : `${entry.interview.score.toFixed(1)} / 5`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
