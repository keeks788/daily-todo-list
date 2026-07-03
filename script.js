import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const addButton = document.querySelector("#add-todo-button");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const selectedDateInput = document.querySelector("#selected-date-input");
const authStatus = document.querySelector("#auth-status");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const profilePanel = document.querySelector("#profile-panel");
const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const setupNotice = document.querySelector("#setup-notice");
const accountMenu = document.querySelector("#account-menu");
const accountMenuButton = document.querySelector("#account-menu-button");
const accountMenuLabel = document.querySelector("#account-menu-label");
const accountMenuPanel = document.querySelector("#account-menu-panel");
const progressText = document.querySelector("#progress-text");
const progressTrack = document.querySelector("#progress-track");
const progressBar = document.querySelector("#progress-bar");
const finishDayButton = document.querySelector("#finish-day-button");
const themeToggleButton = document.querySelector("#theme-toggle-button");
const languageToggleButton = document.querySelector("#language-toggle-button");

const AUTO_FINISH_CHECK_INTERVAL_MS = 60_000;
const THEME_STORAGE_KEY = "dailyTodoTheme";
const LANGUAGE_STORAGE_KEY = "dailyTodoLanguage";
const THEMES = new Set(["light", "dark"]);
const LANGUAGES = new Set(["ru", "en"]);

const TRANSLATIONS = {
  ru: {
    appTitle: "Список дел на сегодня",
    profile: "Профиль",
    signInLabel: "Войти",
    localModeLabel: "Локально",
    userFallback: "Пользователь",
    chooseDay: "Выбрать день",
    historyFor: "История за {date}",
    plannedFor: "План на {date}",
    progress: "Прогресс",
    progressAria: "Прогресс выполнения дел",
    completed: "Выполнено: {percent}%",
    dayCompleted: "День завершён: выполнено {percent}%",
    finishDay: "Завершить день",
    finishedDay: "День завершён",
    newTodo: "Новое дело",
    todoPlaceholder: "Например: разобрать почту",
    add: "Добавить",
    loginWithGoogle: "Войти через Google",
    signOut: "Выйти",
    todayTodos: "Дела на сегодня",
    noTodosForDay: "За выбранный день нет дел.",
    emptyToday: "Пока нет дел. Добавьте первое дело на сегодня.",
    emptySelectedDay: "Пока нет дел. Добавьте первое дело на выбранный день.",
    setupNotice:
      "Облачная синхронизация пока не настроена. Дела временно сохраняются только в этом браузере.",
    checkingConnection: "Проверяем подключение...",
    localModeMessage: "Локальный режим: данные сохраняются только в этом браузере.",
    signInOrLocalMessage: "Войдите через Google или работайте локально в этом браузере.",
    missingFirebaseConfig: "Сначала вставьте Firebase config в firebase-config.js.",
    addTodoFailed: "Не удалось добавить дело. Проверьте подключение и настройки Firebase.",
    updateTodoFailed: "Не удалось обновить дело.",
    deleteTodoFailed: "Не удалось удалить дело.",
    addSubtaskFailed: "Не удалось добавить подзадачу.",
    signInFailed:
      "Не удалось войти через Google. Можно продолжить работу локально в этом браузере.",
    signInPopupFailed:
      "Не удалось открыть окно входа. Можно продолжить работу локально в этом браузере.",
    signOutFailed: "Не удалось выйти из профиля.",
    finishDayFailed: "Не удалось завершить день. Проверьте подключение к базе.",
    firebaseLoadFailed: "Firebase SDK не загрузился. Временно используем локальное сохранение.",
    loadingCloudTodos: "Загружаем дела из облака...",
    loadingSelectedDay: "Загружаем выбранный день из облака...",
    dayResultLoadFailed: "Не удалось загрузить итог дня. Проверьте Firestore rules.",
    synced: "Синхронизировано с облаком.",
    databaseAccessFailed: "Нет доступа к базе. Проверьте Firestore и security rules.",
    autoFinished: "Итог дня подведён автоматически после 00:00.",
    autoFinishFailed: "Не удалось автоматически подвести итог дня.",
    enableDarkTheme: "Включить тёмную тему",
    enableLightTheme: "Включить светлую тему",
    switchToEnglish: "Switch to English",
    switchToRussian: "Переключить на русский",
    markTodo: "Отметить дело: {text}",
    deleteTodo: "Удалить дело: {text}",
    markSubtask: "Отметить подзадачу: {text}",
    deleteSubtask: "Удалить подзадачу: {text}",
    newSubtaskFor: "Новая подзадача для: {text}",
    addSubtask: "Добавить подзадачу",
    delete: "Удалить",
  },
  en: {
    appTitle: "Today’s todo list",
    profile: "Profile",
    signInLabel: "Sign in",
    localModeLabel: "Local",
    userFallback: "User",
    chooseDay: "Choose day",
    historyFor: "History for {date}",
    plannedFor: "Plan for {date}",
    progress: "Progress",
    progressAria: "Todo progress",
    completed: "Completed: {percent}%",
    dayCompleted: "Day finished: {percent}% complete",
    finishDay: "Finish day",
    finishedDay: "Day finished",
    newTodo: "New todo",
    todoPlaceholder: "For example: review email",
    add: "Add",
    loginWithGoogle: "Sign in with Google",
    signOut: "Sign out",
    todayTodos: "Today’s todos",
    noTodosForDay: "There are no todos for the selected day.",
    emptyToday: "No todos yet. Add your first todo for today.",
    emptySelectedDay: "No todos yet. Add your first todo for the selected day.",
    setupNotice: "Cloud sync is not configured yet. Todos are saved only in this browser.",
    checkingConnection: "Checking connection...",
    localModeMessage: "Local mode: data is saved only in this browser.",
    signInOrLocalMessage: "Sign in with Google or keep working locally in this browser.",
    missingFirebaseConfig: "Add Firebase config to firebase-config.js first.",
    addTodoFailed: "Could not add todo. Check your connection and Firebase settings.",
    updateTodoFailed: "Could not update todo.",
    deleteTodoFailed: "Could not delete todo.",
    addSubtaskFailed: "Could not add subtask.",
    signInFailed: "Could not sign in with Google. You can keep working locally in this browser.",
    signInPopupFailed:
      "Could not open the sign-in window. You can keep working locally in this browser.",
    signOutFailed: "Could not sign out.",
    finishDayFailed: "Could not finish the day. Check the database connection.",
    firebaseLoadFailed: "Firebase SDK did not load. Falling back to local storage.",
    loadingCloudTodos: "Loading cloud todos...",
    loadingSelectedDay: "Loading selected day from the cloud...",
    dayResultLoadFailed: "Could not load the day result. Check Firestore rules.",
    synced: "Synced with cloud.",
    databaseAccessFailed: "No database access. Check Firestore and security rules.",
    autoFinished: "The day was finished automatically after 00:00.",
    autoFinishFailed: "Could not automatically finish the day.",
    enableDarkTheme: "Enable dark theme",
    enableLightTheme: "Enable light theme",
    switchToEnglish: "Switch to English",
    switchToRussian: "Переключить на русский",
    markTodo: "Mark todo: {text}",
    deleteTodo: "Delete todo: {text}",
    markSubtask: "Mark subtask: {text}",
    deleteSubtask: "Delete subtask: {text}",
    newSubtaskFor: "New subtask for: {text}",
    addSubtask: "Add subtask",
    delete: "Delete",
  },
};

