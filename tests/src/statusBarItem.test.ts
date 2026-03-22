// Generated from docs/testing/perspectives/src/statusBarItem-test.md.
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

const STATUS_BAR_PRIORITY = 1;
const STATUS_BAR_TEXT = "Git Keizu";
const STATUS_BAR_TOOLTIP = "View Git Keizu";
const STATUS_BAR_COMMAND = "git-keizu.view";
const CREATE_FAILED_MESSAGE = "create failed";
const PUSH_FAILED_MESSAGE = "push failed";
const CONFIG_FAILED_MESSAGE = "config failed";
const SHOW_FAILED_MESSAGE = "show failed";
const HIDE_FAILED_MESSAGE = "hide failed";
const SUBSCRIPTIONS_LENGTH_AFTER_PUSH = 1;
const NO_REPOS = 0;
const NEGATIVE_REPO_COUNT = -1;
const ONE_REPO = 1;
const TWO_REPOS = 2;
const THREE_REPOS = 3;
const FIVE_REPOS = 5;

vi.mock("../../src/config", () => ({
  getConfig: vi.fn()
}));

vi.mock("vscode", () => ({
  StatusBarAlignment: {
    Left: "left"
  },
  window: {
    createStatusBarItem: vi.fn()
  }
}));

import type { ExtensionContext, StatusBarItem as VSCodeStatusBarItem } from "vscode";
import * as vscode from "vscode";

import { getConfig } from "../../src/config";
import { StatusBarItem } from "../../src/statusBarItem";

const mockedCreateStatusBarItem = vscode.window.createStatusBarItem as Mock;
const mockedGetConfig = getConfig as Mock;

interface MockStatusBarItem extends Pick<VSCodeStatusBarItem, "command" | "text" | "tooltip"> {
  hide: Mock;
  show: Mock;
}

interface MockExtensionContext {
  subscriptions: {
    push: Mock;
  };
}

interface StatusBarItemPrivateState {
  numRepos: number;
}

function createMockStatusBarItem(): MockStatusBarItem {
  return {
    command: undefined,
    text: "",
    tooltip: undefined,
    hide: vi.fn(),
    show: vi.fn()
  };
}

function createMockContext(
  pushMock = vi.fn(() => SUBSCRIPTIONS_LENGTH_AFTER_PUSH)
): MockExtensionContext {
  return {
    subscriptions: {
      push: pushMock
    }
  };
}

function toExtensionContext(context: MockExtensionContext): ExtensionContext {
  return context as unknown as ExtensionContext;
}

function toStatusBarItem(statusBarItem: MockStatusBarItem): VSCodeStatusBarItem {
  return statusBarItem as unknown as VSCodeStatusBarItem;
}

function createSubject(context: MockExtensionContext): StatusBarItem {
  return new StatusBarItem(toExtensionContext(context));
}

function expectThrownError(action: () => void, expectedMessage: string): void {
  let caughtError: unknown;

  try {
    action();
  } catch (error) {
    caughtError = error;
  }

  expect(caughtError).toBeInstanceOf(Error);
  if (caughtError instanceof Error) {
    expect(caughtError.message).toBe(expectedMessage);
  }
}

function getStoredNumRepos(statusBarItem: StatusBarItem): number {
  return (statusBarItem as unknown as StatusBarItemPrivateState).numRepos;
}

function setStoredNumRepos(statusBarItem: StatusBarItem, numRepos: number): void {
  (statusBarItem as unknown as StatusBarItemPrivateState).numRepos = numRepos;
}

