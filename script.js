import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const FIREBASE_VERSION = "12.15.0";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const addButton = document.querySelector(".primary-button");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const summary = document.querySelector("#day-summary");
const summaryText = document.querySelector("#summary-text");
const todayLabel = document.querySelector("#today-label");
const authStatus = document.querySelector("#auth-status");
const loginButton = document.querySelector("#login-button");
const logoutButton = document.querySelector("#logout-button");
const profilePanel = document.querySelector("#profile-panel");
const profileName = document.querySelector("#profile-name");
const profileEmail = document.querySelector("#profile-email");
const setupNotice = document.querySelector("#setup-notice");

const todayKey = new Date().toLocaleDateString("sv-SE");
const localStorageKey = `daily-todos:${todayKey}`;

let todos = [];
let appMode = "local";
let currentUser = null;
let firebaseServices = null;
let unsubscribeTodos = null;

todayLabel.textContent = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  setFormBusy(true);

  try {
    await addTodo(text);
    input.value = "";
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
  setupNotice.classList.remove("is-hidden");
  loginButton.disabled = true;
  logoutButton.disabled = true;
  profilePanel.classList.add("is-hidden");
  showAuthMessage("Локальный режим: данные сохраняются только в этом браузере.");
  setTodoEditingEnabled(true);
  render();
}

function setupCloudMode() {
  appMode = "cloud";
  setupNotice.classList.add("is-hidden");
  loginButton.disabled = false;
  showAuthMessage("Войдите через Google, чтобы загрузить дела из облака.");
  setTodoEditingEnabled(false);

  firebaseServices.onAuthStateChanged(firebaseServices.auth, (user) => {
    currentUser = user;
    handleAuthStateChange(user);
  });
}

function handleAuthStateChange(user) {
  unsubscribeFromTodos();

  if (!user) {
    todos = [];
    loginButton.classList.remove("is-hidden");
    profilePanel.classList.add("is-hidden");
    showAuthMessage("Войдите через Google, чтобы работать со своим списком.");
    setTodoEditingEnabled(false);
    render();
    return;
  }

  loginButton.classList.add("is-hidden");
  profilePanel.classList.remove("is-hidden");
  profileName.textContent = user.displayName || "Пользователь";
  profileEmail.textContent = user.email || "";
  showAuthMessage("Загружаем дела из облака...");
  setTodoEditingEnabled(true);
  subscribeToTodos(user.uid);
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
  const todo = {
    id: crypto.randomUUID(),
    text,
    completed: false,
  };

  if (appMode === "local") {
    todos = [...todos, todo];
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
}

async function toggleTodo(id, completed) {
  if (appMode === "local") {
    todos = todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo));
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
}

async function deleteTodo(id) {
  if (appMode === "local") {
    todos = todos.filter((todo) => todo.id !== id);
    saveLocalTodos();
    render();
    return;
  }

  requireSignedInUser();

  await firebaseServices.deleteDoc(todoDocument(currentUser.uid, id));
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
    todayKey,
    "todos",
  );
}

function todoDocument(userId, todoId) {
  return firebaseServices.doc(
    firebaseServices.db,
    "users",
    userId,
    "days",
    todayKey,
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

function loadLocalTodos() {
  const savedTodos = localStorage.getItem(localStorageKey);

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
  localStorage.setItem(localStorageKey, JSON.stringify(todos));
}

function render() {
  list.innerHTML = "";

  for (const todo of todos) {
    list.append(createTodoElement(todo));
  }

  emptyState.classList.toggle("is-hidden", todos.length > 0);
  updateSummary();
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

function updateSummary() {
  summary.className = "day-summary";

  if (todos.length === 0) {
    summary.classList.add("is-neutral");
    summaryText.textContent =
      appMode === "cloud" && !currentUser
        ? "Войдите, чтобы увидеть дела на сегодня."
        : "Добавьте дела, чтобы вечером увидеть итог дня.";
    return;
  }

  const unfinishedCount = todos.filter((todo) => !todo.completed).length;

  if (unfinishedCount === 0) {
    summary.classList.add("is-success");
    summaryText.textContent = "Все дела на сегодня выполнены.";
    return;
  }

  summary.classList.add("is-warning");
  summaryText.textContent = `Дела не закрыты: осталось ${formatUnfinishedCount(unfinishedCount)}.`;
}

function canEditTodos() {
  return appMode === "local" || Boolean(currentUser);
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
  const [{ initializeApp }, authModule, firestoreModule] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
  ]);

  const app = initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  const db = firestoreModule.getFirestore(app);
  const provider = new authModule.GoogleAuthProvider();

  return {
    auth,
    db,
    provider,
    signInWithPopup: authModule.signInWithPopup,
    signOut: authModule.signOut,
    onAuthStateChanged: authModule.onAuthStateChanged,
    collection: firestoreModule.collection,
    deleteDoc: firestoreModule.deleteDoc,
    doc: firestoreModule.doc,
    onSnapshot: firestoreModule.onSnapshot,
    orderBy: firestoreModule.orderBy,
    query: firestoreModule.query,
    serverTimestamp: firestoreModule.serverTimestamp,
    setDoc: firestoreModule.setDoc,
  };
}
