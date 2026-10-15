/* ============================================================
   review.js — "Need Practice" and "Learned Words" lists for /review
   ============================================================ */
(function () {
  "use strict";

  function fetchAllWords() {
    return Promise.all([
      VocabAPI.words("easy"),
      VocabAPI.words("medium"),
      VocabAPI.words("hard")
    ]).then(function (parts) {
      return parts[0].concat(parts[1], parts[2]);
    });
  }

  function renderSection(host, title, words, emptyTitle, emptyText, cta) {
    host.innerHTML = "";
    var section = App.el("section", { className: "review-section" });
    var h = App.el("h2", { textContent: title + " " });
    h.appendChild(App.el("span", { className: "count-pill", textContent: String(words.length) }));
    section.appendChild(h);

    if (!words.length) {
      var empty = App.el("div", { className: "empty" });
      empty.appendChild(App.el("h2", { textContent: emptyTitle }));
      empty.appendChild(App.el("p", { textContent: emptyText }));
      if (cta) empty.appendChild(App.el("a", { className: "btn btn-primary", href: cta.href, textContent: cta.text }));
      section.appendChild(empty);
    } else {
      var ul = App.el("ul", { className: "word-list" });
      words.forEach(function (w, i) {
        var li = App.el("li", {});
        var row = App.el("div", { className: "word-row", role: "group" });
        row.appendChild(App.el("span", { className: "word-idx", textContent: String(i + 1).padStart(2, "0") }));
        var link = App.el("a", {
          className: "word-name",
          href: "/learn?word_id=" + w.id + "&difficulty=" + encodeURIComponent(w.difficulty || "all"),
          textContent: w.word,
          style: "color:inherit;text-decoration:none;flex:1;"
        });
        row.appendChild(link);
        row.appendChild(App.el("span", {
          className: "badge badge-" + (w.difficulty || "easy"),
          textContent: w.difficulty || ""
        }));
        var reset = App.el("button", {
          type: "button",
          className: "reset-btn",
          "aria-label": "Clear status for " + w.word,
          title: "Clear status",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>'
        });
        reset.addEventListener("click", function () {
          Store.setWordStatus(w.id, null);
          App.toast("Status cleared for \"" + w.word + "\".");
          boot(); // re-render both sections
        });
        row.appendChild(reset);
        li.appendChild(row);
        ul.appendChild(li);
      });
      section.appendChild(ul);

      if (title === "Need Practice") {
        var practice = App.el("a", {
          className: "btn btn-primary btn-block",
          href: "/learn?mode=review&difficulty=all",
          textContent: "Practice These Words",
          style: "margin-top:12px;"
        });
        section.appendChild(practice);
      }
    }

    host.appendChild(section);
  }

  function boot() {
    var host = document.getElementById("review-main");
    if (!host) return;
    host.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';

    fetchAllWords().then(function (words) {
      var needPractice = Store.wordsByStatus(words, "review");
      var learned = Store.wordsByStatus(words, "learned");

      var wrap = App.el("div", {});
      renderSection(wrap, "Need Practice", needPractice,
        "Nothing to review",
        "Words you mark \u201cNeed Practice\u201d while learning will appear here.",
        { href: "/learn?difficulty=easy", text: "Start Learning" });
      renderSection(wrap, "Learned Words", learned,
        "No learned words yet",
        "Words you mark \u201cI Know This\u201d while learning will appear here.",
        null);

      host.innerHTML = "";
      host.appendChild(wrap);
    }).catch(function () {
      host.innerHTML = "";
      var box = App.el("div", { className: "empty" });
      box.appendChild(App.el("h2", { textContent: "Something went wrong." }));
      box.appendChild(App.el("p", { textContent: "Please try again." }));
      host.appendChild(box);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
