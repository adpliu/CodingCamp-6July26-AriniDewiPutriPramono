/* ============================================================
   script.js — Expense & Budget Visualizer
   Vanilla JavaScript, no frameworks
   Uses LocalStorage for persistence
   ============================================================ */

/* ---------- Constants ---------- */
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

// Chart colors per category index (extends for custom categories)
const CHART_COLORS = [
  '#4f46e5', '#0ea5e9', '#f59e0b', '#10b981',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1'
];

/* ---------- State ---------- */
let transactions = [];   // array of { id, name, amount, category }
let categories = [];     // array of strings
let chartInstance = null;

/* ---------- LocalStorage Keys ---------- */
const LS_TRANSACTIONS = 'bv_transactions';
const LS_CATEGORIES   = 'bv_categories';
const LS_THEME        = 'bv_theme';
const LS_BUDGET_LIMIT = 'bv_budget_limit';

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  applyTheme(localStorage.getItem(LS_THEME) || 'light');
  renderCategoryOptions();
  renderTransactions();
  updateBalance();
  updateChart();
  restoreBudgetLimit();
  bindEvents();
});

/* ============================================================
   LOCAL STORAGE
   ============================================================ */
function loadFromStorage() {
  const savedTx  = localStorage.getItem(LS_TRANSACTIONS);
  const savedCat = localStorage.getItem(LS_CATEGORIES);

  transactions = savedTx  ? JSON.parse(savedTx)  : [];
  categories   = savedCat ? JSON.parse(savedCat) : [...DEFAULT_CATEGORIES];
}

function saveTransactions() {
  localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(transactions));
}

function saveCategories() {
  localStorage.setItem(LS_CATEGORIES, JSON.stringify(categories));
}

function restoreBudgetLimit() {
  const saved = localStorage.getItem(LS_BUDGET_LIMIT);
  if (saved) {
    document.getElementById('budgetLimit').value = saved;
  }
}

/* ============================================================
   BIND EVENTS
   ============================================================ */
function bindEvents() {
  // Form submit
  document.getElementById('transactionForm')
    .addEventListener('submit', handleFormSubmit);

  // Delete all
  document.getElementById('clearAllBtn')
    .addEventListener('click', handleClearAll);

  // Add custom category
  document.getElementById('addCategoryBtn')
    .addEventListener('click', handleAddCategory);

  // Also allow Enter key in category input
  document.getElementById('newCategoryInput')
    .addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddCategory();
      }
    });

  // Theme toggle
  document.getElementById('themeToggle')
    .addEventListener('click', handleThemeToggle);

  // Budget limit — save on change and check warning
  document.getElementById('budgetLimit')
    .addEventListener('input', handleBudgetLimitChange);
}

/* ============================================================
   FORM — ADD TRANSACTION
   ============================================================ */
function handleFormSubmit(e) {
  e.preventDefault();

  const nameInput     = document.getElementById('itemName');
  const amountInput   = document.getElementById('itemAmount');
  const categoryInput = document.getElementById('itemCategory');

  // Validate
  const isValid = validateForm(nameInput, amountInput, categoryInput);
  if (!isValid) return;

  const transaction = {
    id:       crypto.randomUUID(),
    name:     nameInput.value.trim(),
    amount:   parseFloat(amountInput.value),
    category: categoryInput.value,
  };

  transactions.unshift(transaction); // newest first
  saveTransactions();

  renderTransactions();
  updateBalance();
  updateChart();

  // Reset form
  e.target.reset();
  clearErrors();
}

/* ---------- Validation ---------- */
function validateForm(nameInput, amountInput, categoryInput) {
  let valid = true;

  clearErrors();

  if (!nameInput.value.trim()) {
    showError('itemNameError', nameInput, 'Item name is required.');
    valid = false;
  }

  const amount = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amount) || amount <= 0) {
    showError('itemAmountError', amountInput, 'Enter a valid amount greater than 0.');
    valid = false;
  }

  if (!categoryInput.value) {
    showError('itemCategoryError', categoryInput, 'Please select a category.');
    valid = false;
  }

  return valid;
}

function showError(errorId, inputEl, message) {
  document.getElementById(errorId).textContent = message;
  inputEl.classList.add('error');
}