let currentLanguage = getInitialLanguage();
let selectedDateKey = getTodayKey();
let autoFinishDateKey = selectedDateKey;

let todos = [];
let dayResult = null;
let appMode = "local";
let currentUser = null;
let firebaseServices = null;
let unsubscribeTodos = null;
let unsubscribeDay = null;
let autoFinishTimer = null;
let autoFinishCheckQueued = false;
let isAutoFinishing = false;
let currentAuthMessageKey = "checkingConnection";
let currentAuthMessageParams = {};

initializeLanguage();
initializeTheme();
initializeDateControls();
startAutoFinishTimer();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();

  if (!canEditTodos()) {
    return;
  }

  if (!text) {
    input.focus();
    return;
  }

  setFormBusy(true);

  try {
    await addTodo(text);
    input.value = "";
    resizeTodoInput();
  } catch (error) {
    showError(t("addTodoFailed"), error);
  } finally {
    setFormBusy(false);
  }
});

list.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-action='toggle'], [data-action='toggle-subtask']");

  if (!checkbox) {
    return;
  }

  try {
    if (checkbox.dataset.action === "toggle-subtask") {
      await toggleSubtask(checkbox.dataset.parentId, checkbox.dataset.id, checkbox.checked);
      return;
    }

    await toggleTodo(checkbox.dataset.id, checkbox.checked);
  } catch (error) {
    showError(t("updateTodoFailed"), error);
    checkbox.checked = !checkbox.checked;
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='delete'], [data-action='delete-subtask']");

  if (!button) {
    return;
  }

  try {
    if (button.dataset.action === "delete-subtask") {
      await deleteSubtask(button.dataset.parentId, button.dataset.id);
      return;
    }

    await deleteTodo(button.dataset.id);
  } catch (error) {
    showError(t("deleteTodoFailed"), error);
  }
});

list.addEventListener("submit", async (event) => {
  const subtaskForm = event.target.closest("[data-action='add-subtask']");

  if (!subtaskForm) {
    return;
  }

  event.preventDefault();

  const subtaskInput = subtaskForm.querySelector("[data-role='subtask-input']");
  const text = subtaskInput.value.trim();

  if (!text) {
    subtaskInput.focus();
    return;
  }

  setSubtaskFormBusy(subtaskForm, true);

  try {
    await addSubtask(subtaskForm.dataset.parentId, text);
    subtaskInput.value = "";
  } catch (error) {
    showError(t("addSubtaskFailed"), error);
  } finally {
    setSubtaskFormBusy(subtaskForm, false);
  }
});