describe("StatusBarItem", () => {
  let mockContext: MockExtensionContext;
  let mockShowStatusBarItem: Mock;
  let mockStatusBarItem: MockStatusBarItem;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
    mockStatusBarItem = createMockStatusBarItem();
    mockShowStatusBarItem = vi.fn();
    mockShowStatusBarItem.mockReturnValue(true);
    mockedGetConfig.mockReset();
    mockedGetConfig.mockReturnValue({
      showStatusBarItem: mockShowStatusBarItem
    });
    mockedCreateStatusBarItem.mockReset();
    mockedCreateStatusBarItem.mockReturnValue(toStatusBarItem(mockStatusBarItem));
  });

  describe("constructor", () => {
    it("TC-001: creates and registers the status bar item with the expected metadata", () => {
      // Case: TC-001
      // Given: createStatusBarItem returns a mock item and subscriptions.push is available
      const subject = createSubject(mockContext);

      // When: the StatusBarItem is constructed
      expect(subject).toBeInstanceOf(StatusBarItem);

      // Then: VS Code receives the expected creation args and the item is configured and registered
      expect(mockedCreateStatusBarItem).toHaveBeenCalledTimes(1);
      expect(mockedCreateStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Left,
        STATUS_BAR_PRIORITY
      );
      expect(mockStatusBarItem.text).toBe(STATUS_BAR_TEXT);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIP);
      expect(mockStatusBarItem.command).toBe(STATUS_BAR_COMMAND);
      expect(mockContext.subscriptions.push).toHaveBeenCalledTimes(1);
      expect(mockContext.subscriptions.push).toHaveBeenCalledWith(mockStatusBarItem);
    });

    it("TC-002: rethrows createStatusBarItem failures without registering the item", () => {
      // Case: TC-002
      // Given: createStatusBarItem throws an error
      mockedCreateStatusBarItem.mockImplementation(() => {
        throw new Error(CREATE_FAILED_MESSAGE);
      });

      // When: the StatusBarItem is constructed
      const construct = () => createSubject(mockContext);

      // Then: the same error is propagated and subscriptions.push is never called
      expectThrownError(construct, CREATE_FAILED_MESSAGE);
      expect(mockContext.subscriptions.push).not.toHaveBeenCalled();
    });

    it("TC-003: rethrows subscription push failures after configuring the item", () => {
      // Case: TC-003
      // Given: createStatusBarItem succeeds and subscriptions.push throws an error
      mockContext = createMockContext(
        vi.fn(() => {
          throw new Error(PUSH_FAILED_MESSAGE);
        })
      );

      // When: the StatusBarItem is constructed
      const construct = () => createSubject(mockContext);

      // Then: the same error is propagated after the item metadata is assigned
      expectThrownError(construct, PUSH_FAILED_MESSAGE);
      expect(mockStatusBarItem.text).toBe(STATUS_BAR_TEXT);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIP);
      expect(mockStatusBarItem.command).toBe(STATUS_BAR_COMMAND);
    });
  });

  describe("setNumRepos", () => {
    it("TC-004: stores a positive repo count and refreshes once", () => {
      // Case: TC-004
      // Given: a fresh StatusBarItem instance and a refresh spy
      const subject = createSubject(mockContext);
      const refreshSpy = vi.spyOn(subject, "refresh").mockImplementation(() => undefined);

      // When: setNumRepos is called with a positive count
      subject.setNumRepos(THREE_REPOS);

      // Then: numRepos is updated and refresh is invoked once without arguments
      expect(getStoredNumRepos(subject)).toBe(THREE_REPOS);
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).toHaveBeenCalledWith();
    });

    it("TC-005: stores zero repos and refreshes once", () => {
      // Case: TC-005
      // Given: a fresh StatusBarItem instance and a refresh spy
      const subject = createSubject(mockContext);
      const refreshSpy = vi.spyOn(subject, "refresh").mockImplementation(() => undefined);

      // When: setNumRepos is called with zero
      subject.setNumRepos(NO_REPOS);

      // Then: numRepos is updated to zero and refresh is invoked once
      expect(getStoredNumRepos(subject)).toBe(NO_REPOS);
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).toHaveBeenCalledWith();
    });

    it("TC-006: stores a negative repo count and refreshes once", () => {
      // Case: TC-006
      // Given: a fresh StatusBarItem instance and a refresh spy
      const subject = createSubject(mockContext);
      const refreshSpy = vi.spyOn(subject, "refresh").mockImplementation(() => undefined);

      // When: setNumRepos is called with a negative count
      subject.setNumRepos(NEGATIVE_REPO_COUNT);

      // Then: numRepos keeps the negative value and refresh is invoked once
      expect(getStoredNumRepos(subject)).toBe(NEGATIVE_REPO_COUNT);
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(refreshSpy).toHaveBeenCalledWith();
    });
  });

  describe("refresh", () => {
    it("TC-007: shows the item when config is enabled and repos are present", () => {
      // Case: TC-007
      // Given: showStatusBarItem is enabled and numRepos is positive
      const subject = createSubject(mockContext);
      setStoredNumRepos(subject, ONE_REPO);

      // When: refresh is called
      subject.refresh();

      // Then: show is called once and hide is not called
      expect(mockStatusBarItem.show).toHaveBeenCalledTimes(1);
      expect(mockStatusBarItem.hide).not.toHaveBeenCalled();
    });

    it("TC-009: hides the item when config disables it even with repos present", () => {
      // Case: TC-009
      // Given: showStatusBarItem is disabled and numRepos is positive
      const subject = createSubject(mockContext);
      mockShowStatusBarItem.mockReturnValue(false);
      setStoredNumRepos(subject, FIVE_REPOS);

      // When: refresh is called
      subject.refresh();

      // Then: hide is called once and show is not called
      expect(mockStatusBarItem.hide).toHaveBeenCalledTimes(1);
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
    });

    it("TC-008: hides the item when repo count is zero", () => {
      // Case: TC-008
      // Given: showStatusBarItem is enabled and numRepos is zero
      const subject = createSubject(mockContext);
      setStoredNumRepos(subject, NO_REPOS);

      // When: refresh is called
      subject.refresh();

      // Then: hide is called once and show is not called
      expect(mockStatusBarItem.hide).toHaveBeenCalledTimes(1);
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
    });

    it("TC-010: hides the item when repo count is negative", () => {
      // Case: TC-010
      // Given: showStatusBarItem is enabled and numRepos is negative
      const subject = createSubject(mockContext);
      setStoredNumRepos(subject, NEGATIVE_REPO_COUNT);

      // When: refresh is called
      subject.refresh();

      // Then: hide is called once and show is not called
      expect(mockStatusBarItem.hide).toHaveBeenCalledTimes(1);
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
    });

    it("TC-011: rethrows config read failures before showing or hiding", () => {
      // Case: TC-011
      // Given: showStatusBarItem throws an error before the branch is evaluated
      const subject = createSubject(mockContext);
      setStoredNumRepos(subject, ONE_REPO);
      mockShowStatusBarItem.mockImplementation(() => {
        throw new Error(CONFIG_FAILED_MESSAGE);
      });

      // When: refresh is called
      const refresh = () => subject.refresh();

      // Then: the same error is propagated and neither show nor hide is called
      expectThrownError(refresh, CONFIG_FAILED_MESSAGE);
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
      expect(mockStatusBarItem.hide).not.toHaveBeenCalled();
    });

    it("TC-012: rethrows show failures in the visible branch", () => {
      // Case: TC-012
      // Given: showStatusBarItem is enabled, numRepos is positive, and show throws an error
      const subject = createSubject(mockContext);
      setStoredNumRepos(subject, TWO_REPOS);
      mockStatusBarItem.show.mockImplementation(() => {
        throw new Error(SHOW_FAILED_MESSAGE);
      });

      // When: refresh is called
      const refresh = () => subject.refresh();

      // Then: the same error is propagated and hide is not called
      expectThrownError(refresh, SHOW_FAILED_MESSAGE);
      expect(mockStatusBarItem.hide).not.toHaveBeenCalled();
    });

    it("TC-013: rethrows hide failures in the hidden branch", () => {
      // Case: TC-013
      // Given: showStatusBarItem is disabled, numRepos is positive, and hide throws an error
      const subject = createSubject(mockContext);
      mockShowStatusBarItem.mockReturnValue(false);
      setStoredNumRepos(subject, TWO_REPOS);
      mockStatusBarItem.hide.mockImplementation(() => {
        throw new Error(HIDE_FAILED_MESSAGE);
      });

      // When: refresh is called
      const refresh = () => subject.refresh();

      // Then: the same error is propagated after taking the hide branch
      expectThrownError(refresh, HIDE_FAILED_MESSAGE);
      expect(mockStatusBarItem.show).not.toHaveBeenCalled();
    });
  });
});