function clearErrors() {
  ['itemNameError', 'itemAmountError', 'itemCategoryError'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  ['itemName', 'itemAmount', 'itemCategory'].forEach(id => {
    document.getElementById(id).classList.remove('error');
  });
}

/* ============================================================
   RENDER TRANSACTIONS
   ============================================================ */
function renderTransactions() {
  const list      = document.getElementById('transactionList');
  const emptyMsg  = document.getElementById('listEmpty');

  list.innerHTML = '';

  if (transactions.length === 0) {
    emptyMsg.classList.remove('hidden');
    return;
  }

  emptyMsg.classList.add('hidden');

  transactions.forEach(tx => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.dataset.id = tx.id;

    const colorIndex = categories.indexOf(tx.category) % CHART_COLORS.length;
    const dotColor   = CHART_COLORS[colorIndex >= 0 ? colorIndex : 0];

    li.innerHTML = `
      <span class="item-dot" style="background-color: ${dotColor};" aria-hidden="true"></span>
      <div class="item-info">
        <span class="item-name">${escapeHTML(tx.name)}</span>
        <span class="item-meta">
          <span class="item-category-badge">${escapeHTML(tx.category)}</span>
        </span>
      </div>
      <span class="item-amount">− Rp ${formatNumber(tx.amount)}</span>
      <button
        class="btn-delete"
        aria-label="Delete ${escapeHTML(tx.name)}"
        data-id="${tx.id}"
        title="Delete transaction"
      >🗑️</button>
    `;

    // Bind delete button
    li.querySelector('.btn-delete').addEventListener('click', () => {
      deleteTransaction(tx.id);
    });

    list.appendChild(li);
  });
}

/* ============================================================
   DELETE TRANSACTION
   ============================================================ */
function deleteTransaction(id) {
  transactions = transactions.filter(tx => tx.id !== id);
  saveTransactions();
  renderTransactions();
  updateBalance();
  updateChart();
}

function handleClearAll() {
  if (transactions.length === 0) return;

  const confirmed = window.confirm('Delete all transactions? This cannot be undone.');
  if (!confirmed) return;

  transactions = [];
  saveTransactions();
  renderTransactions();
  updateBalance();
  updateChart();
}

/* ============================================================
   TOTAL BALANCE
   ============================================================ */
function updateBalance() {
  const total    = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const balanceEl = document.getElementById('totalBalance');
  balanceEl.textContent = `Rp ${formatNumber(total)}`;
  checkBudgetWarning(total);
}

/* ============================================================
   BUDGET LIMIT WARNING
   ============================================================ */
function handleBudgetLimitChange() {
  const val = document.getElementById('budgetLimit').value;
  localStorage.setItem(LS_BUDGET_LIMIT, val);
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  checkBudgetWarning(total);
}

function checkBudgetWarning(total) {
  const limitInput  = document.getElementById('budgetLimit');
  const banner      = document.getElementById('warningBanner');
  const limit       = parseFloat(limitInput.value);

  if (!isNaN(limit) && limit > 0 && total > limit) {
    banner.removeAttribute('hidden');
  } else {
    banner.setAttribute('hidden', '');
  }
}

/* ============================================================
   CATEGORY OPTIONS
   ============================================================ */
function renderCategoryOptions() {
  const select = document.getElementById('itemCategory');

  // Keep placeholder option
  select.innerHTML = '<option value="" disabled selected>Select a category</option>';

  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

/* ============================================================
   ADD CUSTOM CATEGORY
   ============================================================ */
function handleAddCategory() {
  const input    = document.getElementById('newCategoryInput');
  const errorEl  = document.getElementById('categoryError');
  const name     = input.value.trim();

  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = 'Category name cannot be empty.';
    return;
  }

  const duplicate = categories.some(
    cat => cat.toLowerCase() === name.toLowerCase()
  );

  if (duplicate) {
    errorEl.textContent = 'That category already exists.';
    return;
  }

  categories.push(name);
  saveCategories();
  renderCategoryOptions();

  input.value = '';
}

/* ============================================================
   PIE CHART (Chart.js)
   ============================================================ */
function updateChart() {
  const canvas   = document.getElementById('expenseChart');
  const emptyMsg = document.getElementById('chartEmpty');

  // Group spending by category
  const totals = {};
  transactions.forEach(tx => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);

  if (labels.length === 0) {
    emptyMsg.classList.remove('hidden');
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  emptyMsg.classList.add('hidden');

  const colors = labels.map(label => {
    const idx = categories.indexOf(label) % CHART_COLORS.length;
    return CHART_COLORS[idx >= 0 ? idx : 0];
  });

  if (chartInstance) {
    // Update existing chart instead of recreating
    chartInstance.data.labels                       = labels;
    chartInstance.data.datasets[0].data             = data;
    chartInstance.data.datasets[0].backgroundColor  = colors;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 13 },
            color: getComputedStyle(document.documentElement)
              .getPropertyValue('--color-text').trim() || '#1a1d23',
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((value / total) * 100).toFixed(1);
              return ` Rp ${formatNumber(value)} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/* ============================================================
   DARK / LIGHT MODE TOGGLE
   ============================================================ */
function handleThemeToggle() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(LS_THEME, next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('themeIcon');
  icon.textContent = theme === 'dark' ? '☀️' : '🌙';

  // Update chart legend color to match theme
  if (chartInstance) {
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text').trim();
    chartInstance.options.plugins.legend.labels.color = textColor;
    chartInstance.update();
  }
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatNumber(num) {
  return num.toLocaleString('id-ID');
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
