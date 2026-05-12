import type {
  CompanyActiveInterviewDetail,
  CompanyCompletedInterviewLedgerEntry,
} from "@project/domain";

export type CompanyInterviewListRow = {
  readonly id: string;
  readonly kind: "active" | "completed";
  readonly recruiterName: string;
  readonly label: string;
  readonly major: string;
  readonly tagLabels: ReadonlyArray<string>;
  readonly institution: string;
  readonly scoreLabel: string;
  readonly status: "active" | "completed";
};

const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export const buildCompanyInterviewListRows = (input: {
  readonly activeInterviews: ReadonlyArray<CompanyActiveInterviewDetail>;
  readonly completedInterviews: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
}): ReadonlyArray<CompanyInterviewListRow> => [
  ...input.activeInterviews.map((entry) => ({
    id: entry.interview.id,
    kind: "active" as const,
    label: `${entry.student.firstName} ${entry.student.lastName}`,
    recruiterName: entry.interview.recruiterName,
    institution: entry.student.institution,
    major: entry.student.major,
    scoreLabel: "En cours",
    status: "active" as const,
    tagLabels: entry.interview.companyTags.map((tag) => tag.label),
  })),
  ...input.completedInterviews.map((entry) => ({
    id: entry.interview.id,
    kind: "completed" as const,
    label: `${entry.student.firstName} ${entry.student.lastName}`,
    recruiterName: entry.interview.recruiterName,
    institution: entry.student.institution,
    major: entry.student.major,
    scoreLabel:
      entry.interview.score == null ? "Sans note" : `${entry.interview.score.toFixed(1)} / 5`,
    status: "completed" as const,
    tagLabels: entry.interview.companyTags.map((tag) => tag.label),
  })),
];

export const filterCompanyInterviewListRows = (
  rows: ReadonlyArray<CompanyInterviewListRow>,
  input: {
    readonly query: string;
    readonly status: "all" | "active" | "completed";
    readonly tag: string | null;
  },
): ReadonlyArray<CompanyInterviewListRow> => {
  const normalizedQuery = normalizeQuery(input.query);
  const normalizedTag = input.tag == null ? null : normalizeQuery(input.tag);

  return rows.filter((row) => {
    if (input.status !== "all" && row.status !== input.status) {
      return false;
    }

    if (
      normalizedTag != null &&
      !row.tagLabels.some((tagLabel) => normalizeQuery(tagLabel) === normalizedTag)
    ) {
      return false;
    }

    if (normalizedQuery.length === 0) {
      return true;
    }

    return [
      row.label,
      row.recruiterName,
      row.institution,
      row.major,
      row.scoreLabel,
      row.status,
      ...row.tagLabels,
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};

export const collectCompanyInterviewListTagFilters = (
  rows: ReadonlyArray<CompanyInterviewListRow>,
): ReadonlyArray<string> => {
  const labels: Array<string> = [];
  const seen = new Set<string>();

  for (const row of rows) {
    for (const label of row.tagLabels) {
      const key = normalizeQuery(label);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      labels.push(label);
    }
  }

  return labels;
};
