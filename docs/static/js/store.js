/* ============================================================
   store.js — localStorage persistence for progress + daily goal
   Exposes: window.Store
   Keys:
     "ielts_vocab_progress_v1" → { "<wordId>": {status, updatedAt} }
     "ielts_vocab_goal"        → { date, target, learned: [wordIds] }
   ============================================================ */
(function () {
  "use strict";

  var PROGRESS_KEY = "ielts_vocab_progress_v1";
  var GOAL_KEY = "ielts_vocab_goal";
  var DEFAULT_TARGET = 10;

  function read(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable — app still works without persistence */ }
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* ---------- Word progress ---------- */
  function loadProgress() {
    var data = read(PROGRESS_KEY);
    return data && typeof data === "object" ? data : {};
  }

  function saveProgress(data) {
    write(PROGRESS_KEY, data);
  }

  // status: "learned" | "review" | null (null clears the entry)
  function setWordStatus(wordId, status) {
    var data = loadProgress();
    var key = String(wordId);
    if (status === null) {
      delete data[key];
    } else {
      data[key] = { status: status, updatedAt: new Date().toISOString() };
    }
    saveProgress(data);
  }

  function getWordStatus(wordId) {
    var entry = loadProgress()[String(wordId)];
    return entry ? entry.status : null;
  }

  // allWords: array of word objects (must have id + difficulty)
  function computeStats(allWords) {
    var progress = loadProgress();
    var per = {
      easy:   { total: 0, learned: 0, review: 0 },
      medium: { total: 0, learned: 0, review: 0 },
      hard:   { total: 0, learned: 0, review: 0 }
    };
    (allWords || []).forEach(function (w) {
      var bucket = per[w.difficulty];
      if (!bucket) return;
      bucket.total += 1;
      var status = progress[String(w.id)] ? progress[String(w.id)].status : null;
      if (status === "learned") bucket.learned += 1;
      else if (status === "review") bucket.review += 1;
    });
    var overall = { total: 0, learned: 0, review: 0 };
    Object.keys(per).forEach(function (k) {
      overall.total += per[k].total;
      overall.learned += per[k].learned;
      overall.review += per[k].review;
    });
    return { per: per, overall: overall };
  }

  /* ---------- Daily goal ---------- */
  function getGoal() {
    var goal = read(GOAL_KEY);
    var today = todayStr();
    if (!goal || goal.date !== today || !Array.isArray(goal.learned)) {
      goal = { date: today, target: (goal && goal.target) || DEFAULT_TARGET, learned: [] };
      write(GOAL_KEY, goal);
    }
    return goal;
  }

  function setGoalTarget(n) {
    var goal = getGoal();
    goal.target = n;
    write(GOAL_KEY, goal);
  }

  // Records a word learned today; returns today's count after adding.
  function markLearnedToday(wordId) {
    var goal = getGoal();
    var key = String(wordId);
    if (goal.learned.indexOf(key) === -1) {
      goal.learned.push(key);
      write(GOAL_KEY, goal);
    }
    return goal.learned.length;
  }

  function todayCount() {
    return getGoal().learned.length;
  }

  function wordsByStatus(allWords, status) {
    var progress = loadProgress();
    return (allWords || []).filter(function (w) {
      var entry = progress[String(w.id)];
      return entry && entry.status === status;
    }).sort(function (a, b) { return a.id - b.id; });
  }

  window.Store = {
    loadProgress: loadProgress,
    saveProgress: saveProgress,
    setWordStatus: setWordStatus,
    getWordStatus: getWordStatus,
    computeStats: computeStats,
    getGoal: getGoal,
    setGoalTarget: setGoalTarget,
    markLearnedToday: markLearnedToday,
    todayCount: todayCount,
    wordsByStatus: wordsByStatus
  };
})();
