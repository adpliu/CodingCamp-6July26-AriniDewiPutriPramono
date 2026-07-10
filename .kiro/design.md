# Design Document — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a client-side single-page application (SPA) built entirely with vanilla HTML, CSS, and JavaScript. It gives users a lightweight tool to record daily spending, track a running total balance, visualize category-based spending via a pie chart, set an optional budget limit with a live warning, and persist all state in `localStorage` — no server required.

The app is already implemented. This document formalizes the technical design to enable correctness verification, future maintenance, and test coverage.

### Key Design Goals

- **Zero dependencies at runtime** beyond Chart.js (loaded via CDN) — no build step, no bundler.
- **Offline-first**: every operation is synchronous and local; the app works without network access after the initial load.
- **Progressive enhancement**: a `<noscript>` fallback is provided; the rest of the app is functional in any modern browser.
- **Accessibility by default**: ARIA attributes, keyboard navigation, focus indicators, and live regions are built into the HTML structure.

---

## Architecture

The app follows a classic **Model → View → Controller** separation implemented as a flat set of JavaScript functions within a single `script.js` module.

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (DOM)                        │
│                                                          │
│  index.html  ←─── css/style.css                         │
│       │                                                  │
│       └──── js/script.js  ─────────────────────────┐    │
│                   │                                 │    │
│            ┌──────▼──────┐   ┌──────────────────┐  │    │
│            │   State     │   │   localStorage   │  │    │
│            │ transactions│◄──►  bv_transactions  │  │    │
│            │ categories  │   │  bv_categories   │  │    │
│            │ chartInstance│  │  bv_theme        │  │    │
│            └──────┬──────┘   │  bv_budget_limit │  │    │
│                   │          └──────────────────┘  │    │
│            ┌──────▼──────────────────────────┐     │    │
│            │      Rendering Functions        │     │    │
│            │  renderTransactions()           │     │    │
│            │  updateBalance()                │     │    │
│            │  updateChart()  (Chart.js)      │─────┘    │
│            │  renderCategoryOptions()        │          │
│            └─────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

1. On `DOMContentLoaded`, the app reads all four `localStorage` keys and hydrates module-level state arrays.
2. User actions (form submit, delete button, theme toggle, etc.) fire event handlers that mutate state, persist to `localStorage`, and re-render the affected UI regions.
3. Chart.js manages the `<canvas>` element; the app calls `chart.update()` to avoid full recreation on every state change.

### File Layout

| File | Role |
|---|---|
| `index.html` | Semantic markup, ARIA attributes, CDN script tag for Chart.js |
| `css/style.css` | Mobile-first styles, CSS custom properties for theming, responsive breakpoints |
| `js/script.js` | All application logic — state, event handlers, validation, rendering, persistence |

---

## Components and Interfaces

### 1. Initialization (`DOMContentLoaded`)

Calls `loadFromStorage()` → `applyTheme()` → `renderCategoryOptions()` → `renderTransactions()` → `updateBalance()` → `updateChart()` → `restoreBudgetLimit()` → `bindEvents()`.

This sequence guarantees UI is fully populated before any user interaction is possible.

### 2. Transaction Management

| Function | Signature | Responsibility |
|---|---|---|
| `handleFormSubmit(e)` | `(Event) → void` | Validates form; creates transaction object; prepends to array; persists; re-renders |
| `validateForm(nameInput, amountInput, categoryInput)` | `(HTMLElement, HTMLElement, HTMLElement) → boolean` | Returns `true` if all fields pass; otherwise shows inline errors and returns `false` |
| `deleteTransaction(id)` | `(string) → void` | Filters out transaction by UUID; persists; re-renders |
| `handleClearAll()` | `() → void` | Shows `window.confirm`; if confirmed, empties array; persists; re-renders |
| `renderTransactions()` | `() → void` | Rebuilds `<ul>` from the `transactions` array; manages empty-state visibility |

### 3. Balance and Budget Warning

