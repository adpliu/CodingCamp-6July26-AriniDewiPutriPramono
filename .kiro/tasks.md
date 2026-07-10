# Implementation Plan

## Overview

The feature is already implemented (index.html, css/style.css, js/script.js). Tasks focus on three areas: (1) adding the graceful fallbacks described in design.md — safe JSON parsing and a Chart.js availability guard; (2) setting up the test infrastructure with Vitest, jsdom, and fast-check; and (3) writing all 15 property-based tests defined in design.md plus supporting unit and integration tests.

## Tasks

- [ ] 1. Add graceful fallbacks to script.js
  - Replace the bare `JSON.parse` calls in `loadFromStorage()` with a `safeParseJSON(str, fallback)` helper that wraps the parse in a `try/catch` and returns the fallback on any error
  - Add a `typeof Chart === 'undefined'` guard at the top of `updateChart()`; when Chart.js has not loaded, set the empty-state message text to `'Chart unavailable (Chart.js not loaded).'` and return early
  - Export pure utility and logic functions (`escapeHTML`, `formatNumber`, `safeParseJSON`, tooltip formatter, `checkBudgetWarning`) via an `if (typeof module !== 'undefined')` guard so the file stays browser-compatible without a build step
  - _Requirements: 8.6, 5.1_

- [ ] 2. Set up the test infrastructure
  - Initialise a `package.json` in the project root with `npm init -y`
  - Install dev dependencies: `npm install -D vitest @vitest/coverage-v8 jsdom fast-check`
  - Add a `vitest.config.js` that sets `environment: 'jsdom'` and `globals: true`
  - Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `package.json`
  - Create `js/script.test.js` with a smoke assertion and confirm `npm test` passes
  - _Requirements: (test infrastructure — no direct requirement mapping)_

- [ ] 3. Unit tests for pure helper functions
  - Write unit tests for `escapeHTML()`: `<script>`, `&`, `"`, `'`, `>`, empty string, plain text unchanged
  - Write unit tests for `formatNumber()`: `0→"0"`, `1000→"1.000"`, `1500000→"1.500.000"`, decimal value
  - Write unit tests for `safeParseJSON()`: valid JSON array, null input, malformed string (returns fallback without throwing)
  - Write unit tests for `checkBudgetWarning()`: balance > positive limit (banner shown), balance === limit (hidden), balance < limit (hidden), empty limit (hidden), negative limit (hidden)
  - Write unit tests for the tooltip label callback: known value/total pair produces the expected `" Rp X.XXX (Y.Y%)"` string
  - Run `npm test` and confirm all unit tests pass
  - _Requirements: 2.1, 6.3, 6.4, 6.5, 4.4, 8.6, 10.1_

- [ ] 4. Property-based tests — Properties 1–5 (Transactions and Balance)
  - 4.1 **[PBT]** Property 1 — Balance equals sum of all transaction amounts. Use `fc.array(fc.float({ min: 1, max: 1_000_000, noNaN: true }))` for amounts; assert rendered `#totalBalance` text equals `"Rp " + formatNumber(sum)`. `// Feature: expense-budget-visualizer, Property 1: Balance equals sum of all transaction amounts` **Validates: Requirements 2.1, 2.4**
  - 4.2 **[PBT]** Property 2 — Valid transaction is prepended to the list. Use `fc.record({ name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), amount: fc.float({ min: 0.01, max: 1e9 }), category: fc.constantFrom('Food','Transport','Fun') })`; assert list length increases by 1 and new item is at index 0. `// Feature: expense-budget-visualizer, Property 2: Valid transaction is prepended to the list` **Validates: Requirements 1.1, 3.2**
  - 4.3 **[PBT]** Property 3 — Form resets after successful submission. Same arbitrary as P2; assert item-name input, amount input, and category select are all empty/unselected after submit. `// Feature: expense-budget-visualizer, Property 3: Form resets after successful submission` **Validates: Requirements 1.3**
  - 4.4 **[PBT]** Property 4 — Transaction persistence round-trip. Use `fc.array(fc.record({ id: fc.uuid(), name: fc.string(), amount: fc.float({ min: 1 }), category: fc.string() }))`; call `saveTransactions()`, parse back from localStorage, assert deep equality. `// Feature: expense-budget-visualizer, Property 4: Transaction persistence round-trip` **Validates: Requirements 1.2, 8.1**
  - 4.5 **[PBT]** Property 5 — Pie chart data mirrors per-category transaction totals. Use `fc.array(fc.record({ amount: fc.float({ min: 1 }), category: fc.constantFrom('Food','Transport','Fun') }), { minLength: 1 })`; after `updateChart()` assert labels equal distinct categories and each data value equals the summed amount for that category. `// Feature: expense-budget-visualizer, Property 5: Pie chart data mirrors per-category transaction totals` **Validates: Requirements 4.1, 4.3**
  - Run `npm test` and confirm all P1–P5 property tests pass

