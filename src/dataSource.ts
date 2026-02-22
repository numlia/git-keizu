import * as cp from "node:child_process";
import * as path from "node:path";

import { getConfig } from "./config";
import {
  GitCommandStatus,
  GitCommit,
  GitCommitDetails,
  GitCommitNode,
  GitFileChangeType,
  GitRefData,
  GitResetMode,
  GitUnsavedChanges
} from "./types";
import { getPathFromStr } from "./utils";

const eolRegex = /\r\n|\r|\n/g;
const headRegex = /^\(HEAD detached at [0-9A-Za-z]+\)/g;
const gitLogSeparator = "XX7Nal-YARtTpjCikii9nJxER19D6diSyk-AWkPb";
const COMMIT_HASH_PATTERN = /^[0-9a-f]{4,40}$/i;

function isValidCommitHash(hash: string): boolean {
  return COMMIT_HASH_PATTERN.test(hash);
}

const INVALID_COMMIT_HASH_MESSAGE = "Invalid commit hash.";
const VALID_RESET_MODES = new Set(["soft", "mixed", "hard"]);
const VALID_GIT_BINARY_NAME = /^git(\.exe)?$/i;
const DEFAULT_GIT_PATH = "git";

function isValidGitPath(gitPath: string): boolean {
  if (gitPath === DEFAULT_GIT_PATH) return true;
  if (!path.isAbsolute(gitPath)) return false;
  return VALID_GIT_BINARY_NAME.test(path.basename(gitPath));
}

export class DataSource {
  private gitPath!: string;
  private gitLogFormat!: string;
  private gitCommitDetailsFormat!: string;

  constructor() {
    this.registerGitPath();
    this.generateGitCommandFormats();
  }

  public registerGitPath() {
    const configPath = getConfig().gitPath();
    this.gitPath = isValidGitPath(configPath) ? configPath : DEFAULT_GIT_PATH;
  }

  public generateGitCommandFormats() {
    let dateType = getConfig().dateType() === "Author Date" ? "%at" : "%ct";
    this.gitLogFormat = ["%H", "%P", "%an", "%ae", dateType, "%s"].join(gitLogSeparator);
    this.gitCommitDetailsFormat = `${["%H", "%P", "%an", "%ae", dateType, "%cn"].join(gitLogSeparator)}%n%B`;
  }

  public getBranches(repo: string, showRemoteBranches: boolean) {
    return this.spawnGit<{ branches: string[]; head: string | null; error: boolean }>(
      ["branch", ...(showRemoteBranches ? ["-a"] : [])],
      repo,
      (stdout) => {
        let branchData: { branches: string[]; head: string | null; error: boolean } = {
          branches: [],
          head: null,
          error: false
        };
        let lines = stdout.split(eolRegex);
        for (let i = 0; i < lines.length - 1; i++) {
          let name = lines[i].substring(2).split(" -> ")[0];
          if (name.match(headRegex) !== null) continue;

          if (lines[i][0] === "*") {
            branchData.head = name;
            branchData.branches.unshift(name);
          } else {
            branchData.branches.push(name);
          }
        }
        return branchData;
      },
      { branches: [], head: null, error: true }
    );
  }

