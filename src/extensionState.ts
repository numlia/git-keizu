import * as fs from "node:fs/promises";
import * as path from "node:path";

import { ExtensionContext, Memento } from "vscode";

import { Avatar, AvatarCache, GitRepoSet, GitRepoState, RecentActionId } from "./types";
import { getPathFromStr } from "./utils";

const AVATAR_STORAGE_FOLDER = "avatars";
const AVATAR_CACHE = "avatarCache";
const LAST_ACTIVE_REPO = "lastActiveRepo";
const REPO_STATES = "repoStates";
const MAX_RECENT_ACTIONS = 5;

export class ExtensionState {
  private globalState: Memento;
  private workspaceState: Memento;
  private globalStoragePath: string;
  private avatarStorageAvailable: boolean = false;

  constructor(context: ExtensionContext) {
    this.globalState = context.globalState;
    this.workspaceState = context.workspaceState;

    this.globalStoragePath = getPathFromStr(context.globalStoragePath);
    this.initAvatarStorage();
  }

  private async initAvatarStorage() {
    const avatarDir = path.join(this.globalStoragePath, AVATAR_STORAGE_FOLDER);
    try {
      await fs.stat(avatarDir);
      this.avatarStorageAvailable = true;
    } catch {
      try {
        await fs.mkdir(avatarDir, { recursive: true });
        this.avatarStorageAvailable = true;
      } catch {
        // Avatar storage initialization failed; avatars will be unavailable
      }
    }
  }

  /* Discovered Repos */
  public getRepos() {
    return this.workspaceState.get<GitRepoSet>(REPO_STATES, {});
  }
  public saveRepos(gitRepoSet: GitRepoSet) {
    this.workspaceState.update(REPO_STATES, this.normalizeRepoSet(gitRepoSet));
  }

  /* Last Active Repo */
  public getLastActiveRepo() {
    return this.workspaceState.get<string | null>(LAST_ACTIVE_REPO, null);
  }
  public setLastActiveRepo(repo: string | null) {
    this.workspaceState.update(LAST_ACTIVE_REPO, repo);
  }

  /* Avatars */
  public isAvatarStorageAvailable() {
    return this.avatarStorageAvailable;
  }
  public getAvatarStoragePath() {
    return path.join(this.globalStoragePath, AVATAR_STORAGE_FOLDER);
  }
  public getAvatarCache() {
    return this.globalState.get<AvatarCache>(AVATAR_CACHE, {});
  }
  public saveAvatar(email: string, avatar: Avatar) {
    let avatars = this.getAvatarCache();
    avatars[email] = avatar;
    this.globalState.update(AVATAR_CACHE, avatars);
  }
  public removeAvatarFromCache(email: string) {
    let avatars = this.getAvatarCache();
    delete avatars[email];
    this.globalState.update(AVATAR_CACHE, avatars);
  }
  public async clearAvatarCache() {
    this.globalState.update(AVATAR_CACHE, {});
    const avatarDir = path.join(this.globalStoragePath, AVATAR_STORAGE_FOLDER);
    try {
      const files = await fs.readdir(avatarDir);
      await Promise.all(files.map((file) => fs.unlink(path.join(avatarDir, file)).catch(() => {})));
    } catch {
      // Directory may not exist; nothing to clean up
    }
  }

  private normalizeRepoSet(gitRepoSet: GitRepoSet): GitRepoSet {
    let normalizedRepoSet: GitRepoSet | null = null;

    for (const [repo, state] of Object.entries(gitRepoSet)) {
      const normalizedState = this.normalizeRepoState(state);
      if (normalizedState === state) {
        continue;
      }

      if (normalizedRepoSet === null) {
        normalizedRepoSet = { ...gitRepoSet };
      }
      normalizedRepoSet[repo] = normalizedState;
    }

    return normalizedRepoSet ?? gitRepoSet;
  }

  private normalizeRepoState(state: GitRepoState): GitRepoState {
    const recentActions = state.recentActions;
    if (recentActions === undefined || recentActions.length <= 1) {
      return state;
    }

    const normalizedRecentActions = this.normalizeRecentActions(recentActions);
    if (normalizedRecentActions === recentActions) {
      return state;
    }

    return {
      ...state,
      recentActions: normalizedRecentActions
    };
  }

  private normalizeRecentActions(recentActions: RecentActionId[]): RecentActionId[] {
    const seen = new Set<RecentActionId>();
    const normalizedRecentActions: RecentActionId[] = [];

    for (const actionId of recentActions) {
      if (seen.has(actionId)) {
        continue;
      }
      seen.add(actionId);
      normalizedRecentActions.push(actionId);
      if (normalizedRecentActions.length === MAX_RECENT_ACTIONS) {
        break;
      }
    }

    if (
      normalizedRecentActions.length === recentActions.length &&
      normalizedRecentActions.every((actionId, index) => actionId === recentActions[index])
    ) {
      return recentActions;
    }

    return normalizedRecentActions;
  }
}
