---
name: PostToolUse IDE hints
description: User forwards PostToolUse hook diagnostics mid-implementation — these are just TypeScript hints, not errors
type: feedback
---

When making multi-step edits, the user forwards PostToolUse IDE diagnostic messages (e.g. "'X' is declared but never read"). These are TypeScript **hints** (severity: Hint, code 6133 or 80001), NOT errors. They appear because variables are added before their JSX usage is written in a subsequent edit.

**Why:** The user sees these appear in the IDE via the hook and forwards them, thinking they need to be addressed immediately.

**How to apply:** Continue the implementation immediately without pausing. Add a one-line acknowledgment ("C'est juste un hint") and proceed to the next edit. Do NOT wait or ask — complete all dependent edits in sequence.
