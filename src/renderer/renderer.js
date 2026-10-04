"use strict";

const api = window.clipaste;
const $ = (selector) => document.querySelector(selector);

const state = {
  items: [],
  query: "",
  filter: "all",
  selected: 0,
};

const els = {
  items: $("#items"),
  empty: $("#empty"),
  emptyTitle: $("#empty-title"),
  emptyText: $("#empty-text"),
  count: $("#count"),
  search: $("#search"),
  toast: $("#toast"),
  confirm: $("#confirm"),
  template: $("#item-template"),
};

const URL_PATTERN = /^https?:\/\/\S+$/;
const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function timeAgo(timestamp) {
  if (!timestamp) return "";
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const steps = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];
  let value = seconds;
  for (const [size, unit] of steps) {
    if (Math.abs(value) < size) return Math.abs(value) < 10 && unit === "second" ? "just now" : relativeTime.format(Math.round(value), unit);
    value /= size;
  }
  return "";
}

function visibleItems() {
  const query = state.query.toLowerCase();
  return state.items.filter(
    (item) =>
      (state.filter === "all" || item.pinned) &&
      (!query || item.text.toLowerCase().includes(query) || (item.source ?? "").toLowerCase().includes(query)),
  );
}

function render() {
  const items = visibleItems();
  state.selected = Math.min(state.selected, Math.max(items.length - 1, 0));

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    node.classList.toggle("pinned", item.pinned);
    node.classList.toggle("selected", index === state.selected);
    node.setAttribute("aria-selected", String(index === state.selected));

    // textContent keeps clipboard content as plain text. It never runs as HTML.
    node.querySelector(".text").textContent = item.text;
    node.title = item.text.length > 400 ? `${item.text.slice(0, 400)}…` : item.text;

    const source = node.querySelector(".source");
    source.textContent = item.source ?? "";
    source.hidden = !item.source;

    const time = node.querySelector(".time");
    time.textContent = timeAgo(item.copiedAt);
    if (item.copiedAt) time.dateTime = new Date(item.copiedAt).toISOString();

    node.querySelector(".open").hidden = !URL_PATTERN.test(item.text.trim());
    const pin = node.querySelector(".pin");
    pin.title = item.pinned ? "Unpin" : "Pin";
    pin.setAttribute("aria-label", pin.title);

    fragment.append(node);
  });
  els.items.replaceChildren(fragment);

  const pinned = state.items.filter((item) => item.pinned).length;
  els.count.textContent = `${state.items.length} items${pinned ? ` · ${pinned} pinned` : ""}`;

  els.empty.hidden = items.length > 0;
  if (state.query) {
    els.emptyTitle.textContent = "No matches";
    els.emptyText.textContent = `Nothing in your history contains "${state.query}".`;
  } else if (state.filter === "pinned") {
    els.emptyTitle.textContent = "No pinned items";
    els.emptyText.textContent = "Pin an item to keep it. Pinned items stay when you clear the history.";
  } else {
    els.emptyTitle.textContent = "Nothing copied yet";
    els.emptyText.textContent = "Copy some text in any app. It shows up here.";
  }
}

function select(index) {
  const items = visibleItems();
  if (items.length === 0) return;
  state.selected = (index + items.length) % items.length;
  render();
  els.items.querySelector(".item.selected")?.scrollIntoView({ block: "nearest" });
}

let toastTimer;
function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 1400);
}

function confirmAction({ title, text, ok }) {
  $("#confirm-title").textContent = title;
  $("#confirm-text").textContent = text;
  $("#confirm-ok").textContent = ok;
  els.confirm.returnValue = "";
  els.confirm.showModal();
  return new Promise((resolve) => {
    els.confirm.addEventListener("close", () => resolve(els.confirm.returnValue === "ok"), { once: true });
  });
}

async function copy(id) {
  await api.copy(id);
  toast("Copied to clipboard");
}

els.items.addEventListener("click", async (event) => {
  const node = event.target.closest(".item");
  if (!node) return;
  const id = node.dataset.id;
  const item = state.items.find((i) => i.id === id);

  if (event.target.closest(".delete")) return api.remove(id);
  if (event.target.closest(".pin")) return api.togglePin(id);
  if (event.target.closest(".open")) return api.openUrl(item.text.trim());
  await copy(id);
});

els.search.addEventListener("input", () => {
  state.query = els.search.value;
  state.selected = 0;
  render();
});

document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    state.filter = tab.dataset.filter;
    state.selected = 0;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t === tab);
      t.setAttribute("aria-selected", String(t === tab));
    });
    render();
  }),
);

$("#hide").addEventListener("click", () => api.hide());

$("#clear").addEventListener("click", async () => {
  const ok = await confirmAction({
    title: "Clear history?",
    text: "This deletes all items that are not pinned. You cannot undo this.",
    ok: "Clear",
  });
  if (ok) {
    await api.clear();
    toast("History cleared");
  }
});

$("#quit").addEventListener("click", async () => {
  const ok = await confirmAction({
    title: "Quit Clipaste?",
    text: "Clipaste stops recording your clipboard until you start it again.",
    ok: "Quit",
  });
  if (ok) api.quit();
});

document.addEventListener("keydown", (event) => {
  if (els.confirm.open) return;
  const item = visibleItems()[state.selected];

  switch (event.key) {
    case "Escape":
      if (els.search.value) {
        els.search.value = "";
        state.query = "";
        render();
      } else {
        api.hide();
      }
      break;
    case "ArrowDown":
      event.preventDefault();
      select(state.selected + 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      select(state.selected - 1);
      break;
    case "Enter":
      if (item) copy(item.id);
      break;
    case "Delete":
      if (item && document.activeElement !== els.search) api.remove(item.id);
      break;
    default:
      // Typing anywhere starts a search.
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) els.search.focus();
  }
});

function formatShortcut(shortcut) {
  const mac = api.platform === "darwin";
  return shortcut
    .replace("CmdOrCtrl", mac ? "⌘" : "Ctrl")
    .replace("Shift", mac ? "⇧" : "Shift")
    .split("+")
    .join(mac ? "" : "+");
}

api.onHistoryChanged((items) => {
  state.items = items;
  render();
});

api.onShown(() => {
  state.selected = 0;
  els.search.select();
  els.search.focus();
  render();
});

// Keep the relative times ("2 minutes ago") current.
setInterval(render, 30_000);

(async () => {
  const settings = await api.getSettings();
  $("#shortcut").textContent = formatShortcut(settings.shortcut);
  state.items = await api.list();
  render();
})();
