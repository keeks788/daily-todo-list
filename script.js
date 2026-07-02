import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
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

const AUTO_FINISH_HOUR = 22;
const AUTO_FINISH_CHECK_INTERVAL_MS = 60_000;

let selectedDateKey = getTodayKey();

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
    showError("Не удалось добавить дело. Проверьте подключение и настройки Firebase.", error);
  } finally {
    setFormBusy(false);
  }
});

list.addEventListener("change", async (event) => {
  const checkbox = event.target.closest("[data-action='toggle']");

  if (!checkbox) {
    return;
  }

  try {
    await toggleTodo(checkbox.dataset.id, checkbox.checked);
  } catch (error) {
    showError("Не удалось обновить дело.", error);
    checkbox.checked = !checkbox.checked;
  }
});

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='delete']");

  if (!button) {
    return;
  }

  try {
    await deleteTodo(button.dataset.id);
  } catch (error) {
    showError("Не удалось удалить дело.", error);
  }
});

loginButton.addEventListener("click", async () => {
  if (!firebaseServices) {
    showAuthMessage("Сначала вставьте Firebase config в firebase-config.js.");
    return;
  }

  loginButton.disabled = true;

  try {
    await firebaseServices.signInWithPopup(firebaseServices.auth, firebaseServices.provider);
  } catch (error) {
    showError("Не удалось войти через Google. Проверьте Firebase Authentication.", error);
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
    showError("Не удалось выйти из профиля.", error);
  } finally {
    logoutButton.disabled = false;
  }
});

finishDayButton.addEventListener("click", async () => {
  if (!canFinishDay()) {
    return;
  }

  finishDayButton.disabled = true;

  try {
    await finishDay();
  } catch (error) {
    showError("Не удалось завершить день. Проверьте подключение к базе.", error);
    render();
  }
});

input.addEventListener("input", resizeTodoInput);

selectedDateInput.addEventListener("change", () => {
  changeSelectedDate(selectedDateInput.value);
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
    showError("Firebase SDK не загрузился. Временно используем локальное сохранение.", error);
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
  updateAccountMenuLabel("Локально");
  showAuthMessage("Локальный режим: данные сохраняются только в этом браузере.");
  setTodoEditingEnabled(true);
  render();
  resizeTodoInput();
}

function setupCloudMode() {
  appMode = "cloud";
  setupNotice.classList.add("is-hidden");
  loginButton.disabled = false;
  updateAccountMenuLabel("Войти");
  showAuthMessage("Войдите через Google, чтобы загрузить дела из облака.");
  setTodoEditingEnabled(false);

  firebaseServices.onAuthStateChanged(firebaseServices.auth, (user) => {
    currentUser = user;
    handleAuthStateChange(user);
  });
}

function handleAuthStateChange(user) {
  unsubscribeFromCloudData();

  if (!user) {
    todos = [];
    dayResult = null;
    loginButton.classList.remove("is-hidden");
    profilePanel.classList.add("is-hidden");
    updateAccountMenuLabel("Войти");
    showAuthMessage("Войдите через Google, чтобы работать со своим списком.");
    setTodoEditingEnabled(false);
    render();
    return;
  }

  loginButton.classList.add("is-hidden");
  profilePanel.classList.remove("is-hidden");
  profileName.textContent = user.displayName || "Пользователь";
  profileEmail.textContent = user.email || "";
  updateAccountMenuLabel(user.displayName || "Профиль");
  showAuthMessage("Загружаем дела из облака...");
  setTodoEditingEnabled(true);
  subscribeToDay(user.uid);
  subscribeToTodos(user.uid);
}

function changeSelectedDate(dateKey) {
  selectedDateKey = normalizeSelectedDateKey(dateKey);
  updateDateControls();
  unsubscribeFromCloudData();

  if (appMode === "local") {
    todos = loadLocalTodos();
    dayResult = loadLocalDayResult();
    render();
    resizeTodoInput();
    return;
  }

  if (!currentUser) {
    todos = [];
    dayResult = null;
    render();
    return;
  }

  showAuthMessage("Загружаем выбранный день из облака...");
  subscribeToDay(currentUser.uid);
  subscribeToTodos(currentUser.uid);
}

function subscribeToDay(userId) {
  unsubscribeDay = firebaseServices.onSnapshot(
    dayDocument(userId),
    (snapshot) => {
      dayResult = snapshot.exists() ? normalizeDayResult(snapshot.data()) : null;
      render();
    },
    (error) => {
      showError("Не удалось загрузить итог дня. Проверьте Firestore rules.", error);
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
      showAuthMessage("Синхронизировано с облаком.");
      render();
    },
    (error) => {
      showError("Нет доступа к базе. Проверьте Firestore и security rules.", error);
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
  };

  if (appMode === "local") {
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
    createdAt: firebaseServices.serverTimestamp(),
    updatedAt: firebaseServices.serverTimestamp(),
  });

  await clearCloudDayResultIfClosed();
}

async function toggleTodo(id, completed) {
  requireEditableDay();

  if (appMode === "local") {
    todos = todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo));
    clearLocalDayResultIfClosed();
    saveLocalTodos();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.setDoc(
    todoDocument(currentUser.uid, id),
    {
      completed,
      updatedAt: firebaseServices.serverTimestamp(),
    },
    { merge: true },
  );

  await clearCloudDayResultIfClosed();
}