- [ ] 5. Property-based tests — Properties 6–10 (Tooltip, Budget Warning, Theme, Serialization, Whitespace)
  - 5.1 **[PBT]** Property 6 — Pie chart tooltip formatter. Use `fc.tuple(fc.float({ min: 1 }), fc.float({ min: 1 }))` for `[value, total]`; assert the returned string matches ` Rp <id-ID value> (<percentage to 1 decimal>%)`. `// Feature: expense-budget-visualizer, Property 6: Pie chart tooltip formatter` **Validates: Requirements 4.4**
  - 5.2 **[PBT]** Property 7 — Budget warning visibility invariant. Use `fc.tuple(fc.float({ min: 0 }), fc.oneof(fc.float({ min: 0 }), fc.constant(''), fc.constant(null)))` for `[balance, limit]`; assert `#warningBanner` `hidden` attribute is present unless limit is a positive number and balance strictly exceeds it. `// Feature: expense-budget-visualizer, Property 7: Budget warning visibility invariant` **Validates: Requirements 6.3, 6.4, 6.5**
  - 5.3 **[PBT]** Property 8 — Theme toggle is an involution with persistence. Use `fc.constantFrom('light', 'dark')` as starting theme; call `handleThemeToggle()` twice; assert `data-theme` is restored and `localStorage['bv_theme']` matches. `// Feature: expense-budget-visualizer, Property 8: Theme toggle is an involution with persistence` **Validates: Requirements 7.1, 7.3, 7.5**
  - 5.4 **[PBT]** Property 9 — LocalStorage serialization round-trip. Use `fc.array(fc.string())` for categories and a full transaction record arbitrary for transactions; call save functions, parse back, assert deep equality. `// Feature: expense-budget-visualizer, Property 9: LocalStorage serialization round-trip` **Validates: Requirements 8.1, 8.2**
  - 5.5 **[PBT]** Property 10 — Whitespace inputs are rejected by the validator. Use `fc.stringMatching(/^\s+$/)` for item name and new category name; assert neither the transactions nor categories array changes and an inline error element has non-empty text. `// Feature: expense-budget-visualizer, Property 10: Whitespace inputs are rejected by the validator` **Validates: Requirements 1.4, 5.4**
  - Run `npm test` and confirm all P6–P10 property tests pass

- [ ] 6. Property-based tests — Properties 11–15 (Amount Rejection, Duplicate Category, XSS, Restoration, Malformed Data)
  - 6.1 **[PBT]** Property 11 — Amount boundary, non-positive values are rejected. Use `fc.oneof(fc.constant(0), fc.float({ max: 0 }).filter(n => n <= 0))` for the amount; assert transactions array length is unchanged and amount error element has non-empty text. `// Feature: expense-budget-visualizer, Property 11: Amount boundary — non-positive values are rejected` **Validates: Requirements 1.5**
  - 6.2 **[PBT]** Property 12 — Duplicate category names are rejected (case-insensitive). Seed categories with a known name; use a case-varied version of that name as input; assert categories array length is unchanged and category error element has non-empty text. `// Feature: expense-budget-visualizer, Property 12: Duplicate category names are rejected (case-insensitive)` **Validates: Requirements 5.5**
  - 6.3 **[PBT]** Property 13 — XSS escaping invariant. Use `fc.string().filter(s => /[&<>"']/.test(s))` as input to `escapeHTML()`; assert none of the raw characters `& < > " '` appear in the output and each is replaced by its HTML entity. `// Feature: expense-budget-visualizer, Property 13: XSS escaping invariant` **Validates: Requirements 10.1**
  - 6.4 **[PBT]** Property 14 — localStorage state restoration on initialization. Write all four storage keys with valid serialized data, call the initialization sequence, assert in-memory state matches the persisted data. `// Feature: expense-budget-visualizer, Property 14: localStorage state restoration on initialization` **Validates: Requirements 8.5, 6.2, 7.4**
  - 6.5 **[PBT]** Property 15 — Graceful fallback on malformed localStorage data. Use `fc.string().filter(s => { try { JSON.parse(s); return false; } catch { return true; } })` to write invalid JSON to `bv_transactions` and `bv_categories`; call the initialization sequence; assert no error is thrown, `transactions` is `[]`, and `categories` deep-equals `['Food','Transport','Fun']`. `// Feature: expense-budget-visualizer, Property 15: Graceful fallback on malformed localStorage data` **Validates: Requirements 8.6, 5.1**
  - Run `npm test` and confirm all P11–P15 property tests pass

- [ ] 7. Integration and smoke tests
  - Write a smoke test asserting the `<noscript>` fallback element is present in the DOM
  - Write a smoke test asserting all `aria-live` regions (`#totalBalance`, `#warningBanner`, `#transactionList`) exist with the correct attribute values after initialization
  - Write a smoke test asserting `#themeToggle` has a non-empty `aria-label` attribute
  - Write a smoke test asserting default categories (`Food`, `Transport`, `Fun`) appear in the `<select>` options when localStorage is empty
  - Run `npm test` and confirm all integration smoke tests pass
  - _Requirements: 9.5, 10.2, 10.3, 5.1_

- [ ] 8. Final verification
  - Run the full test suite (`npm test`) and confirm zero failures across all unit, property-based, and integration tests
  - Open `index.html` directly in a browser (no server) and manually verify: add a transaction, delete a transaction, add a custom category, set a budget limit that triggers the warning, toggle the theme, and reload to confirm data persists
  - Verify responsive layout at < 480 px viewport width using browser DevTools device emulation — single-column, no horizontal scroll
  - _Requirements: 9.1, 9.2, 9.4_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4"] },
    { "wave": 5, "tasks": ["5"] },
    { "wave": 6, "tasks": ["6"] },
    { "wave": 7, "tasks": ["7"] },
    { "wave": 8, "tasks": ["8"] }
  ]
}
```

## Notes

- All test files should live in `js/script.test.js` (co-located with `script.js`) unless the volume of tests warrants splitting into `js/script.unit.test.js` and `js/script.pbt.test.js`.
- The `if (typeof module !== 'undefined') module.exports = { ... }` guard at the bottom of `script.js` is the minimal change needed to make functions importable by Vitest without introducing a bundler.
- Each property-based test must run a minimum of 100 iterations (fast-check default is 100; do not lower it).
- Tasks 4–6 contain PBT sub-tasks; use `update_pbt_status` after running each one.
- Task 1 must be completed before Task 2 because the test file imports the exported functions.
- Responsive layout checks (Task 8) are manual; they do not require automated tests.