  public async getCommits(
    repo: string,
    branch: string,
    maxCommits: number,
    showRemoteBranches: boolean
  ) {
    const [commits, refData] = await Promise.all([
      this.getGitLog(repo, branch, maxCommits + 1, showRemoteBranches),
      this.getRefs(repo, showRemoteBranches)
    ]);

    const moreCommitsAvailable = commits.length === maxCommits + 1;
    if (moreCommitsAvailable) commits.pop();

    if (refData.head !== null) {
      for (let i = 0; i < commits.length; i++) {
        if (refData.head === commits[i].hash) {
          const unsavedChanges = getConfig().showUncommittedChanges()
            ? await this.getGitUnsavedChanges(repo)
            : null;
          if (unsavedChanges !== null) {
            commits.unshift({
              hash: "*",
              parentHashes: [refData.head],
              author: "*",
              email: "",
              date: Math.round(new Date().getTime() / 1000),
              message: `Uncommitted Changes (${unsavedChanges.changes})`
            });
          }
          break;
        }
      }
    }

    const commitNodes: GitCommitNode[] = [];
    const commitLookup: { [hash: string]: number } = {};

    for (let i = 0; i < commits.length; i++) {
      commitLookup[commits[i].hash] = i;
      commitNodes.push({
        hash: commits[i].hash,
        parentHashes: commits[i].parentHashes,
        author: commits[i].author,
        email: commits[i].email,
        date: commits[i].date,
        message: commits[i].message,
        refs: []
      });
    }
    for (let i = 0; i < refData.refs.length; i++) {
      if (typeof commitLookup[refData.refs[i].hash] === "number") {
        commitNodes[commitLookup[refData.refs[i].hash]].refs.push(refData.refs[i]);
      }
    }

    return {
      commits: commitNodes,
      head: refData.head,
      moreCommitsAvailable: moreCommitsAvailable
    };
  }

  public async commitDetails(repo: string, commitHash: string): Promise<GitCommitDetails | null> {
    if (!isValidCommitHash(commitHash)) {
      return null;
    }
    try {
      const [details, nameStatus, numStat] = await Promise.all([
        this.spawnGit<GitCommitDetails | null>(
          ["show", "--quiet", commitHash, `--format=${this.gitCommitDetailsFormat}`],
          repo,
          (stdout) => {
            let lines = stdout.split(eolRegex);
            let lastLine = lines.length - 1;
            while (lines.length > 0 && lines[lastLine] === "") lastLine--;
            let commitInfo = lines[0].split(gitLogSeparator);
            return {
              hash: commitInfo[0],
              parents: commitInfo[1].split(" "),
              author: commitInfo[2],
              email: commitInfo[3],
              date: parseInt(commitInfo[4], 10),
              committer: commitInfo[5],
              body: lines.slice(1, lastLine + 1).join("\n"),
              fileChanges: []
            };
          },
          null
        ),
        this.spawnGit<string[]>(
          [
            "diff-tree",
            "--name-status",
            "-r",
            "-m",
            "--root",
            "--find-renames",
            "--diff-filter=AMDR",
            commitHash
          ],
          repo,
          (stdout) => stdout.split(eolRegex),
          []
        ),
        this.spawnGit<string[]>(
          [
            "diff-tree",
            "--numstat",
            "-r",
            "-m",
            "--root",
            "--find-renames",
            "--diff-filter=AMDR",
            commitHash
          ],
          repo,
          (stdout) => stdout.split(eolRegex),
          []
        )
      ]);

      if (details === null) return null;
      const fileLookup: { [file: string]: number } = {};

      for (let i = 1; i < nameStatus.length - 1; i++) {
        let line = nameStatus[i].split("\t");
        if (line.length < 2) break;
        let oldFilePath = getPathFromStr(line[1]),
          newFilePath = getPathFromStr(line[line.length - 1]);
        fileLookup[newFilePath] = details.fileChanges.length;
        details.fileChanges.push({
          oldFilePath: oldFilePath,
          newFilePath: newFilePath,
          type: <GitFileChangeType>line[0][0],
          additions: null,
          deletions: null
        });
      }

      for (let i = 1; i < numStat.length - 1; i++) {
        let line = numStat[i].split("\t");
        if (line.length !== 3) break;
        let fileName = line[2].replace(/(.*){.* => (.*)}/, "$1$2").replace(/.* => (.*)/, "$1");
        if (typeof fileLookup[fileName] === "number") {
          details.fileChanges[fileLookup[fileName]].additions = parseInt(line[0], 10);
          details.fileChanges[fileLookup[fileName]].deletions = parseInt(line[1], 10);
        }
      }
      return details;
    } catch {
      return null;
    }
  }

