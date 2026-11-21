// The look switch in the footer: Light, Plum or Ember. The pick is kept in this browser's localStorage so it holds
// from page to page, and nothing is sent anywhere. With no pick the site stays Plum. The switch itself is plain radio
// buttons that kit/tokens.css reads with :has(), so it still works on a page with scripts off. This file remembers
// the pick, sets it before the page paints, and opens and closes the switch: it is closed by default, opens on
// hover, focus or click, and picking a look closes it again.
"use strict";

(function () {
  const KEY = "clotr-look";
  const LOOKS = { light: "#fdf8f2", plum: "#22192b", ember: "#2b2135" };
  const NAMES = { light: "Light", plum: "Plum", ember: "Ember" };
  const root = document.documentElement;

  function kept() {
    try {
      const look = localStorage.getItem(KEY);
      return Object.hasOwn(LOOKS, look) ? look : "plum";
    } catch {
      return "plum";
    }
  }

  // Puts a look on the page: the tokens, the browser's bar colour, the switch's checked button and its name.
  function show(look) {
    root.dataset.look = look;
    const bar = document.querySelector('meta[name="theme-color"]');
    if (bar) bar.content = LOOKS[look];
    for (const input of document.querySelectorAll('input[name="look"]')) input.checked = input.value === look;
    for (const name of document.querySelectorAll(".look-name")) name.textContent = NAMES[look];
  }

  function setOpen(box, open) {
    box.classList.toggle("open", open);
    const button = box.querySelector(".look-now");
    if (button) button.setAttribute("aria-expanded", String(open));
  }

  function pick(event) {
    const input = event.target;
    if (!input.checked || !Object.hasOwn(LOOKS, input.value)) return;
    show(input.value);
    try {
      localStorage.setItem(KEY, input.value);
    } catch {
      // Storage is off: the look still changes on this page.
    }
  }

  function wire() {
    show(kept());
    for (const box of document.querySelectorAll(".look-switch")) {
      const button = box.querySelector(".look-now");
      // Set while the switch hands focus back to its button after a pick, so that focus doesn't open it again.
      let closing = false;
      const close = () => {
        closing = true;
        setOpen(box, false);
        button?.focus({ preventScroll: true });
        closing = false;
      };
      button?.addEventListener("click", () => setOpen(box, true));
      // A mouse resting on it opens it, and leaving closes it. A tap is handled by the click above.
      box.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && setOpen(box, true));
      box.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && setOpen(box, false));
      box.addEventListener("focusin", (e) => !closing && e.target !== button && setOpen(box, true));
      button?.addEventListener("keyup", (e) => e.key === "Tab" && setOpen(box, true));
      box.addEventListener("focusout", (e) => !box.contains(e.relatedTarget) && setOpen(box, false));
      box.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && box.classList.contains("open")) close();
        if (e.key === "Enter" && e.target.name === "look") {
          e.preventDefault();
          close();
        }
      });
      for (const input of box.querySelectorAll('input[name="look"]')) {
        input.addEventListener("change", pick);
        // Picking with a click or tap closes the box. Arrow keys move through the looks and leave it open.
        input.addEventListener("click", (e) => e.detail > 0 && close());
      }
    }
  }

  root.dataset.look = kept();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
  // A page brought back from the back-forward cache, or a pick made in another tab, shows the latest pick.
  window.addEventListener("pageshow", (event) => event.persisted && show(kept()));
  window.addEventListener("storage", (event) => event.key === KEY && show(kept()));
})();
