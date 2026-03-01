import * as GG from "../src/types";
import { UNCOMMITTED_CHANGES_HASH } from "../src/types";
export { UNCOMMITTED_CHANGES_HASH };

const vscode = acquireVsCodeApi();
export { vscode };

export const svgIcons = {
  current:
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16"><path d="M 8.5793251,3.9709273 C 5.7393555,3.9722573 3.3857785,6.1732278 3.1943505,9.0067388 H 4.7680416 C 4.9548119,7.0413876 6.6051194,5.5401404 8.5793251,5.5397007 10.693557,5.5401531 12.407367,7.2539644 12.407817,9.3681961 12.408725,11.483388 10.694517,13.198699 8.5793251,13.199151 6.603404,13.198471 4.9524361,11.694493 4.7680416,9.727194 H 3.1943505 c 0.188959,2.835453 2.5432332,5.039225 5.3849746,5.04073 2.9812129,-0.0014 5.3972349,-2.418515 5.3972659,-5.3997279 -0.0014,-2.980253 -2.417013,-5.3958792 -5.3972659,-5.3972688 z m 0,3.1375466 c -0.8665744,3.13e-5 -1.655905,0.5013756 -2.0285866,1.2884596 0.4371757,0.1661687 0.9045642,0.3506253 1.2589529,0.4991552 0.3227657,0.135276 0.9442147,0.3573058 0.9442147,0.4745662 0,0.1172591 -0.621449,0.3368301 -0.9442147,0.4721071 -0.3543887,0.14853 -0.8217772,0.332987 -1.2589529,0.499155 0.3726816,0.787084 1.1620121,1.288429 2.0285866,1.28846 1.2398219,-0.0012 2.2444269,-1.012386 2.2449659,-2.2597221 8.1e-4,-1.2482965 -1.0041896,-2.2610032 -2.2449659,-2.262181 z M 5.579476,8.4313581 c -0.052649,0.00816 -0.07526,0.1152306 0,0.159828 L 6.4769718,9.1223068 H 2.3625859 L 1.8806431,8.3507087 H 0.01849445 l 0.752421,1.0199462 -0.752421,1.0199461 H 1.8806431 L 2.3650449,9.6165442 H 2.6825055 6.4794307 L 5.579476,10.150124 c -0.07526,0.0446 -0.052649,0.15167 0,0.159828 0.2360449,0.03657 1.406845,-0.369239 2.0900586,-0.614723 0.2586305,-0.092928 0.7573385,-0.244023 0.7573385,-0.3245741 0,-0.080552 -0.498708,-0.2316459 -0.7573385,-0.3245738 C 6.986321,8.8005973 5.815521,8.3947939 5.579476,8.4313581 Z"/></svg>',
  refresh:
    '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M 8.244,15.672 C 11.441,15.558 14.868,13.024 14.828,8.55 14.773,6.644 13.911,4.852 12.456,3.619 l -1.648,1.198 c 1.265,0.861 2.037,2.279 2.074,3.809 0.016,2.25 -1.808,5.025 -4.707,5.077 -2.898,0.052 -4.933,-2.08 -5.047,-4.671 C 3.07,6.705 4.635,4.651 6.893,4.088 l 0.041,1.866 3.853,-3.126 -3.978,-2.772 0.032,2.077 c -3.294,0.616 -5.755,3.541 -5.667,6.982 -3.88e-4,4.233 3.873,6.67 7.07,6.557 z"/></svg>',
  alert:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"/></svg>',
  branch:
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="16" viewBox="0 0 10 16"><path fill-rule="evenodd" d="M10 5c0-1.11-.89-2-2-2a1.993 1.993 0 0 0-1 3.72v.3c-.02.52-.23.98-.63 1.38-.4.4-.86.61-1.38.63-.83.02-1.48.16-2 .45V4.72a1.993 1.993 0 0 0-1-3.72C.88 1 0 1.89 0 3a2 2 0 0 0 1 1.72v6.56c-.59.35-1 .99-1 1.72 0 1.11.89 2 2 2 1.11 0 2-.89 2-2 0-.53-.2-1-.53-1.36.09-.06.48-.41.59-.47.25-.11.56-.17.94-.17 1.05-.05 1.95-.45 2.75-1.25S8.95 7.77 9 6.73h-.02C9.59 6.37 10 5.73 10 5zM2 1.8c.66 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2C1.35 4.2.8 3.65.8 3c0-.65.55-1.2 1.2-1.2zm0 12.41c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2zm6-8c-.66 0-1.2-.55-1.2-1.2 0-.65.55-1.2 1.2-1.2.65 0 1.2.55 1.2 1.2 0 .65-.55 1.2-1.2 1.2z"/></svg>',
  close:
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="16" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="16" viewBox="0 0 14 16"><path fill-rule="evenodd" d="M6.3 5.69a.942.942 0 0 1-.28-.7c0-.28.09-.52.28-.7.19-.18.42-.28.7-.28.28 0 .52.09.7.28.18.19.28.42.28.7 0 .28-.09.52-.28.7a1 1 0 0 1-.7.3c-.28 0-.52-.11-.7-.3zM8 7.99c-.02-.25-.11-.48-.31-.69-.2-.19-.42-.3-.69-.31H6c-.27.02-.48.13-.69.31-.2.2-.3.44-.31.69h1v3c.02.27.11.5.31.69.2.2.42.31.69.31h1c.27 0 .48-.11.69-.31.2-.19.3-.42.31-.69H8V7.98v.01zM7 2.3c-3.14 0-5.7 2.54-5.7 5.68 0 3.14 2.56 5.7 5.7 5.7s5.7-2.55 5.7-5.7c0-3.15-2.56-5.69-5.7-5.69v.01zM7 .98c3.86 0 7 3.14 7 7s-3.14 7-7 7-7-3.12-7-7 3.14-7 7-7z"/></svg>',
  tag: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="16" viewBox="0 0 15 16"><path fill-rule="evenodd" d="M7.73 1.73C7.26 1.26 6.62 1 5.96 1H3.5C2.13 1 1 2.13 1 3.5v2.47c0 .66.27 1.3.73 1.77l6.06 6.06c.39.39 1.02.39 1.41 0l4.59-4.59a.996.996 0 0 0 0-1.41L7.73 1.73zM2.38 7.09c-.31-.3-.47-.7-.47-1.13V3.5c0-.88.72-1.59 1.59-1.59h2.47c.42 0 .83.16 1.13.47l6.14 6.13-4.73 4.73-6.13-6.15zM3.01 3h2v2H3V3h.01z"/></svg>',
  loading:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 12 16"><path fill-rule="evenodd" d="M10.24 7.4a4.15 4.15 0 0 1-1.2 3.6 4.346 4.346 0 0 1-5.41.54L4.8 10.4.5 9.8l.6 4.2 1.31-1.26c2.36 1.74 5.7 1.57 7.84-.54a5.876 5.876 0 0 0 1.74-4.46l-1.75-.34zM2.96 5a4.346 4.346 0 0 1 5.41-.54L7.2 5.6l4.3.6-.6-4.2-1.31 1.26c-2.36-1.74-5.7-1.57-7.85.54C.5 5.03-.06 6.65.01 8.26l1.75.35A4.17 4.17 0 0 1 2.96 5z"/></svg>',
  openFolder:
    '<svg xmlns="http://www.w3.org/2000/svg" class="openFolderIcon" viewBox="0 0 30 30"><path d="M 5 4 C 3.895 4 3 4.895 3 6 L 3 9 L 3 11 L 22 11 L 27 11 L 27 8 C 27 6.895 26.105 6 25 6 L 12.199219 6 L 11.582031 4.9707031 C 11.221031 4.3687031 10.570187 4 9.8671875 4 L 5 4 z M 2.5019531 13 C 1.4929531 13 0.77040625 13.977406 1.0664062 14.941406 L 4.0351562 24.587891 C 4.2941563 25.426891 5.0692656 26 5.9472656 26 L 15 26 L 24.052734 26 C 24.930734 26 25.705844 25.426891 25.964844 24.587891 L 28.933594 14.941406 C 29.229594 13.977406 28.507047 13 27.498047 13 L 15 13 L 2.5019531 13 z"/></svg>',
  closedFolder:
    '<svg xmlns="http://www.w3.org/2000/svg" class="closedFolderIcon" viewBox="0 0 30 30"><path d="M 4 3 C 2.895 3 2 3.895 2 5 L 2 8 L 13 8 L 28 8 L 28 7 C 28 5.895 27.105 5 26 5 L 11.199219 5 L 10.582031 3.9707031 C 10.221031 3.3687031 9.5701875 3 8.8671875 3 L 4 3 z M 3 10 C 2.448 10 2 10.448 2 11 L 2 23 C 2 24.105 2.895 25 4 25 L 26 25 C 27.105 25 28 24.105 28 23 L 28 11 C 28 10.448 27.552 10 27 10 L 3 10 z"/></svg>',
  file: '<svg xmlns="http://www.w3.org/2000/svg" class="fileIcon" viewBox="0 0 30 30"><path d="M24.707,8.793l-6.5-6.5C18.019,2.105,17.765,2,17.5,2H7C5.895,2,5,2.895,5,4v22c0,1.105,0.895,2,2,2h16c1.105,0,2-0.895,2-2 V9.5C25,9.235,24.895,8.981,24.707,8.793z M18,10c-0.552,0-1-0.448-1-1V3.904L23.096,10H18z"/></svg>',
  fetch:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M7.47 10.78a.749.749 0 0 0 1.06 0l3.75-3.75a.749.749 0 1 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.749.749 0 1 0-1.06 1.06l3.75 3.75zM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5z"/></svg>',
  stash:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2.8 2.06A1.75 1.75 0 0 1 4.41 1h7.18c.7 0 1.333.417 1.61 1.06l2.74 6.395a.75.75 0 0 1 .06.295v4.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25v-4.5a.75.75 0 0 1 .06-.295L2.8 2.06zM4.41 2.5a.25.25 0 0 0-.23.152L1.68 8H4.75a.75.75 0 0 1 .75.75 2.5 2.5 0 0 0 5 0 .75.75 0 0 1 .75-.75h3.07L11.82 2.652a.25.25 0 0 0-.23-.152H4.41zM1.5 9.5v3.75c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V9.5h-2.9a4 4 0 0 1-7.7 0H1.5z"/></svg>',
  search:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04-1.06 1.06-3.04-3.04zM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0z"/></svg>',
  arrowUp:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 4.94L3.47 9.47l.94.94L8 6.82l3.59 3.59.94-.94L8 4.94z"/></svg>',
  arrowDown:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 11.06l-4.53-4.53.94-.94L8 9.18l3.59-3.59.94.94L8 11.06z"/></svg>',
  cdv: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0zM8 4c-2.8 0-5.2 1.6-6.7 4 1.5 2.4 3.9 4 6.7 4s5.2-1.6 6.7-4C13.2 5.6 10.8 4 8 4z"/></svg>',
  treeView:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1.5 1h13l.5.5v13l-.5.5h-13l-.5-.5v-13l.5-.5zM2 14h12V2H2v12zm2-2v-1h3v1H4zm0-4V7h5v1H4zm7-2H4V5h7v1z"/></svg>',
  listView:
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M2 3h12v1H2V3zm0 4h12v1H2V7zm0 4h12v1H2v-1z"/></svg>'
};
export const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
const htmlEscapes: { [key: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;"
};
const htmlUnescapes: { [key: string]: string } = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#x27;": "'",
  "&#x2F;": "/"
};
const htmlEscaper = /[&<>"'/]/g;
const htmlUnescaper = /&lt;|&gt;|&amp;|&quot;|&#x27;|&#x2F;/g;
export const refInvalid = /^[-/].*|[\\" ><~^:?*[]|\.\.|\/\/|\/\.|@{|[./]$|\.lock$|^@$/;
export const ELLIPSIS = "&#8230;";

export function arraysEqual<T>(a: T[], b: T[], equalElements: (a: T, b: T) => boolean) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!equalElements(a[i], b[i])) return false;
  }
  return true;
}
export function pad2(i: number) {
  return i > 9 ? i : `0${i}`;
}

