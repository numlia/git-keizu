import { addListenerToClass } from "./utils";

const contextMenu = document.getElementById("contextMenu")!;
let contextMenuSource: HTMLElement | null = null;

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
  contextMenu.style.left = `${
    event.pageX - window.pageXOffset + bounds.width < window.innerWidth
      ? event.pageX - 2
      : event.pageX - bounds.width + 2
  }px`;
  contextMenu.style.top = `${
    event.pageY - window.pageYOffset + bounds.height < window.innerHeight
      ? event.pageY - 2
      : event.pageY - bounds.height + 2
  }px`;
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
