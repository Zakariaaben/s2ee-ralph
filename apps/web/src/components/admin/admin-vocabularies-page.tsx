"use client";

import { useAtomRefresh, useAtomSet } from "@effect/atom-react";
import { Alert, AlertDescription, AlertTitle } from "@project/ui/components/alert";
import { Button } from "@project/ui/components/button";
import { Input } from "@project/ui/components/input";
import { Trash2Icon, CircleAlertIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";

import {
  AdminFailurePanel,
  AdminLoadingPanel,
  AdminPageHeader,
} from "@/components/admin/admin-page-primitives";
import {
  formatAdminMutationError,
  useAdminStudentInstitutionsState,
  useAdminStudentMajorsState,
} from "@/lib/admin-page-data";
import { adminWorkspaceAtoms, adminWorkspaceReactivity } from "@/lib/admin-atoms";

type VocabularyEntry = {
  readonly id: string;
  readonly label: string;
};

const toVocabularyId = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

type VocabularySectionProps = {
  readonly addEntry: (input: {
    readonly payload: VocabularyEntry;
    readonly reactivityKeys: readonly [string, string];
  }) => Promise<ReadonlyArray<VocabularyEntry>>;
  readonly deleteEntry: (input: {
    readonly payload: { readonly id: string };
    readonly reactivityKeys: readonly [string, string];
  }) => Promise<ReadonlyArray<VocabularyEntry>>;
  readonly description: string;
  readonly entries: ReadonlyArray<VocabularyEntry>;
  readonly reactivityKeys: readonly [string, string];
  readonly refresh: () => void;
  readonly title: string;
};

function VocabularySection(props: VocabularySectionProps): React.ReactElement {
  const [labelDraft, setLabelDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const addEntry = async () => {
    const label = labelDraft.trim();
    const id = toVocabularyId(label);

    if (label.length === 0 || id.length === 0) {
      setMutationError("Renseignez un libelle valide.");
      return;
    }

    setIsSaving(true);
    setMutationError(null);

    try {
      await props.addEntry({
        payload: { id, label },
        reactivityKeys: props.reactivityKeys,
      });
      props.refresh();
      setLabelDraft("");
    } catch (error) {
      setMutationError(formatAdminMutationError(error));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    setIsSaving(true);
    setMutationError(null);

    try {
      await props.deleteEntry({
        payload: { id },
        reactivityKeys: props.reactivityKeys,
      });
      props.refresh();
    } catch (error) {
      setMutationError(formatAdminMutationError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="border border-[var(--s2ee-border)] bg-white">
      <div className="border-b border-[var(--s2ee-border)] p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
          {props.title}
        </p>
        <p className="mt-2 text-sm leading-6 text-[color:var(--s2ee-muted-foreground)]">
          {props.description}
        </p>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input
            className="rounded-none border-[var(--s2ee-border)] bg-[var(--s2ee-surface-soft)] shadow-none"
            disabled={isSaving}
            placeholder="Nouveau libelle"
            value={labelDraft}
            onChange={(event) => setLabelDraft(event.currentTarget.value)}
          />
          <Button disabled={isSaving} onClick={() => void addEntry()} type="button">
            <PlusIcon className="size-4" />
            Ajouter
          </Button>
        </div>

        {mutationError ? (
          <Alert variant="error">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>Modification impossible</AlertTitle>
            <AlertDescription>{mutationError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-px border border-[var(--s2ee-border)] bg-[var(--s2ee-border)]">
          {props.entries.length === 0 ? (
            <div className="bg-[var(--s2ee-surface-soft)] p-5 text-sm text-[color:var(--s2ee-muted-foreground)]">
              Aucun element configure.
            </div>
          ) : (
            props.entries.map((entry) => (
              <div className="flex items-center justify-between gap-4 bg-white p-4" key={entry.id}>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.08em] text-slate-900">
                    {entry.label}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--s2ee-muted-foreground)]">
                    {entry.id}
                  </p>
                </div>
                <Button
                  disabled={isSaving}
                  onClick={() => void deleteEntry(entry.id)}
                  type="button"
                  variant="outline"
                >
                  <Trash2Icon className="size-4" />
                  Supprimer
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export function AdminVocabulariesPage(): React.ReactElement {
  const majorsState = useAdminStudentMajorsState();
  const institutionsState = useAdminStudentInstitutionsState();
  const refreshMajors = useAtomRefresh(adminWorkspaceAtoms.studentMajors);
  const refreshInstitutions = useAtomRefresh(adminWorkspaceAtoms.studentInstitutions);
  const addStudentMajor = useAtomSet(adminWorkspaceAtoms.addStudentMajor, { mode: "promise" });
  const deleteStudentMajor = useAtomSet(adminWorkspaceAtoms.deleteStudentMajor, { mode: "promise" });
  const addStudentInstitution = useAtomSet(adminWorkspaceAtoms.addStudentInstitution, { mode: "promise" });
  const deleteStudentInstitution = useAtomSet(adminWorkspaceAtoms.deleteStudentInstitution, { mode: "promise" });

  const refreshAll = () => {
    refreshMajors();
    refreshInstitutions();
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        actions={
          <Button onClick={refreshAll} type="button" variant="outline">
            <RefreshCwIcon className="size-4" />
            Actualiser
          </Button>
        }
        description="Gerez les listes utilisees dans l'onboarding etudiant. Les profils stockent le texte selectionne, pas l'identifiant du referentiel."
        eyebrow="Admin"
        title="Referentiels etudiants"
      />

      {majorsState.kind === "loading" || institutionsState.kind === "loading" ? <AdminLoadingPanel /> : null}
      {majorsState.kind === "failure" ? (
        <AdminFailurePanel description={majorsState.message} title="Specialites indisponibles" />
      ) : null}
      {institutionsState.kind === "failure" ? (
        <AdminFailurePanel description={institutionsState.message} title="Institutions indisponibles" />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <VocabularySection
          addEntry={addStudentMajor}
          deleteEntry={deleteStudentMajor}
          description="Domaines proposes aux etudiants pendant l'onboarding."
          entries={majorsState.kind === "success" ? majorsState.value : []}
          reactivityKeys={adminWorkspaceReactivity.studentMajors}
          refresh={refreshMajors}
          title="Specialites"
        />
        <VocabularySection
          addEntry={addStudentInstitution}
          deleteEntry={deleteStudentInstitution}
          description="Institutions proposees aux etudiants pendant l'onboarding."
          entries={institutionsState.kind === "success" ? institutionsState.value : []}
          reactivityKeys={adminWorkspaceReactivity.studentInstitutions}
          refresh={refreshInstitutions}
          title="Institutions"
        />
      </div>
    </div>
  );
}