loginButton.addEventListener("click", async () => {
  if (!firebaseServices) {
    showAuthMessage("missingFirebaseConfig");
    return;
  }

  loginButton.disabled = true;

  try {
    await firebaseServices.signInWithPopup(firebaseServices.auth, firebaseServices.provider);
  } catch (error) {
    showError(getSignInErrorMessage(error), error);
  } finally {
    loginButton.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  if (!firebaseServices) {
    return;
  }

  logoutButton.disabled = true;

  try {
    await firebaseServices.signOut(firebaseServices.auth);
  } catch (error) {
    showError(t("signOutFailed"), error);
  } finally {
    logoutButton.disabled = false;
  }
});

themeToggleButton.addEventListener("click", () => {
  applyTheme(themeToggleButton.dataset.nextTheme);
});

languageToggleButton.addEventListener("click", () => {
  applyLanguage(languageToggleButton.dataset.nextLanguage);
});

finishDayButton.addEventListener("click", async () => {
  if (!canFinishDay()) {
    return;
  }

  finishDayButton.disabled = true;

  try {
    await finishDay();
  } catch (error) {
    showError(t("finishDayFailed"), error);
    render();
  }
});

input.addEventListener("input", resizeTodoInput);

selectedDateInput.addEventListener("pointerdown", () => {
  setAccountMenuOpen(false);
});

selectedDateInput.addEventListener("focus", () => {
  setAccountMenuOpen(false);
});

selectedDateInput.addEventListener("change", () => {
  void changeSelectedDate(selectedDateInput.value);
});

accountMenuButton.addEventListener("click", () => {
  setAccountMenuOpen(accountMenuPanel.classList.contains("is-hidden"));
});

document.addEventListener("click", (event) => {
  if (!accountMenu.contains(event.target)) {
    setAccountMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setAccountMenuOpen(false);
  }
});

initializeAppMode();

async function initializeAppMode() {
  if (!isFirebaseConfigured()) {
    enableLocalMode();
    return;
  }

  try {
    firebaseServices = await loadFirebaseServices();
    setupCloudMode();
  } catch (error) {
    showError(t("firebaseLoadFailed"), error);
    enableLocalMode();
  }
}

function enableLocalMode() {
  appMode = "local";
  currentUser = null;
  todos = loadLocalTodos();
  dayResult = loadLocalDayResult();
  setupNotice.classList.remove("is-hidden");
  loginButton.disabled = true;
  logoutButton.disabled = true;
  profilePanel.classList.add("is-hidden");
  loginButton.classList.remove("is-hidden");
  updateAccountMenuLabel(t("localModeLabel"));
  showAuthMessage("localModeMessage");
  setTodoEditingEnabled(true);
  render();
  resizeTodoInput();
}

function setupCloudMode() {
  appMode = "cloud";
  setupNotice.classList.add("is-hidden");
  loginButton.disabled = false;
  updateAccountMenuLabel(t("signInLabel"));
  showAuthMessage("signInOrLocalMessage");
  setTodoEditingEnabled(true);

  firebaseServices.onAuthStateChanged(firebaseServices.auth, (user) => {
    currentUser = user;
    void handleAuthStateChange(user);
  });
}

function getSignInErrorMessage(error) {
  if (error?.code === "auth/popup-blocked" || error?.code === "auth/popup-closed-by-user") {
    return t("signInPopupFailed");
  }

  return t("signInFailed");
}

async function handleAuthStateChange(user) {
  unsubscribeFromCloudData();

  if (!user) {
    todos = loadLocalTodos();
    dayResult = loadLocalDayResult();
    loginButton.classList.remove("is-hidden");
    profilePanel.classList.add("is-hidden");
    updateAccountMenuLabel(t("signInLabel"));
    showAuthMessage("signInOrLocalMessage");
    setTodoEditingEnabled(true);
    render();
    resizeTodoInput();
    return;
  }

  loginButton.classList.add("is-hidden");
  profilePanel.classList.remove("is-hidden");
  profileName.textContent = user.displayName || t("userFallback");
  profileEmail.textContent = user.email || "";
  updateAccountMenuLabel(user.displayName || t("profile"));
  showAuthMessage("loadingCloudTodos");
  setTodoEditingEnabled(false);
  render();

  try {
    await ensureFirestoreServices();
    setTodoEditingEnabled(true);
    subscribeToDay(user.uid);
    subscribeToTodos(user.uid);
  } catch (error) {
    showError(t("firebaseLoadFailed"), error);
    todos = [];
    dayResult = null;
    render();
  }
}

async function changeSelectedDate(dateKey) {
  selectedDateKey = normalizeSelectedDateKey(dateKey);
  updateDateControls();
  unsubscribeFromCloudData();

  if (usesLocalStorage()) {
    todos = loadLocalTodos();
    dayResult = loadLocalDayResult();
    render();
    resizeTodoInput();
    return;
  }

  showAuthMessage("loadingSelectedDay");
  setTodoEditingEnabled(false);
  render();

  try {
    await ensureFirestoreServices();
    setTodoEditingEnabled(true);
    subscribeToDay(currentUser.uid);
    subscribeToTodos(currentUser.uid);
  } catch (error) {
    showError(t("firebaseLoadFailed"), error);
    todos = [];
    dayResult = null;
    render();
  }
}

function subscribeToDay(userId) {
  unsubscribeDay = firebaseServices.onSnapshot(
    dayDocument(userId),
    (snapshot) => {
      dayResult = snapshot.exists() ? normalizeDayResult(snapshot.data()) : null;
      render();
    },
    (error) => {
      showError(t("dayResultLoadFailed"), error);
      dayResult = null;
      render();
    },
  );
}

function subscribeToTodos(userId) {
  const todosQuery = firebaseServices.query(
    todosCollection(userId),
    firebaseServices.orderBy("createdAt", "asc"),
  );

  unsubscribeTodos = firebaseServices.onSnapshot(
    todosQuery,
    (snapshot) => {
      todos = snapshot.docs.map((document) => normalizeTodo(document.id, document.data()));
      showAuthMessage("synced");
      render();
    },
    (error) => {
      showError(t("databaseAccessFailed"), error);
      todos = [];
      render();
    },
  );
}

async function addTodo(text) {
  requireEditableDay();

  const todo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
    subtasks: [],
  };

  if (usesLocalStorage()) {
    todos = [...todos, todo];
    clearLocalDayResultIfClosed();
    saveLocalTodos();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.setDoc(todoDocument(currentUser.uid, todo.id), {
    text: todo.text,
    completed: todo.completed,
    subtasks: todo.subtasks,
    createdAt: firebaseServices.serverTimestamp(),
    updatedAt: firebaseServices.serverTimestamp(),
  });

  await clearCloudDayResultIfClosed();
}

async function toggleTodo(id, completed) {
  requireEditableDay();

  const todoToUpdate = findTodo(id);

  if (!todoToUpdate) {
    throw new Error("Todo was not found.");
  }

  const subtasks = todoToUpdate.subtasks.map((subtask) => ({ ...subtask, completed }));
  const updates = { completed, subtasks };

  if (usesLocalStorage()) {
    todos = todos.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo));
    clearLocalDayResultIfClosed();
    saveLocalTodos();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.setDoc(
    todoDocument(currentUser.uid, id),
    {
      ...updates,
      updatedAt: firebaseServices.serverTimestamp(),
    },
    { merge: true },
  );

  await clearCloudDayResultIfClosed();
}

