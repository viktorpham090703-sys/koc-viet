import { matchesSearch } from "./list-search.js";

export function bindProvincePicker(picker) {
  const input = picker.querySelector("input");
  const toggle = picker.querySelector("[data-province-toggle]");
  const panel = picker.querySelector("[data-province-panel]");
  const empty = picker.querySelector("[data-province-empty]");
  const options = [...picker.querySelectorAll("[role=option]")];
  let active = null;

  const setActive = option => {
    active?.classList.remove("is-active");
    active = option;
    input.removeAttribute("aria-activedescendant");
    if (active) {
      active.classList.add("is-active");
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }
  };
  const close = () => {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    setActive(null);
  };
  const open = (query = "") => {
    options.forEach(option => {
      option.hidden = !matchesSearch(option.textContent, query);
      option.setAttribute("aria-selected", String(option.textContent === input.value));
    });
    empty.hidden = options.some(option => !option.hidden);
    panel.hidden = false;
    panel.scrollTop = 0;
    input.setAttribute("aria-expanded", "true");
    setActive(null);
  };
  const choose = option => {
    input.value = option.textContent;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    close();
  };

  input.addEventListener("focus", () => { open(); input.select(); });
  input.addEventListener("click", () => { if (panel.hidden) open(); });
  input.addEventListener("input", () => open(input.value));
  input.addEventListener("keydown", event => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (panel.hidden) open();
      const visible = options.filter(option => !option.hidden);
      const index = visible.indexOf(active);
      const next = event.key === "ArrowDown" ? index + 1 : (index < 0 ? visible.length - 1 : index - 1);
      setActive(visible[(next + visible.length) % visible.length] || null);
    } else if (event.key === "Enter" && !panel.hidden) {
      event.preventDefault();
      if (active) choose(active);
    }
  });
  toggle.addEventListener("mousedown", event => event.preventDefault());
  toggle.addEventListener("click", () => {
    const wasOpen = !panel.hidden;
    input.focus();
    if (wasOpen) close();
    else open();
  });
  options.forEach(option => {
    option.addEventListener("mousedown", event => event.preventDefault());
    option.addEventListener("click", () => choose(option));
  });
  picker.addEventListener("focusout", event => {
    if (!picker.contains(event.relatedTarget)) close();
  });
}
