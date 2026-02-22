# Test Supplement (Project-Specific)

This file supplements the generic test strategy rules with
project-specific examples and conventions based on the language and framework used.

---

## 1. Language & Framework Information

| Item                 | Value                                                                     |
| -------------------- | ------------------------------------------------------------------------- |
| Language             | TypeScript                                                                |
| Framework            | VS Code Extension API                                                     |
| Test framework       | Vitest 4.x                                                                |
| Mock library         | Vitest built-in (`vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.stubGlobal()`) |
| Test data generation | -                                                                         |
| Code style           | oxlint + oxfmt (printWidth: 100, indent: 2 spaces, no trailing commas)    |

---

## 2. Assertion Accuracy Examples (BAD / GOOD)

### 2.1 Do not type-convert before asserting (Strategy Rule Section 2.5)

```typescript
// BAD: Converting with String() before comparison
const result = service.calculate(input);
expect(String(result)).toBe("100");

// GOOD: Assert the return value as-is
const result = service.calculate(input);
expect(result).toBe(100);
```

```typescript
// BAD: JSON.stringify comparison drops undefined fields
expect(JSON.stringify(result)).toBe(JSON.stringify(expected));

// GOOD: Use toEqual to compare the entire structure
expect(result).toEqual(expected);
```

### 2.2 Do not conflate empty/absent values (Strategy Rule Section 2.6)

TS/JS empty values: `undefined`, `null`, `""`, `0`, `false`, `[]` each have distinct semantics.

```typescript
// BAD: Falsy check cannot distinguish null, undefined, "", 0, false
expect(!result).toBe(true);

// GOOD: Assert the expected value explicitly
expect(result).toBeNull(); // expect null
expect(result).toBeUndefined(); // expect undefined
expect(result).toBe(""); // expect empty string
expect(result).toBe(0); // expect zero
```

```typescript
// BAD: Converting null to undefined
expect(result ?? undefined).toBeUndefined();

// GOOD: Assert null directly
expect(result).toBeNull();
```

### 2.3 No redundant safe access after existence check (Strategy Rule Section 2.7)

```typescript
// BAD: Using ?. right after confirming existence with expect
expect(entry).toBeDefined();
expect(entry?.area).toBe("Tokyo");

// GOOD: Access directly since existence is already confirmed
expect(entry).toBeDefined();
expect(entry.area).toBe("Tokyo");
```

### 2.4 Empty assertions (tests that verify nothing)

```typescript
// BAD: Always-passing assertion
it("something works", () => {
  service.execute(input);
  expect(true).toBe(true);
});

// GOOD: Assert concrete results
it("something works", () => {
  const result = service.execute(input);
  expect(result.status).toBe("completed");
  expect(result.processedCount).toBe(1);
});
```

### 2.5 Exception verification

```typescript
// BAD: Only checking that an error is thrown
expect(() => fn()).toThrow();

// GOOD: Verify both error type and message
expect(() => fn()).toThrow(ValidationError);
expect(() => fn()).toThrow("Field 'email' is required");
```

```typescript
// BAD: Not verifying message for async exceptions
await expect(asyncFn()).rejects.toThrow();

// GOOD: Verify type and message for async exceptions
await expect(asyncFn()).rejects.toThrow("fail");
```

### 2.6 Mock verification

```typescript
// BAD: Mock function set up but invocation not verified
const mockSend = vi.fn();
service.process(entry);

// GOOD: Verify call count and arguments
const mockSend = vi.fn();
service.process(entry);
expect(mockSend).toHaveBeenCalledTimes(1);
expect(mockSend).toHaveBeenCalledWith(entry.email, expect.stringContaining("done"));
```

---

## 3. Test Naming Conventions

| Item         | Convention                                                           |
| ------------ | -------------------------------------------------------------------- |
| Method names | `describe("functionName") + it("describes behavior in English")`     |
| Test files   | `*.test.ts` (e.g., `utils.test.ts`)                                  |
| Directory    | `tests/src/` mirrors `src/`, `tests/web/` mirrors `web/`             |
| Setup        | `tests/web/setup.ts` globally mocks VS Code API (`acquireVsCodeApi`) |

### Directory Placement Rules

| Test target | Test location         | Notes                               |
| ----------- | --------------------- | ----------------------------------- |
| `src/*.ts`  | `tests/src/*.test.ts` | Extension backend (Node.js runtime) |
| `web/*.ts`  | `tests/web/*.test.ts` | Webview frontend (Browser runtime)  |

---

## 4. Execution Commands

```bash
# Run all tests (CI mode)
pnpm run test:ci

# Run all tests (watch mode)
pnpm run test

# Run a single test file
pnpm exec vitest run tests/src/utils.test.ts

# Get coverage report
pnpm exec vitest run --coverage
```

---

## 5. Project-Specific Notes

### VS Code API Mocking Strategy

This project is a VS Code Extension; the `vscode` module is not available in the test environment.
Use the following approaches to mock it.

**Backend tests (`tests/src/`):**

```typescript
// Mock the entire vscode module
vi.mock("vscode", () => ({
  env: {
    clipboard: {
      writeText: vi.fn()
    }
  }
  // Add additional APIs as needed
}));
```

**Frontend tests (`tests/web/`):**

`acquireVsCodeApi` is globally mocked in `tests/web/setup.ts` (auto-loaded via vitest.config.ts setupFiles).

```typescript
// Already configured in setup.ts
vi.stubGlobal(
  "acquireVsCodeApi",
  vi.fn(() => ({
    getState: vi.fn(() => null),
    postMessage: vi.fn(),
    setState: vi.fn()
  }))
);
```

### child_process.spawn Mocking Strategy

`src/dataSource.ts` uses `spawn` from `node:child_process` to execute Git commands.
In tests, mock it with `vi.mock("node:child_process")` and simulate stdout/stderr/exit events.

### Time-Dependent Code

The following files use `new Date().getTime()` / `setTimeout` / `setInterval`:

- `src/avatarManager.ts` — Avatar cache timestamps, fetch queue timing control
- `src/repoFileWatcher.ts` — File change event debouncing
- `src/repoManager.ts` — Event processing debouncing
- `src/dataSource.ts` — Dummy timestamp for uncommitted changes

In tests, use `vi.useFakeTimers()` to freeze time and `vi.advanceTimersByTime()` to advance timers.
