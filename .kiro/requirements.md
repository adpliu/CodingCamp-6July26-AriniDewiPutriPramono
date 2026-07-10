# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly single-page web application built with vanilla HTML, CSS, and JavaScript (no frameworks). It helps users record daily spending transactions, view a running total balance, categorize expenses into built-in or user-defined categories, visualize spending distribution via a pie chart, set a budget limit with a live warning, and switch between light and dark themes — all without any server. All data is stored in the browser's LocalStorage so it persists across sessions.

The app is already implemented at a working-MVP level. These requirements formally describe the intended behavior of every feature so that correctness can be verified, gaps identified, and future enhancements planned.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense entry with an item name, a positive monetary amount (in Rupiah), and an assigned category.
- **Transaction_List**: The ordered collection of all recorded Transactions, displayed newest-first.
- **Category**: A string label used to group Transactions. Includes Default_Categories and Custom_Categories.
- **Default_Categories**: The three built-in categories: Food, Transport, Fun.
- **Custom_Category**: A user-defined category added at runtime.
- **Category_List**: The combined, ordered collection of Default_Categories followed by Custom_Categories.
- **Balance**: The arithmetic sum of the amounts of all Transactions currently in the Transaction_List.
- **Budget_Limit**: An optional positive number (in Rupiah) set by the user. When the Balance exceeds it, a warning is shown.
- **Pie_Chart**: A Chart.js pie chart that shows the proportion of the Balance spent per Category.
- **Warning_Banner**: A visible, pulsing alert element shown when the Balance exceeds the Budget_Limit.
- **Theme**: The visual color scheme of the App — either `light` or `dark`.
- **LocalStorage**: The browser's `localStorage` API used for client-side data persistence.
- **Validator**: The client-side input validation logic within the App.
- **Form**: The "Add Transaction" HTML form containing the Item Name, Amount, and Category fields.
- **Storage_Key**: One of four LocalStorage keys — `bv_transactions`, `bv_categories`, `bv_theme`, `bv_budget_limit`.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to add a new expense transaction by filling in an item name, amount, and category, so that I can track what I am spending money on.

#### Acceptance Criteria

1. WHEN a user submits the Form with a non-empty item name, a positive numeric amount, and a selected Category, THE App SHALL create a new Transaction and prepend it to the Transaction_List.
2. WHEN a new Transaction is added, THE App SHALL persist the updated Transaction_List to LocalStorage immediately.
3. WHEN a new Transaction is added, THE App SHALL reset all Form fields to their default empty/placeholder state.
4. WHEN a user submits the Form with an empty or whitespace-only item name, THE Validator SHALL prevent submission and display an inline error message for the item name field.
5. WHEN a user submits the Form with an amount that is missing, zero, or negative, THE Validator SHALL prevent submission and display an inline error message for the amount field.
6. WHEN a user submits the Form without selecting a Category, THE Validator SHALL prevent submission and display an inline error message for the category field.
7. WHEN validation fails on one or more fields, THE App SHALL retain the user-entered values in all other fields so the user does not have to re-enter valid data.

---

### Requirement 2: Display and Update Total Balance

**User Story:** As a user, I want to see my total spending amount at the top of the page, so that I know how much I have spent in total.

#### Acceptance Criteria

1. THE App SHALL display the Balance as the sum of all Transaction amounts, formatted as `Rp <number>` using Indonesian locale number formatting (`.` as thousands separator).
2. WHEN a Transaction is added, THE App SHALL recalculate and update the displayed Balance immediately without a page reload.
3. WHEN a Transaction is deleted, THE App SHALL recalculate and update the displayed Balance immediately without a page reload.
4. WHEN the Transaction_List is empty, THE App SHALL display the Balance as `Rp 0`.

---

### Requirement 3: View and Delete Transactions

**User Story:** As a user, I want to see all my recorded transactions and delete individual ones or all at once, so that I can manage and correct my spending history.

#### Acceptance Criteria

1. THE App SHALL render each Transaction in the Transaction_List as a list item showing the item name, category badge, and amount formatted as `− Rp <number>`.
2. THE App SHALL render the Transaction_List in newest-first order (most recently added at the top).
3. WHEN the Transaction_List is empty, THE App SHALL display an empty-state message in place of the list.
4. WHEN a user clicks the delete button on a Transaction item, THE App SHALL remove that Transaction from the Transaction_List and persist the updated list to LocalStorage.
5. WHEN a user clicks the "Delete All" button and confirms the action in a confirmation dialog, THE App SHALL remove all Transactions from the Transaction_List and persist the empty list to LocalStorage.
6. WHEN a user clicks the "Delete All" button and dismisses the confirmation dialog, THE App SHALL leave the Transaction_List unchanged.
7. WHEN the Transaction_List contains more items than the visible area can show, THE App SHALL provide vertical scrolling within the list container without affecting the rest of the page layout.

---

### Requirement 4: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending grouped by category, so that I can understand where my money is going at a glance.

#### Acceptance Criteria

1. WHEN the Transaction_List is non-empty, THE Pie_Chart SHALL display one slice per Category that has at least one Transaction, sized proportionally to that Category's share of the total Balance.
2. WHEN the Transaction_List is empty, THE App SHALL hide the Pie_Chart canvas and display an empty-state message in its place.
3. WHEN a Transaction is added or deleted, THE Pie_Chart SHALL update immediately to reflect the new per-Category totals without a page reload.
4. THE Pie_Chart SHALL display a tooltip on hover showing the amount in `Rp <number>` format and the percentage of the total Balance for the hovered slice.
5. THE Pie_Chart SHALL display a legend below the chart identifying each Category by name and color.

---

