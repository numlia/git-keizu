# Test Perspectives: web/stashMenu.ts

> Source: `web/stashMenu.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: Structure of the returned array

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `buildStashContextMenuItems(repo: string, hash: string, selector: string, sourceElem: HTMLElement): ContextMenuElement[]`
**Target path**: `web/stashMenu.ts:4-108`

| Case ID | Input / Precondition                                                            | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                           | Notes              |
| ------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| TC-001  | repo="repo1", hash="abc123", selector="stash@{0}", sourceElem=valid HTMLElement | Normal - standard                                                          | Returns an array of 7 elements: index 0-3 non-null, index 4 null (separator), index 5-6 non-null                                                                                                                          | L10-107            |
| TC-002  | Same as above                                                                   | Normal - standard                                                          | Each menu title: [0]=`Apply Stash${ELLIPSIS}`, [1]=`Create Branch from Stash${ELLIPSIS}`, [2]=`Pop Stash${ELLIPSIS}`, [3]=`Drop Stash${ELLIPSIS}`, [5]="Copy Stash Name to Clipboard", [6]="Copy Stash Hash to Clipboard" | L12,32,51,71,88,98 |

## S2: Apply Stash menu item

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `web/stashMenu.ts:11-30`

| Case ID | Input / Precondition                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                     | Notes  |
| ------- | ------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-003  | Run onClick of Apply Stash           | Normal - standard                                                          | showCheckboxDialog is called once with arguments: message is HTML containing the result of escapeHtml(selector), label="Reinstate Index", defaultValue=false, actionName="Yes, apply stash", callback=a function, target=sourceElem | L14-28 |
| TC-004  | Apply callback: reinstateIndex=true  | Normal - standard                                                          | sendMessage({command:"applyStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:true}) is called once                                                                                                                         | L20-25 |
| TC-005  | Apply callback: reinstateIndex=false | Normal - standard                                                          | sendMessage({command:"applyStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:false}) is called once                                                                                                                        | L20-25 |

## S3: Create Branch from Stash menu item

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `web/stashMenu.ts:31-49`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                      | Notes  |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-006  | Run onClick of Create Branch                  | Normal - standard                                                          | showRefInputDialog is called once with arguments: message is HTML containing the result of escapeHtml(selector), defaultValue="", actionName="Create Branch", callback=a function, target=sourceElem | L34-47 |
| TC-007  | Create Branch callback: name="feature-branch" | Normal - standard                                                          | sendMessage({command:"branchFromStash", repo:"repo1", branchName:"feature-branch", selector:"stash@{0}"}) is called once                                                                             | L39-44 |

## S4: Pop Stash menu item

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `web/stashMenu.ts:50-68`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                                                                                                  | Notes  |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| TC-008  | Run onClick of Pop Stash           | Normal - standard                                                          | showCheckboxDialog is called once with arguments: message is HTML containing escapeHtml(selector) and "remove the stash entry", label="Reinstate Index", defaultValue=false, actionName="Yes, pop stash", callback=a function, target=sourceElem | L53-66 |
| TC-009  | Pop callback: reinstateIndex=true  | Normal - standard                                                          | sendMessage({command:"popStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:true}) is called once                                                                                                                                        | L59-64 |
| TC-010  | Pop callback: reinstateIndex=false | Normal - standard                                                          | sendMessage({command:"popStash", repo:"repo1", selector:"stash@{0}", reinstateIndex:false}) is called once                                                                                                                                       | L59-64 |

## S5: Drop Stash menu item

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `web/stashMenu.ts:70-85`

| Case ID | Input / Precondition      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                                      | Notes  |
| ------- | ------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| TC-011  | Run onClick of Drop Stash | Normal - standard                                                          | showConfirmationDialog is called once with arguments: message is HTML containing escapeHtml(selector) and "cannot be undone", callback=a function, target=sourceElem | L73-83 |
| TC-012  | Run the Drop callback     | Normal - standard                                                          | sendMessage({command:"dropStash", repo:"repo1", selector:"stash@{0}"}) is called once                                                                                | L76-80 |

## S6: Copy to Clipboard menu items

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `web/stashMenu.ts:87-106`

| Case ID | Input / Precondition           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                              | Notes    |
| ------- | ------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| TC-013  | Run onClick of Copy Stash Name | Normal - standard                                                          | sendMessage({command:"copyToClipboard", type:"Stash Name", data:"stash@{0}"}) is called once (data=selector) | L90-94   |
| TC-014  | Run onClick of Copy Stash Hash | Normal - standard                                                          | sendMessage({command:"copyToClipboard", type:"Stash Hash", data:"abc123"}) is called once (data=hash)        | L100-104 |

## S7: Input boundary values / HTML escaping

> Origin: test-plan
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Target path**: `web/stashMenu.ts:4-108`

| Case ID | Input / Precondition                                                                   | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                             | Notes                                                     |
| ------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| TC-015  | selector="" (empty string)                                                             | Boundary - empty                                                           | The result of escapeHtml("") (empty string) is embedded in every dialog message, and the selector/data of sendMessage is "" | 4 calls to escapeHtml                                     |
| TC-016  | repo="" (empty string)                                                                 | Boundary - empty                                                           | The repo field of every sendMessage call is ""                                                                              | No validation                                             |
| TC-017  | hash="" (empty string)                                                                 | Boundary - empty                                                           | The sendMessage data of Copy Hash is ""                                                                                     | L100-104                                                  |
| TC-018  | selector=`<b>&"test'</b>` (HTML special characters)                                    | Boundary - special chars                                                   | HTML special characters are embedded in escaped form in every dialog message                                                | escapeHtml L15,35,54,74                                   |
| TC-019  | selector=`<script>alert(1)</script>` (XSS)                                             | Validation - rejected precondition                                         | `<script>` is escaped in the dialog message into a form that does not run as a script                                       | Prevents XSS                                              |
| TC-020  | selector="stash@{0}" (a typical stash reference)                                       | Boundary - stash format                                                    | `@` and `{}` are not escaped by escapeHtml, so they appear as-is in the dialog message                                      | escapeHtml escapes only the 6 characters `&<>"'/`         |
| TC-021  | selector="日本語スタッシュ" (unicode; a Japanese test string meaning "Japanese stash") | Type - unicode                                                             | Passes through escapeHtml and the unicode is embedded as-is in the dialog message                                           | -                                                         |
| TC-022  | selector="line1\nline2" (contains a newline)                                           | Boundary - whitespace                                                      | escapeHtml does not escape the newline, and it is embedded as-is in the dialog HTML                                         | How the dialog displays it depends on HTML interpretation |
| TC-023  | selector="&amp;already-encoded" (already encoded)                                      | Boundary - double encoding                                                 | escapeHtml escapes `&` again, giving `&amp;amp;already-encoded`                                                             | Checks double encoding                                    |
| TC-024  | repo="/path/with spaces/repo" (path with spaces)                                       | Boundary - spaces                                                          | Passed as-is to repo in sendMessage                                                                                         | No validation                                             |
| TC-025  | hash="not-a-hex-value" (non-hex characters)                                            | Type - invalid format                                                      | Passed as-is to data in sendMessage (no validation)                                                                         | Copy Hash                                                 |
| TC-026  | selector=null (TypeScript type violation at runtime)                                   | Boundary - null                                                            | Depends on the behavior of escapeHtml(null) (an error or the string "null")                                                 | The TS type is string, but it could be null at runtime    |
| TC-027  | hash=null (TypeScript type violation at runtime)                                       | Boundary - null                                                            | null is passed to data in sendMessage                                                                                       | Same as above                                             |
| TC-028  | selector="a".repeat(10000) (a very long string)                                        | Boundary - max length                                                      | Passed to escapeHtml and sendMessage without truncation (the function has no truncation)                                    | -                                                         |

## S8: Context menu reorganization (032)

> Origin: Feature 032 (context-menu-reorg) Task 7
> Added: 2026-04-30
> Status: active
> Supersedes: -

**Signature**: `buildStashContextMenuItems(repo: string, hash: string, selector: string, sourceElem: HTMLElement): ContextMenuElement[]`
**Target path**: `web/stashMenu.ts`

| Case ID | Input / Precondition                          | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                                                 | Notes          |
| ------- | --------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| TC-029  | A normal case with valid repo/hash/selector   | Normal - submenu layout                                                    | Returns 7 elements: index 0=`Apply Stash...`, 1=`Pop Stash...`, 2=`null`, 3=`More...`, 4=`null`, 5=`Copy Stash Name...`, 6=`Copy Stash Hash...` | New base order |
| TC-030  | Refer to the `More...` element as a `submenu` | Validation - submenu contents                                              | The submenu child titles are the 2 items `Create Branch from Stash...`, `Drop Stash...`, and the children contain no `null`                     | No divider     |
