import type {
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  GlobalInterviewTag,
  Interview,
  PresentedCvProfilePreview,
  Recruiter,
} from "@project/domain";

export type CompanyInterviewDraft = {
  readonly interviewId: Interview["id"];
  readonly preview: PresentedCvProfilePreview;
  readonly recruiter: Recruiter;
};

export type AggregatedInterviewTagOption = {
  readonly key: string;
  readonly kind: "company";
  readonly label: string;
};

const normalizeTagLabelKey = (value: string): string => value.trim().toLocaleLowerCase();

export const normalizeInterviewScoreInput = (value: string): number | null => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return Math.round(parsed * 10) / 10;
};

export const normalizeCustomTagLabel = (value: string): string | null => {
  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
};

export const collectSuggestedCompanyTagLabels = (input: {
  readonly activeInterviews: ReadonlyArray<Interview>;
  readonly completedInterviews: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
}): ReadonlyArray<string> => {
  const suggestions: Array<string> = [];
  const seen = new Set<string>();

  const rememberTags = (tags: ReadonlyArray<CompanyInterviewTag>) => {
    for (const tag of tags) {
      const key = normalizeTagLabelKey(tag.label);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      suggestions.push(tag.label);
    }
  };

  for (const entry of [...input.completedInterviews].reverse()) {
    rememberTags(entry.interview.companyTags);
  }

  for (const interview of [...input.activeInterviews].reverse()) {
    rememberTags(interview.companyTags);
  }

  return suggestions;
};

export const buildAggregatedInterviewTagOptions = (input: {
  readonly companyTagSuggestions: ReadonlyArray<string>;
}): ReadonlyArray<AggregatedInterviewTagOption> => {
  const options: Array<AggregatedInterviewTagOption> = [];
  const seen = new Set<string>();

  for (const label of input.companyTagSuggestions) {
    const key = normalizeTagLabelKey(label);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({
      key,
      kind: "company",
      label,
    });
  }

  return options;
};

export const filterAggregatedInterviewTagOptions = (
  options: ReadonlyArray<AggregatedInterviewTagOption>,
  query: string,
): ReadonlyArray<AggregatedInterviewTagOption> => {
  const normalizedQuery = normalizeTagLabelKey(query);

  if (normalizedQuery.length === 0) {
    return options;
  }

  return options.filter((option) => normalizeTagLabelKey(option.label).includes(normalizedQuery));
};

export const toggleAggregatedTagSelection = (
  selectedLabels: ReadonlyArray<string>,
  label: string,
): ReadonlyArray<string> => {
  const key = normalizeTagLabelKey(label);
  const existingIndex = selectedLabels.findIndex(
    (selectedLabel) => normalizeTagLabelKey(selectedLabel) === key,
  );

  if (existingIndex >= 0) {
    return selectedLabels.filter((_, index) => index !== existingIndex);
  }

  return [...selectedLabels, label];
};

export const partitionAggregatedInterviewTags = (input: {
  readonly selectedLabels: ReadonlyArray<string>;
}): {
  readonly companyTagLabels: ReadonlyArray<string>;
  readonly globalTagIds: ReadonlyArray<GlobalInterviewTag["id"]>;
} => {
  const companyTagLabels: Array<string> = [];
  const seenCompanyLabels = new Set<string>();

  for (const label of input.selectedLabels) {
    const normalizedLabel = normalizeTagLabelKey(label);
    const cleanLabel = label.trim();

    if (cleanLabel.length > 0 && !seenCompanyLabels.has(normalizedLabel)) {
      seenCompanyLabels.add(normalizedLabel);
      companyTagLabels.push(cleanLabel);
    }
  }

  return {
    globalTagIds: [],
    companyTagLabels,
  };
};

export const canCompleteInterviewDraft = (input: {
  readonly draft: CompanyInterviewDraft | null;
  readonly score: number | null;
}): boolean => input.draft != null && input.score != null;

export const describeInterviewNotes = (notes: string): string | null => {
  const trimmed = notes.trim();

  return trimmed.length === 0 ? null : trimmed;
};
