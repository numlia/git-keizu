import { getBranchLabels } from "./branchLabels";
import { buildCommitContextMenuItems } from "./commitMenu";
import {
  hideContextMenu,
  hideContextMenuListener,
  isContextMenuActive,
  showContextMenu
} from "./contextMenu";
import { getCommitDate } from "./dates";
import { hideDialog, isDialogActive } from "./dialogs";
import { Dropdown } from "./dropdown";
import { alterGitFileTree, generateGitFileTree, generateGitFileTreeHtml } from "./fileTree";
import { FindWidget } from "./findWidget";
import { Graph } from "./graph";
import { handleMessage } from "./messageHandler";
import { buildRefContextMenuItems, checkoutBranchAction } from "./refMenu";
import { buildStashContextMenuItems } from "./stashMenu";
import { buildUncommittedContextMenuItems } from "./uncommittedMenu";
import {
  abbrevCommit,
  addListenerToClass,
  arraysEqual,
  buildCommitRowAttributes,
  buildStashSelectorDisplay,
  escapeHtml,
  getVSCodeStyle,
  insertAfter,
  sendMessage,
  svgIcons,
  UNCOMMITTED_CHANGES_HASH,
  unescapeHtml,
  vscode
} from "./utils";

const FLASH_ANIMATION_DURATION_MS = 850;
const SCROLL_PADDING_TOP = 8;
const SCROLL_ROW_HEIGHT = 32;
const SCROLL_CENTER_OFFSET = 12;

const CDV_DEFAULT_HEIGHT = 250;
const CDV_MIN_HEIGHT = 100;
const CDV_SCROLL_PADDING = 8;

class GitGraphView {
  private gitRepos: GG.GitRepoSet;
  private gitBranches: string[] = [];
  private gitBranchHead: string | null = null;
  private commits: GG.GitCommitNode[] = [];
  private commitHead: string | null = null;
  private commitLookup: { [hash: string]: number } = {};
  private avatars: AvatarImageCollection = {};
  private currentBranch: string | null = null;
  private currentRepo!: string;

  private graph: Graph;
  private findWidget: FindWidget;
  private config: Config;
  private moreCommitsAvailable: boolean = false;
  private showRemoteBranches: boolean = true;
  private expandedCommit: ExpandedCommit | null = null;
  private maxCommits: number;

  private tableElem: HTMLElement;
  private footerElem: HTMLElement;
  private scrollContainerElem: HTMLElement;
  private repoDropdown: Dropdown;
  private branchDropdown: Dropdown;
  private showRemoteBranchesElem: HTMLInputElement;
  private scrollShadowElem: HTMLElement;

  private loadBranchesCallback: ((changes: boolean, isRepo: boolean) => void) | null = null;
  private loadCommitsCallback: ((changes: boolean) => void) | null = null;

  constructor(
    repos: GG.GitRepoSet,
    lastActiveRepo: string | null,
    config: Config,
    prevState: WebViewState | null
  ) {
    this.gitRepos = repos;
    this.config = config;
    this.maxCommits = config.initialLoadCommits;
    this.graph = new Graph("commitGraph", this.config);
    this.tableElem = document.getElementById("commitTable")!;
    this.footerElem = document.getElementById("footer")!;
    this.scrollContainerElem = document.getElementById("scrollContainer")!;
    this.repoDropdown = new Dropdown("repoSelect", true, "Repos", (value) => {
      this.currentRepo = value;
      this.maxCommits = this.config.initialLoadCommits;
      this.expandedCommit = null;
      this.currentBranch = null;
      this.saveState();
      this.refresh(true);
    });
    this.branchDropdown = new Dropdown("branchSelect", false, "Branches", (value) => {
      this.currentBranch = value;
      this.maxCommits = this.config.initialLoadCommits;
      this.expandedCommit = null;
      this.saveState();
      this.renderShowLoading();
      this.requestLoadCommits(true, () => {});
    });
    this.showRemoteBranchesElem = <HTMLInputElement>(
      document.getElementById("showRemoteBranchesCheckbox")!
    );
    this.showRemoteBranchesElem.addEventListener("change", () => {
      this.showRemoteBranches = this.showRemoteBranchesElem.checked;
      this.saveState();
      this.refresh(true);
    });
    this.scrollShadowElem = <HTMLInputElement>document.getElementById("scrollShadow")!;
    const refreshBtnElem = document.getElementById("refreshBtn")!;
    refreshBtnElem.innerHTML = svgIcons.refresh;
    refreshBtnElem.addEventListener("click", () => {
      this.refresh(true);
    });
    const fetchBtnElem = document.getElementById("fetchBtn")!;
    fetchBtnElem.innerHTML = svgIcons.fetch;
    fetchBtnElem.addEventListener("click", () => {
      sendMessage({ command: "fetch", repo: this.currentRepo });
    });
    const currentBtnElem = document.getElementById("currentBtn")!;
    currentBtnElem.innerHTML = svgIcons.current;
    currentBtnElem.addEventListener("click", () => {
      if (this.commitHead !== null && typeof this.commitLookup[this.commitHead] === "number") {
        this.scrollToCommit(this.commitHead, true, true);
      }
    });
    const searchBtnElem = document.getElementById("searchBtn")!;
    searchBtnElem.innerHTML = svgIcons.search;
    searchBtnElem.addEventListener("click", () => {
      this.findWidget.show(true);
    });
    this.findWidget = new FindWidget({
      getCommits: () => this.commits,
      getColumnVisibility: () => ({
        author: true,
        date: true,
        commit: true
      }),
      scrollToCommit: (hash, alwaysCenterCommit) => this.scrollToCommit(hash, alwaysCenterCommit),
      saveState: () => this.saveState(),
      loadCommitDetails: (elem) => this.loadCommitDetails(elem),
      getCommitId: (hash) =>
        typeof this.commitLookup[hash] === "number" ? this.commitLookup[hash] : null,
      isCdvOpen: (hash, compareWithHash) =>
        this.expandedCommit !== null &&
        this.expandedCommit.hash === hash &&
        this.expandedCommit.compareWithHash === compareWithHash
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        this.findWidget.show(true);
      }
    });
    this.observeWindowSizeChanges();
    this.observeWebviewStyleChanges();
    this.observeWebviewScroll();

