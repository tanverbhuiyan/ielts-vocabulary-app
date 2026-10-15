/* ============================================================
   data.js — static data layer for the GitHub Pages build.
   Loads data/vocabulary.json once, then answers the same queries
   the FastAPI backend used to serve (/api/words, /api/search).
   Exposes: window.VocabAPI { words(difficulty), search(q) }
   ============================================================ */
(function () {
  "use strict";

  var cache = null;

  function load() {
    if (!cache) {
      cache = fetch("data/vocabulary.json").then(function (res) {
        if (!res.ok) throw new Error("Word data failed to load: " + res.status);
        return res.json();
      });
    }
    return cache;
  }

  // Mirror of GET /api/words?difficulty=easy|medium|hard
  function words(difficulty) {
    return load().then(function (all) {
      if (!difficulty) return all.slice();
      var d = String(difficulty).toLowerCase();
      return all.filter(function (w) { return w.difficulty === d; });
    });
  }

  // Mirror of GET /api/search?q=... (word OR bangla meaning, case-insensitive)
  function search(q) {
    var needle = (q || "").trim().toLowerCase();
    if (!needle) return Promise.reject(new Error("Missing search query"));
    return load().then(function (all) {
      return all.filter(function (w) {
        return (w.word && w.word.toLowerCase().indexOf(needle) !== -1) ||
               (w.bangla_meaning && w.bangla_meaning.toLowerCase().indexOf(needle) !== -1);
      });
    });
  }

  window.VocabAPI = { words: words, search: search };
})();