async function deleteTodo(id) {
  requireEditableDay();

  if (usesLocalStorage()) {
    todos = todos.filter((todo) => todo.id !== id);
    clearLocalDayResultIfClosed();
    saveLocalTodos();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.deleteDoc(todoDocument(currentUser.uid, id));
  await clearCloudDayResultIfClosed();
}

async function addSubtask(parentId, text) {
  requireEditableDay();

  const parentTodo = findTodo(parentId);

  if (!parentTodo) {
    throw new Error("Parent todo was not found.");
  }

  const subtasks = [
    ...parentTodo.subtasks,
    {
      id: crypto.randomUUID(),
      text,
      completed: false,
    },
  ];

  await updateTodoSubtasks(parentId, subtasks, false);
}

async function toggleSubtask(parentId, subtaskId, completed) {
  requireEditableDay();

  const parentTodo = findTodo(parentId);

  if (!parentTodo) {
    throw new Error("Parent todo was not found.");
  }

  const subtasks = parentTodo.subtasks.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, completed } : subtask,
  );
  const todoCompleted = getSubtaskDrivenCompletion(subtasks, parentTodo.completed);

  await updateTodoSubtasks(parentId, subtasks, todoCompleted);
}

async function deleteSubtask(parentId, subtaskId) {
  requireEditableDay();

  const parentTodo = findTodo(parentId);

  if (!parentTodo) {
    throw new Error("Parent todo was not found.");
  }

  const subtasks = parentTodo.subtasks.filter((subtask) => subtask.id !== subtaskId);
  const todoCompleted = getSubtaskDrivenCompletion(subtasks, parentTodo.completed);

  await updateTodoSubtasks(parentId, subtasks, todoCompleted);
}

