/* ============================================================
   home.js — dashboard for / (index.html)
   ============================================================ */
(function () {
  "use strict";

  var LEVELS = [
    { key: "easy",   title: "Easy",   tagline: "Start with the basics", css: "level-easy" },
    { key: "medium", title: "Medium", tagline: "Build your vocabulary", css: "level-medium" },
    { key: "hard",   title: "Hard",   tagline: "Challenge yourself",    css: "level-hard" }
  ];

  var MOTIVATIONS = [
    "Small steps every day lead to big results.",
    "Consistency beats intensity. Keep going.",
    "Every word you learn is progress."
  ];

  function pct(done, total) {
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  function progressBar(percent, green) {
    var track = App.el("div", { className: "progress-track" });
    var fill = App.el("div", { className: "progress-fill" + (green ? " green" : "") });
    fill.style.width = percent + "%";
    track.appendChild(fill);
    return track;
  }

  function fetchAllWords() {
    return Promise.all([
      VocabAPI.words("easy"),
      VocabAPI.words("medium"),
      VocabAPI.words("hard")
    ]).then(function (parts) {
      return parts[0].concat(parts[1], parts[2]);
    });
  }

  function renderLevels(host, stats) {
    var grid = App.el("div", { className: "grid-3" });
    LEVELS.forEach(function (lvl) {
      var s = stats.per[lvl.key] || { total: 0, learned: 0 };
      var p = pct(s.learned, s.total);
      var card = App.el("div", { className: "card level-card " + lvl.css });

      var name = App.el("div", { className: "level-name", textContent: lvl.title });
      var h = App.el("h2", { textContent: lvl.title + " Words" });
      var tag = App.el("p", { className: "tagline", textContent: lvl.tagline });
      var meta = App.el("div", { className: "level-meta" });
      meta.appendChild(App.el("span", {}, [
        App.el("strong", { textContent: String(s.total) }), " words"
      ]));
      meta.appendChild(App.el("span", { textContent: p + "% learned" }));

      var btn = App.el("a", {
        className: "btn btn-primary btn-block",
        href: "learn.html?difficulty=" + lvl.key,
        textContent: s.learned > 0 && s.learned < s.total ? "Continue" : "Start Learning"
      });

      [name, h, tag, meta, progressBar(p, true), btn].forEach(function (n) { card.appendChild(n); });
      grid.appendChild(card);
    });
    host.appendChild(grid);
  }

  function renderOverall(host, stats) {
    var o = stats.overall;
    var remaining = o.total - o.learned;
    var p = pct(o.learned, o.total);
    var row = App.el("div", { className: "stats-row" });
    [
      { num: o.total, label: "Total Words" },
      { num: o.learned, label: "Learned" },
      { num: remaining, label: "Remaining" },
      { num: p + "%", label: "Overall Progress" }
    ].forEach(function (s) {
      var box = App.el("div", { className: "stat" });
      box.appendChild(App.el("div", { className: "num", textContent: String(s.num) }));
      box.appendChild(App.el("div", { className: "label", textContent: s.label }));
      row.appendChild(box);
    });
    host.appendChild(row);
  }

  function renderGoal(host, stats) {
    var goal = Store.getGoal();
    var count = goal.learned.length;
    var card = App.el("div", { className: "card goal-card" });

    var top = App.el("div", { className: "goal-top" });
    top.appendChild(App.el("h2", { textContent: "Today's Goal" }));

    var selector = App.el("div", { className: "target-select", role: "group", "aria-label": "Daily word target" });
    [5, 10, 15, 20].forEach(function (n) {
      var b = App.el("button", {
        type: "button",
        textContent: String(n),
        "aria-label": "Set daily target to " + n + " words"
      });
      if (goal.target === n) b.classList.add("active");
      b.addEventListener("click", function () {
        Store.setGoalTarget(n);
        selector.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); });
        b.classList.add("active");
        refreshGoalNumbers();
      });
      selector.appendChild(b);
    });
    top.appendChild(selector);
    card.appendChild(top);

    var barHost = App.el("div", { className: "goal-progress" });
    var countEl = App.el("p", { className: "goal-count" });
    card.appendChild(barHost);
    card.appendChild(countEl);

    function refreshGoalNumbers() {
      var g = Store.getGoal();
      var p = pct(g.learned.length, g.target);
      barHost.innerHTML = "";
      barHost.appendChild(progressBar(p, true));
      countEl.innerHTML = "";
      countEl.appendChild(App.el("strong", { textContent: g.learned.length + " / " + g.target }));
      countEl.appendChild(document.createTextNode(" words learned today"));
    }
    refreshGoalNumbers();

    // Continue Learning → first difficulty that still has unlearned words
    var next = "easy";
    for (var i = 0; i < LEVELS.length; i++) {
      var s = stats.per[LEVELS[i].key];
      if (s && s.learned < s.total) { next = LEVELS[i].key; break; }
    }
    var cont = App.el("a", {
      className: "btn btn-secondary btn-block",
      href: "learn.html?difficulty=" + next,
      textContent: "Continue Learning"
    });
    card.appendChild(cont);
    host.appendChild(card);
  }

  function clearLoading(host) {
    var l = host.querySelector(".loading");
    if (l) l.remove();
  }

  function renderMotivation(host) {
    var p = App.el("p", {
      className: "motivation",
      textContent: MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]
    });
    host.appendChild(p);
  }

  function renderError(host) {
    clearLoading(host);
    var box = App.el("div", { className: "empty" });
    box.appendChild(App.el("h2", { textContent: "Could not load vocabulary" }));
    box.appendChild(App.el("p", { textContent: "Something went wrong. Please try again." }));
    var retry = App.el("button", { className: "btn btn-primary", type: "button", textContent: "Retry" });
    retry.addEventListener("click", function () { window.location.reload(); });
    box.appendChild(retry);
    host.appendChild(box);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var hero = document.getElementById("hero");
    var main = document.getElementById("home-main");
    if (!hero || !main) return;

    fetchAllWords().then(function (words) {
      clearLoading(main);
      var stats = Store.computeStats(words);
      renderLevels(main, stats);
      renderOverall(main, stats);
      renderGoal(main, stats);
      renderMotivation(hero);
    }).catch(function () {
      renderError(main);
    });
  });
})();
