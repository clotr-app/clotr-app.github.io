// Practice, on clotr.app: the extension's six drills and its spot-the-leak round, run by the same engine as
// "Is this a scam?" above. A reply you type here never leaves this page, isn't stored, and is gone once the tab
// closes; use made-up numbers, same as the extension's own practice page says.
"use strict";

(() => {
  const { detect, redact, mask, practiceNotice, practice } = globalThis.Clotr;
  const $ = (id) => document.getElementById(id);

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    node.append(...children);
    return node;
  }

  const DRILLS = practice.drills;
  const answers = DRILLS.map(() => ({ reply: "", checked: false }));
  let at = 0;

  const quoted = (text) => `“${text}”`;

  // ---------- Round 1: the drills ----------

  function showDrill(i) {
    at = i;
    const d = DRILLS[i];
    $("pz-drill").hidden = false;
    $("pz-leak").hidden = true;
    $("pz-title").textContent = "What would you reply?";
    $("pz-drill-step").textContent = `Drill ${i + 1} of ${DRILLS.length}: a message from ${d.who}`;
    $("pz-segments").replaceChildren(...DRILLS.map((_, j) => el("span", { className: j <= i ? "done" : "" })));
    $("pz-drill-initial").textContent = d.from
      .replace(/^[^\p{L}]+/u, "")
      .charAt(0)
      .toUpperCase();
    $("pz-drill-from").textContent = d.from;
    $("pz-drill-message").textContent = d.message;
    $("pz-reply").value = answers[i].reply;
    $("pz-back").hidden = i === 0;
    if (answers[i].checked) reveal();
    else {
      $("pz-reveal").replaceChildren();
      $("pz-next").hidden = true;
    }
  }

  function reveal(after = false) {
    const d = DRILLS[at];
    const text = $("pz-reply").value;
    answers[at] = { reply: text, checked: true };
    let shown;
    try {
      const found = text.trim() ? detect(text) : [];
      const bare = !found.length && d.bareAsk && text.trim() && d.bareAsk.shape(text);
      shown = found.length
        ? [
            el("p", { className: "reveal-label", textContent: "What Clotr would show on a real chat" }),
            practiceNotice(found, {
              everyday: true,
              onHide: () => {
                $("pz-reply").value = redact($("pz-reply").value, found);
                reveal(true);
                $("pz-reply").focus();
              },
              onLeave: () => {},
            }),
          ]
        : bare
          ? [
              el("p", {
                className: "reveal-none",
                textContent:
                  "Clotr would stay quiet here too: a bare number alone never warns in a real chat, so it doesn't cry wolf on someone's harmless one.",
              }),
              el("p", { className: "reveal-hint", textContent: d.bareAsk.text }),
            ]
          : [
              el("p", {
                className: "reveal-none",
                textContent: after
                  ? "Nothing in your reply now that Clotr knows scammers ask for."
                  : "Nothing in your reply that Clotr knows scammers ask for.",
              }),
              el("p", {
                className: "reveal-hint",
                textContent: "Clotr only sees what's in your words, so compare your reply with the one below.",
              }),
            ];
    } catch {
      shown = [el("p", { className: "reveal-none", textContent: "Clotr couldn't check this reply." })];
    }
    $("pz-reveal").replaceChildren(
      ...shown,
      el("div", { className: "safer" }, [
        el("h3", { textContent: "A safer reply" }),
        el("p", { className: "safer-quote", textContent: quoted(d.safer) }),
        el("p", { className: "safer-why", textContent: d.why }),
      ]),
    );
    const last = at === DRILLS.length - 1;
    $("pz-next").textContent = last ? "Next: Spot the leak" : `Next drill: ${DRILLS[at + 1].who}`;
    $("pz-next").hidden = false;
  }

  $("pz-check").addEventListener("click", () => reveal());
  $("pz-reply").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    e.preventDefault();
    reveal();
  });
  $("pz-reply").addEventListener("input", () => {
    answers[at].reply = $("pz-reply").value;
  });
  $("pz-use-made-up").addEventListener("click", () => {
    $("pz-reply").value = DRILLS[at].reply;
    answers[at].reply = DRILLS[at].reply;
    $("pz-reply").focus();
  });
  $("pz-next").addEventListener("click", () => {
    if (at < DRILLS.length - 1) {
      showDrill(at + 1);
      $("pz-reply").focus();
    } else startLeak();
  });
  $("pz-back").addEventListener("click", () => {
    if (at > 0) showDrill(at - 1);
  });

  // ---------- Round 2: Spot the leak ----------

  const ROUND = 10;
  const leak = { picks: [], at: 0, private: 0, changed: 0 };

  function shuffle(list) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function startLeak() {
    const some = practice.leaks.filter((l) => l.finds.length);
    const none = practice.leaks.filter((l) => !l.finds.length);
    Object.assign(leak, {
      picks: shuffle([...shuffle(some).slice(0, ROUND / 2), ...shuffle(none).slice(0, ROUND / 2)]),
      at: 0,
      private: 0,
      changed: 0,
    });
    $("pz-drill").hidden = true;
    $("pz-leak").hidden = false;
    $("pz-leak-end").hidden = true;
    $("pz-title").textContent = "Spot the leak";
    showLeak();
    $("pz-leak-title").focus();
  }

  function showLeak() {
    const l = leak.picks[leak.at];
    $("pz-leak-count").hidden = false;
    $("pz-leak-count").textContent = `${leak.at + 1} of ${leak.picks.length}`;
    const answer = (id, label) => {
      const b = el("button", { id, className: "btn answer", type: "button", textContent: label });
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => answerLeak(l, id));
      return b;
    };
    const next = el("button", {
      id: "pz-leak-next",
      className: "btn primary",
      type: "button",
      hidden: true,
      textContent: leak.at === leak.picks.length - 1 ? "See how you did" : "Next message",
    });
    next.addEventListener("click", () => {
      leak.at++;
      if (leak.at < leak.picks.length) {
        showLeak();
        $("pz-leak-title").focus();
      } else endLeak();
    });
    $("pz-leak-body").replaceChildren(
      el("figure", { className: "typed" }, [
        el("figcaption", { textContent: "Typed into an AI chat:" }),
        el("blockquote", { id: "pz-leak-text", textContent: l.text }),
      ]),
      el("fieldset", { className: "answers" }, [
        el("legend", { className: "sr-only", textContent: "Would you send this?" }),
        answer("pz-send-it", "I'd send it"),
        answer("pz-change-it", "I'd change it first"),
      ]),
      el("div", { id: "pz-leak-reveal", role: "status" }),
      el("p", { className: "nav" }, [next]),
    );
  }

  function answerLeak(l, choice) {
    for (const b of document.querySelectorAll("#pz-leak-body .answer")) {
      b.setAttribute("aria-pressed", String(b.id === choice));
      b.disabled = true;
    }
    let found = [];
    try {
      found = detect(l.text);
    } catch {
      $("pz-leak-reveal").replaceChildren(
        el("p", { className: "leak-card", textContent: "Clotr couldn't check this message." }),
      );
    }
    if (found.length) {
      leak.private++;
      if (choice === "pz-change-it") leak.changed++;
    }
    const n = found.reduce((sum, r) => sum + r.matches.length, 0);
    if (found.length)
      $("pz-leak-reveal").replaceChildren(
        el("div", { className: "leak-card found" }, [
          el("h3", { textContent: n === 1 ? "Clotr sees 1 detail here" : `Clotr sees ${n} details here` }),
          el(
            "ul",
            { className: "chips" },
            found.flatMap((r) =>
              r.matches.map((m) => el("li", { className: "chip-find", textContent: `${r.name} (${mask(m)})` })),
            ),
          ),
          el("p", { textContent: l.instead || bandageLine(l.text, found) }),
        ]),
      );
    else if (!$("pz-leak-reveal").childElementCount)
      $("pz-leak-reveal").replaceChildren(
        el("div", { className: "leak-card none" }, [
          el("p", { textContent: "Clotr finds nothing private here. Fine to send." }),
        ]),
      );
    $("pz-leak-next").hidden = false;
    $("pz-leak-next").focus();
  }

  function bandageLine(text, found) {
    const labels = practice.coverLabels(text, found);
    const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}` : labels[0];
    return `With Bandage on, Clotr can send ${list} instead, and put your details back in the AI's answer.`;
  }

  function endLeak() {
    $("pz-leak-body").replaceChildren();
    $("pz-leak-count").hidden = true;
    $("pz-leak-score").textContent =
      `You'd have changed ${leak.changed} of the ${leak.private} that had something private.`;
    $("pz-leak-cheer").textContent =
      leak.changed === leak.private
        ? "You spotted every one."
        : "That's what Clotr is for: on a real AI chat, it warns before details like these go out.";
    $("pz-leak-end").hidden = false;
    $("pz-leak-score").focus();
  }

  $("pz-leak-again").addEventListener("click", startLeak);
  $("pz-leak-back").addEventListener("click", () => showDrill(DRILLS.length - 1));

  // Empties the reply whenever the page is hidden, so a reply typed here never ends up in the browser's own
  // restore data after a crash or a Back/Forward.
  window.addEventListener("pagehide", () => {
    $("pz-reply").value = "";
    for (const a of answers) a.reply = "";
  });

  showDrill(0);
})();
