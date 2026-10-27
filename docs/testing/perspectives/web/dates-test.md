# Test Perspectives: web/dates.ts

> Source: `web/dates.ts`
> Generated: 2026-03-22T13:23:24Z
> Language: TypeScript
> Test Framework: Vitest

## S1: switch branches - output format chosen by dateFormat

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                                 | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                   | Notes                                         |
| ------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| TC-001  | dateVal=1700000000, viewState.dateFormat not set (default branch)    | Normal - standard                                                          | value is a string in the "D Mon YYYY HH:MM" format. title and value are the same                  | L47 default branch. Effectively "Date & Time" |
| TC-002  | dateVal=1700000000, viewState.dateFormat="Date Only"                 | Normal - branch                                                            | value is a string in the "D Mon YYYY" format (no time). title is in the "D Mon YYYY HH:MM" format | L17                                           |
| TC-003  | viewState.dateFormat="Relative", dateVal=mockNow/1000-30 (diff=30 s) | Normal - branch                                                            | value = "30 seconds ago". title is in the "D Mon YYYY HH:MM" format                               | L20-46. Needs a Date mock                     |

## S2: Relative branch - choosing the time unit (if/else if chain)

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result         | Notes                  |
| ------- | ------------------------- | -------------------------------------------------------------------------- | ----------------------- | ---------------------- |
| TC-004  | Relative, diff=120 s      | Normal - branch                                                            | value = "2 minutes ago" | L25. diff/60=2, plural |
| TC-005  | Relative, diff=7200 s     | Normal - branch                                                            | value = "2 hours ago"   | L28. diff/3600=2       |
| TC-006  | Relative, diff=172800 s   | Normal - branch                                                            | value = "2 days ago"    | L31. diff/86400=2      |
| TC-007  | Relative, diff=1209600 s  | Normal - branch                                                            | value = "2 weeks ago"   | L34. diff/604800=2     |
| TC-008  | Relative, diff=5259600 s  | Normal - branch                                                            | value = "2 months ago"  | L37. diff/2629800=2    |
| TC-009  | Relative, diff=63115200 s | Normal - branch                                                            | value = "2 years ago"   | L40. diff/31557600=2   |

## S3: Consistency of the title property

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                   |
| ------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| TC-010  | The same dateVal with each dateFormat ("Date & Time", "Date Only", "Relative") | Normal - standard                                                          | title is the same "D Mon YYYY HH:MM" format for every format. Only value changes with the format | L50. 3 patterns checked |

## S4: Error cases - edge cases with no validation

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                                        | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                           | Notes                             |
| ------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------- |
| TC-011  | dateVal=NaN, dateFormat="Date & Time"                                       | Validation - rejected precondition                                         | new Date(NaN) is an Invalid Date. The dateStr in value/title contains "NaN" and "undefined" (months[NaN]) | L11-13. No validation             |
| TC-012  | dateVal=Infinity, dateFormat="Date & Time"                                  | Validation - rejected precondition                                         | new Date(Infinity) is an Invalid Date. As in TC-011, value/title contain "NaN"                            | L11                               |
| TC-013  | Relative, dateVal in the future (diff<0)                                    | Validation - rejected precondition                                         | diff<0 satisfies diff<60. value = a negative number + " seconds ago" (e.g. "-30 seconds ago")             | L23. No guard for negative values |
| TC-014  | viewState.dateFormat="InvalidFormat" (a string outside the type definition) | Validation - rejected precondition                                         | Goes to the switch default, and value is in the "dateStr timeStr" format (same behavior as "Date & Time") | L47                               |

