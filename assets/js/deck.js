/* PAMUUC Studio — Custom Wardrobe deck
   Three jobs: shrink-to-fit long localised strings exactly as the PDF build does,
   keep the chrome legible against whatever slide is on screen, and allow keyboard paging. */
(function () {
  "use strict";

  var MOBILE = window.matchMedia("(max-width: 900px)");
  var DARK_SLIDES = { 1: 1, 2: 1, 7: 1, 8: 1 };
  var deck = document.querySelector(".slides");
  var slides = [].slice.call(document.querySelectorAll(".slide"));
  if (!deck || !slides.length) return;

  /* ---- shrink-to-fit ------------------------------------------------ */
  function fitSlide(slide) {
    var stage = slide.querySelector(".stage");
    if (!stage) return;
    var u = stage.getBoundingClientRect().width / 1440;
    if (!u) return;
    [].forEach.call(slide.querySelectorAll(".b[data-min]"), function (el) {
      var fs0 = parseFloat(el.dataset.fs);
      var lh0 = parseFloat(el.dataset.lh);
      var min = parseFloat(el.dataset.min);
      var limit = parseFloat(el.dataset.h) * u + 0.75;
      var fs = fs0;
      el.style.setProperty("--fs", fs);
      el.style.setProperty("--lh", lh0);
      var guard = 0;
      while (el.scrollHeight > limit && fs > min && guard++ < 400) {
        fs -= 0.5;
        if (fs < min) fs = min;
        el.style.setProperty("--fs", fs);
        el.style.setProperty("--lh", lh0 * (fs / fs0));
      }
    });
  }

  function fitAll() {
    if (MOBILE.matches) return;
    slides.forEach(fitSlide);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAll);
  } else {
    window.addEventListener("load", fitAll);
  }
  fitAll();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fitAll, 120);
  });


  /* ---- consent-gated analytics --------------------------------------
     Mirrors pamuuc-studio.com: no request leaves the page until the
     visitor opts in. Slide depth is sent as a custom event because the
     deck scrolls inside a container, so GA's built-in scroll tracking
     never fires. */
  var CONSENT_KEY = "pamuuc-consent";
  var bar = document.querySelector("[data-consent]");
  var pending = [];
  var gaOn = false;

  function loadAnalytics() {
    var id = document.body.dataset.ga;
    if (gaOn || !id) return;
    gaOn = true;
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + id;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", id, {
      anonymize_ip: true,
      page_title: "Custom Wardrobe — " + (document.body.dataset.lang || "").toUpperCase()
    });
    pending.splice(0).forEach(function (e) { gtag("event", e[0], e[1]); });
  }

  function track(name, params) {
    params = params || {};
    params.deck_language = document.body.dataset.lang || "";
    if (gaOn && window.gtag) { window.gtag("event", name, params); }
    else if (pending.length < 40) { pending.push([name, params]); }
  }

  var stored = null;
  try { stored = localStorage.getItem(CONSENT_KEY); } catch (e) {}
  if (stored === "granted") loadAnalytics();

  if (bar) {
    if (!stored) {
      // hold the prompt back until the reader is past the cover, so the
      // first impression is the deck and not a consent dialog
      var reveal = function () { bar.hidden = false; };
      if ("IntersectionObserver" in window && slides[1]) {
        var ro = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { reveal(); ro.disconnect(); } });
        }, { threshold: 0.3 });
        ro.observe(slides[1]);
      } else {
        setTimeout(reveal, 6000);
      }
    }
    bar.addEventListener("click", function (e) {
      var act = e.target.closest("[data-consent-action]");
      if (!act) return;
      var v = act.dataset.consentAction;
      try { localStorage.setItem(CONSENT_KEY, v); } catch (err) {}
      if (v === "granted") loadAnalytics();
      else pending.length = 0;
      bar.hidden = true;
    });
  }

  /* the three things worth knowing about a prospect */
  var deepest = 0;
  function reportSlide(index) {
    var n = index + 1;
    if (n <= deepest) return;
    deepest = n;
    track("slide_view", { slide_number: n });
  }

  document.addEventListener("click", function (e) {
    var dl = e.target.closest(".dl");
    if (dl) { track("pdf_download", {}); return; }
    var link = e.target.closest(".b--email a, .b--phone a, .b--url a");
    if (link) {
      var kind = link.closest(".b--email") ? "email"
               : link.closest(".b--phone") ? "phone" : "website";
      track("contact_click", { contact_method: kind });
    }
  });

  /* ---- chrome tone + current slide ---------------------------------- */
  var current = 0;
  function setTone(index) {
    var n = index + 1;
    document.body.dataset.tone = DARK_SLIDES[n] ? "dark" : "light";
  }
  setTone(0);

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          current = slides.indexOf(entry.target);
          setTone(current);
          reportSlide(current);
        }
      });
    }, { threshold: [0.5, 0.75] });
    slides.forEach(function (s) { io.observe(s); });
  }

  /* ---- idle-fade the chrome while scrolling ------------------------- */
  var scrollTimer;
  deck.addEventListener("scroll", function () {
    document.body.classList.add("scrolling");
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      document.body.classList.remove("scrolling");
    }, 500);
  }, { passive: true });

  /* ---- keyboard paging ---------------------------------------------- */
  function goTo(index) {
    if (index < 0 || index >= slides.length) return;
    slides[index].scrollIntoView({ behavior: "smooth", block: "start" });
    current = index;
  }

  document.addEventListener("keydown", function (e) {
    if (MOBILE.matches) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    switch (e.key) {
      case "ArrowDown": case "PageDown": case " ": case "Enter":
        e.preventDefault(); goTo(current + 1); break;
      case "ArrowRight":
        e.preventDefault(); goTo(current + 1); break;
      case "ArrowUp": case "PageUp":
        e.preventDefault(); goTo(current - 1); break;
      case "ArrowLeft":
        e.preventDefault(); goTo(current - 1); break;
      case "Home":
        e.preventDefault(); goTo(0); break;
      case "End":
        e.preventDefault(); goTo(slides.length - 1); break;
    }
  });
})();
