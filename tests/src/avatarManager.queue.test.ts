import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createAvatarManager,
  createAvatarRequest,
  DEFAULT_EMAIL,
  DEFAULT_REPO_PATH,
  DEFAULT_TIME_MS,
  resetAvatarManagerTestEnvironment,
  SHORT_COMMITS,
  useFixedTime
} from "./avatarManager.testUtils";

const EMPTY_CHECK_AFTER = 0;
const EXISTING_CHECK_AFTER = 5;
const INCREMENTED_CHECK_AFTER = 6;
const INITIAL_ATTEMPTS = 0;
const NEXT_ATTEMPTS = 1;
const READY_CHECK_AFTER = DEFAULT_TIME_MS - 1;
const EQUAL_CHECK_AFTER = DEFAULT_TIME_MS;
const FUTURE_CHECK_AFTER = DEFAULT_TIME_MS + 1;
const LOWEST_CHECK_AFTER = 1;
const MIDDLE_CHECK_AFTER = 3;
const HIGHEST_CHECK_AFTER = 5;

type QueueConstructor = new (itemsAvailableCallback: () => void) => ReturnType<typeof createQueue>;

function createQueue(itemsAvailableCallback: () => void = vi.fn()) {
  const harness = createAvatarManager();
  const AvatarRequestQueue = harness.queue.constructor as unknown as QueueConstructor;
  return new AvatarRequestQueue(itemsAvailableCallback);
}

