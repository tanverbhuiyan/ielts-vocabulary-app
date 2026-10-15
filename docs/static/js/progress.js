/* ============================================================
   progress.js — progress overview for /progress
   ============================================================ */
(function () {
  "use strict";

  var LEVELS = [
    { key: "easy", title: "Easy" },
    { key: "medium", title: "Medium" },
    { key: "hard", title: "Hard" }
  ];

  function pct(done, total) {
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }

  function bar(percent, green) {
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

  function renderOverall(host, stats) {
    var o = stats.overall;
    var p = pct(o.learned, o.total);
    var block = App.el("div", { className: "card progress-block" });
    block.appendChild(App.el("h2", { textContent: "Overall Progress" }));
    var head = App.el("div", { className: "diff-head", style: "display:flex;justify-content:space-between;margin-bottom:6px;" });
    head.appendChild(App.el("span", { textContent: o.learned + " of " + o.total + " words learned" }));
    head.appendChild(App.el("strong", { textContent: p + "%" }));
    block.appendChild(head);
    block.appendChild(bar(p, true));
    host.appendChild(block);
  }

  function renderByDifficulty(host, stats) {
    var block = App.el("div", { className: "card progress-block" });
    block.appendChild(App.el("h2", { textContent: "Progress by Difficulty" }));
    LEVELS.forEach(function (lvl) {
      var s = stats.per[lvl.key] || { total: 0, learned: 0 };
      var p = pct(s.learned, s.total);
      var row = App.el("div", { className: "diff-row" });
      var head = App.el("div", { className: "diff-head" });
      head.appendChild(App.el("strong", { textContent: lvl.title }));
      head.appendChild(App.el("span", { textContent: s.learned + " / " + s.total + " learned (" + p + "%)" }));
      row.appendChild(head);
      row.appendChild(bar(p, false));
      block.appendChild(row);
    });
    host.appendChild(block);
  }

  function renderGoal(host) {
    var goal = Store.getGoal();
    var card = App.el("div", { className: "card progress-block" });
    card.appendChild(App.el("h2", { textContent: "Today's Goal" }));

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
        refresh();
      });
      selector.appendChild(b);
    });
    card.appendChild(selector);

    var barHost = App.el("div", { className: "goal-progress" });
    var countEl = App.el("p", { className: "goal-count" });
    card.appendChild(barHost);
    card.appendChild(countEl);

    function refresh() {
      var g = Store.getGoal();
      barHost.innerHTML = "";
      barHost.appendChild(bar(pct(g.learned.length, g.target), true));
      countEl.innerHTML = "";
      countEl.appendChild(App.el("strong", { textContent: g.learned.length + " / " + g.target }));
      countEl.appendChild(document.createTextNode(" words learned today"));
    }
    refresh();
    host.appendChild(card);
  }

  function renderStatsGrid(host, stats) {
    var o = stats.overall;
    var row = App.el("div", { className: "stats-row" });
    [
      { num: o.learned, label: "Learned" },
      { num: o.review, label: "Need Practice" },
      { num: o.total - o.learned, label: "Remaining" },
      { num: o.total, label: "Total Words" }
    ].forEach(function (s) {
      var box = App.el("div", { className: "stat" });
      box.appendChild(App.el("div", { className: "num", textContent: String(s.num) }));
      box.appendChild(App.el("div", { className: "label", textContent: s.label }));
      row.appendChild(box);
    });
    host.appendChild(row);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var host = document.getElementById("progress-main");
    if (!host) return;
    host.innerHTML = '<div class="loading"><div class="spinner"></div>Loading…</div>';

    fetchAllWords().then(function (words) {
      var stats = Store.computeStats(words);
      host.innerHTML = "";
      renderOverall(host, stats);
      renderByDifficulty(host, stats);
      renderGoal(host);
      renderStatsGrid(host, stats);
    }).catch(function () {
      host.innerHTML = "";
      var box = App.el("div", { className: "empty" });
      box.appendChild(App.el("h2", { textContent: "Something went wrong." }));
      box.appendChild(App.el("p", { textContent: "Please try again." }));
      host.appendChild(box);
    });
  });
})();
