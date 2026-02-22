import { months, pad2 } from "./utils";

const SECONDS_IN_MINUTE = 60;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_DAY = 86400;
const SECONDS_IN_WEEK = 604800;
const SECONDS_IN_MONTH = 2629800;
const SECONDS_IN_YEAR = 31557600;

export function getCommitDate(dateVal: number) {
  let date = new Date(dateVal * 1000),
    value;
  let dateStr = `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  let timeStr = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

  switch (viewState.dateFormat) {
    case "Date Only":
      value = dateStr;
      break;
    case "Relative":
      let diff = Math.round(new Date().getTime() / 1000) - dateVal,
        unit;
      if (diff < SECONDS_IN_MINUTE) {
        unit = "second";
      } else if (diff < SECONDS_IN_HOUR) {
        unit = "minute";
        diff /= SECONDS_IN_MINUTE;
      } else if (diff < SECONDS_IN_DAY) {
        unit = "hour";
        diff /= SECONDS_IN_HOUR;
      } else if (diff < SECONDS_IN_WEEK) {
        unit = "day";
        diff /= SECONDS_IN_DAY;
      } else if (diff < SECONDS_IN_MONTH) {
        unit = "week";
        diff /= SECONDS_IN_WEEK;
      } else if (diff < SECONDS_IN_YEAR) {
        unit = "month";
        diff /= SECONDS_IN_MONTH;
      } else {
        unit = "year";
        diff /= SECONDS_IN_YEAR;
      }
      diff = Math.round(diff);
      value = `${diff} ${unit}${diff !== 1 ? "s" : ""} ago`;
      break;
    default:
      value = `${dateStr} ${timeStr}`;
  }
  return { title: `${dateStr} ${timeStr}`, value: value };
}