async function updateTodoSubtasks(parentId, subtasks, completed) {
  if (usesLocalStorage()) {
    todos = todos.map((todo) => (todo.id === parentId ? { ...todo, completed, subtasks } : todo));
    clearLocalDayResultIfClosed();
    saveLocalTodos();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.setDoc(
    todoDocument(currentUser.uid, parentId),
    {
      completed,
      subtasks,
      updatedAt: firebaseServices.serverTimestamp(),
    },
    { merge: true },
  );

  await clearCloudDayResultIfClosed();
}

async function finishDay(options = {}) {
  if (options.requireEditable !== false) {
    requireEditableDay();
  }

  const result = createDayResult();

  if (usesLocalStorage()) {
    dayResult = result;
    saveLocalDayResult();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.setDoc(
    dayDocument(currentUser.uid),
    {
      ...result,
      closedAt: firebaseServices.serverTimestamp(),
      updatedAt: firebaseServices.serverTimestamp(),
    },
    { merge: true },
  );
}

async function clearCloudDayResultIfClosed() {
  if (!dayResult?.closed || appMode !== "cloud") {
    return;
  }

  requireSignedInUser();
  dayResult = null;

  await firebaseServices.setDoc(
    dayDocument(currentUser.uid),
    {
      closed: false,
      updatedAt: firebaseServices.serverTimestamp(),
    },
    { merge: true },
  );
}

function clearLocalDayResultIfClosed() {
  if (!dayResult?.closed) {
    return;
  }

  dayResult = null;
  localStorage.removeItem(getLocalDayResultKey());
}

function requireEditableDay() {
  if (!canEditTodos()) {
    throw new Error("Selected day is read-only.");
  }
}

function requireSignedInUser() {
  if (!currentUser) {
    throw new Error("User is not signed in.");
  }
}

function todosCollection(userId) {
  return firebaseServices.collection(
    firebaseServices.db,
    "users",
    userId,
    "days",
    selectedDateKey,
    "todos",
  );
}

function dayDocument(userId) {
  return firebaseServices.doc(firebaseServices.db, "users", userId, "days", selectedDateKey);
}

function todoDocument(userId, todoId) {
  return firebaseServices.doc(
    firebaseServices.db,
    "users",
    userId,
    "days",
    selectedDateKey,
    "todos",
    todoId,
  );
}

function normalizeTodo(id, data) {
  const subtasks = normalizeSubtasks(data.subtasks);

  return {
    id,
    text: typeof data.text === "string" ? data.text : "",
    completed: getSubtaskDrivenCompletion(subtasks, Boolean(data.completed)),
    subtasks,
  };
}

function normalizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) {
    return [];
  }

  return subtasks
    .filter((subtask) => typeof subtask?.id === "string" && typeof subtask?.text === "string")
    .map((subtask) => ({
      id: subtask.id,
      text: subtask.text,
      completed: Boolean(subtask.completed),
    }));
}

function normalizeDayResult(data) {
  if (!data?.closed) {
    return null;
  }

  const totalTodos = Number(data.totalTodos) || 0;
  const completedTodos = Number(data.completedTodos) || 0;
  const unfinishedTodos = Number(data.unfinishedTodos) || 0;

  return {
    closed: true,
    status: data.status === "completed" ? "completed" : "incomplete",
    totalTodos,
    completedTodos,
    unfinishedTodos,
    closedAt: data.closedAt || null,
  };
}

function loadLocalTodos() {
  const savedTodos = localStorage.getItem(getLocalTodosKey());

  if (!savedTodos) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(savedTodos);

    if (!Array.isArray(parsedTodos)) {
      return [];
    }

    return parsedTodos
      .filter((todo) => typeof todo?.id === "string")
      .map((todo) => normalizeTodo(todo.id, todo));
  } catch {
    return [];
  }
}

function saveLocalTodos() {
  localStorage.setItem(getLocalTodosKey(), JSON.stringify(todos));
}

function loadLocalDayResult() {
  const savedResult = localStorage.getItem(getLocalDayResultKey());

  if (!savedResult) {
    return null;
  }

  try {
    return normalizeDayResult(JSON.parse(savedResult));
  } catch {
    return null;
  }
}

function saveLocalDayResult() {
  localStorage.setItem(getLocalDayResultKey(), JSON.stringify(dayResult));
}

function initializeLanguage() {
  applyLanguage(currentLanguage);
}

function applyLanguage(language) {
  currentLanguage = LANGUAGES.has(language) ? language : getBrowserLanguage();
  document.documentElement.lang = currentLanguage;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  updateLanguageToggle();
  updateStaticText();

  if (list.childElementCount > 0) {
    render();
  }
}

function getInitialLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);

  return LANGUAGES.has(savedLanguage) ? savedLanguage : getBrowserLanguage();
}

