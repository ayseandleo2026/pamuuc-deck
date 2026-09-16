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