### Requirement 5: Manage Categories

**User Story:** As a user, I want to add my own spending categories beyond the defaults, so that I can classify transactions in a way that matches my lifestyle.

#### Acceptance Criteria

1. THE App SHALL initialise the Category_List with the Default_Categories (Food, Transport, Fun) on first load when no saved categories exist in LocalStorage.
2. WHEN saved categories exist in LocalStorage, THE App SHALL restore the Category_List from LocalStorage instead of using only the Default_Categories.
3. WHEN a user enters a non-empty, non-duplicate category name and clicks "Add" (or presses Enter), THE App SHALL append the new Custom_Category to the Category_List, persist the updated list to LocalStorage, and immediately make it available in the Category dropdown.
4. WHEN a user attempts to add a category with an empty or whitespace-only name, THE Validator SHALL prevent the addition and display an inline error message.
5. WHEN a user attempts to add a category whose name matches an existing Category (case-insensitive), THE Validator SHALL prevent the addition and display an inline error message indicating the category already exists.

---

### Requirement 6: Budget Limit Warning

**User Story:** As a user, I want to set a budget limit and receive a visual warning when my total spending exceeds it, so that I stay within my planned budget.

#### Acceptance Criteria

1. WHEN a user enters a positive numeric value in the Budget Limit field, THE App SHALL persist the value to LocalStorage immediately.
2. WHEN the App loads, THE App SHALL restore a previously saved Budget_Limit value into the Budget Limit input field.
3. WHEN the Balance exceeds the Budget_Limit and the Budget_Limit is a positive number, THE App SHALL display the Warning_Banner with a pulsing animation.
4. WHEN the Balance is less than or equal to the Budget_Limit, THE App SHALL hide the Warning_Banner.
5. WHEN the Budget_Limit field is empty or contains a non-positive value, THE App SHALL hide the Warning_Banner regardless of the current Balance.
6. WHEN a Transaction is added or deleted, THE App SHALL re-evaluate the Budget_Limit condition and update the visibility of the Warning_Banner immediately.

---

### Requirement 7: Light and Dark Mode

**User Story:** As a user, I want to toggle between light and dark color themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. WHEN a user clicks the theme toggle button, THE App SHALL switch the active Theme from `light` to `dark` or from `dark` to `light`.
2. WHEN the Theme is switched, THE App SHALL apply the corresponding CSS custom property values to all visible UI elements immediately without a page reload.
3. WHEN the Theme is switched, THE App SHALL persist the new Theme value to LocalStorage.
4. WHEN the App loads, THE App SHALL restore the previously saved Theme from LocalStorage; if no Theme is saved, THE App SHALL default to the `light` Theme.
5. WHEN the Theme is `dark`, THE App SHALL display the sun icon (☀️) on the toggle button; WHEN the Theme is `light`, THE App SHALL display the moon icon (🌙).
6. WHEN the active Theme changes and a Pie_Chart is currently rendered, THE App SHALL update the Pie_Chart legend text color to match the new Theme's text color.

---

### Requirement 8: Data Persistence Across Sessions

**User Story:** As a user, I want my transactions, categories, budget limit, and theme preference to be saved automatically, so that my data is still there when I reopen the app.

#### Acceptance Criteria

1. THE App SHALL store Transactions under the Storage_Key `bv_transactions` as a JSON-serialized array.
2. THE App SHALL store Custom_Categories under the Storage_Key `bv_categories` as a JSON-serialized array.
3. THE App SHALL store the Budget_Limit under the Storage_Key `bv_budget_limit` as a plain string.
4. THE App SHALL store the Theme preference under the Storage_Key `bv_theme` as a plain string.
5. WHEN the App initialises, THE App SHALL read all four Storage_Keys from LocalStorage and restore the corresponding application state before rendering the UI.
6. IF LocalStorage is unavailable or a Storage_Key contains malformed data, THEN THE App SHALL fall back to safe defaults (empty Transaction_List, Default_Categories, `light` Theme, no Budget_Limit) without throwing an unhandled error.

---

### Requirement 9: Cross-Browser and Responsive Behavior

**User Story:** As a user, I want to use the app on any modern browser and on both mobile and desktop screen sizes, so that it is accessible to me wherever I am.

#### Acceptance Criteria

1. THE App SHALL render correctly and be fully functional in the current stable versions of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL use a single-column, mobile-first layout on screens narrower than 480 px without horizontal scrolling or clipped content.
3. WHEN the viewport width is 480 px or wider, THE App SHALL apply responsive layout adjustments (larger balance text, wider chart) as defined by the CSS breakpoints.
4. THE App SHALL load and be interactive without any server-side runtime — all logic, data, and assets SHALL be served as static files.
5. WHEN JavaScript is disabled, THE App SHALL display a visible fallback message informing the user that JavaScript is required.

---

### Requirement 10: Accessibility and Input Safety

**User Story:** As a user who relies on assistive technologies or keyboard navigation, I want the app to be operable without a mouse and to protect me from malformed input, so that the app is usable and safe for everyone.

#### Acceptance Criteria

1. THE App SHALL escape all user-supplied strings (item names, category names) before inserting them into the DOM to prevent cross-site scripting (XSS) injection.
2. THE App SHALL provide descriptive `aria-label` attributes on all icon-only interactive elements (theme toggle, delete buttons).
3. WHEN a live region updates (balance, warning banner, transaction list), THE App SHALL use `aria-live` attributes so that screen readers announce the change.
4. ALL interactive elements (buttons, inputs, selects) SHALL be reachable and operable via keyboard Tab navigation and the Enter/Space keys.
5. THE App SHALL display visible focus indicators on all interactive elements when navigated by keyboard.
