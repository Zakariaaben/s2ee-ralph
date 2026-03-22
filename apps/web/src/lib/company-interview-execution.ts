import type {
  CompanyCompletedInterviewLedgerEntry,
  CompanyInterviewTag,
  CvProfile,
  GlobalInterviewTag,
  Interview,
  Recruiter,
  Student,
} from "@project/domain";

export type CompanyInterviewDraft = {
  readonly student: Student;
  readonly recruiter: Recruiter;
  readonly cvProfile: CvProfile;
  readonly qrIdentity: string;
};

export const interviewScoreOptions = [1, 2, 3, 4, 5] as const;

const splitTagInput = (value: string) =>
  value
    .split(/[\n,]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

export const normalizeCompanyTagLabels = (value: string): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const labels: Array<string> = [];

  for (const label of splitTagInput(value)) {
    const key = label.toLocaleLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    labels.push(label);
  }

  return labels;
};

export const collectSuggestedCompanyTagLabels = (input: {
  readonly activeInterviews: ReadonlyArray<Interview>;
  readonly completedInterviews: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
}): ReadonlyArray<string> => {
  const suggestions: Array<string> = [];
  const seen = new Set<string>();

  const rememberTags = (tags: ReadonlyArray<CompanyInterviewTag>) => {
    for (const tag of tags) {
      const key = tag.label.toLocaleLowerCase();

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

export const toggleGlobalInterviewTagId = (
  selectedTagIds: ReadonlyArray<GlobalInterviewTag["id"]>,
  tagId: GlobalInterviewTag["id"],
): ReadonlyArray<GlobalInterviewTag["id"]> =>
  selectedTagIds.includes(tagId)
    ? selectedTagIds.filter((selectedTagId) => selectedTagId !== tagId)
    : [...selectedTagIds, tagId];

export const canCompleteInterviewDraft = (input: {
  readonly draft: CompanyInterviewDraft | null;
  readonly score: number | null;
}): boolean => input.draft != null && input.score != null;

export const describeInterviewNotes = (notes: string): string | null => {
  const trimmed = notes.trim();

  return trimmed.length === 0 ? null : trimmed;
};
