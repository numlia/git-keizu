import { getWebviewLocale, t } from "./i18n";
import { pad2 } from "./utils";

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const SECONDS_IN_WEEK = 604800;
const SECONDS_IN_MONTH = 2629800;
const SECONDS_IN_YEAR = 31557600;

const RELATIVE_UNITS: { unit: string; seconds: number; max: number }[] = [
  { unit: "second", seconds: 1, max: SECONDS_IN_MINUTE },
  { unit: "minute", seconds: SECONDS_IN_MINUTE, max: SECONDS_IN_HOUR },
  { unit: "hour", seconds: SECONDS_IN_HOUR, max: SECONDS_IN_DAY },
  { unit: "day", seconds: SECONDS_IN_DAY, max: SECONDS_IN_WEEK },
  { unit: "week", seconds: SECONDS_IN_WEEK, max: SECONDS_IN_MONTH },
  { unit: "month", seconds: SECONDS_IN_MONTH, max: SECONDS_IN_YEAR },
  { unit: "year", seconds: SECONDS_IN_YEAR, max: Number.POSITIVE_INFINITY }
];

export function getCommitDate(dateVal: number) {
  let date = new Date(dateVal * 1000),
    value;
  let dateStr =
    getWebviewLocale() === "ja"
      ? `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
      : `${date.getDate()} ${t(`date.month.short.${date.getMonth()}`)} ${date.getFullYear()}`;
  let timeStr = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  switch (viewState.dateFormat) {
    case "Date Only":
      value = dateStr;
      break;
    case "Relative":
      let diff = Math.round(new Date().getTime() / 1000) - dateVal;
      let unitIndex = RELATIVE_UNITS.findIndex((u) => diff < u.max);
      if (unitIndex === -1) unitIndex = RELATIVE_UNITS.length - 1;
      let selectedUnit = RELATIVE_UNITS[unitIndex];
      let count = Math.round(diff / selectedUnit.seconds);
      let nextUnit = RELATIVE_UNITS[unitIndex + 1];
      if (nextUnit !== undefined && count * selectedUnit.seconds >= nextUnit.seconds) {
        selectedUnit = nextUnit;
        count = 1;
      }
      value = t(`date.relative.${selectedUnit.unit}.${count === 1 ? "one" : "other"}`, count);
      break;
    default:
      value = `${dateStr} ${timeStr}`;
  }
  return { title: `${dateStr} ${timeStr}`, value: value };
}
