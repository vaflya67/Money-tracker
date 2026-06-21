const STORAGE_KEY = "money-tracker-v1";
const CATEGORIES_KEY = "money-tracker-categories-v1";

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: "food", label: "Еда", icon: "🍔" },
  { id: "transport", label: "Транспорт", icon: "🚗" },
  { id: "home", label: "Жильё", icon: "🏠" },
  { id: "subs", label: "Подписки", icon: "📱" },
  { id: "fun", label: "Развлечения", icon: "🎬" },
  { id: "health", label: "Здоровье", icon: "💊" },
  { id: "clothes", label: "Одежда", icon: "👕" },
  { id: "other", label: "Прочее", icon: "📦" },
];

const DEFAULT_INCOME_CATEGORIES = [
  { id: "salary", label: "Зарплата", icon: "💼" },
  { id: "freelance", label: "Фриланс", icon: "💻" },
  { id: "gift", label: "Подарок", icon: "🎁" },
  { id: "other", label: "Прочее", icon: "📦" },
];

const EMOJI_PICKER = [
  "🍔", "🚗", "🏠", "📱", "🎬", "💊", "👕", "📦", "☕", "🛒",
  "✈️", "🐾", "🎁", "💼", "💻", "💇", "🏋️", "📚", "🔧", "❤️",
];

const RU_LETTERS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split("");

const EXPENSE_COMMENTS = [
  "Кофе", "Обед", "Продукты", "Такси", "Аптека", "Бензин", "Подписка", "Доставка",
];

const INCOME_COMMENTS = [
  "Аванс", "Премия", "Подработка", "Возврат",
];

const MONTHS_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

let transactions = [];
let expenseCategories = [];
let incomeCategories = [];
let viewDate = new Date();
let modalType = "expense";
let selectedCategory = null;
let selectedComment = "";
let amountStr = "";
let settingsTab = "expense";
let newCatType = "expense";
let newCatEmoji = "📦";
let newCatName = "";
let letterCase = "upper";

const $ = (sel) => document.querySelector(sel);

const els = {
  mainView: $("#mainView"),
  addView: $("#addView"),
  monthLabel: $("#monthLabel"),
  totalIncome: $("#totalIncome"),
  totalExpense: $("#totalExpense"),
  totalBalance: $("#totalBalance"),
  categoriesChart: $("#categoriesChart"),
  transactionsList: $("#transactionsList"),
  addTitle: $("#addTitle"),
  categoryGrid: $("#categoryGrid"),
  amountField: $("#amountField"),
  amountInput: $("#amountInput"),
  commentGrid: $("#commentGrid"),
  numpad: $("#numpad"),
  settingsView: $("#settingsView"),
  settingsCatList: $("#settingsCatList"),
  newCatView: $("#newCatView"),
  newCatTitle: $("#newCatTitle"),
  emojiGrid: $("#emojiGrid"),
  namePreview: $("#namePreview"),
  letterPad: $("#letterPad"),
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  } catch {
    transactions = [];
  }
  loadCategories();
}

function loadCategories() {
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      expenseCategories = data.expense?.length ? data.expense : [...DEFAULT_EXPENSE_CATEGORIES];
      incomeCategories = data.income?.length ? data.income : [...DEFAULT_INCOME_CATEGORIES];
    } else {
      expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
      incomeCategories = [...DEFAULT_INCOME_CATEGORIES];
      saveCategories();
    }
  } catch {
    expenseCategories = [...DEFAULT_EXPENSE_CATEGORIES];
    incomeCategories = [...DEFAULT_INCOME_CATEGORIES];
  }
}

function saveCategories() {
  localStorage.setItem(
    CATEGORIES_KEY,
    JSON.stringify({ expense: expenseCategories, income: incomeCategories })
  );
}

