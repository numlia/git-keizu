import * as GG from "../src/types";
import { escapeHtml, svgIcons } from "./utils";

export function generateGitFileTree(gitFiles: GG.GitFileChange[]) {
  let contents: GitFolderContents = {},
    i,
    j,
    path,
    cur: GitFolder;
  let files: GitFolder = {
    type: "folder",
    name: "",
    folderPath: "",
    contents: contents,
    open: true
  };
  for (i = 0; i < gitFiles.length; i++) {
    cur = files;
    path = gitFiles[i].newFilePath.split("/");
    for (j = 0; j < path.length; j++) {
      if (j < path.length - 1) {
        if (cur.contents[path[j]] === undefined) {
          contents = {};
          cur.contents[path[j]] = {
            type: "folder",
            name: path[j],
            folderPath: path.slice(0, j + 1).join("/"),
            contents: contents,
            open: true
          };
        }
        cur = <GitFolder>cur.contents[path[j]];
      } else {
        cur.contents[path[j]] = { type: "file", name: path[j], index: i };
      }
    }
  }
  return files;
}

export function generateGitFileTreeHtml(folder: GitFolder, gitFiles: GG.GitFileChange[]) {
  let html =
      (folder.name !== ""
        ? `<span class="gitFolder" data-folderpath="${encodeURIComponent(folder.folderPath)}"><span class="gitFolderIcon">${folder.open ? svgIcons.openFolder : svgIcons.closedFolder}</span><span class="gitFolderName">${folder.name}</span></span>`
        : "") + `<ul class="gitFolderContents${!folder.open ? " hidden" : ""}">`,
    keys = Object.keys(folder.contents),
    i,
    gitFile,
    gitFolder;
  keys.sort((a, b) =>
    folder.contents[a].type === "folder" && folder.contents[b].type === "file"
      ? -1
      : folder.contents[a].type === "file" && folder.contents[b].type === "folder"
        ? 1
        : folder.contents[a].name < folder.contents[b].name
          ? -1
          : folder.contents[a].name > folder.contents[b].name
            ? 1
            : 0
  );
  for (i = 0; i < keys.length; i++) {
    if (folder.contents[keys[i]].type === "folder") {
      gitFolder = <GitFolder>folder.contents[keys[i]];
      html += `<li${!gitFolder.open ? ' class="closed"' : ""}>${generateGitFileTreeHtml(gitFolder, gitFiles)}</li>`;
    } else {
      gitFile = gitFiles[(<GitFile>folder.contents[keys[i]]).index];
      let diffPossible = gitFile.additions !== null && gitFile.deletions !== null;
      let binaryTitle = !diffPossible ? ' title="This is a binary file, unable to view diff."' : "";
      let renameHtml =
        gitFile.type === "R"
          ? ` <span class="gitFileRename" title="${escapeHtml(`${gitFile.oldFilePath} was renamed to ${gitFile.newFilePath}`)}">R</span>`
          : "";
      let addDelHtml =
        gitFile.type !== "A" && gitFile.type !== "D" && diffPossible
          ? `<span class="gitFileAddDel">(<span class="gitFileAdditions" title="${gitFile.additions} addition${gitFile.additions !== 1 ? "s" : ""}">+${gitFile.additions}</span>|<span class="gitFileDeletions" title="${gitFile.deletions} deletion${gitFile.deletions !== 1 ? "s" : ""}">-${gitFile.deletions}</span>)</span>`
          : "";
      html += `<li class="gitFile ${gitFile.type}${diffPossible ? " gitDiffPossible" : ""}" data-oldfilepath="${encodeURIComponent(gitFile.oldFilePath)}" data-newfilepath="${encodeURIComponent(gitFile.newFilePath)}" data-type="${gitFile.type}"${binaryTitle}><span class="gitFileIcon">${svgIcons.file}</span>${folder.contents[keys[i]].name}${renameHtml}${addDelHtml}</li>`;
    }
  }
  return `${html}</ul>`;
}

export function alterGitFileTree(folder: GitFolder, folderPath: string, open: boolean) {
  let path = folderPath.split("/"),
    i,
    cur = folder;
  for (i = 0; i < path.length; i++) {
    if (cur.contents[path[i]] !== undefined) {
      cur = <GitFolder>cur.contents[path[i]];
      if (i === path.length - 1) {
        cur.open = open;
        return;
      }
    } else {
      return;
    }
  }
}