| Function | Responsibility |
|---|---|
| `updateBalance()` | Sums all transaction amounts; updates `#totalBalance` text; delegates to `checkBudgetWarning()` |
| `checkBudgetWarning(total)` | Reads `#budgetLimit` value; toggles the `hidden` attribute on `#warningBanner` |
| `handleBudgetLimitChange()` | Persists new limit to `localStorage`; triggers `checkBudgetWarning()` |

### 4. Category Management

| Function | Responsibility |
|---|---|
| `renderCategoryOptions()` | Rebuilds `<select>` options from the `categories` array |
| `handleAddCategory()` | Validates new name (non-empty, non-duplicate case-insensitive); pushes to array; persists; re-renders select |

### 5. Pie Chart (`updateChart()`)

- Groups transaction amounts by category into a `totals` map.
- If empty: destroys any existing `Chart` instance; shows empty-state text.
- If non-empty: hides empty-state; maps category names to colors from `CHART_COLORS`; either creates a new `Chart` instance or calls `chartInstance.update()` on the existing one.
- Tooltip callback formats values as `Rp <id-ID locale> (X.X%)`.

### 6. Theme Management

| Function | Responsibility |
|---|---|
| `handleThemeToggle()` | Reads current `data-theme` attribute; toggles; calls `applyTheme()`; persists |
| `applyTheme(theme)` | Sets `data-theme` on `<html>`; updates toggle icon emoji; updates Chart.js legend text color if chart exists |

### 7. Persistence (`localStorage`)

| Storage Key | Value Type | Content |
|---|---|---|
| `bv_transactions` | JSON string | Array of `Transaction` objects |
| `bv_categories` | JSON string | Array of category name strings |
| `bv_theme` | Plain string | `"light"` or `"dark"` |
| `bv_budget_limit` | Plain string | Numeric string or empty |

`loadFromStorage()` wraps reads in a try/catch (implicit via nullish fallback) and falls back to safe defaults on any missing or malformed key.

### 8. Utility Functions

| Function | Signature | Description |
|---|---|---|
| `formatNumber(num)` | `(number) → string` | `num.toLocaleString('id-ID')` — Indonesian locale, `.` as thousands separator |
| `escapeHTML(str)` | `(string) → string` | Replaces `&`, `<`, `>`, `"`, `'` with HTML entities to prevent XSS |

---

## Data Models

### Transaction Object

```js
{
  id:       string,   // UUID generated by crypto.randomUUID()
  name:     string,   // User-supplied item name (1–80 characters, HTML-escaped on render)
  amount:   number,   // Positive float, Rupiah amount
  category: string,   // One of the strings in the categories array
}
```

### Application State (module-level)

```js
let transactions = [];       // Transaction[]
let categories   = [];       // string[]  — Default_Categories + Custom_Categories
let chartInstance = null;    // Chart | null
```

### LocalStorage Serialization

```
bv_transactions  →  JSON.stringify(Transaction[])
bv_categories    →  JSON.stringify(string[])
bv_theme         →  "light" | "dark"
bv_budget_limit  →  "<number>" | ""
```

### Category Color Mapping

Categories are assigned Chart.js colors deterministically by their index in the `categories` array modulo `CHART_COLORS.length` (10 colors). This keeps the pie slice color consistent across add/delete operations as long as the categories array order is preserved.

```js
const CHART_COLORS = [
  '#4f46e5', '#0ea5e9', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1'
];
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property Reflection:** Before writing the final list, redundancies were resolved:
- Requirements 2.2 and 2.3 (balance updates on add/delete) are subsumed by Property 1 (balance always equals sum of transactions).
- Requirements 4.3 (chart updates on add/delete) is subsumed by Property 5 (chart data always reflects current transactions).
- Requirements 6.4 and 6.5 are collapsed with 6.3 into one unified budget-warning visibility property (Property 7).
- Requirements 8.1 and 8.2 (JSON serialization of transactions and categories) are combined into a single round-trip persistence property (Property 9).
- Requirements 7.3 and 7.1 (toggle persists) are consolidated into the theme toggle round-trip (Property 8).

---

### Property 1: Balance equals sum of all transaction amounts

*For any* set of transactions in the transaction list, the text displayed in `#totalBalance` SHALL equal `"Rp " + formatNumber(sum of all amounts)` where `formatNumber` uses the Indonesian locale (`id-ID`) with `.` as the thousands separator.