function getBrowserLanguage() {
  return navigator.language?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function updateLanguageToggle() {
  const nextLanguage = currentLanguage === "ru" ? "en" : "ru";
  const label = nextLanguage === "ru" ? t("switchToRussian") : t("switchToEnglish");

  languageToggleButton.dataset.nextLanguage = nextLanguage;
  languageToggleButton.textContent = nextLanguage.toUpperCase();
  languageToggleButton.setAttribute("aria-label", label);
  languageToggleButton.title = label;
}

function updateStaticText() {
  document.title = t("appTitle");
  setText("#app-title", t("appTitle"));
  setText(".auth-label", t("profile"));
  setText(".summary-title", t("progress"));
  setText("label[for='todo-input']", t("newTodo"));
  setText("#add-todo-button", t("add"));
  setText("#login-button", t("loginWithGoogle"));
  setText("#logout-button", t("signOut"));
  setText("#setup-notice", t("setupNotice"));

  input.placeholder = t("todoPlaceholder");
  emptyState.textContent = getEmptyStateText();
  selectedDateInput.setAttribute("aria-label", t("chooseDay"));
  list.setAttribute("aria-label", t("todayTodos"));
  progressTrack.setAttribute("aria-label", t("progressAria"));
  accountMenuPanel.setAttribute("aria-label", t("profile"));
  updateThemeToggle(document.documentElement.dataset.theme || "light");
  updateAccountLabelForState();
  updateDateControls();
  updateProgress();
  updateAuthMessageText();
}

function updateAccountLabelForState() {
  if (currentUser) {
    updateAccountMenuLabel(currentUser.displayName || t("profile"));
    return;
  }

  updateAccountMenuLabel(
    appMode === "local" && !firebaseServices ? t("localModeLabel") : t("signInLabel"),
  );
}

function setText(selector, value) {
  const element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function t(key, values = {}) {
  const template = TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function initializeTheme() {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY));
}

function applyTheme(theme) {
  const normalizedTheme = THEMES.has(theme) ? theme : "light";

  document.documentElement.dataset.theme = normalizedTheme;
  localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);

  updateThemeToggle(normalizedTheme);
}

function updateThemeToggle(theme) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  const nextThemeLabel = nextTheme === "dark" ? t("enableDarkTheme") : t("enableLightTheme");

  themeToggleButton.dataset.nextTheme = nextTheme;
  themeToggleButton.setAttribute("aria-label", nextThemeLabel);
  themeToggleButton.title = nextThemeLabel;
}

function render() {
  updateDateControls();
  setTodoEditingEnabled(canEditTodos());
  list.innerHTML = "";

  for (const todo of todos) {
    list.append(createTodoElement(todo));
  }

  emptyState.textContent = getEmptyStateText();
  emptyState.classList.toggle("is-hidden", todos.length > 0);
  updateProgress();
  queueAutoFinishCheck();
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className = `todo-item${todo.completed ? " is-completed" : ""}`;

  const mainRow = document.createElement("div");
  mainRow.className = "todo-main-row";

  const checkboxLabel = document.createElement("label");
  checkboxLabel.className = "todo-checkbox";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.disabled = !canEditTodos();
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = todo.id;
  checkbox.setAttribute("aria-label", t("markTodo", { text: todo.text }));

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.disabled = !canEditTodos();
  deleteButton.textContent = "×";
  deleteButton.dataset.action = "delete";
  deleteButton.dataset.id = todo.id;
  deleteButton.setAttribute("aria-label", t("deleteTodo", { text: todo.text }));
  deleteButton.title = t("delete");

  checkboxLabel.append(checkbox);
  mainRow.append(checkboxLabel, text, deleteButton);
  item.append(mainRow, createSubtaskList(todo), createSubtaskForm(todo));

  return item;
}

function createSubtaskList(todo) {
  const subtaskList = document.createElement("ul");
  subtaskList.className = "subtask-list";

  for (const subtask of todo.subtasks) {
    subtaskList.append(createSubtaskElement(todo, subtask));
  }

  return subtaskList;
}

function createSubtaskElement(todo, subtask) {
  const item = document.createElement("li");
  item.className = `subtask-item${subtask.completed ? " is-completed" : ""}`;

  const checkboxLabel = document.createElement("label");
  checkboxLabel.className = "subtask-checkbox";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = subtask.completed;
  checkbox.disabled = !canEditTodos();
  checkbox.dataset.action = "toggle-subtask";
  checkbox.dataset.parentId = todo.id;
  checkbox.dataset.id = subtask.id;
  checkbox.setAttribute("aria-label", t("markSubtask", { text: subtask.text }));

  const text = document.createElement("span");
  text.className = "subtask-text";
  text.textContent = subtask.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "subtask-delete-button";
  deleteButton.type = "button";
  deleteButton.disabled = !canEditTodos();
  deleteButton.textContent = "×";
  deleteButton.dataset.action = "delete-subtask";
  deleteButton.dataset.parentId = todo.id;
  deleteButton.dataset.id = subtask.id;
  deleteButton.setAttribute("aria-label", t("deleteSubtask", { text: subtask.text }));
  deleteButton.title = t("delete");

  checkboxLabel.append(checkbox);
  item.append(checkboxLabel, text, deleteButton);

  return item;
}

