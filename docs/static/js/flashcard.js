/* ============================================================
   flashcard.js — flashcard learning screen for /learn
   Query params:
     difficulty=easy|medium|hard|all   (default: easy)
     mode=sequential|random|review     (default: sequential)
     word_id=<id>                     (jump to a specific word)
   ============================================================ */
(function () {
  "use strict";

  var DIFF_TITLES = { easy: "Easy Vocabulary", medium: "Medium Vocabulary", hard: "Hard Vocabulary", all: "All Words" };

  var SPEAKER_ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/>' +
    '<path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

  var state = {
    words: [],
    order: [],
    index: 0,
    difficulty: "easy",
    mode: "sequential",
    revealed: false
  };

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = a[i] = t;
    }
    return a;
  }

  function fetchWords(difficulty) {
    if (difficulty === "all") {
      return Promise.all([
        VocabAPI.words("easy"),
        VocabAPI.words("medium"),
        VocabAPI.words("hard")
      ]).then(function (parts) {
        return parts[0].concat(parts[1], parts[2]).sort(function (a, b) { return a.id - b.id; });
      });
    }
    return VocabAPI.words(encodeURIComponent(difficulty));
  }

  function currentWord() {
    return state.words[state.order[state.index]];
  }

  /* ---------- Rendering ---------- */
  function renderCard() {
    var w = currentWord();
    var front = document.getElementById("card-front");
    var back = document.getElementById("card-back");
    var card = document.getElementById("flashcard");
    if (!w || !front || !back) return;

    card.classList.remove("flipped");
    card.setAttribute("aria-label", "Flashcard for " + w.word + ". Press Enter to reveal the meaning.");
    state.revealed = false;

    front.innerHTML = "";
    var body = App.el("div", { className: "card-front-body" });
    body.appendChild(App.el("p", { className: "card-word", textContent: w.word }));
    if (w.pronunciation) body.appendChild(App.el("div", { className: "card-pron", textContent: w.pronunciation }));
    if (w.part_of_speech) body.appendChild(App.el("span", { className: "card-pos", textContent: w.part_of_speech }));

    var speakBtn = App.el("button", {
      className: "speaker-btn", type: "button", "aria-label": "Pronounce " + w.word, innerHTML: SPEAKER_ICON
    });
    speakBtn.addEventListener("click", function (e) { e.stopPropagation(); App.speak(w.word); });
    body.appendChild(speakBtn);

    var hint = App.el("span", { className: "reveal-hint" });
    hint.appendChild(document.createTextNode("Tap to reveal"));
    body.appendChild(hint);
    front.appendChild(body);

    // Build the back face (revealed content)
    back.innerHTML = "";
    var titleRow = App.el("div", { style: "display:flex;align-items:center;gap:10px;" });
    titleRow.appendChild(App.el("h2", { textContent: w.word }));
    var backSpeak = App.el("button", {
      className: "speaker-btn", type: "button", "aria-label": "Pronounce " + w.word, innerHTML: SPEAKER_ICON,
      style: "width:38px;height:38px;margin-top:0;"
    });
    backSpeak.addEventListener("click", function (e) { e.stopPropagation(); App.speak(w.word); });
    titleRow.appendChild(backSpeak);
    back.appendChild(titleRow);

    back.appendChild(App.el("div", { className: "meaning-label", textContent: "Bangla meaning" }));
    var bn = App.el("p", { className: "bn-meaning bn", textContent: w.bangla_meaning || "" });

    back.appendChild(bn);
    back.appendChild(App.el("div", { className: "meaning-label", textContent: "English meaning" }));
    back.appendChild(App.el("p", { className: "en-meaning", textContent: w.english_meaning || "" }));

    if (w.synonyms && w.synonyms.length) {
      back.appendChild(App.el("div", { className: "meaning-label", textContent: "Synonyms" }));
      var chips = App.el("div", { className: "syn-chips" });
      w.synonyms.forEach(function (s) {
        chips.appendChild(App.el("span", { className: "syn-chip", textContent: s }));
      });
      back.appendChild(chips);
    }

    if (w.examples && w.examples.length) {
      back.appendChild(App.el("div", { className: "meaning-label", textContent: "Example sentences" }));
      var ol = App.el("ol", { className: "examples" });
      w.examples.forEach(function (ex) {
        ol.appendChild(App.el("li", { textContent: ex }));
      });
      back.appendChild(ol);
    }

    updateChrome();
  }

  function updateChrome() {
    var total = state.order.length;
    var counter = document.getElementById("learn-counter");
    var fill = document.getElementById("learn-progress-fill");
    if (counter) counter.textContent = total ? (state.index + 1) + " / " + total : "0 / 0";
    if (fill) fill.style.width = total ? Math.round(((state.index + 1) / total) * 100) + "%" : "0%";
  }

  function flip() {
    var card = document.getElementById("flashcard");
    if (!card || !currentWord()) return;
    state.revealed = !state.revealed;
    card.classList.toggle("flipped", state.revealed);
    card.setAttribute("aria-label",
      state.revealed
        ? "Meaning of " + currentWord().word + " shown. Press Enter to hide."
        : "Flashcard for " + currentWord().word + ". Press Enter to reveal the meaning.");
  }

  function goTo(i) {
    var total = state.order.length;
    if (!total) return;
    if (i < 0) i = 0;
    if (i >= total) i = total - 1;
    state.index = i;
    renderCard();
    // Keep the card in view on small screens
    var card = document.getElementById("flashcard");
    if (card) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function next() {
    var total = state.order.length;
    if (!total) return;
    if (state.mode === "random" && state.index === total - 1 && total > 1) {
      // Reshuffle at the end of a random deck, avoiding an immediate repeat
      var lastWordIdx = state.order[state.index];
      var rest = shuffle(state.order.filter(function (x) { return x !== lastWordIdx; }));
      state.order = [lastWordIdx].concat(rest);
      state.index = 1; // move to the first new word (index 0 is the just-seen word)
      renderCard();
      var card = document.getElementById("flashcard");
      if (card) card.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    goTo((state.index + 1) % total);
  }

  function prev() {
    var total = state.order.length;
    if (!total) return;
    goTo((state.index - 1 + total) % total);
  }

  function markKnown() {
    var w = currentWord();
    if (!w) return;
    Store.setWordStatus(w.id, "learned");
    var count = Store.markLearnedToday(w.id);
    App.toast("Nice! " + count + (count === 1 ? " word" : " words") + " learned today.");
    next();
  }

  function markReview() {
    var w = currentWord();
    if (!w) return;
    Store.setWordStatus(w.id, "review");
    App.toast("Added to your review list.");
    next();
  }

  function showEmpty(message, linkText, linkHref) {
    var host = document.getElementById("learn-main");
    if (!host) return;
    host.innerHTML = "";
    var box = App.el("div", { className: "empty" });
    box.appendChild(App.el("h2", { textContent: "No words found." }));
    box.appendChild(App.el("p", { textContent: message }));
    if (linkText && linkHref) {
      box.appendChild(App.el("a", { className: "btn btn-primary", href: linkHref, textContent: linkText }));
    }
    host.appendChild(box);
  }

  function initEvents() {
    var card = document.getElementById("flashcard");
    if (card) {
      card.addEventListener("click", flip);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          // Don't hijack Space when a button inside the card is focused
          if (e.target.closest("button")) return;
          e.preventDefault();
          flip();
        }
      });
    }

    function bind(id, fn) {
      var b = document.getElementById(id);
      if (b) b.addEventListener("click", fn);
    }
    bind("btn-prev", prev);
    bind("btn-next", next);
    bind("btn-known", markKnown);
    bind("btn-review", markReview);

    document.addEventListener("keydown", function (e) {
      // Ignore shortcuts while typing in an input
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
      if (!state.words.length) return;
      switch (e.key) {
        case " ":
          if (e.target.closest && e.target.closest("button")) return;
          e.preventDefault();
          flip();
          break;
        case "ArrowRight": next(); break;
        case "ArrowLeft": prev(); break;
        case "k": case "K": markKnown(); break;
        case "r": case "R": markReview(); break;
      }
    });
  }

  /* ---------- Boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("learn-main");
    if (!host) return;

    var q = App.params();
    var difficulty = (q.get("difficulty") || "easy").toLowerCase();
    if (["easy", "medium", "hard", "all"].indexOf(difficulty) === -1) difficulty = "easy";
    var mode = (q.get("mode") || "sequential").toLowerCase();
    if (["sequential", "random", "review"].indexOf(mode) === -1) mode = "sequential";
    var wordId = q.get("word_id") ? parseInt(q.get("word_id"), 10) : null;

    state.difficulty = difficulty;
    state.mode = mode;

    var title = document.getElementById("learn-title");
    if (title) title.textContent = mode === "review" ? "Review Words" : (DIFF_TITLES[difficulty] || "Vocabulary");
    var backLink = document.getElementById("learn-back");
    if (backLink) backLink.href = mode === "review" ? "/review" : "/";

    var loading = document.getElementById("learn-loading");

    fetchWords(difficulty).then(function (words) {
      if (loading) loading.style.display = "none";

      var list = words.slice().sort(function (a, b) { return a.id - b.id; });

      if (mode === "review") {
        list = list.filter(function (w) { return Store.getWordStatus(w.id) === "review"; });
        if (!list.length) {
          showEmpty(
            "You have no words marked for review. Tap \u201cNeed Practice\u201d on a flashcard to add words here.",
            "Start Learning", "learn.html?difficulty=" + difficulty
          );
          return;
        }
      }

      if (!list.length) {
        showEmpty("There are no words in this list yet.", "Back to Home", "/");
        return;
      }

      state.words = list;
      var idx = list.map(function (w, i) { return i; });
      state.order = mode === "random" ? shuffle(idx) : idx;

      if (wordId) {
        var pos = -1;
        state.order.forEach(function (wi, i) {
          if (state.words[wi].id === wordId) pos = i;
        });
        if (pos !== -1) state.index = pos;
      }

      initEvents();
      renderCard();
    }).catch(function () {
      if (loading) loading.style.display = "none";
      showEmpty("Something went wrong while loading words. Please try again.", "Retry", window.location.href);
    });
  });
})();