**Validates: Requirements 2.1, 2.4**

---

### Property 2: Valid transaction is prepended to the list

*For any* transaction input where the item name is non-empty (and non-whitespace-only), the amount is a positive number, and a category is selected, submitting the form SHALL increase the transaction list length by exactly 1 and place the new transaction at index 0.

**Validates: Requirements 1.1, 3.2**

---

### Property 3: Form resets after successful submission

*For any* valid transaction input that is successfully submitted, all form fields (item name, amount, category select) SHALL be reset to their default empty/unselected state immediately after submission.

**Validates: Requirements 1.3**

---

### Property 4: Transaction persistence round-trip

*For any* transaction that is added to the list, reading and JSON-parsing the `bv_transactions` key from `localStorage` SHALL yield an array that contains an entry with matching `id`, `name`, `amount`, and `category` fields.

**Validates: Requirements 1.2, 8.1**

---

### Property 5: Pie chart data mirrors per-category transaction totals

*For any* non-empty transaction list, the chart instance's `labels` array SHALL contain exactly the set of distinct category names present in the list, and the corresponding `data` values SHALL equal the sum of amounts for each respective category.

**Validates: Requirements 4.1, 4.3**

---

### Property 6: Pie chart tooltip formatter

*For any* numeric slice value and total, the tooltip label callback SHALL return a string of the form `" Rp <id-ID formatted value> (<percentage to 1 decimal place>%)"` where percentage = `(value / total) × 100`.

**Validates: Requirements 4.4**

---

### Property 7: Budget warning visibility invariant

*For any* combination of balance and budget limit:
- If the budget limit is a positive number and the balance strictly exceeds it, the `#warningBanner` element SHALL NOT have the `hidden` attribute.
- In all other cases (limit is empty, zero, negative, or balance ≤ limit), the `#warningBanner` element SHALL have the `hidden` attribute set.

**Validates: Requirements 6.3, 6.4, 6.5**

---

### Property 8: Theme toggle is an involution with persistence

*For any* active theme (`"light"` or `"dark"`), clicking the theme toggle button SHALL switch the `data-theme` attribute on `<html>` to the opposite value, update the toggle icon emoji accordingly (`"🌙"` for light, `"☀️"` for dark), and write the new theme string to `localStorage["bv_theme"]`. Clicking a second time SHALL restore the original theme.

**Validates: Requirements 7.1, 7.3, 7.5**

---

### Property 9: LocalStorage serialization round-trip (transactions and categories)

*For any* array of transaction objects or category strings, calling `saveTransactions()` / `saveCategories()` and then reading and `JSON.parse`-ing the corresponding `localStorage` key SHALL produce a deep-equal copy of the original array.

**Validates: Requirements 8.1, 8.2**

---

### Property 10: Whitespace inputs are rejected by the validator

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), using it as an item name in the transaction form or as a new category name SHALL be rejected by the validator — the transaction/category list SHALL remain unchanged and an inline error message SHALL be displayed.

**Validates: Requirements 1.4, 5.4**

---

### Property 11: Amount boundary — non-positive values are rejected

*For any* number that is zero or negative (including `NaN` from an empty field), using it as the transaction amount SHALL be rejected by the validator — the transaction list SHALL remain unchanged and an inline error message for the amount field SHALL be displayed.

**Validates: Requirements 1.5**

---

### Property 12: Duplicate category names are rejected (case-insensitive)

*For any* string that matches an existing category name when both are lowercased, attempting to add it as a new category SHALL be rejected — the `categories` array SHALL remain unchanged and an inline error SHALL be displayed.

