# Test Perspectives: web/uncommittedMenu.ts

> Source: `web/uncommittedMenu.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: Stash Push Include Untracked default value

> Origin: Feature 014 (dialog-defaults) (aidd-spec-tasks-test)
> Added: 2026-03-09
> Status: active
> Supersedes: -

**Target path**: `web/uncommittedMenu.ts:16-43`

| Case ID | Input / Precondition                                                    | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                         | Notes                |
| ------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------- |
| TC-001  | viewState.dialogDefaults.stashUncommittedChanges.includeUntracked=true  | Normal - standard                                                          | The Include Untracked checkbox is shown ON (checked)                                    | Setting applied      |
| TC-002  | viewState.dialogDefaults.stashUncommittedChanges.includeUntracked=false | Normal - standard                                                          | The Include Untracked checkbox is shown OFF (unchecked)                                 | Setting applied      |
| TC-003  | Overall layout of the Stash Push dialog                                 | Normal - standard                                                          | showFormDialog is called with 2 elements: text (Message) + checkbox (Include Untracked) | Existing layout kept |