async function deleteTodo(id) {
  requireEditableDay();

  if (appMode === "local") {
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

async function finishDay() {
  requireEditableDay();

  const result = createDayResult();

  if (appMode === "local") {
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
  return {
    id,
    text: typeof data.text === "string" ? data.text : "",
    completed: Boolean(data.completed),
  };
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
    return Array.isArray(parsedTodos) ? parsedTodos : [];
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

  const checkboxLabel = document.createElement("label");
  checkboxLabel.className = "todo-checkbox";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.disabled = !canEditTodos();
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = todo.id;
  checkbox.setAttribute("aria-label", `Отметить дело: ${todo.text}`);

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
  deleteButton.setAttribute("aria-label", `Удалить дело: ${todo.text}`);
  deleteButton.title = "Удалить";

  checkboxLabel.append(checkbox);
  item.append(checkboxLabel, text, deleteButton);

  return item;
}

function updateProgress() {
  const totalCount = dayResult?.closed ? dayResult.totalTodos : todos.length;
  const completedCount = dayResult?.closed ? dayResult.completedTodos : getCompletedCount();
  const progressPercent = getProgressPercent(completedCount, totalCount);

  progressTrack.setAttribute("aria-valuenow", String(progressPercent));
  progressBar.style.width = `${progressPercent}%`;

  if (dayResult?.closed) {
    progressText.textContent = `День завершён: выполнено ${progressPercent}% (${completedCount} из ${totalCount})`;
    finishDayButton.textContent = "День завершён";
  } else {
    progressText.textContent = `Выполнено: ${completedCount} из ${totalCount}`;
    finishDayButton.textContent = "Завершить день";
  }

  finishDayButton.disabled = !canFinishDay();
}

function getEmptyStateText() {
  if (!isSelectedToday()) {
    return "За выбранный день нет дел.";
  }

  if (appMode === "cloud" && !currentUser) {
    return "Войдите, чтобы увидеть свои дела.";
  }

  return "Пока нет дел. Добавьте первое дело на сегодня.";
}

function getProgressPercent(completedCount, totalCount) {
  return totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
}

function canFinishDay() {
  return canEditTodos() && todos.length > 0 && !dayResult?.closed;
}

function createDayResult() {
  const totalTodos = todos.length;
  const completedTodos = getCompletedCount();
  const unfinishedTodos = totalTodos - completedTodos;

  return {
    closed: true,
    status: unfinishedTodos === 0 ? "completed" : "incomplete",
    totalTodos,
    completedTodos,
    unfinishedTodos,
    closedAt: new Date().toISOString(),
  };
}

function getCompletedCount() {
  return todos.filter((todo) => todo.completed).length;
}

function canEditTodos() {
  return isSelectedToday() && (appMode === "local" || Boolean(currentUser));
}

function initializeDateControls() {
  selectedDateInput.value = selectedDateKey;
  updateDateControls();
}

function updateDateControls() {
  const todayKey = getTodayKey();
  selectedDateInput.max = todayKey;
  selectedDateInput.value = selectedDateKey;

  selectedDateInput.title = isSelectedToday()
    ? "Выбрать день"
    : `История за ${formatDisplayDate(selectedDateKey)}`;
}

function normalizeSelectedDateKey(dateKey) {
  const todayKey = getTodayKey();

  if (!isDateKey(dateKey)) {
    return selectedDateKey;
  }

  return dateKey > todayKey ? todayKey : dateKey;
}

function isDateKey(dateKey) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

function isSelectedToday() {
  return selectedDateKey === getTodayKey();
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

  return new Intl.DateTimeFormat("ru-RU", {
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
  if (!shouldAutoFinishDay()) {
    return;
  }

  isAutoFinishing = true;

  try {
    await finishDay();
    showAuthMessage("Итог дня подведён автоматически после 22:00.");
  } catch (error) {
    showError("Не удалось автоматически подвести итог дня.", error);
    render();
  } finally {
    isAutoFinishing = false;
  }
}

function shouldAutoFinishDay() {
  return (
    isSelectedToday() &&
    new Date().getHours() >= AUTO_FINISH_HOUR &&
    canFinishDay() &&
    !isAutoFinishing
  );
}

function setTodoEditingEnabled(isEnabled) {
  input.disabled = !isEnabled;
  addButton.disabled = !isEnabled;
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

function showAuthMessage(message) {
  authStatus.textContent = message;
}

function showError(message, error) {
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

function loadFirebaseServices() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  return {
    auth,
    db,
    provider,
    collection,
    deleteDoc,
    doc,
    onAuthStateChanged,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    signInWithPopup,
    signOut,
  };
}