function createSubtaskForm(todo) {
  const form = document.createElement("form");
  form.className = "subtask-form";
  form.dataset.action = "add-subtask";
  form.dataset.parentId = todo.id;

  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.htmlFor = `subtask-input-${todo.id}`;
  label.textContent = t("newSubtaskFor", { text: todo.text });

  const input = document.createElement("input");
  input.className = "subtask-input";
  input.id = `subtask-input-${todo.id}`;
  input.type = "text";
  input.autocomplete = "off";
  input.maxLength = 400;
  input.placeholder = t("addSubtask");
  input.disabled = !canEditTodos();
  input.dataset.role = "subtask-input";

  const button = document.createElement("button");
  button.className = "subtask-add-button";
  button.type = "submit";
  button.disabled = !canEditTodos();
  button.textContent = t("add");

  form.append(label, input, button);

  return form;
}

function updateProgress() {
  const stats = getProgressStats();
  const totalCount = dayResult?.closed ? dayResult.totalTodos : stats.total;
  const completedCount = dayResult?.closed ? dayResult.completedTodos : stats.completed;
  const progressPercent = getProgressPercent(completedCount, totalCount);

  progressTrack.setAttribute("aria-valuenow", String(progressPercent));
  progressBar.style.width = `${progressPercent}%`;

  if (dayResult?.closed) {
    progressText.textContent = t("dayCompleted", { percent: progressPercent });
    finishDayButton.textContent = t("finishedDay");
  } else {
    progressText.textContent = t("completed", { percent: progressPercent });
    finishDayButton.textContent = t("finishDay");
  }

  finishDayButton.disabled = !canFinishDay();
}

function getEmptyStateText() {
  if (!canEditTodos()) {
    return t("noTodosForDay");
  }

  return isSelectedToday() ? t("emptyToday") : t("emptySelectedDay");
}

function getProgressPercent(completedCount, totalCount) {
  return totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
}

function canFinishDay() {
  return isSelectedToday() && canEditTodos() && todos.length > 0 && !dayResult?.closed;
}

function createDayResult() {
  const { total: totalTodos, completed: completedTodos } = getProgressStats();
  const unfinishedTodos = totalTodos - completedTodos;

  return {
    closed: true,
    status: completedTodos >= totalTodos ? "completed" : "incomplete",
    totalTodos,
    completedTodos,
    unfinishedTodos,
    closedAt: new Date().toISOString(),
  };
}

function getProgressStats() {
  if (todos.length === 0) {
    return { total: 0, completed: 0 };
  }

  return {
    total: 100,
    completed: todos.reduce(
      (completedPercent, todo) => completedPercent + getTodoCompletionPercent(todo, todos.length),
      0,
    ),
  };
}

function getTodoCompletionPercent(todo, totalTodos) {
  const todoPercent = 100 / totalTodos;

  if (todo.subtasks.length === 0) {
    return todo.completed ? todoPercent : 0;
  }

  const completedSubtasks = todo.subtasks.filter((subtask) => subtask.completed).length;

  return (completedSubtasks / todo.subtasks.length) * todoPercent;
}

function getSubtaskDrivenCompletion(subtasks, fallbackCompleted) {
  if (subtasks.length === 0) {
    return fallbackCompleted;
  }

  return subtasks.every((subtask) => subtask.completed);
}

function findTodo(id) {
  return todos.find((todo) => todo.id === id);
}

function canEditTodos() {
  return (
    !isSelectedPast() &&
    (usesLocalStorage() || Boolean(currentUser && firebaseServices?.firestoreReady))
  );
}

function usesLocalStorage() {
  return appMode === "local" || !currentUser;
}

function initializeDateControls() {
  selectedDateInput.value = selectedDateKey;
  updateDateControls();
}

function updateDateControls() {
  selectedDateInput.removeAttribute("max");
  selectedDateInput.value = selectedDateKey;

  if (isSelectedToday()) {
    selectedDateInput.title = t("chooseDay");
    return;
  }

  const titleKey = isSelectedPast() ? "historyFor" : "plannedFor";
  selectedDateInput.title = t(titleKey, { date: formatDisplayDate(selectedDateKey) });
}

function normalizeSelectedDateKey(dateKey) {
  if (!isDateKey(dateKey)) {
    return selectedDateKey;
  }

  return dateKey;
}

function isDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

function isSelectedToday() {
  return selectedDateKey === getTodayKey();
}

function isSelectedPast() {
  return selectedDateKey < getTodayKey();
}

function getTodayKey() {
  return new Date().toLocaleDateString("sv-SE");
}

function getLocalTodosKey() {
  return `daily-todos:${selectedDateKey}`;
}