    this.renderShowLoading();
    if (prevState) {
      this.currentBranch = prevState.currentBranch;
      this.showRemoteBranches = prevState.showRemoteBranches;
      this.showRemoteBranchesElem.checked = this.showRemoteBranches;
      if (this.gitRepos[prevState.currentRepo] !== undefined) {
        this.currentRepo = prevState.currentRepo;
        this.maxCommits = prevState.maxCommits;
        this.expandedCommit = prevState.expandedCommit;
        this.avatars = prevState.avatars;
        this.loadBranches(prevState.gitBranches, prevState.gitBranchHead, true, true);
        this.loadCommits(
          prevState.commits,
          prevState.commitHead,
          prevState.moreCommitsAvailable,
          true
        );
      }
      if (prevState.findWidgetState !== null && prevState.findWidgetState !== undefined) {
        this.findWidget.restoreState(prevState.findWidgetState);
      }
    }
    this.loadRepos(this.gitRepos, lastActiveRepo);
    this.requestLoadBranchesAndCommits(false);
  }

  /* Loading Data */
  public loadRepos(repos: GG.GitRepoSet, lastActiveRepo: string | null) {
    this.gitRepos = repos;
    this.saveState();

    let repoPaths = Object.keys(repos),
      changedRepo = false;
    if (repos[this.currentRepo] === undefined) {
      this.currentRepo =
        lastActiveRepo !== null && repos[lastActiveRepo] !== undefined
          ? lastActiveRepo
          : repoPaths[0];
      this.saveState();
      changedRepo = true;
    }

    let options = [],
      repoComps,
      i;
    for (i = 0; i < repoPaths.length; i++) {
      repoComps = repoPaths[i].split("/");
      options.push({ name: repoComps[repoComps.length - 1], value: repoPaths[i] });
    }
    document.getElementById("repoControl")!.style.display =
      repoPaths.length > 1 ? "inline" : "none";
    this.repoDropdown.setOptions(options, this.currentRepo);

    if (changedRepo) {
      this.refresh(true);
    }
  }

  public loadBranches(
    branchOptions: string[],
    branchHead: string | null,
    hard: boolean,
    isRepo: boolean
  ) {
    if (!isRepo) {
      this.triggerLoadBranchesCallback(false, isRepo);
      return;
    }
    if (
      !hard &&
      arraysEqual(this.gitBranches, branchOptions, (a, b) => a === b) &&
      this.gitBranchHead === branchHead
    ) {
      this.triggerLoadBranchesCallback(false, isRepo);
      return;
    }

    this.gitBranches = branchOptions;
    this.gitBranchHead = branchHead;
    if (
      this.currentBranch === null ||
      (this.currentBranch !== "" && !this.gitBranches.includes(this.currentBranch))
    ) {
      this.currentBranch =
        this.config.showCurrentBranchByDefault && this.gitBranchHead !== null
          ? this.gitBranchHead
          : "";
    }
    this.saveState();

    let options = [{ name: "Show All", value: "" }];
    for (let i = 0; i < this.gitBranches.length; i++) {
      options.push({
        name: this.gitBranches[i].startsWith("remotes/")
          ? this.gitBranches[i].substring(8)
          : this.gitBranches[i],
        value: this.gitBranches[i]
      });
    }
    this.branchDropdown.setOptions(options, this.currentBranch);

    this.triggerLoadBranchesCallback(true, isRepo);
  }
  private triggerLoadBranchesCallback(changes: boolean, isRepo: boolean) {
    if (this.loadBranchesCallback !== null) {
      this.loadBranchesCallback(changes, isRepo);
      this.loadBranchesCallback = null;
    }
  }

  public loadCommits(
    commits: GG.GitCommitNode[],
    commitHead: string | null,
    moreAvailable: boolean,
    hard: boolean
  ) {
    if (
      !hard &&
      this.moreCommitsAvailable === moreAvailable &&
      this.commitHead === commitHead &&
      arraysEqual(
        this.commits,
        commits,
        (a, b) =>
          a.hash === b.hash &&
          arraysEqual(a.refs, b.refs, (a, b) => a.name === b.name && a.type === b.type) &&
          arraysEqual(a.parentHashes, b.parentHashes, (a, b) => a === b)
      )
    ) {
      if (this.commits.length > 0 && this.commits[0].hash === UNCOMMITTED_CHANGES_HASH) {
        this.commits[0] = commits[0];
        this.saveState();
        this.renderUncommitedChanges();
      }
      this.triggerLoadCommitsCallback(false);
      this.updateCurrentBtnState();
      return;
    }

    this.moreCommitsAvailable = moreAvailable;
    this.commits = commits;
    this.commitHead = commitHead;
    this.commitLookup = {};
    this.saveState();

    let i: number,
      expandedCommitVisible = false,
      avatarsNeeded: { [email: string]: string[] } = {};
    for (i = 0; i < this.commits.length; i++) {
      this.commitLookup[this.commits[i].hash] = i;
      if (this.expandedCommit !== null && this.expandedCommit.hash === this.commits[i].hash)
        expandedCommitVisible = true;
      if (
        this.config.fetchAvatars &&
        typeof this.avatars[this.commits[i].email] !== "string" &&
        this.commits[i].email !== ""
      ) {
        if (avatarsNeeded[this.commits[i].email] === undefined) {
          avatarsNeeded[this.commits[i].email] = [this.commits[i].hash];
        } else {
          avatarsNeeded[this.commits[i].email].push(this.commits[i].hash);
        }
      }
    }

    this.graph.loadCommits(this.commits, this.commitHead, this.commitLookup);

    if (this.expandedCommit !== null && !expandedCommitVisible) {
      this.expandedCommit = null;
      this.saveState();
    }
    this.render();

    this.triggerLoadCommitsCallback(true);
    this.fetchAvatars(avatarsNeeded);
    this.updateCurrentBtnState();
  }
  private triggerLoadCommitsCallback(changes: boolean) {
    if (this.loadCommitsCallback !== null) {
      this.loadCommitsCallback(changes);
      this.loadCommitsCallback = null;
    }
  }

  public loadAvatar(email: string, image: string) {
    this.avatars[email] = image;
    this.saveState();
    let avatarsElems = <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName("avatar"),
      escapedEmail = escapeHtml(email);
    for (let i = 0; i < avatarsElems.length; i++) {
      if (avatarsElems[i].dataset.email === escapedEmail) {
        avatarsElems[i].innerHTML = `<img class="avatarImg" src="${escapeHtml(image)}">`;
      }
    }
  }

  /* Refresh */
  public refresh(hard: boolean) {
    if (hard) {
      if (this.expandedCommit !== null) {
        this.expandedCommit = null;
        this.saveState();
      }
      this.renderShowLoading();
    }
    this.requestLoadBranchesAndCommits(hard);
  }

  /* Requests */
  private requestLoadBranches(
    hard: boolean,
    loadedCallback: (changes: boolean, isRepo: boolean) => void
  ) {
    if (this.loadBranchesCallback !== null) return;
    this.loadBranchesCallback = loadedCallback;
    sendMessage({
      command: "loadBranches",
      repo: this.currentRepo!,
      showRemoteBranches: this.showRemoteBranches,
      hard: hard
    });
  }
  private requestLoadCommits(hard: boolean, loadedCallback: (changes: boolean) => void) {
    if (this.loadCommitsCallback !== null) return;
    this.loadCommitsCallback = loadedCallback;
    sendMessage({
      command: "loadCommits",
      repo: this.currentRepo!,
      branchName: this.currentBranch !== null ? this.currentBranch : "",
      maxCommits: this.maxCommits,
      showRemoteBranches: this.showRemoteBranches,
      hard: hard
    });
  }
  private requestLoadBranchesAndCommits(hard: boolean) {
    this.requestLoadBranches(hard, (branchChanges: boolean, isRepo: boolean) => {
      if (isRepo) {
        this.requestLoadCommits(hard, (commitChanges: boolean) => {
          if (!hard && (branchChanges || commitChanges)) {
            hideDialogAndContextMenu();
          }
        });
      } else {
        sendMessage({ command: "loadRepos", check: true });
      }
    });
  }
  private fetchAvatars(avatars: { [email: string]: string[] }) {
    let emails = Object.keys(avatars);
    for (let i = 0; i < emails.length; i++) {
      sendMessage({
        command: "fetchAvatar",
        repo: this.currentRepo!,
        email: emails[i],
        commits: avatars[emails[i]]
      });
    }
  }

  /* State */
  private saveState() {
    vscode.setState({
      gitRepos: this.gitRepos,
      gitBranches: this.gitBranches,
      gitBranchHead: this.gitBranchHead,
      commits: this.commits,
      commitHead: this.commitHead,
      avatars: this.avatars,
      currentBranch: this.currentBranch,
      currentRepo: this.currentRepo,
      moreCommitsAvailable: this.moreCommitsAvailable,
      maxCommits: this.maxCommits,
      showRemoteBranches: this.showRemoteBranches,
      expandedCommit: this.expandedCommit,
      findWidgetState: this.findWidget.getState()
    });
  }

  /* CDV Height Helpers */
  private calculateCdvHeight(): number {
    const viewportHeight = window.innerHeight;
    const controlsHeight = document.getElementById("controls")?.clientHeight ?? 0;
    const headerHeight = (document.getElementById("tableColHeaders")?.clientHeight ?? 0) + 1;
    const commitRowHeight = this.config.grid.y;
    const availableHeight = viewportHeight - controlsHeight - headerHeight - commitRowHeight;
    return Math.max(Math.min(CDV_DEFAULT_HEIGHT, availableHeight), CDV_MIN_HEIGHT);
  }

  private updateCommitDetailsHeight() {
    if (this.expandedCommit === null) return;
    const cdvElem = document.getElementById("commitDetails");
    if (!cdvElem) return;
    const height = this.calculateCdvHeight();
    cdvElem.style.height = `${height}px`;
    this.renderGraph();
  }

  /* Renderers */
  private render() {
    this.renderTable();
    this.renderGraph();
    this.findWidget.setInputEnabled(true);
    this.findWidget.refresh();
  }
  private renderGraph() {
    let colHeadersElem = document.getElementById("tableColHeaders");
    if (colHeadersElem === null) return;
    let headerHeight = colHeadersElem.clientHeight + 1,
      expandedCommitElem =
        this.expandedCommit !== null ? document.getElementById("commitDetails") : null;
    this.config.grid.expandY =
      expandedCommitElem !== null
        ? expandedCommitElem.getBoundingClientRect().height
        : this.config.grid.expandY;
    this.config.grid.y =
      this.commits.length > 0
        ? (this.tableElem.children[0].clientHeight -
            headerHeight -
            (this.expandedCommit !== null ? this.config.grid.expandY : 0)) /
          this.commits.length
        : this.config.grid.y;
    this.config.grid.offsetY = headerHeight + this.config.grid.y / 2;
    this.graph.render(this.expandedCommit);
  }
  private renderTable() {
    let html =
        '<tr id="tableColHeaders"><th id="tableHeaderGraphCol" class="tableColHeader">Graph</th><th class="tableColHeader">Description</th><th class="tableColHeader">Date</th><th class="tableColHeader">Author</th><th class="tableColHeader">Commit</th></tr>',
      i,
      currentHash =
        this.commits.length > 0 && this.commits[0].hash === UNCOMMITTED_CHANGES_HASH
          ? UNCOMMITTED_CHANGES_HASH
          : this.commitHead;
    for (i = 0; i < this.commits.length; i++) {
      let refs = "",
        message = escapeHtml(this.commits[i].message),
        date = getCommitDate(this.commits[i].date),
        j,
        refName,
        refActive,
        refHtml;
      let branchLabels = getBranchLabels(this.commits[i].refs);
      for (j = 0; j < branchLabels.heads.length; j++) {
        refName = escapeHtml(branchLabels.heads[j].name);
        refActive = branchLabels.heads[j].name === this.gitBranchHead;
        refHtml = `<span class="gitRef head${refActive ? " active" : ""}" data-name="${refName}">${svgIcons.branch}<span class="gitRefName">${refName}</span>`;
        for (let k = 0; k < branchLabels.heads[j].remotes.length; k++) {
          let remoteName = escapeHtml(branchLabels.heads[j].remotes[k]);
          refHtml += `<span class="gitRefHeadRemote" data-remote="${remoteName}" data-name="${escapeHtml(`${branchLabels.heads[j].remotes[k]}/${branchLabels.heads[j].name}`)}">${remoteName}</span>`;
        }
        refHtml += "</span>";
        refs = refActive ? refHtml + refs : refs + refHtml;
      }
      for (j = 0; j < branchLabels.remotes.length; j++) {
        refName = escapeHtml(branchLabels.remotes[j].name);
        refs += `<span class="gitRef remote" data-name="${refName}">${svgIcons.branch}${refName}</span>`;
      }
      for (j = 0; j < branchLabels.tags.length; j++) {
        refName = escapeHtml(branchLabels.tags[j].name);
        refs += `<span class="gitRef tag" data-name="${refName}">${svgIcons.tag}${refName}</span>`;
      }
      if (this.commits[i].stash !== null) {
        let selectorDisplay = escapeHtml(
          buildStashSelectorDisplay(this.commits[i].stash!.selector)
        );
        refs = `<span class="gitRef stash">${svgIcons.stash}${selectorDisplay}</span>${refs}`;
      }
      let rowClass = buildCommitRowAttributes(this.commits[i].hash, this.commits[i].stash);
      html += `<tr ${rowClass} data-id="${i}" data-color="${this.graph.getVertexColour(i)}"><td></td><td>${this.commits[i].hash === this.commitHead ? '<span class="commitHeadDot"></span>' : ""}${refs}${this.commits[i].hash === currentHash ? `<b>${message}</b>` : message}</td><td title="${date.title}">${date.value}</td><td title="${escapeHtml(`${this.commits[i].author} <${this.commits[i].email}>`)}">${
        this.config.fetchAvatars
          ? `<span class="avatar" data-email="${escapeHtml(this.commits[i].email)}">${
              typeof this.avatars[this.commits[i].email] === "string"
                ? `<img class="avatarImg" src="${escapeHtml(this.avatars[this.commits[i].email])}">`
                : ""
            }</span>`
          : ""
      }${escapeHtml(this.commits[i].author)}</td><td title="${escapeHtml(this.commits[i].hash)}">${escapeHtml(abbrevCommit(this.commits[i].hash))}</td></tr>`;
    }
    this.tableElem.innerHTML = `<table>${html}</table>`;
    this.footerElem.innerHTML = this.moreCommitsAvailable
      ? '<div id="loadMoreCommitsBtn" class="roundedBtn">Load More Commits</div>'
      : "";
    this.makeTableResizable();

    if (this.moreCommitsAvailable) {
      document.getElementById("loadMoreCommitsBtn")!.addEventListener("click", () => {
        (<HTMLElement>(
          document.getElementById("loadMoreCommitsBtn")!.parentNode!
        )).innerHTML = `<h2 id="loadingHeader">${svgIcons.loading}Loading ...</h2>`;
        this.maxCommits += this.config.loadMoreCommits;
        this.hideCommitDetails();
        this.saveState();
        this.requestLoadCommits(true, () => {});
      });
    }

    if (this.expandedCommit !== null) {
      let elem = null;
      const commitElems = document.querySelectorAll<HTMLElement>(".commit, .unsavedChanges");
      for (i = 0; i < commitElems.length; i++) {
        if (this.expandedCommit.hash === commitElems[i].dataset.hash) {
          elem = commitElems[i];
          break;
        }
      }
      if (elem === null) {
        this.expandedCommit = null;
        this.saveState();
      } else {
        this.expandedCommit.id = parseInt(elem.dataset.id!, 10);
        this.expandedCommit.srcElem = elem;
        if (this.expandedCommit.compareWithHash !== null) {
          this.expandedCommit.compareWithSrcElem = null;
          for (let ci = 0; ci < commitElems.length; ci++) {
            if (this.expandedCommit.compareWithHash === commitElems[ci].dataset.hash) {
              this.expandedCommit.compareWithSrcElem = commitElems[ci];
              commitElems[ci].classList.add("compareTarget");
              break;
            }
          }
        }
        this.saveState();
        if (this.expandedCommit.commitDetails !== null && this.expandedCommit.fileTree !== null) {
          this.showCommitDetails(this.expandedCommit.commitDetails, this.expandedCommit.fileTree);
        } else {
          this.loadCommitDetails(elem);
        }
      }
    }

    addListenerToClass("commit", "contextmenu", (e: Event) => {
      e.stopPropagation();
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".commit")!;
      let hash = sourceElem.dataset.hash!;
      let commit = this.commits[this.commitLookup[hash]];
      if (commit.stash !== null) {
        let selector = commit.stash.selector;
        showContextMenu(
          <MouseEvent>e,
          buildStashContextMenuItems(this.currentRepo, hash, selector, sourceElem),
          sourceElem
        );
        return;
      }
      showContextMenu(
        <MouseEvent>e,
        buildCommitContextMenuItems(
          this.currentRepo,
          hash,
          commit.parentHashes,
          this.commits,
          this.commitLookup,
          sourceElem
        ),
        sourceElem
      );
    });
    addListenerToClass("commit", "click", (e: Event) => {
      const mouseEvent = <MouseEvent>e;
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".commit")!;
      const clickedHash = sourceElem.dataset.hash!;
      const isModifierClick = mouseEvent.ctrlKey || mouseEvent.metaKey;

      if (isModifierClick && this.expandedCommit !== null) {
        // Compare mode: Ctrl/Cmd+click while a commit is expanded
        if (this.expandedCommit.compareWithHash === clickedHash) {
          // Same compare target clicked again → cancel comparison
          this.clearCompareTarget();
          this.expandedCommit.compareWithHash = null;
          this.expandedCommit.compareWithSrcElem = null;
          this.saveState();
          if (this.expandedCommit.commitDetails !== null && this.expandedCommit.fileTree !== null) {
            this.showCommitDetails(this.expandedCommit.commitDetails, this.expandedCommit.fileTree);
          }
        } else if (clickedHash !== this.expandedCommit.hash) {
          // Different commit → enter/change compare target
          this.clearCompareTarget();
          this.expandedCommit.compareWithHash = clickedHash;
          this.expandedCommit.compareWithSrcElem = sourceElem;
          sourceElem.classList.add("compareTarget");
          this.saveState();
          const order = this.getCommitOrder(this.expandedCommit.hash, clickedHash);
          sendMessage({
            command: "compareCommits",
            repo: this.currentRepo,
            fromHash: order.from,
            toHash: order.to
          });
        }
      } else if (this.expandedCommit !== null && this.expandedCommit.hash === clickedHash) {
        this.hideCommitDetails();
      } else {
        this.loadCommitDetails(sourceElem);
      }
    });
    addListenerToClass("unsavedChanges", "click", (e: Event) => {
      const mouseEvent = <MouseEvent>e;
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".unsavedChanges")!;
      const clickedHash = sourceElem.dataset.hash!;
      const isModifierClick = mouseEvent.ctrlKey || mouseEvent.metaKey;

      if (isModifierClick && this.expandedCommit !== null) {
        if (this.expandedCommit.compareWithHash === clickedHash) {
          this.clearCompareTarget();
          this.expandedCommit.compareWithHash = null;
          this.expandedCommit.compareWithSrcElem = null;
          this.saveState();
          if (this.expandedCommit.commitDetails !== null && this.expandedCommit.fileTree !== null) {
            this.showCommitDetails(this.expandedCommit.commitDetails, this.expandedCommit.fileTree);
          }
        } else if (clickedHash !== this.expandedCommit.hash) {
          this.clearCompareTarget();
          this.expandedCommit.compareWithHash = clickedHash;
          this.expandedCommit.compareWithSrcElem = sourceElem;
          sourceElem.classList.add("compareTarget");
          this.saveState();
          const order = this.getCommitOrder(this.expandedCommit.hash, clickedHash);
          sendMessage({
            command: "compareCommits",
            repo: this.currentRepo,
            fromHash: order.from,
            toHash: order.to
          });
        }
      } else if (this.expandedCommit !== null && this.expandedCommit.hash === clickedHash) {
        this.hideCommitDetails();
      } else {
        this.loadCommitDetails(sourceElem);
      }
    });
    addListenerToClass("unsavedChanges", "contextmenu", (e: Event) => {
      e.stopPropagation();
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".unsavedChanges")!;
      showContextMenu(
        <MouseEvent>e,
        buildUncommittedContextMenuItems(this.currentRepo, sourceElem),
        sourceElem
      );
    });
    addListenerToClass("gitRef", "contextmenu", (e: Event) => {
      e.stopPropagation();
      let target = <HTMLElement>e.target;
      let sourceElem = <HTMLElement>target.closest(".gitRef")!;
      let isRemoteCombined = target.classList.contains("gitRefHeadRemote");
      let refName = isRemoteCombined
        ? unescapeHtml(target.dataset.name!)
        : unescapeHtml(sourceElem.dataset.name!);
      showContextMenu(
        <MouseEvent>e,
        buildRefContextMenuItems(
          this.currentRepo,
          refName,
          sourceElem,
          isRemoteCombined,
          this.gitBranchHead
        ),
        sourceElem
      );
    });
    addListenerToClass("gitRef", "click", (e: Event) => e.stopPropagation());
    addListenerToClass("gitRef", "dblclick", (e: Event) => {
      e.stopPropagation();
      hideDialogAndContextMenu();
      let target = <HTMLElement>e.target;
      let sourceElem = <HTMLElement>target.closest(".gitRef")!;
      let isRemoteCombined = target.classList.contains("gitRefHeadRemote");
      if (isRemoteCombined) {
        checkoutBranchAction(
          this.currentRepo,
          sourceElem,
          unescapeHtml(target.dataset.name!),
          true
        );
      } else {
        checkoutBranchAction(this.currentRepo, sourceElem, unescapeHtml(sourceElem.dataset.name!));
      }
    });
  }
  private renderUncommitedChanges() {
    let date = getCommitDate(this.commits[0].date);
    document.getElementsByClassName("unsavedChanges")[0].innerHTML =
      `<td></td><td><b>${escapeHtml(this.commits[0].message)}</b></td><td title="${date.title}">${date.value}</td><td title="* <>">*</td><td title="*">*</td>`;
  }
  private renderShowLoading() {
    hideDialogAndContextMenu();
    this.graph.clear();
    this.tableElem.innerHTML = `<h2 id="loadingHeader">${svgIcons.loading}Loading ...</h2>`;
    this.footerElem.innerHTML = "";
    this.findWidget.setInputEnabled(false);
  }
  private makeTableResizable() {
    let colHeadersElem = document.getElementById("tableColHeaders")!,
      cols = <HTMLCollectionOf<HTMLElement>>document.getElementsByClassName("tableColHeader");
    let columnWidths = this.gitRepos[this.currentRepo].columnWidths,
      mouseX = -1,
      col = -1;

    const makeTableFixedLayout = () => {
      if (columnWidths !== null) {
        cols[0].style.width = `${columnWidths[0]}px`;
        cols[0].style.padding = "";
        cols[2].style.width = `${columnWidths[1]}px`;
        cols[3].style.width = `${columnWidths[2]}px`;
        cols[4].style.width = `${columnWidths[3]}px`;
        this.tableElem.className = "fixedLayout";
        this.graph.limitMaxWidth(columnWidths[0] + 16);
      }
    };
    const stopResizing = () => {
      if (col > -1 && columnWidths !== null) {
        col = -1;
        mouseX = -1;
        colHeadersElem.classList.remove("resizing");
        this.gitRepos[this.currentRepo].columnWidths = columnWidths;
        sendMessage({
          command: "saveRepoState",
          repo: this.currentRepo,
          state: this.gitRepos[this.currentRepo]
        });
      }
    };

    for (let i = 0; i < cols.length; i++) {
      cols[i].innerHTML +=
        (i > 0 ? `<span class="resizeCol left" data-col="${i - 1}"></span>` : "") +
        (i < cols.length - 1 ? `<span class="resizeCol right" data-col="${i}"></span>` : "");
    }
    if (columnWidths !== null) {
      makeTableFixedLayout();
    } else {
      this.tableElem.className = "autoLayout";
      this.graph.limitMaxWidth(-1);
      cols[0].style.padding = `0 ${Math.round((Math.max(this.graph.getWidth() + 16, 64) - (cols[0].offsetWidth - 24)) / 2)}px`;
    }

    addListenerToClass("resizeCol", "mousedown", (e) => {
      col = parseInt((<HTMLElement>e.target).dataset.col!, 10);
      mouseX = (<MouseEvent>e).clientX;
      if (columnWidths === null) {
        columnWidths = [
          cols[0].clientWidth - 24,
          cols[2].clientWidth - 24,
          cols[3].clientWidth - 24,
          cols[4].clientWidth - 24
        ];
        makeTableFixedLayout();
      }
      colHeadersElem.classList.add("resizing");
    });
    colHeadersElem.addEventListener("mousemove", (e) => {
      if (col > -1 && columnWidths !== null) {
        let mouseEvent = <MouseEvent>e;
        let mouseDeltaX = mouseEvent.clientX - mouseX;
        switch (col) {
          case 0:
            if (columnWidths[0] + mouseDeltaX < 40) mouseDeltaX = -columnWidths[0] + 40;
            if (cols[1].clientWidth - mouseDeltaX < 64) mouseDeltaX = cols[1].clientWidth - 64;
            columnWidths[0] += mouseDeltaX;
            cols[0].style.width = `${columnWidths[0]}px`;
            this.graph.limitMaxWidth(columnWidths[0] + 16);
            break;
          case 1:
            if (cols[1].clientWidth + mouseDeltaX < 64) mouseDeltaX = -cols[1].clientWidth + 64;
            if (columnWidths[1] - mouseDeltaX < 40) mouseDeltaX = columnWidths[1] - 40;
            columnWidths[1] -= mouseDeltaX;
            cols[2].style.width = `${columnWidths[1]}px`;
            break;
          default:
            if (columnWidths[col - 1] + mouseDeltaX < 40) mouseDeltaX = -columnWidths[col - 1] + 40;
            if (columnWidths[col] - mouseDeltaX < 40) mouseDeltaX = columnWidths[col] - 40;
            columnWidths[col - 1] += mouseDeltaX;
            columnWidths[col] -= mouseDeltaX;
            cols[col].style.width = `${columnWidths[col - 1]}px`;
            cols[col + 1].style.width = `${columnWidths[col]}px`;
        }
        mouseX = mouseEvent.clientX;
      }
    });
    colHeadersElem.addEventListener("mouseup", stopResizing);
    colHeadersElem.addEventListener("mouseleave", stopResizing);
  }

  /* Observers */
  private observeWindowSizeChanges() {
    let windowWidth = window.outerWidth,
      windowHeight = window.outerHeight;
    window.addEventListener("resize", () => {
      if (windowWidth === window.outerWidth && windowHeight === window.outerHeight) {
        if (this.expandedCommit !== null) {
          this.updateCommitDetailsHeight();
        } else {
          this.renderGraph();
        }
      } else {
        windowWidth = window.outerWidth;
        windowHeight = window.outerHeight;
        if (this.expandedCommit !== null) {
          this.updateCommitDetailsHeight();
        }
      }
    });
  }
  private observeWebviewStyleChanges() {
    let fontFamily = getVSCodeStyle("--vscode-editor-font-family");
    new MutationObserver(() => {
      let ff = getVSCodeStyle("--vscode-editor-font-family");
      if (ff !== fontFamily) {
        fontFamily = ff;
        this.repoDropdown.refresh();
        this.branchDropdown.refresh();
      }
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
  }
  private observeWebviewScroll() {
    let active = this.scrollContainerElem.scrollTop > 0;
    this.scrollShadowElem.className = active ? "active" : "";
    this.scrollContainerElem.addEventListener("scroll", () => {
      if (active !== this.scrollContainerElem.scrollTop > 0) {
        active = this.scrollContainerElem.scrollTop > 0;
        this.scrollShadowElem.className = active ? "active" : "";
      }
    });
  }

  /* Scroll to Commit */
  private scrollToCommit(hash: string, alwaysCenterCommit: boolean, flash: boolean = false) {
    const elem = document.querySelector<HTMLElement>(`.commit[data-hash="${hash}"]`);
    if (elem === null) return;

    const elemTop = elem.offsetTop;
    const scrollTop = this.scrollContainerElem.scrollTop;
    const viewHeight = this.scrollContainerElem.clientHeight;
    if (
      alwaysCenterCommit ||
      elemTop - SCROLL_PADDING_TOP < scrollTop ||
      elemTop + SCROLL_ROW_HEIGHT > scrollTop + viewHeight
    ) {
      this.scrollContainerElem.scrollTop = elemTop + SCROLL_CENTER_OFFSET - viewHeight / 2;
    }

    if (flash && !elem.classList.contains("flash")) {
      elem.classList.add("flash");
      setTimeout(() => {
        elem.classList.remove("flash");
      }, FLASH_ANIMATION_DURATION_MS);
    }
  }

  private updateCurrentBtnState() {
    const currentBtn = document.getElementById("currentBtn");
    if (currentBtn === null) return;
    const isHeadVisible =
      this.commitHead !== null && typeof this.commitLookup[this.commitHead] === "number";
    if (isHeadVisible) {
      currentBtn.classList.remove("disabled");
    } else {
      currentBtn.classList.add("disabled");
    }
  }

  /* Commit Details */
  private loadCommitDetails(sourceElem: HTMLElement) {
    this.hideCommitDetails();
    this.expandedCommit = {
      id: parseInt(sourceElem.dataset.id!, 10),
      hash: sourceElem.dataset.hash!,
      srcElem: sourceElem,
      compareWithHash: null,
      compareWithSrcElem: null,
      commitDetails: null,
      fileTree: null
    };
    this.saveState();
    sendMessage({
      command: "commitDetails",
      repo: this.currentRepo!,
      commitHash: sourceElem.dataset.hash!
    });
  }
  private getCommitOrder(hash1: string, hash2: string): { from: string; to: string } {
    // Backend expects UNCOMMITTED_CHANGES_HASH in fromHash to trigger working tree diff
    if (hash1 === UNCOMMITTED_CHANGES_HASH) return { from: hash1, to: hash2 };
    if (hash2 === UNCOMMITTED_CHANGES_HASH) return { from: hash2, to: hash1 };

    const idx1 = this.commitLookup[hash1] ?? -1;
    const idx2 = this.commitLookup[hash2] ?? -1;
    // Higher index = older commit in the table; diff should go from older → newer
    if (idx1 > idx2) {
      return { from: hash1, to: hash2 };
    } else {
      return { from: hash2, to: hash1 };
    }
  }
  private clearCompareTarget() {
    if (this.expandedCommit !== null && this.expandedCommit.compareWithSrcElem !== null) {
      this.expandedCommit.compareWithSrcElem.classList.remove("compareTarget");
    }
  }
  public hideCommitDetails() {
    if (this.expandedCommit !== null) {
      this.clearCompareTarget();
      let elem = document.getElementById("commitDetails");
      if (typeof elem === "object" && elem !== null) elem.remove();
      if (typeof this.expandedCommit.srcElem === "object" && this.expandedCommit.srcElem !== null)
        this.expandedCommit.srcElem.classList.remove("commitDetailsOpen");
      this.expandedCommit = null;
      this.saveState();
      this.renderGraph();
    }
  }
  public showCommitDetails(commitDetails: GG.GitCommitDetails, fileTree: GitFolder) {
    if (
      this.expandedCommit === null ||
      this.expandedCommit.srcElem === null ||
      this.expandedCommit.hash !== commitDetails.hash
    )
      return;
    let elem = document.getElementById("commitDetails");
    if (typeof elem === "object" && elem !== null) elem.remove();

    const isCompareMode = this.expandedCommit.compareWithHash !== null;
    if (!isCompareMode) {
      this.expandedCommit.commitDetails = commitDetails;
      this.expandedCommit.fileTree = fileTree;
    }
    this.expandedCommit.srcElem.classList.add("commitDetailsOpen");
    this.saveState();

    const isUncommitted = commitDetails.hash === UNCOMMITTED_CHANGES_HASH;
    let newElem = document.createElement("tr"),
      html = '<td></td><td colspan="4"><div id="commitDetailsSummary">';
    if (isCompareMode) {
      const fromLabel = escapeHtml(abbrevCommit(this.expandedCommit.hash));
      const toLabel = escapeHtml(abbrevCommit(this.expandedCommit.compareWithHash!));
      html += `<span class="commitDetailsSummaryTop"><span class="commitDetailsSummaryTopRow"><span class="commitDetailsSummaryKeyValues">`;
      html += `<b>Comparing</b> ${fromLabel} &#8596; ${toLabel}`;
      html += ` (${commitDetails.fileChanges.length} file${commitDetails.fileChanges.length !== 1 ? "s" : ""})`;
      html += "</span></span></span>";
    } else if (isUncommitted) {
      html += `<span class="commitDetailsSummaryTop"><span class="commitDetailsSummaryTopRow"><span class="commitDetailsSummaryKeyValues">`;
      html += `<b>Uncommitted Changes</b> (${commitDetails.fileChanges.length} file${commitDetails.fileChanges.length !== 1 ? "s" : ""})`;
      html += "</span></span></span>";
    } else {
      html += `<span class="commitDetailsSummaryTop${typeof this.avatars[commitDetails.email] === "string" ? " withAvatar" : ""}"><span class="commitDetailsSummaryTopRow"><span class="commitDetailsSummaryKeyValues">`;
      html += `<b>Commit: </b>${escapeHtml(commitDetails.hash)}<br>`;
      html += `<b>Parents: </b>${commitDetails.parents.map(escapeHtml).join(", ")}<br>`;
      html += `<b>Author: </b>${escapeHtml(commitDetails.author)} &lt;<a href="mailto:${encodeURIComponent(commitDetails.email)}">${escapeHtml(commitDetails.email)}</a>&gt;<br>`;
      html += `<b>Date: </b>${new Date(commitDetails.date * 1000).toString()}<br>`;
      html += `<b>Committer: </b>${escapeHtml(commitDetails.committer)}</span>`;
      if (typeof this.avatars[commitDetails.email] === "string")
        html += `<span class="commitDetailsSummaryAvatar"><img src="${escapeHtml(this.avatars[commitDetails.email])}"></span>`;
      html += "</span></span><br><br>";
      html += `${escapeHtml(commitDetails.body).replace(/\n/g, "<br>")}`;
    }
    html += "</div>";
    html += `<div id="commitDetailsFiles">${generateGitFileTreeHtml(fileTree, commitDetails.fileChanges)}</table></div>`;
    html += `<div id="commitDetailsClose">${svgIcons.close}</div>`;
    html += "</td>";

    newElem.id = "commitDetails";
    newElem.innerHTML = html;
    insertAfter(newElem, this.expandedCommit.srcElem);

    const cdvHeight = this.calculateCdvHeight();
    newElem.style.height = `${cdvHeight}px`;

    this.renderGraph();

    const scrollTop = this.scrollContainerElem.scrollTop;
    const viewHeight = this.scrollContainerElem.clientHeight;
    if (newElem.offsetTop - CDV_SCROLL_PADDING < scrollTop) {
      this.scrollContainerElem.scrollTop = newElem.offsetTop - CDV_SCROLL_PADDING;
    } else if (newElem.offsetTop + this.config.grid.expandY - viewHeight > scrollTop) {
      const desiredScroll = newElem.offsetTop + this.config.grid.expandY - viewHeight;
      const maxScroll = this.expandedCommit.srcElem!.offsetTop;
      this.scrollContainerElem.scrollTop = Math.min(desiredScroll, maxScroll);
    }

    document.getElementById("commitDetailsClose")!.addEventListener("click", () => {
      this.hideCommitDetails();
    });
    addListenerToClass("gitFolder", "click", (e) => {
      let sourceElem = <HTMLElement>(<Element>e.target!).closest(".gitFolder");
      let parent = sourceElem.parentElement!;
      parent.classList.toggle("closed");
      let isOpen = !parent.classList.contains("closed");
      parent.children[0].children[0].innerHTML = isOpen
        ? svgIcons.openFolder
        : svgIcons.closedFolder;
      parent.children[1].classList.toggle("hidden");
      alterGitFileTree(
        this.expandedCommit!.fileTree!,
        decodeURIComponent(sourceElem.dataset.folderpath!),
        isOpen
      );
      this.saveState();
    });
    addListenerToClass("gitFile", "click", (e) => {
      let sourceElem = <HTMLElement>(<Element>e.target).closest(".gitFile")!;
      if (this.expandedCommit === null || !sourceElem.classList.contains("gitDiffPossible")) return;
      const viewDiffMsg: GG.RequestViewDiff = {
        command: "viewDiff",
        repo: this.currentRepo!,
        commitHash: this.expandedCommit.hash,
        oldFilePath: decodeURIComponent(sourceElem.dataset.oldfilepath!),
        newFilePath: decodeURIComponent(sourceElem.dataset.newfilepath!),
        type: <GG.GitFileChangeType>sourceElem.dataset.type
      };
      if (this.expandedCommit.compareWithHash !== null) {
        viewDiffMsg.compareWithHash = this.expandedCommit.compareWithHash;
      }
      sendMessage(viewDiffMsg);
    });
  }
  public showCompareResult(fileChanges: GG.GitFileChange[], fromHash: string, toHash: string) {
    if (this.expandedCommit === null || this.expandedCommit.compareWithHash === null) return;
    // fromHash/toHash may be reordered by getCommitOrder, so validate as a set
    const hashes = new Set([fromHash, toHash]);
    if (!hashes.has(this.expandedCommit.hash) || !hashes.has(this.expandedCommit.compareWithHash))
      return;
    const syntheticDetails: GG.GitCommitDetails = {
      hash: this.expandedCommit.hash,
      parents: [],
      author: "",
      email: "",
      date: 0,
      committer: "",
      body: "",
      fileChanges
    };
    this.showCommitDetails(syntheticDetails, generateGitFileTree(fileChanges));
  }
}

/* Initialization */
let gitGraph = new GitGraphView(
  viewState.repos,
  viewState.lastActiveRepo,
  {
    fetchAvatars: viewState.fetchAvatars,
    graphColours: viewState.graphColours,
    graphStyle: viewState.graphStyle,
    grid: { x: 16, y: 24, offsetX: 8, offsetY: 12, expandY: CDV_DEFAULT_HEIGHT },
    initialLoadCommits: viewState.initialLoadCommits,
    loadMoreCommits: viewState.loadMoreCommits,
    showCurrentBranchByDefault: viewState.showCurrentBranchByDefault
  },
  vscode.getState()
);

/* Command Processing */
window.addEventListener("message", (event) => {
  handleMessage(event.data, gitGraph);
});

function hideDialogAndContextMenu() {
  if (isDialogActive()) hideDialog();
  if (isContextMenuActive()) hideContextMenu();
}

/* Global Listeners */
document.addEventListener("keyup", (e) => {
  if (e.key === "Escape") hideDialogAndContextMenu();
});
document.addEventListener("click", hideContextMenuListener);
document.addEventListener("contextmenu", hideContextMenuListener);
document.addEventListener("mouseleave", hideContextMenuListener);
