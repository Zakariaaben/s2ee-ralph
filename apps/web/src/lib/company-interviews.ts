import type {
  CompanyCompletedInterviewLedgerEntry,
  Interview,
} from "@project/domain";

export type CompanyInterviewListRow = {
  readonly id: string;
  readonly kind: "active" | "completed";
  readonly recruiterName: string;
  readonly label: string;
  readonly major: string;
  readonly institution: string;
  readonly scoreLabel: string;
  readonly status: "active" | "completed";
};

const normalizeQuery = (value: string): string => value.trim().toLowerCase();

export const buildCompanyInterviewListRows = (input: {
  readonly activeInterviews: ReadonlyArray<Interview>;
  readonly completedInterviews: ReadonlyArray<CompanyCompletedInterviewLedgerEntry>;
}): ReadonlyArray<CompanyInterviewListRow> => [
  ...input.activeInterviews.map((interview) => ({
    id: interview.id,
    kind: "active" as const,
    label: `Entretien ${interview.id.slice(0, 8)}`,
    recruiterName: interview.recruiterName,
    institution: "",
    major: "",
    scoreLabel: "En cours",
    status: "active" as const,
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
  })),
];

export const filterCompanyInterviewListRows = (
  rows: ReadonlyArray<CompanyInterviewListRow>,
  input: {
    readonly query: string;
    readonly status: "all" | "active" | "completed";
  },
): ReadonlyArray<CompanyInterviewListRow> => {
  const normalizedQuery = normalizeQuery(input.query);

  return rows.filter((row) => {
    if (input.status !== "all" && row.status !== input.status) {
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
    ].some((value) => value.toLowerCase().includes(normalizedQuery));
  });
};
