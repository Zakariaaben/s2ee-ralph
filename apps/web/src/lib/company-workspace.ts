import type {
  Company,
  CompanyCompletedInterviewLedgerEntry,
  Interview,
} from "@project/domain";

export const companyCompletedPreviewLimit = 5;

export type CompanyWorkspaceSummary = {
  readonly recruiterCount: number;
  readonly activeInterviewCount: number;
  readonly completedInterviewCount: number;
  readonly averageCompletedScore: number | null;
  readonly distinctTagCount: number;
};

export const summarizeCompanyWorkspace = (input: {
  readonly company: Company | null;
  readonly activeInterviews: ReadonlyArray<Interview>;
  readonly completedInterviews: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
}): CompanyWorkspaceSummary => {
  const completedScores = input.completedInterviews.flatMap((entry) =>
    entry.interview.score == null ? [] : [entry.interview.score],
  );
  const distinctTags = new Set<string>();

  for (const interview of input.activeInterviews) {
    for (const tag of interview.globalTags) {
      distinctTags.add(`global:${tag.id}`);
    }

    for (const tag of interview.companyTags) {
      distinctTags.add(`company:${tag.id}`);
    }
  }

  for (const entry of input.completedInterviews) {
    for (const tag of entry.interview.globalTags) {
      distinctTags.add(`global:${tag.id}`);
    }

    for (const tag of entry.interview.companyTags) {
      distinctTags.add(`company:${tag.id}`);
    }
  }

  return {
    recruiterCount: input.company?.recruiters.length ?? 0,
    activeInterviewCount: input.activeInterviews.length,
    completedInterviewCount: input.completedInterviews.length,
    averageCompletedScore:
      completedScores.length === 0
        ? null
        : completedScores.reduce((total, score) => total + score, 0) / completedScores.length,
    distinctTagCount: distinctTags.size,
  };
};

export const selectRecentCompletedInterviews = (
  entries: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>,
  limit = companyCompletedPreviewLimit,
): ReadonlyArray<CompanyCompletedInterviewLedgerEntry> =>
  entries.slice(Math.max(entries.length - limit, 0)).slice().reverse();