  public getCommitFile(repo: string, commitHash: string, filePath: string) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve("");
    }
    if (filePath.split("/").includes("..")) {
      return Promise.resolve("");
    }
    return this.spawnGit(["show", `${commitHash}:${filePath}`], repo, (stdout) => stdout, "");
  }

  public getRemoteUrl(repo: string) {
    return this.spawnGit<string | null>(
      ["config", "--get", "remote.origin.url"],
      repo,
      (stdout) => stdout.split(eolRegex)[0],
      null
    );
  }

  public isGitRepository(path: string) {
    return this.spawnGit<boolean>(["rev-parse", "--git-dir"], path, () => true, false);
  }

  public addTag(
    repo: string,
    tagName: string,
    commitHash: string,
    lightweight: boolean,
    message: string
  ) {
    let args = ["tag"];
    if (lightweight) {
      args.push(tagName);
    } else {
      args.push("-a", tagName, "-m", message);
    }
    args.push(commitHash);
    return this.runGitCommandSpawn(args, repo);
  }

  public deleteTag(repo: string, tagName: string) {
    return this.runGitCommandSpawn(["tag", "-d", tagName], repo);
  }

  public pushTag(repo: string, tagName: string) {
    return this.runGitCommandSpawn(["push", "origin", tagName], repo);
  }

  public createBranch(repo: string, branchName: string, commitHash: string) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve(INVALID_COMMIT_HASH_MESSAGE);
    }
    return this.runGitCommandSpawn(["branch", branchName, commitHash], repo);
  }

  public checkoutBranch(repo: string, branchName: string, remoteBranch: string | null) {
    if (remoteBranch === null) {
      return this.runGitCommandSpawn(["checkout", branchName], repo);
    }
    return this.runGitCommandSpawn(["checkout", "-b", branchName, remoteBranch], repo);
  }

  public checkoutCommit(repo: string, commitHash: string) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve(INVALID_COMMIT_HASH_MESSAGE);
    }
    return this.runGitCommandSpawn(["checkout", commitHash], repo);
  }

  public deleteBranch(repo: string, branchName: string, forceDelete: boolean) {
    return this.runGitCommandSpawn(
      ["branch", "--delete", ...(forceDelete ? ["--force"] : []), branchName],
      repo
    );
  }

  public renameBranch(repo: string, oldName: string, newName: string) {
    return this.runGitCommandSpawn(["branch", "-m", oldName, newName], repo);
  }

  public mergeBranch(repo: string, branchName: string, createNewCommit: boolean) {
    return this.runGitCommandSpawn(
      ["merge", branchName, ...(createNewCommit ? ["--no-ff"] : [])],
      repo
    );
  }

  public mergeCommit(repo: string, commitHash: string, createNewCommit: boolean) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve(INVALID_COMMIT_HASH_MESSAGE);
    }
    return this.runGitCommandSpawn(
      ["merge", commitHash, ...(createNewCommit ? ["--no-ff"] : [])],
      repo
    );
  }

  public cherrypickCommit(repo: string, commitHash: string, parentIndex: number) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve(INVALID_COMMIT_HASH_MESSAGE);
    }
    if (!Number.isInteger(parentIndex) || parentIndex < 0) {
      return Promise.resolve("Invalid parent index.");
    }
    return this.runGitCommandSpawn(
      ["cherry-pick", commitHash, ...(parentIndex > 0 ? ["-m", String(parentIndex)] : [])],
      repo
    );
  }

  public revertCommit(repo: string, commitHash: string, parentIndex: number) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve(INVALID_COMMIT_HASH_MESSAGE);
    }
    if (!Number.isInteger(parentIndex) || parentIndex < 0) {
      return Promise.resolve("Invalid parent index.");
    }
    return this.runGitCommandSpawn(
      ["revert", "--no-edit", commitHash, ...(parentIndex > 0 ? ["-m", String(parentIndex)] : [])],
      repo
    );
  }

  public resetToCommit(repo: string, commitHash: string, resetMode: GitResetMode) {
    if (!isValidCommitHash(commitHash)) {
      return Promise.resolve(INVALID_COMMIT_HASH_MESSAGE);
    }
    if (!VALID_RESET_MODES.has(resetMode)) {
      return Promise.resolve("Invalid reset mode.");
    }
    return this.runGitCommandSpawn(["reset", `--${resetMode}`, commitHash], repo);
  }

  private getRefs(repo: string, showRemoteBranches: boolean) {
    let args = ["show-ref"];
    if (!showRemoteBranches) {
      args.push("--heads", "--tags");
    }
    args.push("-d", "--head");

    return this.spawnGit<GitRefData>(
      args,
      repo,
      (stdout) => {
        let refData: GitRefData = { head: null, refs: [] };
        let lines = stdout.split(eolRegex);
        for (let i = 0; i < lines.length - 1; i++) {
          let line = lines[i].split(" ");
          if (line.length < 2) continue;

          let hash = line.shift()!;
          let ref = line.join(" ");

          if (ref.startsWith("refs/heads/")) {
            refData.refs.push({ hash: hash, name: ref.substring(11), type: "head" });
          } else if (ref.startsWith("refs/tags/")) {
            refData.refs.push({
              hash: hash,
              name: ref.endsWith("^{}") ? ref.substring(10, ref.length - 3) : ref.substring(10),
              type: "tag"
            });
          } else if (ref.startsWith("refs/remotes/")) {
            refData.refs.push({ hash: hash, name: ref.substring(13), type: "remote" });
          } else if (ref === "HEAD") {
            refData.head = hash;
          }
        }
        return refData;
      },
      { head: null, refs: [] }
    );
  }

  private getGitLog(repo: string, branch: string, num: number, showRemoteBranches: boolean) {
    let args = ["log", `--max-count=${num}`, `--format=${this.gitLogFormat}`, "--date-order"];
    if (branch !== "") {
      args.push(branch);
    } else {
      args.push("--branches", "--tags");
      if (showRemoteBranches) args.push("--remotes");
    }

    return this.spawnGit(
      args,
      repo,
      (stdout) => {
        let lines = stdout.split(eolRegex);
        let gitCommits: GitCommit[] = [];
        for (let i = 0; i < lines.length - 1; i++) {
          let line = lines[i].split(gitLogSeparator);
          if (line.length !== 6) break;
          gitCommits.push({
            hash: line[0],
            parentHashes: line[1].split(" "),
            author: line[2],
            email: line[3],
            date: parseInt(line[4], 10),
            message: line[5]
          });
        }
        return gitCommits;
      },
      []
    );
  }

  private getGitUnsavedChanges(repo: string) {
    return this.spawnGit<GitUnsavedChanges | null>(
      ["status", "-s", "--branch", "--untracked-files", "--porcelain"],
      repo,
      (stdout) => {
        let lines = stdout.split(eolRegex);
        return lines.length > 2
          ? { branch: lines[0].substring(3).split("...")[0], changes: lines.length - 2 }
          : null;
      },
      null
    );
  }

  private runGitCommandSpawn(args: string[], repo: string) {
    return new Promise<GitCommandStatus>((resolve) => {
      let stdout = "",
        stderr = "",
        err = false;
      const cmd = cp.spawn(this.gitPath, args, { cwd: repo });
      cmd.stdout.on("data", (d) => {
        stdout += d;
      });
      cmd.stderr.on("data", (d) => {
        stderr += d;
      });
      cmd.on("error", (e) => {
        resolve(e.message.split(eolRegex).join("\n"));
        err = true;
      });
      cmd.on("exit", (code) => {
        if (err) return;
        if (code === 0) {
          resolve(null);
        } else {
          let lines = (stdout !== "" ? stdout : stderr !== "" ? stderr : "").split(eolRegex);
          resolve(lines.slice(0, lines.length - 1).join("\n"));
        }
      });
    });
  }

  private spawnGit<T>(
    args: string[],
    repo: string,
    successValue: { (stdout: string): T },
    errorValue: T
  ) {
    return new Promise<T>((resolve) => {
      let stdout = "",
        err = false;
      const cmd = cp.spawn(this.gitPath, args, { cwd: repo });
      cmd.stdout.on("data", (d) => {
        stdout += d;
      });
      cmd.on("error", () => {
        resolve(errorValue);
        err = true;
      });
      cmd.on("exit", (code) => {
        if (err) return;
        resolve(code === 0 ? successValue(stdout) : errorValue);
      });
    });
  }
}
