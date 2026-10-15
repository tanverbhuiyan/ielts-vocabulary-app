/* ============================================================
   words.js — searchable, filterable vocabulary list for /words
   ============================================================ */
(function () {
  "use strict";

  var FILTERS = [
    { key: "all", label: "All" },
    { key: "easy", label: "Easy" },
    { key: "medium", label: "Medium" },
    { key: "hard", label: "Hard" },
    { key: "learned", label: "Learned" },
    { key: "review", label: "Need Practice" }
  ];

  var state = { filter: "all", query: "", timer: null, seq: 0 };

  function learnHref(w) {
    var diff = w.difficulty || "all";
    return "/learn?word_id=" + w.id + "&difficulty=" + encodeURIComponent(diff);
  }

  function renderRows(host, words) {
    host.innerHTML = "";
    var count = document.getElementById("result-count");
    if (count) count.textContent = words.length + (words.length === 1 ? " word" : " words");

    if (!words.length) {
      var empty = App.el("div", { className: "empty" });
      empty.appendChild(App.el("h2", { textContent: "No words found." }));
      empty.appendChild(App.el("p", { textContent: "Try a different search or filter." }));
      host.appendChild(empty);
      return;
    }

    var ul = App.el("ul", { className: "word-list" });
    words.forEach(function (w, i) {
      var status = Store.getWordStatus(w.id);
      var row = App.el("a", { className: "word-row", href: learnHref(w) });
      row.appendChild(App.el("span", { className: "word-idx", textContent: String(i + 1).padStart(2, "0") }));
      row.appendChild(App.el("span", { className: "word-name", textContent: w.word }));
      row.appendChild(App.el("span", {
        className: "badge badge-" + (w.difficulty || "easy"),
        textContent: w.difficulty || ""
      }));
      if (status === "learned" || status === "review") {
        var dot = App.el("span", {
          className: "status-dot " + status,
          title: status === "learned" ? "Learned" : "Needs practice"
        });
        row.appendChild(dot);
      }
      ul.appendChild(row);
    });
    host.appendChild(ul);
  }

  function applyStatusFilter(words) {
    if (state.filter === "learned") return Store.wordsByStatus(words, "learned");
    if (state.filter === "review") return Store.wordsByStatus(words, "review");
    return words;
  }

  function fetchBase() {
    // Base list: difficulty filters go through the API, status filters are client-side
    if (state.filter === "easy" || state.filter === "medium" || state.filter === "hard") {
      return VocabAPI.words(state.filter);
    }
    return Promise.all([
      VocabAPI.words("easy"),
      VocabAPI.words("medium"),
      VocabAPI.words("hard")
    ]).then(function (parts) {
      return parts[0].concat(parts[1], parts[2]).sort(function (a, b) { return a.id - b.id; });
    });
  }

  function refresh() {
    var host = document.getElementById("word-list-host");
    if (!host) return;
    var mySeq = ++state.seq;
    host.innerHTML = '<div class="loading"><div class="spinner"></div>Loading words…</div>';

    var promise;
    if (state.query) {
      promise = VocabAPI.search(state.query);
    } else {
      promise = fetchBase();
    }

    promise.then(function (words) {
      if (mySeq !== state.seq) return; // a newer request superseded this one
      renderRows(host, applyStatusFilter(words || []));
    }).catch(function () {
      if (mySeq !== state.seq) return;
      host.innerHTML = "";
      var box = App.el("div", { className: "empty" });
      box.appendChild(App.el("h2", { textContent: "Something went wrong." }));
      box.appendChild(App.el("p", { textContent: "Please try again." }));
      host.appendChild(box);
    });
  }

  function initChips() {
    var host = document.getElementById("filter-chips");
    if (!host) return;
    FILTERS.forEach(function (f) {
      var b = App.el("button", {
        type: "button",
        className: "chip" + (state.filter === f.key ? " active" : ""),
        textContent: f.label,
        "aria-pressed": state.filter === f.key ? "true" : "false"
      });
      b.addEventListener("click", function () {
        state.filter = f.key;
        host.querySelectorAll(".chip").forEach(function (c) {
          c.classList.remove("active");
          c.setAttribute("aria-pressed", "false");
        });
        b.classList.add("active");
        b.setAttribute("aria-pressed", "true");
        refresh();
      });
      host.appendChild(b);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("word-list-host")) return;
    initChips();
    var input = document.getElementById("search-input");
    if (input) {
      input.addEventListener("input", function () {
        if (state.timer) clearTimeout(state.timer);
        state.timer = setTimeout(function () {
          state.query = input.value.trim();
          refresh();
        }, 300);
      });
    }
    refresh();
  });
})();
