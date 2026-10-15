/* ============================================================
   app.js — shared helpers, theme, navigation, TTS, toast
   Exposes: window.App
   ============================================================ */
(function () {
  "use strict";

  var THEME_KEY = "ielts_vocab_theme";

  /* ---------- HTML helpers ---------- */
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // el("div", {className:"x", textContent:"hi"}, [children...])
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      if (key === "textContent") node.textContent = attrs[key];
      else if (key === "innerHTML") node.innerHTML = attrs[key];
      else if (key === "style") node.setAttribute("style", attrs[key]);
      else if (key === "dataset") {
        Object.keys(attrs.dataset).forEach(function (d) { node.dataset[d] = attrs.dataset[d]; });
      } else if (key in node && key !== "class" && key !== "for") {
        node[key] = attrs[key];
      } else {
        node.setAttribute(key === "className" ? "class" : key, attrs[key]);
      }
    });
    (children || []).forEach(function (child) {
      if (child === null || child === undefined) return;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    });
    return node;
  }

  /* ---------- Theme ---------- */
  function getTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) { /* storage unavailable */ }
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    return "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var isDark = theme === "dark";
      btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      btn.innerHTML = isDark ? ICON_SUN : ICON_MOON;
    }
  }

  var ICON_SUN =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  var ICON_MOON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  function initTheme() {
    applyTheme(getTheme());
    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
        applyTheme(next);
      });
    }
  }

  /* ---------- Active nav highlighting ---------- */
  function initNav() {
    var path = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll("[data-nav]").forEach(function (link) {
      var href = link.getAttribute("data-nav");
      var normalized = href;
      if (normalized === path) link.classList.add("active");
    });
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(message) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = message;
    t.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- Text-to-speech ---------- */
  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    try {
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.9;
      var voices = window.speechSynthesis.getVoices();
      var enVoice = voices.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf("en-us") === 0; }) ||
                    voices.find(function (v) { return v.lang && v.lang.toLowerCase().indexOf("en") === 0; });
      if (enVoice) utter.voice = enVoice;
      window.speechSynthesis.speak(utter);
    } catch (e) { /* TTS not available */ }
  }

  // Voices load async on some browsers; warm them up once.
  if ("speechSynthesis" in window) {
    try { window.speechSynthesis.getVoices(); } catch (e) { /* ignore */ }
  }

  /* ---------- Fetch helper ---------- */
  function getJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Request failed: " + res.status);
      return res.json();
    });
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  /* ---------- Init on DOM ready ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initNav();
  });

  window.App = {
    escapeHtml: escapeHtml,
    el: el,
    toast: toast,
    speak: speak,
    getJSON: getJSON,
    params: params,
    ICON_SUN: ICON_SUN,
    ICON_MOON: ICON_MOON
  };
})();
