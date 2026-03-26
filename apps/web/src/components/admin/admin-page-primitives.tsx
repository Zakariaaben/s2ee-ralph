"use client";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@project/ui/components/empty";
import { Skeleton } from "@project/ui/components/skeleton";
import { CircleAlertIcon } from "lucide-react";
import type React from "react";

export function AdminPageHeader(props: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly actions?: React.ReactNode;
}): React.ReactElement {
  return (
    <header className="grid gap-5 border-b border-[var(--s2ee-border)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--s2ee-muted-foreground)]">
          {props.eyebrow}
        </p>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-[-0.08em] text-slate-900 sm:text-4xl">
            {props.title}
          </h1>
          {props.description.length > 0 ? (
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
              {props.description}
            </p>
          ) : null}
        </div>
      </div>
      {props.actions ? <div className="flex flex-wrap items-center gap-3">{props.actions}</div> : null}
    </header>
  );
}

export function AdminLoadingPanel(): React.ReactElement {
  return (
    <div className="grid gap-3 border border-[var(--s2ee-border)] bg-white p-5">
      <Skeleton className="h-8 rounded-none" />
      <Skeleton className="h-20 rounded-none" />
      <Skeleton className="h-20 rounded-none" />
      <Skeleton className="h-20 rounded-none" />
    </div>
  );
}

export function AdminFailurePanel(props: {
  readonly title: string;
  readonly description: string;
}): React.ReactElement {
  return (
    <div className="border border-[var(--s2ee-border)] bg-white p-6">
      <Empty className="items-start text-left">
        <EmptyHeader className="items-start text-left">
          <EmptyMedia variant="icon" className="rounded-none">
            <CircleAlertIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle>{props.title}</EmptyTitle>
          <EmptyDescription>{props.description}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
