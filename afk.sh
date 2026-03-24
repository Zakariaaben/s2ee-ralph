#!/usr/bin/env bash
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <iterations>"
  exit 1
fi

iterations="$1"

if ! [[ "$iterations" =~ ^[0-9]+$ ]] || [ "$iterations" -lt 1 ]; then
  echo "Iterations must be a positive integer"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex is not installed or not on PATH"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed or not on PATH"
  exit 1
fi

prompt_file=""

if [ -f "RALPH.MD" ]; then
  prompt_file="RALPH.MD"
elif [ -f "RALPH.md" ]; then
  prompt_file="RALPH.md"
fi

if [ -z "$prompt_file" ]; then
  echo "Prompt file not found: RALPH.MD"
  exit 1
fi

promise_file="promise.md"
stop_seq="<promise>NO MORE TASKS</promise>"

for ((i = 1; i <= iterations; i++)); do
  if [ -f "$promise_file" ]; then
    promise="$(cat "$promise_file")"
  else
    promise=""
  fi

  if [[ "$promise" == *"$stop_seq"* ]]; then
    echo "No more tasks, imma get some sleep."
    rm -f "$promise_file"
    exit 0
  fi

  commits="$(git log -n 5 --format="%H%n%ad%n%B---" --date=short 2>/dev/null || echo "No commits found")"

  if command -v gh >/dev/null 2>&1; then
    issues="$(gh issue list --state open --json number,title,body,comments 2>/dev/null || echo "[]")"
  else
    issues="[]"
  fi

  prompt="$(cat "$prompt_file")"

  codex exec \
    --dangerously-bypass-approvals-and-sandbox \
    --model gpt-5.4 \
    -c model_reasoning_effort='"medium"' \
    -s workspace-write \
    --cd "$(pwd)" \
    "Iteration $i of $iterations.

Previous commits:
$commits

Open issues:
$issues

$prompt"
done
