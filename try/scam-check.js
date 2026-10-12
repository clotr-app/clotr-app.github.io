// "Is this a scam?" on clotr.app: the same signs and sources as the extension's own check.html, run by the
// same engine, but with nothing to read from a vault (there's no extension here, so a message's own details are
// never matched against anything of yours). Nothing is sent anywhere, and the pasted message never leaves this
// page; it's gone when the tab closes.
"use strict";

(() => {
  const { detect, scamSigns, scamHasLink } = globalThis.Clotr;
  const $ = (id) => document.getElementById(id);
  const el = (tag, props = {}, children = []) => {
    const node = document.createElement(tag);
    Object.assign(node, props);
    node.append(...children);
    return node;
  };

  // ---------- Where each piece of advice comes from ----------

  const WHO = {
    ftc: "US FTC",
    georgia: "Georgia Attorney General",
    munster: "University of Münster",
  };
  const SOURCES = {
    1: [
      "ftc",
      "What's a verification code and why would someone ask me for it?",
      "https://consumer.ftc.gov/consumer-alerts/2024/03/whats-verification-code-why-would-someone-ask-me-it",
    ],
    3: [
      "ftc",
      "Avoiding and Reporting Gift Card Scams",
      "https://consumer.ftc.gov/articles/avoiding-and-reporting-gift-card-scams",
    ],
    5: ["georgia", "Credit Card Scams", "https://consumer.georgia.gov/credit-card-scams"],
    7: [
      "ftc",
      "The Google Voice scam",
      "https://consumer.ftc.gov/consumer-alerts/2021/10/google-voice-scam-how-verification-code-scam-works-how-avoid-it",
    ],
    8: [
      "ftc",
      "How To Spot, Avoid, and Report Tech Support Scams",
      "https://consumer.ftc.gov/articles/how-spot-avoid-and-report-tech-support-scams",
    ],
    9: ["ftc", "How To Avoid a Scam", "https://consumer.ftc.gov/articles/how-avoid-scam"],
    10: [
      "ftc",
      "How To Recognize and Avoid Phishing Scams",
      "https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams",
    ],
    11: [
      "ftc",
      "What To Know About Cryptocurrency and Scams",
      "https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams",
    ],
    17: [
      "munster",
      "Warning about attacks with fake captchas (ClickFix)",
      "https://www.uni-muenster.de/Informationssicherheit/en/sammler/Warnung_ClickFix_20260507.html",
    ],
    18: [
      "ftc",
      "Scammers Use Fake Emergencies To Steal Your Money",
      "https://consumer.ftc.gov/articles/scammers-use-fake-emergencies-steal-your-money",
    ],
    19: [
      "ftc",
      "Sure ways to spot a scammer",
      "https://consumer.ftc.gov/consumer-alerts/2024/03/sure-ways-spot-scammer",
    ],
    20: [
      "ftc",
      "Never move your money to “protect it.” That’s a scam",
      "https://consumer.ftc.gov/consumer-alerts/2024/03/never-move-your-money-protect-it-thats-scam",
    ],
    21: [
      "ftc",
      "How To Avoid a Government Impersonation Scam",
      "https://consumer.ftc.gov/articles/how-avoid-government-impersonation-scam",
    ],
    22: ["ftc", "What To Know About Romance Scams", "https://consumer.ftc.gov/articles/what-know-about-romance-scams"],
    23: [
      "ftc",
      "Fake Prize, Sweepstakes, and Lottery Scams",
      "https://consumer.ftc.gov/articles/fake-prize-sweepstakes-and-lottery-scams",
    ],
  };
  const SIGN_SOURCES = {
    asks_code: [1, 7],
    asks_card_code: [5],
    asks_gift_card: [3],
    asks_remote: [8],
    asks_details: [10],
    asks_command: [17],
    pay_crypto: [11, 19],
    pay_hard_to_undo: [9, 18, 19],
    pay_move_money: [20],
    press_rush: [9, 19],
    press_secret: [18, 19],
    press_threat: [19],
    press_stay: [19],
    pret_gov: [21],
    pret_bank: [20],
    pret_support: [8],
    pret_family: [18],
    pret_romance: [22],
    prob_account: [10],
    prob_prize: [23],
  };

  function sourceLine(numbers) {
    const parts = [numbers.length > 1 ? "Sources: " : "Source: "];
    let lastWho = null;
    numbers.forEach((n, i) => {
      const [who, title, href] = SOURCES[n];
      if (i) parts.push(who === lastWho ? " · " : "; ");
      if (who !== lastWho) parts.push(`${WHO[who]}: `);
      parts.push(el("a", { href, target: "_blank", rel: "noopener noreferrer", textContent: title }));
      lastWho = who;
    });
    return parts;
  }

  // ---------- The words for each sign (the extension's own wording, so a sign reads the same way everywhere) ----------

  const GROUPS = {
    asks: "It asks for a code or a detail",
    pay: "It wants you to pay in a certain way",
    press: "It pressures you",
    pret: "It pretends to be someone you trust",
    prob: "It says there's a problem or a prize",
  };
  const TECH = "Real tech companies don't contact you about a problem with your computer.";
  const SIGNS = {
    asks_code: [
      "Asks for a code that was sent to you",
      "Anyone who asks for a code sent to you is a scammer: with it, they get into your account.",
    ],
    asks_card_code: [
      "Asks for the numbers on the back of your card",
      "Your card company never asks for them: it already has them.",
    ],
    asks_gift_card: [
      "Asks for gift cards",
      "No real business or government agency will ever tell you to pay with a gift card.",
    ],
    asks_remote: ["Asks to get into your computer", TECH],
    asks_details: [
      "Asks you to confirm personal or bank details",
      "Messages that ask you to confirm your details are a common trick: you don't need to.",
    ],
    asks_command: [
      "Asks you to paste a command",
      "No real check asks you to press Win+R or open Terminal and paste something.",
    ],
    pay_crypto: ["Wants crypto or a Bitcoin ATM", "Only scammers demand payment in cryptocurrency."],
    pay_hard_to_undo: [
      "Wants a wire transfer, cash, gold or a payment app",
      "Scammers ask for ways of paying that are hard to get back.",
    ],
    pay_move_money: [
      "Tells you to move your money to protect it",
      "Someone who says you have to move your money to protect it is a scammer.",
    ],
    press_rush: ["Rushes you", "Scammers push you to act right away, so you don't stop to check."],
    press_secret: [
      "Tells you to keep it secret",
      "Scammers ask for secrecy so you don't talk to someone who'd spot it.",
    ],
    press_threat: [
      "Threatens arrest, fines or a closed account",
      "Threats like these are a scammer's line, to scare you into paying.",
    ],
    press_stay: ["Tells you not to hang up", "Keeping you on the line stops you checking with anyone."],
    pret_gov: [
      "Says it's the government, and asks for money or details",
      "Government agencies don't call, email or text to ask for money or personal information, the US FTC says.",
    ],
    pret_bank: [
      "Says it's your bank's fraud team, and asks for something",
      "Hang up and call the number on your card or statement, never the one they give you.",
    ],
    pret_support: ["Says it's tech support", TECH],
    pret_family: [
      "Says a family member is in trouble",
      "Don't trust the voice or the name: call them on a number you know is theirs.",
    ],
    pret_romance: [
      "Someone you haven't met asks for money",
      "Never send money or gifts to someone you haven't met in person.",
    ],
    prob_account: [
      "Says there's a problem with your account, a payment or a delivery",
      "A common opener. Check with the company on a number or website you already know.",
    ],
    prob_prize: ["Says you won something", "Real prizes are free: if anything has to be paid first, it's a scam."],
  };

  // ---------- Showing what was found ----------

  function marked(text, signs) {
    const edges = new Set([0, text.length]);
    for (const s of signs) for (const p of s.spans) edges.add(p.start).add(p.end);
    const cuts = [...edges].sort((a, b) => a - b);
    const pieces = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const [a, b] = [cuts[i], cuts[i + 1]];
      const ids = signs.filter((s) => s.spans.some((p) => p.start <= a && p.end >= b)).map((s) => s.id);
      const last = pieces.at(-1);
      if (last && last.ids.join() === ids.join()) last.end = b;
      else pieces.push({ start: a, end: b, ids });
    }
    const nodes = [];
    for (const { start, end, ids } of pieces) {
      const words = text.slice(start, end);
      if (!ids.length) {
        nodes.push(words);
        continue;
      }
      const names = ids.map((id) => SIGNS[id][0]).join(", ");
      nodes.push(el("mark", { textContent: words, title: names }));
      nodes.push(el("span", { className: "sr-only", textContent: ` (${names})` }));
    }
    return nodes;
  }

  const quote = (words) => `“${words.length > 90 ? `${words.slice(0, 88)}…` : words}”`;
  function wordsOf(text, sign) {
    return sign.spans
      .slice(0, 3)
      .map((p) => quote(text.slice(p.start, p.end).replace(/\s+/g, " ")))
      .join(" · ");
  }

  function card(text, sign) {
    const [name, means] = SIGNS[sign.id];
    const box = el("article", { className: "sign-card" }, [
      el("h4", { className: "sign-name", textContent: name }),
      el("p", { className: "sign-words", textContent: wordsOf(text, sign) }),
      el("p", { className: "sign-means", textContent: means }),
      el("p", { className: "sign-source source" }, sourceLine(SIGN_SOURCES[sign.id])),
    ]);
    box.dataset.sign = sign.id;
    return box;
  }

  function showResult(text) {
    const signs = scamSigns(text, { mine: [] });
    const count = signs.length;
    $("sc-found").hidden = !count;
    $("sc-none").hidden = Boolean(count);
    $("sc-found-title").textContent = count === 1 ? "Clotr found 1 warning sign" : `Clotr found ${count} warning signs`;
    $("sc-marked").replaceChildren(...marked(text, signs));
    const groups = [];
    for (const [group, title] of Object.entries(GROUPS)) {
      const mine = signs.filter((s) => s.group === group);
      if (!mine.length) continue;
      groups.push(
        el("section", { className: "sign-group" }, [
          el("h3", { textContent: title }),
          ...mine.map((s) => card(text, s)),
        ]),
      );
    }
    $("sc-signs").replaceChildren(...groups);
    $("sc-has-phone").hidden = !detect(text).some((r) => r.id === "phone_number");
    $("sc-has-link").hidden = !scamHasLink(text);
    $("sc-ask").hidden = true;
    $("sc-result").hidden = false;
    (count ? $("sc-found-title") : $("sc-none-title")).focus();
  }

  function check(text) {
    $("sc-failed").hidden = true;
    $("sc-empty-note").hidden = true;
    if (!text.trim()) {
      $("sc-empty-note").hidden = false;
      $("sc-message").focus();
      return;
    }
    try {
      showResult(text);
    } catch {
      $("sc-result").hidden = true;
      $("sc-ask").hidden = false;
      $("sc-failed").hidden = false;
    }
  }

  $("sc-check-it").addEventListener("click", () => check($("sc-message").value));
  $("sc-message").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) check($("sc-message").value);
  });
  $("sc-message").addEventListener("input", () => ($("sc-empty-note").hidden = true));
  $("sc-try-made-up").addEventListener("click", () => {
    $("sc-message").value =
      "This is the fraud team at Anytown Bank. We stopped a strange payment on your card. To cancel it, reply right away with the 6-digit code we just texted you. Don't tell anyone at the branch, they may be in on it.";
    check($("sc-message").value);
  });
  $("sc-check-another").addEventListener("click", () => {
    $("sc-message").value = "";
    $("sc-marked").replaceChildren();
    $("sc-signs").replaceChildren();
    $("sc-result").hidden = true;
    $("sc-ask").hidden = false;
    $("sc-message").focus();
  });

  $("sc-before-sources").replaceChildren(...sourceLine([10, 20, 9]));

  // Never leaves a pasted message sitting where a browser's own crash recovery could pick it back up.
  window.addEventListener("pagehide", () => {
    $("sc-message").value = "";
  });
})();
