# ISSUES

GitHub issues are provided at the start of the context. Parse them to identify all open issues, including their bodies and comments.

Work only on **AFK** issues. Ignore **HITL** issues.

You have also been given a file containing the most recent commits. Review it to understand what has already been done and avoid repeating work.

If every AFK task is complete, create a file named `promise.md` at the repository root containing exactly:

<promise>NO MORE TASKS</promise>

# TASK SELECTION

Select the next task using this priority order:

1. Critical bug fixes
2. Development infrastructure
3. Complete the features
4. Polish and quick wins
5. Refactors

Development infrastructure includes things like tests, types, validation, and developer scripts. This is often the highest-leverage precursor to feature work.

# EXPLORATION

Explore the repository before making changes. Understand the architecture, the relevant code paths, and how the current work connects to the selected issue.

# IMPLEMENTATION

Focus primarily on delivering working functionality. Tests are secondary. The goal is to build a solid v1 and move the product forward as much as possible within the boundaries of the selected issue.

Do the maximum amount of useful work possible on the chosen issue. Continue until you cannot proceed further without materially entering the scope of another issue. That is what counts as completing the task for this iteration.

Prefer completing consequential follow-up work within the same issue rather than stopping after a small change.

# FEEDBACK LOOPS

Before committing, run both feedback loops:

- `bun run test`
- `bun run check-types`

If either fails, fix the failures when they are caused by your changes or are reasonably within the scope of the selected task.

# COMMIT

Create a git commit.

The commit message must include:

1. The key decisions made
2. The files changed
3. Any blockers, follow-ups, or notes for the next iteration

# THE ISSUE

If the selected task is fully complete, close the corresponding GitHub issue.

If the task is only partially complete, leave a comment on the GitHub issue summarizing:

- what was completed
- what remains
- any blockers or risks

# FINAL RULES

Always do the maximum amount of work possible on the selected issue before stopping.

Do not stop after a minor change if there is still clear, in-scope follow-up work available.

Stay within the boundaries of the selected issue. Do not drift into unrelated issues.

Always load relevant skills.