function getLocalDayResultKey() {
  return `daily-day-result:${selectedDateKey}`;
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(currentLanguage === "ru" ? "ru-RU" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function startAutoFinishTimer() {
  stopAutoFinishTimer();
  autoFinishTimer = window.setInterval(autoFinishDayIfNeeded, AUTO_FINISH_CHECK_INTERVAL_MS);
}

function stopAutoFinishTimer() {
  if (autoFinishTimer) {
    window.clearInterval(autoFinishTimer);
  }

  autoFinishTimer = null;
}

function queueAutoFinishCheck() {
  if (autoFinishCheckQueued) {
    return;
  }

  autoFinishCheckQueued = true;

  window.setTimeout(async () => {
    autoFinishCheckQueued = false;
    await autoFinishDayIfNeeded();
  }, 0);
}

async function autoFinishDayIfNeeded() {
  const todayKey = getTodayKey();

  if (todayKey === autoFinishDateKey || isAutoFinishing) {
    return;
  }

  if (!shouldAutoFinishDay(todayKey)) {
    autoFinishDateKey = todayKey;
    return;
  }

  isAutoFinishing = true;

  try {
    await finishDay({ requireEditable: false });
    autoFinishDateKey = todayKey;
    showAuthMessage("autoFinished");
  } catch (error) {
    showError(t("autoFinishFailed"), error);
    render();
  } finally {
    isAutoFinishing = false;
  }
}

function shouldAutoFinishDay(todayKey) {
  return (
    selectedDateKey === autoFinishDateKey &&
    autoFinishDateKey < todayKey &&
    todos.length > 0 &&
    !dayResult?.closed &&
    (usesLocalStorage() || Boolean(currentUser && firebaseServices?.firestoreReady))
  );
}

function setTodoEditingEnabled(isEnabled) {
  input.disabled = !isEnabled;
  addButton.disabled = !isEnabled;
}

function setSubtaskFormBusy(form, isBusy) {
  const subtaskInput = form.querySelector("[data-role='subtask-input']");
  const submitButton = form.querySelector("button[type='submit']");

  subtaskInput.disabled = isBusy || !canEditTodos();
  submitButton.disabled = isBusy || !canEditTodos();
}

function setFormBusy(isBusy) {
  if (!canEditTodos()) {
    setTodoEditingEnabled(false);
    return;
  }

  input.disabled = isBusy;
  addButton.disabled = isBusy;
}

function resizeTodoInput() {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}

function setAccountMenuOpen(isOpen) {
  accountMenuPanel.classList.toggle("is-hidden", !isOpen);
  accountMenuButton.setAttribute("aria-expanded", String(isOpen));
}

function updateAccountMenuLabel(label) {
  accountMenuLabel.textContent = label;
}

function showAuthMessage(messageKey, params = {}) {
  currentAuthMessageKey = messageKey;
  currentAuthMessageParams = params;
  updateAuthMessageText();
}

function updateAuthMessageText() {
  if (currentAuthMessageKey) {
    authStatus.textContent = t(currentAuthMessageKey, currentAuthMessageParams);
  }
}

function showError(message, error) {
  currentAuthMessageKey = null;
  currentAuthMessageParams = {};
  console.error(error);
  authStatus.textContent = message;
}

function unsubscribeFromTodos() {
  if (typeof unsubscribeTodos === "function") {
    unsubscribeTodos();
  }

  unsubscribeTodos = null;
}

function unsubscribeFromDay() {
  if (typeof unsubscribeDay === "function") {
    unsubscribeDay();
  }

  unsubscribeDay = null;
}

function unsubscribeFromCloudData() {
  unsubscribeFromTodos();
  unsubscribeFromDay();
}

function formatUnfinishedCount(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} дел`;
  }

  if (lastDigit === 1) {
    return `${count} дело`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} дела`;
  }

  return `${count} дел`;
}

async function loadFirebaseServices() {
  const [appModule, authModule] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
  ]);

  const app = appModule.initializeApp(firebaseConfig);

  return {
    app,
    auth: authModule.getAuth(app),
    provider: new authModule.GoogleAuthProvider(),
    firestoreReady: false,
    onAuthStateChanged: authModule.onAuthStateChanged,
    signInWithPopup: authModule.signInWithPopup,
    signOut: authModule.signOut,
  };
}

async function ensureFirestoreServices() {
  if (firebaseServices?.firestoreReady) {
    return;
  }

  if (!firebaseServices?.app) {
    throw new Error("Firebase app is not initialized.");
  }

  const firestoreModule = await import("firebase/firestore");

  Object.assign(firebaseServices, {
    db: firestoreModule.getFirestore(firebaseServices.app),
    collection: firestoreModule.collection,
    deleteDoc: firestoreModule.deleteDoc,
    doc: firestoreModule.doc,
    firestoreReady: true,
    onSnapshot: firestoreModule.onSnapshot,
    orderBy: firestoreModule.orderBy,
    query: firestoreModule.query,
    serverTimestamp: firestoreModule.serverTimestamp,
    setDoc: firestoreModule.setDoc,
  });
}