## S5: Boundary values - switching boundaries between time units

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: superseded
> Superseded By: S9
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition               | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                | Notes                                         |
| ------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------- |
| TC-015  | Relative, diff=0 s (dateVal = now) | Boundary - zero                                                            | value = "0 seconds ago". Math.round(0)=0, 0!==1 so plural      | L23, L45                                      |
| TC-016  | Relative, diff=59 s                | Boundary - max (second)                                                    | value = "59 seconds ago". Boundary -1 of SECONDS_IN_MINUTE(60) | L23                                           |
| TC-017  | Relative, diff=60 s                | Boundary - min (minute)                                                    | value = "1 minute ago". 60/60=1, singular                      | L25. Second → minute boundary                 |
| TC-018  | Relative, diff=3599 s              | Boundary - max (minute)                                                    | value = "60 minutes ago". 3599/60≈59.98, Math.round=60         | L25. Boundary -1 of SECONDS_IN_HOUR(3600)     |
| TC-019  | Relative, diff=3600 s              | Boundary - min (hour)                                                      | value = "1 hour ago". 3600/3600=1, singular                    | L28. Minute → hour boundary                   |
| TC-020  | Relative, diff=86399 s             | Boundary - max (hour)                                                      | value = "24 hours ago". 86399/3600≈23.99, Math.round=24        | L28. Boundary -1 of SECONDS_IN_DAY(86400)     |
| TC-021  | Relative, diff=86400 s             | Boundary - min (day)                                                       | value = "1 day ago". 86400/86400=1, singular                   | L31. Hour → day boundary                      |
| TC-022  | Relative, diff=604799 s            | Boundary - max (day)                                                       | value = "7 days ago". 604799/86400≈6.99, Math.round=7          | L31. Boundary -1 of SECONDS_IN_WEEK(604800)   |
| TC-023  | Relative, diff=604800 s            | Boundary - min (week)                                                      | value = "1 week ago". 604800/604800=1, singular                | L34. Day → week boundary                      |
| TC-024  | Relative, diff=2629799 s           | Boundary - max (week)                                                      | value = "4 weeks ago". 2629799/604800≈4.35, Math.round=4       | L34. Boundary -1 of SECONDS_IN_MONTH(2629800) |
| TC-025  | Relative, diff=2629800 s           | Boundary - min (month)                                                     | value = "1 month ago". 2629800/2629800=1, singular             | L37. Week → month boundary                    |
| TC-026  | Relative, diff=31557599 s          | Boundary - max (month)                                                     | value = "12 months ago". 31557599/2629800≈12.0, Math.round=12  | L37. Boundary -1 of SECONDS_IN_YEAR(31557600) |
| TC-027  | Relative, diff=31557600 s          | Boundary - min (year)                                                      | value = "1 year ago". 31557600/31557600=1, singular            | L40. Month → year boundary                    |

## S6: Boundary values - extreme values of dateVal

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition                                      | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                  | Notes                         |
| ------- | --------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------- |
| TC-028  | dateVal=0, dateFormat="Date & Time"                       | Boundary - zero (dateVal)                                                  | The date string of the UNIX epoch (1970-01-01). value/title contain "1970"                       | L11. Depends on the time zone |
| TC-029  | dateVal=Number.MAX_SAFE_INTEGER, dateFormat="Date & Time" | Boundary - max (dateVal)                                                   | dateVal\*1000 exceeds the valid Date range (8.64e15 ms). Invalid Date; value/title contain "NaN" | L11. Overflow                 |

## S7: Boundary values - singular/plural (ternary operator)

> Origin: test-plan (既存コード分析)
> Added: 2026-03-21
> Status: active
> Supersedes: -

**Signature**: `export function getCommitDate(dateVal: number): { title: string; value: string }`
**Target path**: `web/dates.ts:10-51`

| Case ID | Input / Precondition | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                     | Notes |
| ------- | -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----- |
| TC-030  | Relative, diff=1 s   | Boundary - singular                                                        | value = "1 second ago". Math.round(1)=1, 1!==1 is false → no "s"    | L45   |
| TC-031  | Relative, diff=2 s   | Boundary - plural                                                          | value = "2 seconds ago". Math.round(2)=2, 2!==1 is true → "s" added | L45   |

## S8: locale branch - Japanese date display

> Origin: Feature 035 (japanese-ui-i18n) Task 8
> Added: 2026-05-03
> Status: active
> Supersedes: -
> Signature: `export function getCommitDate(dateVal: number): { title: string; value: string }`
> Target Path: `web/dates.ts`