**Validates: Requirements 5.5**

---

### Property 13: XSS escaping invariant

*For any* string containing at least one of the characters `&`, `<`, `>`, `"`, or `'`, the `escapeHTML()` function SHALL return a string where none of those raw characters appear and each is replaced by its HTML entity equivalent (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#039;`).

**Validates: Requirements 10.1**

---

### Property 14: localStorage state restoration on initialization

*For any* valid set of data written to all four `localStorage` keys before the app initializes, calling the initialization sequence SHALL restore the `transactions` array, `categories` array, `budgetLimit` input value, and `data-theme` attribute to values that match the persisted data.

**Validates: Requirements 8.5, 6.2, 7.4**

---

### Property 15: Graceful fallback on malformed localStorage data

*For any* non-parseable string written to `bv_transactions` or `bv_categories` in `localStorage`, the initialization sequence SHALL NOT throw an unhandled error, SHALL set `transactions` to `[]`, and SHALL set `categories` to the default `["Food", "Transport", "Fun"]`.

**Validates: Requirements 8.6, 5.1**

---

## Error Handling

### Input Validation Errors

All validation is performed client-side before any state mutation. The pattern is:

1. Call `clearErrors()` to reset any prior error state.
2. Check each field; if invalid, call `showError(errorId, inputEl, message)` which sets the error element's `textContent` and adds the `.error` class to the input.
3. Return `false` from `validateForm()` to abort the submit handler.
4. Valid fields are never cleared — the user's input is preserved (Requirement 1.7).

| Error Condition | Element | Error Message |
|---|---|---|
| Empty / whitespace item name | `#itemNameError` | "Item name is required." |
| Missing / zero / negative amount | `#itemAmountError` | "Enter a valid amount greater than 0." |
| No category selected | `#itemCategoryError` | "Please select a category." |
| Empty category name | `#categoryError` | "Category name cannot be empty." |
| Duplicate category name | `#categoryError` | "That category already exists." |

### localStorage Failures

`loadFromStorage()` uses nullish-coalescing defaults: if `JSON.parse` throws or the key is `null`, the module-level arrays fall back to `[]` / `[...DEFAULT_CATEGORIES]`. No try/catch is currently explicit in the code, but the nullish fallback pattern (`savedTx ? JSON.parse(savedTx) : []`) will propagate a `SyntaxError` to the top-level `DOMContentLoaded` handler if the stored value is malformed JSON. A recommended improvement is to wrap each parse in a `try/catch`:

```js
function safeParseJSON(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}
```

### Chart.js Absence

If Chart.js fails to load (CDN unavailable, network issue), `new Chart(...)` will throw a `ReferenceError`. The rest of the app (transactions, balance, categories, persistence) continues to work; only the chart fails silently. A defensive guard can be added:

```js
if (typeof Chart === 'undefined') {
  emptyMsg.textContent = 'Chart unavailable (Chart.js not loaded).';
  return;
}
```

### Budget Limit Edge Cases

Non-numeric values in the budget limit field produce `NaN` from `parseFloat`, which the `isNaN(limit)` guard correctly catches, leaving the warning banner hidden.

---

## Testing Strategy

### Overview

This is a vanilla JS client-side app. Testing is done entirely in the browser or with a DOM simulation environment (e.g., jsdom via Vitest or Jest). No server or build pipeline is required to run tests.

**Recommended stack**: [Vitest](https://vitest.dev/) with jsdom environment + [fast-check](https://fast-check.io/) for property-based tests.

```
npm install -D vitest @vitest/jsdom fast-check
```

### Unit Tests

Unit tests cover specific behaviors, edge cases, and integration points:

| Test Area | What to Test |
|---|---|
| `escapeHTML()` | Specific inputs: `<script>`, `&`, `"`, `'`, `>`, empty string, plain text unchanged |
| `formatNumber()` | Known values: `0 → "0"`, `1000 → "1.000"`, `1500000 → "1.500.000"` |
| `validateForm()` | Empty name, whitespace-only name, zero amount, negative amount, no category selected, all valid |
| `handleClearAll()` | Confirm → empty list; dismiss → list unchanged |
| `deleteTransaction()` | Removes correct item by ID; other items preserved |
| `handleAddCategory()` | Duplicate (exact match), duplicate (different case), empty name, valid new name |
| Theme initialization | Missing key defaults to `"light"`; `"dark"` key applies dark theme on load |
| `checkBudgetWarning()` | balance > limit → show; balance === limit → hide; balance < limit → hide; empty limit → hide; negative limit → hide |

### Property-Based Tests

Each property-based test runs a **minimum of 100 iterations** per property. Tests use `fast-check` arbitraries to generate inputs.

Tag format for each test: `// Feature: expense-budget-visualizer, Property <N>: <property_text>`

| Property | fast-check Arbitrary | What Varies |
|---|---|---|
| **P1** Balance equals sum | `fc.array(fc.float({ min: 1, max: 1_000_000, noNaN: true }))` | Number of transactions, amounts |
| **P2** Valid tx prepended | `fc.record({ name: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), amount: fc.float({ min: 0.01, max: 1e9 }), category: fc.constantFrom(...categories) })` | Name, amount, category |
| **P3** Form resets | Same as P2 | Input values |
| **P4** Persistence round-trip | `fc.array(fc.record({ id: fc.uuid(), name: fc.string(), amount: fc.float({ min: 1 }), category: fc.string() }))` | Array contents, length |
| **P5** Chart data mirrors totals | `fc.array(fc.record({ amount: fc.float({ min: 1 }), category: fc.constantFrom('Food','Transport','Fun') }), { minLength: 1 })` | Transactions, category distribution |
| **P6** Tooltip formatter | `fc.tuple(fc.float({ min: 1 }), fc.float({ min: 1 }))` | Slice value, total |
| **P7** Budget warning invariant | `fc.tuple(fc.float({ min: 0 }), fc.oneof(fc.float({ min: 0 }), fc.constant(''), fc.constant(null)))` | Balance, limit value |
| **P8** Theme toggle involution | `fc.constantFrom('light', 'dark')` | Starting theme |
| **P9** Serialization round-trip | `fc.array(fc.string())` for categories; full tx record for transactions | Array length and content |
| **P10** Whitespace rejection | `fc.stringMatching(/^\s+$/)` | Whitespace composition |
| **P11** Non-positive amount rejection | `fc.oneof(fc.constant(0), fc.float({ max: 0 }).filter(n => n <= 0))` | Zero, negatives |
| **P12** Duplicate category rejection | Existing category name with `fc.mixedCase()` | Letter casing |
| **P13** XSS escaping | `fc.string().filter(s => /[&<>"']/.test(s))` | Strings with special chars |
| **P14** State restoration on init | All four storage keys with valid values | Stored data content |
| **P15** Malformed localStorage fallback | `fc.string().filter(s => { try { JSON.parse(s); return false; } catch { return true; } })` | Invalid JSON strings |

### Integration / Smoke Tests

These are run once (not property-iterated) and verify infrastructure wiring:

- Chart.js `<script>` tag loads successfully (CDN reachability, optional in CI).
- `<noscript>` fallback message is present in the DOM.
- All four `aria-live` regions exist (`#totalBalance`, `#warningBanner`, `#transactionList`).
- All icon-only buttons (`#themeToggle`, `.btn-delete`) have non-empty `aria-label` attributes.
- The transaction list container has `overflow-y: auto` (CSS rule check).
- Default categories (`Food`, `Transport`, `Fun`) are present on first load with empty `localStorage`.

### Responsive Layout Tests

Manual checks at the following breakpoints:
- **< 480 px** (mobile): single-column layout, no horizontal scroll, chart max-width ≤ 280 px.
- **≥ 480 px**: balance font size increases to 2.5rem, chart widens to 320 px.
- **≥ 640 px**: card padding increases, container padding adjusts.
