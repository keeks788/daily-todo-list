const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const summary = document.querySelector("#day-summary");
const summaryText = document.querySelector("#summary-text");
const todayLabel = document.querySelector("#today-label");

const todayKey = new Date().toLocaleDateString("sv-SE");
const storageKey = `daily-todos:${todayKey}`;

let todos = loadTodos();

todayLabel.textContent = new Intl.DateTimeFormat("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
}).format(new Date());

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = input.value.trim();

  if (!text) {
    input.focus();
    return;
  }

  todos = [
    ...todos,
    {
      id: crypto.randomUUID(),
      text,
      completed: false,
    },
  ];

  input.value = "";
  saveAndRender();
});

list.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-action='toggle']");

  if (!checkbox) {
    return;
  }

  const id = checkbox.dataset.id;

  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: checkbox.checked } : todo,
  );

  saveAndRender();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='delete']");

  if (!button) {
    return;
  }

  todos = todos.filter((todo) => todo.id !== button.dataset.id);
  saveAndRender();
});

render();

function loadTodos() {
  const savedTodos = localStorage.getItem(storageKey);

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

function saveAndRender() {
  localStorage.setItem(storageKey, JSON.stringify(todos));
  render();
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
  checkbox.dataset.action = "toggle";
  checkbox.dataset.id = todo.id;
  checkbox.setAttribute("aria-label", `Отметить дело: ${todo.text}`);

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
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
    summaryText.textContent = "Добавьте дела, чтобы вечером увидеть итог дня.";
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