function getCategoryList(type) {
  return type === "income" ? incomeCategories : expenseCategories;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatMoney(amount) {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString("ru-RU", {
    minimumFractionDigits: abs % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  if (amount > 0) return `+${formatted} ₴`;
  if (amount < 0) return `−${formatted} ₴`;
  return `${formatted} ₴`;
}

function getCategory(type, id, tx) {
  if (tx?.categoryLabel) {
    return { label: tx.categoryLabel, icon: tx.categoryIcon || "📦" };
  }
  const list = getCategoryList(type);
  return list.find((c) => c.id === id) || { label: "Прочее", icon: "📦" };
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthTransactions() {
  const key = monthKey(viewDate);
  return transactions
    .filter((t) => t.date.startsWith(key))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function formatTxDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Сегодня · ${time}`;
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()].slice(0, 3).toLowerCase()} · ${time}`;
}

function render() {
  const monthTx = getMonthTransactions();

  els.monthLabel.textContent = `${MONTHS_RU[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

  let income = 0;
  let expense = 0;
  const expenseByCat = {};

  for (const tx of monthTx) {
    if (tx.type === "income") income += tx.amount;
    else {
      expense += tx.amount;
      expenseByCat[tx.category] = (expenseByCat[tx.category] || 0) + tx.amount;
    }
  }

  const balance = income - expense;
  els.totalIncome.textContent = formatMoney(income);
  els.totalExpense.textContent = formatMoney(-expense);
  els.totalBalance.textContent = formatMoney(balance);
  els.totalBalance.style.color =
    balance > 0 ? "var(--green)" : balance < 0 ? "var(--red)" : "var(--cyan)";

  renderCategories(expenseByCat, expense);
  renderTransactions(monthTx);
}

function renderCategories(expenseByCat, totalExpense) {
  const entries = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    els.categoriesChart.innerHTML = '<p class="empty-state">Пока нет расходов за этот месяц</p>';
    return;
  }

  els.categoriesChart.innerHTML = entries
    .map(([catId, amount]) => {
      const cat = getCategory("expense", catId);
      const pct = totalExpense ? (amount / totalExpense) * 100 : 0;
      return `
        <div class="cat-row">
          <span class="cat-icon">${cat.icon}</span>
          <div class="cat-info">
            <div class="cat-name">
              <span>${cat.label}</span>
              <span class="cat-amount">${formatMoney(-amount)} · ${Math.round(pct)}%</span>
            </div>
            <div class="cat-bar-track">
              <div class="cat-bar-fill" style="width:${pct}%"></div>
            </div>
          </div>
        </div>`;
    })
    .join("");
}

function renderTransactions(monthTx) {
  if (!monthTx.length) {
    els.transactionsList.innerHTML = '<li class="empty-state">Добавь первую операцию</li>';
    return;
  }

  els.transactionsList.innerHTML = monthTx
    .map((tx) => {
      const cat = getCategory(tx.type, tx.category, tx);
      const isExpense = tx.type === "expense";
      const title = tx.note || cat.label;
      return `
        <li class="tx-item tx-item--${tx.type}">
          <span class="tx-icon">${cat.icon}</span>
          <div class="tx-body">
            <div class="tx-title">${escapeHtml(title)}</div>
            <div class="tx-meta">${cat.label} · ${formatTxDate(tx.date)}</div>
          </div>
          <span class="tx-amount tx-amount--${tx.type}">
            ${isExpense ? "−" : "+"}${tx.amount.toLocaleString("ru-RU")} ₴
          </span>
          <button class="tx-delete" data-id="${tx.id}" type="button" aria-label="Удалить">×</button>
        </li>`;
    })
    .join("");

  els.transactionsList.querySelectorAll(".tx-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      transactions = transactions.filter((t) => t.id !== btn.dataset.id);
      save();
      render();
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function parseAmount(raw) {
  const cleaned = String(raw).replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned);
}

function resetAmount() {
  amountStr = "";
  updateAmountDisplay();
  els.amountInput.setAttribute("readonly", "readonly");
  els.amountField.classList.remove("focused");
}

function updateAmountDisplay() {
  els.amountInput.value = amountStr;
}

function sanitizeAmount(raw) {
  let val = String(raw).replace(",", ".").replace(/[^\d.]/g, "");
  const dot = val.indexOf(".");
  if (dot !== -1) {
    val = val.slice(0, dot + 1) + val.slice(dot + 1).replace(/\./g, "");
  }
  if (val.length > 12) val = val.slice(0, 12);
  return val;
}

function syncFromInput() {
  amountStr = sanitizeAmount(els.amountInput.value);
  els.amountInput.value = amountStr;
}

function focusAmountInput() {
  els.amountInput.removeAttribute("readonly");
  els.amountField.classList.add("focused");

  if (!amountStr || amountStr === "0") {
    amountStr = "";
    els.amountInput.value = "";
  }

  els.amountInput.focus();

  requestAnimationFrame(() => {
    if (amountStr) els.amountInput.select();
  });
}

function blurAmountInput() {
  els.amountInput.setAttribute("readonly", "readonly");
  els.amountField.classList.remove("focused");
  if (!amountStr) els.amountInput.value = "";
}

function pressNumpadKey(key) {
  els.amountInput.blur();
  blurAmountInput();

  if (key === "back") {
    amountStr = amountStr.slice(0, -1);
  } else if (key === ".") {
    if (amountStr.includes(".")) return;
    amountStr = amountStr ? `${amountStr}.` : "0.";
  } else if (key >= "0" && key <= "9") {
    if (!amountStr || amountStr === "0") amountStr = key;
    else amountStr += key;
  }
  if (amountStr.length > 12) amountStr = amountStr.slice(0, 12);
  updateAmountDisplay();
}

function addQuickAmount(value) {
  const current = parseAmount(amountStr || "0") || 0;
  const next = current + value;
  amountStr = Number.isInteger(next) ? String(next) : next.toFixed(2).replace(/\.?0+$/, "");
  updateAmountDisplay();
}

function renderCommentChips(type) {
  const comments = type === "expense" ? EXPENSE_COMMENTS : INCOME_COMMENTS;
  els.commentGrid.innerHTML = comments
    .map(
      (label) =>
        `<button class="comment-chip" type="button" data-comment="${label}">${label}</button>`
    )
    .join("");

  els.commentGrid.querySelectorAll(".comment-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const isSelected = btn.classList.contains("selected");
      els.commentGrid.querySelectorAll(".comment-chip").forEach((b) => b.classList.remove("selected"));
      if (isSelected) {
        selectedComment = "";
      } else {
        btn.classList.add("selected");
        selectedComment = btn.dataset.comment;
      }
    });
  });
}

function openAddForm(type) {
  modalType = type;
  selectedCategory = null;
  selectedComment = "";
  els.addTitle.textContent = type === "expense" ? "Новый расход" : "Новый доход";
  resetAmount();

  const cats = getCategoryList(type);
  els.categoryGrid.innerHTML = cats
    .map(
      (c) =>
        `<button class="cat-btn" type="button" data-id="${c.id}">
          <span>${c.icon}</span>
          <span>${c.label}</span>
        </button>`
    )
    .join("");

  els.categoryGrid.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.categoryGrid.querySelectorAll(".cat-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedCategory = btn.dataset.id;
    });
  });

  renderCommentChips(type);

  document.body.classList.add("add-mode");
  els.addView.hidden = false;
  window.scrollTo(0, 0);
}

function closeAddForm() {
  document.body.classList.remove("add-mode");
  els.addView.hidden = true;
  blurAmountInput();
}

function submitTransaction() {
  syncFromInput();
  const amount = parseAmount(amountStr);
  if (!amount || amount <= 0) {
    els.amountInput.style.borderColor = "var(--red)";
    setTimeout(() => { els.amountInput.style.borderColor = ""; }, 600);
    return;
  }
  if (!selectedCategory) {
    return;
  }

  const cat = getCategory(modalType, selectedCategory);

  transactions.push({
    id: crypto.randomUUID(),
    type: modalType,
    amount,
    category: selectedCategory,
    categoryLabel: cat.label,
    categoryIcon: cat.icon,
    note: selectedComment,
    date: new Date().toISOString(),
  });

  save();
  closeAddForm();
  render();
}

function exportData() {
  const payload = {
    transactions,
    categories: { expense: expenseCategories, income: incomeCategories },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dengi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function openSettings() {
  settingsTab = "expense";
  updateSettingsTabs();
  renderSettingsList();
  document.body.classList.add("settings-mode");
  els.settingsView.hidden = false;
  window.scrollTo(0, 0);
}

function closeSettings() {
  document.body.classList.remove("settings-mode");
  els.settingsView.hidden = true;
}

function updateSettingsTabs() {
  document.querySelectorAll(".settings-tab").forEach((tab) => {
    tab.classList.toggle("settings-tab--active", tab.dataset.tab === settingsTab);
  });
}

function renderSettingsList() {
  const list = getCategoryList(settingsTab);
  els.settingsCatList.innerHTML = list
    .map(
      (cat) => `
        <li class="settings-cat">
          <span class="settings-cat-icon">${cat.icon}</span>
          <span class="settings-cat-label">${escapeHtml(cat.label)}</span>
          <button class="settings-cat-delete" type="button" data-id="${cat.id}" aria-label="Удалить">×</button>
        </li>`
    )
    .join("");

  els.settingsCatList.querySelectorAll(".settings-cat-delete").forEach((btn) => {
    btn.addEventListener("click", () => deleteCategory(btn.dataset.id));
  });
}

function deleteCategory(id) {
  const list = getCategoryList(settingsTab);
  if (list.length <= 1) {
    alert("Нужна хотя бы одна категория");
    return;
  }
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list.splice(idx, 1);
  saveCategories();
  renderSettingsList();
}

function openNewCategory() {
  newCatType = settingsTab;
  newCatEmoji = "📦";
  newCatName = "";
  letterCase = "upper";
  updateCaseToggle();
  els.newCatTitle.textContent =
    settingsTab === "expense" ? "Новая категория расходов" : "Новая категория доходов";
  renderEmojiGrid();
  renderLetterPad();
  updateNamePreview();
  document.body.classList.add("new-cat-mode");
  els.newCatView.hidden = false;
  window.scrollTo(0, 0);
}

function closeNewCategory() {
  document.body.classList.remove("new-cat-mode");
  els.newCatView.hidden = true;
}

function renderEmojiGrid() {
  els.emojiGrid.innerHTML = EMOJI_PICKER.map(
    (emoji) =>
      `<button type="button" class="emoji-btn${emoji === newCatEmoji ? " selected" : ""}" data-emoji="${emoji}">${emoji}</button>`
  ).join("");

  els.emojiGrid.querySelectorAll(".emoji-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      newCatEmoji = btn.dataset.emoji;
      renderEmojiGrid();
    });
  });
}

function renderLetterPad() {
  const letters =
    letterCase === "upper" ? RU_LETTERS : RU_LETTERS.map((l) => l.toLowerCase());

  const keys = [
    ...letters.map((l) => ({ key: l, label: l })),
    { key: "space", label: "пробел", wide: true },
    { key: "back", label: "⌫", back: true },
  ];

  els.letterPad.innerHTML = keys
    .map(({ key, label, wide, back }) => {
      const cls = ["letter-key", wide && "letter-key--wide", back && "letter-key--back"]
        .filter(Boolean)
        .join(" ");
      return `<button type="button" class="${cls}" data-key="${key}">${label}</button>`;
    })
    .join("");

  els.letterPad.querySelectorAll(".letter-key").forEach((btn) => {
    btn.addEventListener("click", () => pressLetterKey(btn.dataset.key));
  });
}

function updateCaseToggle() {
  document.querySelectorAll(".case-btn").forEach((btn) => {
    btn.classList.toggle("case-btn--active", btn.dataset.case === letterCase);
  });
}

function setLetterCase(mode) {
  letterCase = mode;
  updateCaseToggle();
  renderLetterPad();
}

function pressLetterKey(key) {
  if (key === "back") {
    newCatName = newCatName.slice(0, -1);
  } else if (key === "space") {
    if (newCatName && !newCatName.endsWith(" ")) newCatName += " ";
  } else {
    if (newCatName.length < 24) newCatName += key;
  }
  updateNamePreview();
}

function updateNamePreview() {
  const trimmed = newCatName.trim();
  els.namePreview.textContent = trimmed || "Название";
  els.namePreview.classList.toggle("is-empty", !trimmed);
}

function saveNewCategory() {
  const label = newCatName.trim();
  if (!label) {
    els.namePreview.style.borderColor = "var(--red)";
    setTimeout(() => { els.namePreview.style.borderColor = ""; }, 600);
    return;
  }

  const list = getCategoryList(newCatType);
  const duplicate = list.some((c) => c.label.toLowerCase() === label.toLowerCase());
  if (duplicate) {
    alert("Такая категория уже есть");
    return;
  }

  list.push({
    id: `cat_${Date.now().toString(36)}`,
    label,
    icon: newCatEmoji,
  });

  saveCategories();
  closeNewCategory();
  renderSettingsList();
}

$("#btnPrevMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
  render();
});

$("#btnNextMonth").addEventListener("click", () => {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
  render();
});

$("#btnAddExpense").addEventListener("click", () => openAddForm("expense"));
$("#btnAddIncome").addEventListener("click", () => openAddForm("income"));
$("#btnCloseAdd").addEventListener("click", closeAddForm);
$("#btnSubmit").addEventListener("click", submitTransaction);
$("#btnExport").addEventListener("click", exportData);
$("#btnSettings").addEventListener("click", openSettings);
$("#btnCloseSettings").addEventListener("click", closeSettings);
$("#btnAddCategory").addEventListener("click", openNewCategory);
$("#btnCloseNewCat").addEventListener("click", closeNewCategory);
$("#btnSaveCategory").addEventListener("click", saveNewCategory);

document.getElementById("caseToggle").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-case]");
  if (btn) setLetterCase(btn.dataset.case);
});

$("#tabExpense").addEventListener("click", () => {
  settingsTab = "expense";
  updateSettingsTabs();
  renderSettingsList();
});

$("#tabIncome").addEventListener("click", () => {
  settingsTab = "income";
  updateSettingsTabs();
  renderSettingsList();
});

els.numpad.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-key]");
  if (btn) pressNumpadKey(btn.dataset.key);
});

els.amountInput.addEventListener("touchend", (e) => {
  e.preventDefault();
  focusAmountInput();
});

els.amountInput.addEventListener("focus", () => {
  els.amountField.classList.add("focused");
  if (els.amountInput.value === "0") {
    amountStr = "";
    els.amountInput.value = "";
  }
});

els.amountInput.addEventListener("blur", blurAmountInput);

els.amountInput.addEventListener("input", syncFromInput);

document.querySelectorAll(".quick-btn").forEach((btn) => {
  btn.addEventListener("click", () => addQuickAmount(Number(btn.dataset.add)));
});

load();
render();
registerServiceWorker();
