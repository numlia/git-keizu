import { addListenerToClass } from "./utils";

const contextMenu = document.getElementById("contextMenu")!;
let contextMenuSource: HTMLElement | null = null;
const POSITION_OFFSET = 2;

export function showContextMenu(
  e: MouseEvent,
  items: ContextMenuElement[],
  sourceElem: HTMLElement
) {
  let html = "",
    i: number,
    event = <MouseEvent>e;
  for (i = 0; i < items.length; i++) {
    html +=
      items[i] !== null
        ? `<li class="contextMenuItem" data-index="${i}">${items[i]!.title}</li>`
        : '<li class="contextMenuDivider"></li>';
  }

  hideContextMenuListener();
  contextMenu.style.opacity = "0";
  contextMenu.className = "active";
  contextMenu.innerHTML = html;
  let bounds = contextMenu.getBoundingClientRect();
  contextMenu.style.left = `${Math.max(
    0,
    event.clientX + bounds.width < window.innerWidth
      ? event.clientX - POSITION_OFFSET
      : event.clientX - bounds.width + POSITION_OFFSET
  )}px`;
  contextMenu.style.top = `${Math.max(
    0,
    event.clientY + bounds.height < window.innerHeight
      ? event.clientY - POSITION_OFFSET
      : event.clientY - bounds.height + POSITION_OFFSET
  )}px`;
  contextMenu.style.opacity = "1";

  addListenerToClass("contextMenuItem", "click", (e) => {
    e.stopPropagation();
    hideContextMenu();
    items[parseInt((<HTMLElement>e.target).dataset.index!, 10)]!.onClick();
  });

  contextMenuSource = sourceElem;
  contextMenuSource.classList.add("contextMenuActive");
}

export function hideContextMenu() {
  contextMenu.className = "";
  contextMenu.innerHTML = "";
  contextMenu.style.left = "0px";
  contextMenu.style.top = "0px";
  if (contextMenuSource !== null) {
    contextMenuSource.classList.remove("contextMenuActive");
    contextMenuSource = null;
  }
}

export function hideContextMenuListener() {
  if (contextMenu.classList.contains("active")) hideContextMenu();
}

export function isContextMenuActive() {
  return contextMenu.classList.contains("active");
}