| Case ID | Input / Precondition                           | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                    | Notes                             |
| ------- | ---------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| TC-032  | locale=`ja`, dateFormat=`Date & Time`          | Normal - locale branch                                                     | value/title are in the `YYYY-MM-DD HH:mm` format   | The en stored value is kept       |
| TC-033  | locale=`ja`, dateFormat=`Date Only`            | Normal - locale branch                                                     | value is `YYYY-MM-DD`, title is `YYYY-MM-DD HH:mm` | title follows the locale too      |
| TC-034  | locale=`ja`, dateFormat=`Relative`, diff=5 min | Normal - locale branch                                                     | value is `5分前` ("5 minutes ago")                 | Japanese display of relative time |

## S9: Boundary values - switching boundaries between time units, including carry after rounding

> Origin: フェーズ3 修正 L13 (relative-date-round-carry)
> Added: 2026-07-04T04:29:24Z
> Status: active
> Supersedes: S5
> Signature: `export function getCommitDate(dateVal: number): { title: string; value: string }`
> Target Path: `web/dates.ts:11-45`

A fix that replaces the `if/else if` chain for choosing the relative time unit with a `RELATIVE_UNITS` table + `findIndex`, and adds a correction that carries over to the next unit with `count=1` when the rounded value within a unit (`count = Math.round(diff / unit.seconds)`) reaches the next unit's threshold (`nextUnit.seconds`). The old implementation showed the value rounded within each unit as is, so just below a boundary (e.g. 3599 seconds) it showed the next unit's value in the lower unit, as in "60 minutes ago". This replaces the no-carry rounding assumption of S5 (TC-018/020/022/026).

| Case ID | Input / Precondition                                                              | Perspective (Normal / Validation / Exception / External / Boundary / Type) | Expected Result                                                                                                             | Notes                                             |
| ------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| TC-035  | Relative, diff=60 s                                                               | Boundary - min (minute)                                                    | value = "1 minute ago". Exactly at the minute threshold, no carry from the lower unit                                       | Second → minute boundary                          |
| TC-036  | Relative, diff=59 s                                                               | Boundary - max (second, no carry)                                          | value = "59 seconds ago". No carry because `59*1=59 < 60`                                                                   | Upper limit of seconds, no carry                  |
| TC-037  | Relative, diff=3570 s                                                             | Boundary - minute carry to hour                                            | value = "1 hour ago". `round(3570/60)=60`, and `60*60=3600 >= 3600` carries to hour with count=1                            | Core of L13. The example case from the task       |
| TC-038  | Relative, diff=3599 s                                                             | Boundary - max (minute) carry                                              | value = "1 hour ago" (old S5 TC-018 was "60 minutes ago"). `round(3599/60)=60` → carry to hour                              | Replaces the old behavior                         |
| TC-039  | Relative, diff=86399 s                                                            | Boundary - hour carry to day                                               | value = "1 day ago" (old S5 TC-020 was "24 hours ago"). `round(86399/3600)=24`, and `24*3600=86400 >= 86400` carries to day | Replaces the old behavior                         |
| TC-040  | Relative, diff=604799 s                                                           | Boundary - day carry to week                                               | value = "1 week ago" (old S5 TC-022 was "7 days ago"). `round(604799/86400)=7` → carry to week                              | Replaces the old behavior                         |
| TC-041  | Relative, diff=31557599 s                                                         | Boundary - month carry to year                                             | value = "1 year ago" (old S5 TC-026 was "12 months ago"). `round(31557599/2629800)=12` → carry to year                      | Replaces the old behavior                         |
| TC-042  | Relative, diff=2629799 s                                                          | Boundary - week max, no carry                                              | value = "4 weeks ago". `round(2629799/604800)=4`, and `4*604800=2419200 < 2629800` so no carry                              | Control case where no carry happens               |
| TC-043  | Relative, diff=86400 s                                                            | Boundary - min (day)                                                       | value = "1 day ago". Exactly at the hour → day threshold, and `1*86400=86400 < 604800` so no carry                          | No carry exactly at a boundary of the higher unit |
| TC-044  | Relative, diff=Infinity (equivalent to `dateVal=-Infinity`, findIndex returns -1) | Boundary - findIndex fallback to year                                      | The `unitIndex===-1` fallback chooses the year unit, and the unit in value is `year`                                        | `RELATIVE_UNITS.length-1` fallback branch         |