export function escapeHtml(str: string) {
  return str.replace(htmlEscaper, (match) => htmlEscapes[match]);
}
export function unescapeHtml(str: string) {
  return str.replace(htmlUnescaper, (match) => htmlUnescapes[match]);
}

export function addListenerToClass(className: string, event: string, eventListener: EventListener) {
  let elems = document.getElementsByClassName(className),
    i;
  for (i = 0; i < elems.length; i++) {
    elems[i].addEventListener(event, eventListener);
  }
}
export function insertAfter(newNode: HTMLElement, referenceNode: HTMLElement) {
  referenceNode.parentNode!.insertBefore(newNode, referenceNode.nextSibling);
}

export function buildCommitRowAttributes(hash: string, stash: GG.GitCommitStash | null): string {
  if (hash === UNCOMMITTED_CHANGES_HASH) {
    return `class="unsavedChanges" data-hash="${UNCOMMITTED_CHANGES_HASH}"`;
  } else if (stash !== null) {
    return `class="commit stash" data-hash="${hash}"`;
  } else {
    return `class="commit" data-hash="${hash}"`;
  }
}

export function buildStashSelectorDisplay(selector: string): string {
  return selector.substring("stash".length);
}

export function sendMessage(msg: GG.RequestMessage) {
  vscode.postMessage(msg);
}

export function refreshGraphOrDisplayError(
  status: GG.GitCommandStatus,
  errorMessage: string,
  onRefresh: () => void,
  showError: (message: string, reason: string, sourceElem: null) => void
) {
  if (status === null) {
    onRefresh();
  } else {
    showError(errorMessage, status, null);
  }
}
export function getVSCodeStyle(name: string) {
  return document.documentElement.style.getPropertyValue(name);
}

const ABBREV_COMMIT_LENGTH = 8;
export function abbrevCommit(commitHash: string) {
  return commitHash.substring(0, ABBREV_COMMIT_LENGTH);
}