describe("AvatarRequestQueue behavior", () => {
  beforeEach(() => {
    resetAvatarManagerTestEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("constructor", () => {
    it("TC-065: initializes with an empty queue and retains the callback reference", () => {
      // Case: TC-065
      // Given: A callback mock is prepared for queue availability notifications.
      const itemsAvailableCallback = vi.fn();

      // When: A fresh AvatarRequestQueue instance is created.
      const queue = createQueue(itemsAvailableCallback);

      // Then: The queue starts empty and stores the same callback reference.
      expect(queue.queue).toEqual([]);
      expect(queue.itemsAvailableCallback).toBe(itemsAvailableCallback);
    });
  });

  describe("add", () => {
    it("TC-066: appends only the new commits when the same email/repo entry already exists", () => {
      // Case: TC-066
      // Given: The queue already has an item for the same email and repo whose last commit appears mid-list in the new commits.
      const queue = createQueue();
      const existingItem = createAvatarRequest({
        commits: [SHORT_COMMITS[0], SHORT_COMMITS[1]]
      });
      queue.queue.push(existingItem);

      // When: add is called with the same email/repo and later commits after the existing tail commit.
      queue.add(
        DEFAULT_EMAIL,
        DEFAULT_REPO_PATH,
        ["older", SHORT_COMMITS[1], "new-1", "new-2"],
        false
      );

      // Then: Only the unseen commits are appended to the existing queue item and no duplicate item is added.
      expect(queue.queue).toHaveLength(1);
      expect(queue.queue[0].commits).toEqual([
        SHORT_COMMITS[0],
        SHORT_COMMITS[1],
        "new-1",
        "new-2"
      ]);
    });

    it("TC-067: leaves the queue unchanged when the existing tail commit is missing or already last", () => {
      // Case: TC-067
      // Given: The queue already has an item for the same email and repo whose tail commit is the last entry in the new commit list.
      const queue = createQueue();
      const existingItem = createAvatarRequest({
        commits: [SHORT_COMMITS[0], SHORT_COMMITS[1]]
      });
      queue.queue.push(existingItem);

      // When: add is called with a commit list that does not provide any later commits after the known tail.
      queue.add(DEFAULT_EMAIL, DEFAULT_REPO_PATH, ["other", SHORT_COMMITS[1]], false);

      // Then: The queue contents remain unchanged and no extra item is inserted.
      expect(queue.queue).toHaveLength(1);
      expect(queue.queue[0].commits).toEqual([SHORT_COMMITS[0], SHORT_COMMITS[1]]);
    });

    it("TC-068: inserts new immediate items with checkAfter 0 and attempts 0", () => {
      // Case: TC-068
      // Given: The queue is empty and a new item is requested with immediate=true.
      const queue = createQueue();

      // When: add is called for a new email/repo pair with immediate dispatch.
      queue.add(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...SHORT_COMMITS], true);

      // Then: The inserted item starts with checkAfter 0 and attempts 0.
      expect(queue.queue).toHaveLength(1);
      expect(queue.queue[0]).toEqual({
        attempts: INITIAL_ATTEMPTS,
        checkAfter: EMPTY_CHECK_AFTER,
        commits: [...SHORT_COMMITS],
        email: DEFAULT_EMAIL,
        repo: DEFAULT_REPO_PATH
      });
    });

    it("TC-069: inserts non-immediate items at checkAfter 0 when the queue is empty", () => {
      // Case: TC-069
      // Given: The queue is empty and immediate=false is requested.
      const queue = createQueue();

      // When: add inserts the first non-immediate item.
      queue.add(DEFAULT_EMAIL, DEFAULT_REPO_PATH, [...SHORT_COMMITS], false);

      // Then: The inserted item still starts at checkAfter 0 because the queue was empty.
      expect(queue.queue).toHaveLength(1);
      expect(queue.queue[0].checkAfter).toBe(EMPTY_CHECK_AFTER);
    });

    it("TC-070: increments checkAfter from the current queue tail for later non-immediate items", () => {
      // Case: TC-070
      // Given: The queue already contains one item whose checkAfter value is 5.
      const queue = createQueue();
      queue.queue.push(
        createAvatarRequest({
          checkAfter: EXISTING_CHECK_AFTER,
          commits: [...SHORT_COMMITS]
        })
      );

      // When: add inserts a new non-immediate item for a different email.
      queue.add("secondary@example.com", DEFAULT_REPO_PATH, [...SHORT_COMMITS], false);

      // Then: The new item receives checkAfter 6 before insertion.
      expect(queue.queue).toHaveLength(2);
      expect(queue.queue[1].checkAfter).toBe(INCREMENTED_CHECK_AFTER);
      expect(queue.queue[1].attempts).toBe(INITIAL_ATTEMPTS);
    });
  });

  describe("addItem", () => {
    it("TC-071: updates checkAfter without incrementing attempts when failedAttempt is false", () => {
      // Case: TC-071
      // Given: A queue item exists and insertItem is spied for requeueing.
      const queue = createQueue();
      const item = createAvatarRequest();
      const insertItemSpy = vi.spyOn(queue, "insertItem");

      // When: addItem requeues the item with failedAttempt=false.
      queue.addItem(item, EXISTING_CHECK_AFTER, false);

      // Then: The item receives the new checkAfter value, attempts stay unchanged, and insertItem is called.
      expect(item.checkAfter).toBe(EXISTING_CHECK_AFTER);
      expect(item.attempts).toBe(INITIAL_ATTEMPTS);
      expect(insertItemSpy).toHaveBeenCalledTimes(1);
      expect(insertItemSpy).toHaveBeenCalledWith(item);
    });

    it("TC-072: increments attempts before re-inserting when failedAttempt is true", () => {
      // Case: TC-072
      // Given: A queue item exists and insertItem is spied for requeueing.
      const queue = createQueue();
      const item = createAvatarRequest();
      const insertItemSpy = vi.spyOn(queue, "insertItem");

      // When: addItem requeues the item with failedAttempt=true.
      queue.addItem(item, EXISTING_CHECK_AFTER, true);

      // Then: The item receives the new checkAfter value, attempts increment once, and insertItem is called.
      expect(item.checkAfter).toBe(EXISTING_CHECK_AFTER);
      expect(item.attempts).toBe(NEXT_ATTEMPTS);
      expect(insertItemSpy).toHaveBeenCalledTimes(1);
      expect(insertItemSpy).toHaveBeenCalledWith(item);
    });
  });

  describe("hasItems", () => {
    it("TC-073: returns false when the queue is empty", () => {
      // Case: TC-073
      // Given: A fresh queue contains no items.
      const queue = createQueue();

      // When: hasItems is called.
      const result = queue.hasItems();

      // Then: The method returns false.
      expect(result).toBe(false);
    });

    it("TC-074: returns true when the queue has at least one item", () => {
      // Case: TC-074
      // Given: The queue contains one request item.
      const queue = createQueue();
      queue.queue.push(createAvatarRequest());

      // When: hasItems is called.
      const result = queue.hasItems();

      // Then: The method returns true.
      expect(result).toBe(true);
    });
  });

  describe("takeItem", () => {
    it("TC-075: returns null when the queue is empty", () => {
      // Case: TC-075
      // Given: A fresh queue contains no items.
      const queue = createQueue();

      // When: takeItem is called.
      const result = queue.takeItem();

      // Then: The method returns null.
      expect(result).toBeNull();
    });

    it("TC-076: shifts and returns the head item when checkAfter is earlier than now", () => {
      // Case: TC-076
      // Given: The current time is fixed and the queue head is already due.
      useFixedTime();
      const queue = createQueue();
      const readyItem = createAvatarRequest({ checkAfter: READY_CHECK_AFTER });
      queue.queue.push(readyItem);

      // When: takeItem is called.
      const result = queue.takeItem();

      // Then: The head item is removed from the queue and returned.
      expect(result).toBe(readyItem);
      expect(queue.queue).toEqual([]);
    });

    it("TC-077: returns null when checkAfter is exactly equal to the current time", () => {
      // Case: TC-077
      // Given: The current time is fixed and the queue head checkAfter equals that exact timestamp.
      useFixedTime();
      const queue = createQueue();
      const exactItem = createAvatarRequest({ checkAfter: EQUAL_CHECK_AFTER });
      queue.queue.push(exactItem);

      // When: takeItem is called at that exact time.
      const result = queue.takeItem();

      // Then: The item stays queued because the comparison uses a strict less-than check.
      expect(result).toBeNull();
      expect(queue.queue).toEqual([exactItem]);
    });

    it("TC-078: returns null when the head item is scheduled for the future", () => {
      // Case: TC-078
      // Given: The current time is fixed and the queue head checkAfter is still in the future.
      useFixedTime();
      const queue = createQueue();
      const futureItem = createAvatarRequest({ checkAfter: FUTURE_CHECK_AFTER });
      queue.queue.push(futureItem);

      // When: takeItem is called before that deadline.
      const result = queue.takeItem();

      // Then: The item remains queued and null is returned.
      expect(result).toBeNull();
      expect(queue.queue).toEqual([futureItem]);
    });
  });

  describe("insertItem", () => {
    it("TC-079: inserts into an empty queue and calls itemsAvailableCallback once", () => {
      // Case: TC-079
      // Given: The queue is empty and a callback mock is registered.
      const itemsAvailableCallback = vi.fn();
      const queue = createQueue(itemsAvailableCallback);
      const item = createAvatarRequest();

      // When: insertItem adds the first queue item.
      queue.insertItem(item);

      // Then: The item becomes the head entry and the callback is triggered once.
      expect(queue.queue).toEqual([item]);
      expect(itemsAvailableCallback).toHaveBeenCalledTimes(1);
    });

    it("TC-080: keeps queue items sorted by ascending checkAfter after multiple insertions", () => {
      // Case: TC-080
      // Given: Three items have descending insertion order but distinct checkAfter values.
      const queue = createQueue();
      const latestItem = createAvatarRequest({ checkAfter: HIGHEST_CHECK_AFTER });
      const earliestItem = createAvatarRequest({
        checkAfter: LOWEST_CHECK_AFTER,
        email: "early@example.com"
      });
      const middleItem = createAvatarRequest({
        checkAfter: MIDDLE_CHECK_AFTER,
        email: "middle@example.com"
      });

      // When: insertItem adds them one by one.
      queue.insertItem(latestItem);
      queue.insertItem(earliestItem);
      queue.insertItem(middleItem);

      // Then: The internal queue ordering is sorted from lowest to highest checkAfter.
      expect(queue.queue).toEqual([earliestItem, middleItem, latestItem]);
    });

    it("TC-081: places equal checkAfter items after existing items with the same value", () => {
      // Case: TC-081
      // Given: One queue item already exists with a specific checkAfter value.
      const queue = createQueue();
      const firstItem = createAvatarRequest({ checkAfter: EXISTING_CHECK_AFTER });
      const secondItem = createAvatarRequest({
        checkAfter: EXISTING_CHECK_AFTER,
        email: "second@example.com"
      });
      queue.insertItem(firstItem);

      // When: insertItem adds another item with the same checkAfter value.
      queue.insertItem(secondItem);

      // Then: The second item is placed after the existing equal-value item.
      expect(queue.queue).toEqual([firstItem, secondItem]);
    });

    it("TC-082: does not call itemsAvailableCallback when inserting into a non-empty queue", () => {
      // Case: TC-082
      // Given: The queue already contains one item and the callback call history is cleared.
      const itemsAvailableCallback = vi.fn();
      const queue = createQueue(itemsAvailableCallback);
      queue.insertItem(createAvatarRequest());
      itemsAvailableCallback.mockClear();
      const laterItem = createAvatarRequest({
        checkAfter: EXISTING_CHECK_AFTER,
        email: "later@example.com"
      });

      // When: insertItem adds another item to the non-empty queue.
      queue.insertItem(laterItem);

      // Then: The callback is not triggered again.
      expect(itemsAvailableCallback).not.toHaveBeenCalled();
    });
  });
});
