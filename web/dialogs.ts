import { escapeHtml, refInvalid, svgIcons } from "./utils";

const dialog = document.getElementById("dialog")!;
const dialogBacking = document.getElementById("dialogBacking")!;
let dialogMenuSource: HTMLElement | null = null;

export function showConfirmationDialog(
  message: string,
  confirmed: () => void,
  sourceElem: HTMLElement | null
) {
  showDialog(
    message,
    "Yes",
    "No",
    () => {
      hideDialog();
      confirmed();
    },
    sourceElem
  );
}

export function showRefInputDialog(
  message: string,
  defaultValue: string,
  actionName: string,
  actioned: (value: string) => void,
  sourceElem: HTMLElement | null
) {
  showFormDialog(
    message,
    [{ type: "text-ref", name: "", default: defaultValue }],
    actionName,
    (values) => actioned(values[0]),
    sourceElem
  );
}

export function showCheckboxDialog(
  message: string,
  checkboxLabel: string,
  checkboxValue: boolean,
  actionName: string,
  actioned: (value: boolean) => void,
  sourceElem: HTMLElement | null
) {
  showFormDialog(
    message,
    [{ type: "checkbox", name: checkboxLabel, value: checkboxValue }],
    actionName,
    (values) => actioned(values[0] === "checked"),
    sourceElem
  );
}

export function showSelectDialog(
  message: string,
  defaultValue: string,
  options: { name: string; value: string }[],
  actionName: string,
  actioned: (value: string) => void,
  sourceElem: HTMLElement | null
) {
  showFormDialog(
    message,
    [{ type: "select", name: "", options: options, default: defaultValue }],
    actionName,
    (values) => actioned(values[0]),
    sourceElem
  );
}

export function showFormDialog(
  message: string,
  inputs: DialogInput[],
  actionName: string,
  actioned: (values: string[]) => void,
  sourceElem: HTMLElement | null
) {
  let textRefInput = -1,
    multiElementForm = inputs.length > 1;
  let html = `${message}<br><table class="dialogForm ${multiElementForm ? "multi" : "single"}">`;
  for (let i = 0; i < inputs.length; i++) {
    let input = inputs[i];
    html += `<tr>${multiElementForm ? `<td>${input.name}</td>` : ""}<td>`;
    if (input.type === "select") {
      html += `<select id="dialogInput${i}">`;
      for (let j = 0; j < input.options.length; j++) {
        html += `<option value="${input.options[j].value}"${input.options[j].value === input.default ? " selected" : ""}>${input.options[j].name}</option>`;
      }
      html += "</select>";
    } else if (input.type === "checkbox") {
      html += `<span class="dialogFormCheckbox"><label><input id="dialogInput${i}" type="checkbox"${input.value ? " checked" : ""}/>${multiElementForm ? "" : input.name}</label></span>`;
    } else {
      let placeholder =
        input.type === "text" && input.placeholder !== null
          ? ` placeholder="${input.placeholder}"`
          : "";
      html += `<input id="dialogInput${i}" type="text" value="${input.default}"${placeholder}/>`;
      if (input.type === "text-ref") textRefInput = i;
    }
    html += "</td></tr>";
  }
  html += "</table>";
  showDialog(
    html,
    actionName,
    "Cancel",
    () => {
      if (dialog.className === "active noInput" || dialog.className === "active inputInvalid")
        return;
      let values = [];
      for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i],
          elem = document.getElementById(`dialogInput${i}`);
        if (input.type === "select") {
          values.push((<HTMLSelectElement>elem).value);
        } else if (input.type === "checkbox") {
          values.push((<HTMLInputElement>elem).checked ? "checked" : "unchecked");
        } else {
          values.push((<HTMLInputElement>elem).value);
        }
      }
      hideDialog();
      actioned(values);
    },
    sourceElem
  );

  if (textRefInput > -1) {
    let dialogInput = <HTMLInputElement>document.getElementById(`dialogInput${textRefInput}`),
      dialogAction = document.getElementById("dialogAction")!;
    if (dialogInput.value === "") dialog.className = "active noInput";
    dialogInput.focus();
    dialogInput.addEventListener("keyup", () => {
      let noInput = dialogInput.value === "",
        invalidInput = dialogInput.value.match(refInvalid) !== null;
      let newClassName = `active${noInput ? " noInput" : invalidInput ? " inputInvalid" : ""}`;
      if (dialog.className !== newClassName) {
        dialog.className = newClassName;
        dialogAction.title = invalidInput
          ? `Unable to ${actionName}, one or more invalid characters entered.`
          : "";
      }
    });
  }
}

export function showErrorDialog(
  message: string,
  reason: string | null,
  sourceElem: HTMLElement | null
) {
  showDialog(
    `${svgIcons.alert}Error: ${message}${reason !== null ? `<br><span class="errorReason">${escapeHtml(reason).split("\n").join("<br>")}</span>` : ""}`,
    null,
    "Dismiss",
    null,
    sourceElem
  );
}

export function showActionRunningDialog(command: string) {
  showDialog(
    `<span id="actionRunning">${svgIcons.loading}${command} ...</span>`,
    null,
    "Dismiss",
    null,
    null
  );
}

function showDialog(
  html: string,
  actionName: string | null,
  dismissName: string,
  actioned: (() => void) | null,
  sourceElem: HTMLElement | null
) {
  dialogBacking.className = "active";
  dialog.className = "active";
  dialog.innerHTML = `${html}<br>${actionName !== null ? `<div id="dialogAction" class="roundedBtn">${actionName}</div>` : ""}<div id="dialogDismiss" class="roundedBtn">${dismissName}</div>`;
  if (actionName !== null && actioned !== null)
    document.getElementById("dialogAction")!.addEventListener("click", actioned);
  document.getElementById("dialogDismiss")!.addEventListener("click", hideDialog);

  dialogMenuSource = sourceElem;
  if (dialogMenuSource !== null) dialogMenuSource.classList.add("dialogActive");
}

export function hideDialog() {
  dialogBacking.className = "";
  dialog.className = "";
  dialog.innerHTML = "";
  if (dialogMenuSource !== null) {
    dialogMenuSource.classList.remove("dialogActive");
    dialogMenuSource = null;
  }
}

export function isDialogActive() {
  return dialog.classList.contains("active");
}
