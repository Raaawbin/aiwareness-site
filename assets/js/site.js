/* =====================================================================
   AIwareness | Rebrand 2026 | site.js (no dependencies)
   Header and menu, language switch (EN / DE), reveal on scroll,
   card spotlight, starfield, event countdown, Substack signup.
   The inline script in <head> sets the language before first paint.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');
  window.AIW = true;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var LANG_KEY = 'aiw_lang';

  function lang() { return root.getAttribute('lang') === 'de' ? 'de' : 'en'; }
  function tr(en, de) { return lang() === 'de' ? de : en; }

  /* ---------- Clean links, also offline ----------
     Built links have no .html (aiwareness.space/about). GitHub Pages understands that,
     a page opened from Finder or a simple local server does not. There, add .html
     (and index.html for folder links) so the menu and all links keep working. */
  var cleanUrlsServed = /^(www\.)?aiwareness\.space$|\.github\.io$/.test(location.hostname);
  if (!cleanUrlsServed) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || /^(#|\?|\/\/|[a-z][a-z0-9+.-]*:)/i.test(href)) return;
      var m = href.match(/^([^?#]*)(.*)$/);
      var path = m[1], rest = m[2];
      if (!path) return;
      if (path.slice(-1) === '/' || path === '.' || path === '..') {
        path = (path.slice(-1) === '/' ? path : path + '/') + 'index.html';
      } else if (!/\.[a-z0-9]+$/i.test(path.split('/').pop())) {
        path += '.html';
      }
      a.setAttribute('href', path + rest);
    });
  }

  /* ---------- Header: scroll state and mobile menu ---------- */
  var head = document.getElementById('siteHead');
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function onScroll() {
    if (head) head.classList.toggle('scrolled', window.scrollY > 40);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open, restoreFocus) {
    if (!menu || !burger) return;
    menu.classList.toggle('open', open);
    head.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? tr('Close menu', 'Menü schließen') : tr('Open menu', 'Menü öffnen'));
    if (restoreFocus) burger.focus();
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menu.classList.contains('open')); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false, true);
    });
    document.addEventListener('pointerdown', function (e) {
      if (menu.classList.contains('open') && !head.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- Language switch ---------- */
  var switchLinks = document.querySelectorAll('[data-lang]');

  function applyLang(l, remember) {
    l = l === 'de' ? 'de' : 'en';
    root.setAttribute('lang', l);
    var title = root.getAttribute('data-title-' + l);
    if (title) document.title = title;
    var desc = root.getAttribute('data-desc-' + l);
    var meta = document.querySelector('meta[name="description"]');
    if (desc && meta) meta.setAttribute('content', desc);

    /* The choice is remembered in the browser only; links and the address bar stay clean. */
    if (remember) {
      try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* storage blocked */ }
    }

    switchLinks.forEach(function (a) {
      a.setAttribute('aria-pressed', a.getAttribute('data-lang') === l ? 'true' : 'false');
    });
    document.querySelectorAll('img[data-alt-en][data-alt-de]').forEach(function (img) {
      img.alt = img.getAttribute('data-alt-' + l);
    });
    document.querySelectorAll('.brand').forEach(function (b) {
      b.setAttribute('aria-label', tr('AIwareness home', 'AIwareness Startseite'));
    });
    if (menu) menu.setAttribute('aria-label', tr('Main', 'Hauptnavigation'));
    if (burger) burger.setAttribute('aria-label', menu && menu.classList.contains('open') ? tr('Close menu', 'Menü schließen') : tr('Open menu', 'Menü öffnen'));
    document.querySelectorAll('[data-countdown]').forEach(function (cd) {
      cd.setAttribute('aria-label', tr('Time until the evening starts', 'Zeit bis zum Beginn des Abends'));
    });
    updateEvents();
    try { window.dispatchEvent(new Event('aiw-lang')); } catch (e) { /* very old browsers */ }
  }

  switchLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      applyLang(a.getAttribute('data-lang'), true);
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal, .steps');
  if ('IntersectionObserver' in window && !reduceMotion) {
    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
      });
    }, 60);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Spotlight on cards: follows the pointer, not on touch ---------- */
  document.querySelectorAll('.panel').forEach(function (card) {
    var frame = 0, x = 0, y = 0;
    card.addEventListener('pointermove', function (e) {
      if (reduceMotion || !finePointer.matches) return;
      var box = card.getBoundingClientRect();
      x = e.clientX - box.left; y = e.clientY - box.top;
      if (frame) return;
      frame = requestAnimationFrame(function () {
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        frame = 0;
      });
    }, { passive: true });
    card.addEventListener('pointerleave', function () {
      cancelAnimationFrame(frame); frame = 0;
      card.style.removeProperty('--mx'); card.style.removeProperty('--my');
    });
  });

  /* ---------- Starfield (AIwareness), now in the rebrand colours ---------- */
  document.querySelectorAll('canvas[data-particles]').forEach(function (canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var density = parseFloat(canvas.getAttribute('data-particles')) || 1;
    var pts = [], w = 0, h = 0, raf = null, visible = true;
    var mouse = { x: -9999, y: -9999 };
    var colors = document.body.classList.contains('theme-classic')
      ? ['201,166,255', '76,201,240', '168,85,247', '255,255,255']
      : ['110,231,255', '167,139,250', '244,114,182', '253,186,116', '255,255,255', '255,255,255'];

    function build() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(110, (w * h) / 14000) * density);
      pts = [];
      for (var i = 0; i < count; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
          r: Math.random() * 1.6 + 0.4,
          c: colors[Math.floor(Math.random() * colors.length)],
          a: Math.random() * 0.5 + 0.35
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      var max = 130, max2 = max * max;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduceMotion) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
          var mdx = p.x - mouse.x, mdy = p.y - mouse.y, md = mdx * mdx + mdy * mdy;
          if (md < 22000) { var f = (22000 - md) / 22000 * 0.6; p.x += mdx / Math.sqrt(md + 1) * f; p.y += mdy / Math.sqrt(md + 1) * f; }
        }
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = dx * dx + dy * dy;
          if (d < max2) {
            ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.15 * (1 - d / max2)).toFixed(3) + ')';
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        var md2 = (p.x - mouse.x) * (p.x - mouse.x) + (p.y - mouse.y) * (p.y - mouse.y);
        if (md2 < 32000) {
          ctx.strokeStyle = 'rgba(167,139,250,' + (0.35 * (1 - md2 / 32000)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
        ctx.shadowColor = 'rgba(' + p.c + ',.9)';
        ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    function loop() {
      draw();
      raf = (visible && !document.hidden) ? requestAnimationFrame(loop) : null;
    }
    function start() { if (!raf && !reduceMotion) raf = requestAnimationFrame(loop); }

    build(); draw(); start();

    var host = canvas.parentElement;
    host.addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { build(); draw(); }, 150);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        visible = en[0].isIntersecting; if (visible) start();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) start(); });
  });

  /* ---------- Events: live / past state and countdown ---------- */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var eventEls = Array.prototype.slice.call(document.querySelectorAll('[data-event-start]'));

  function updateEvents() {
    var now = Date.now();
    eventEls.forEach(function (el) {
      var start = new Date(el.getAttribute('data-event-start')).getTime();
      var end = new Date(el.getAttribute('data-event-end') || el.getAttribute('data-event-start')).getTime();
      var status = el.querySelector('[data-status]');
      var cd = el.querySelector('[data-countdown]');
      if (now >= end) {
        el.classList.add('is-past'); el.classList.remove('is-live');
        if (status) status.textContent = tr('This evening has taken place', 'Dieser Abend hat stattgefunden');
        return;
      }
      if (now >= start) {
        el.classList.add('is-live');
        if (status) status.textContent = tr('Happening now', 'Läuft gerade');
        return;
      }
      if (cd) {
        var s = Math.floor((start - now) / 1000);
        var d = Math.floor(s / 86400); s -= d * 86400;
        var h = Math.floor(s / 3600); s -= h * 3600;
        var m = Math.floor(s / 60); s -= m * 60;
        cd.querySelector('[data-d]').textContent = d;
        cd.querySelector('[data-h]').textContent = pad(h);
        cd.querySelector('[data-m]').textContent = pad(m);
        cd.querySelector('[data-s]').textContent = pad(s);
      }
    });
  }
  if (eventEls.length) setInterval(updateEvents, 1000);

  /* ---------- Newsletter signup: Substack's embedded form ---------- */
  // Substack only allows its form inside pages served over http(s). A page opened
  // straight from disk (file://) gets an empty frame, so offer the link instead.
  var canEmbed = /^https?:$/.test(location.protocol);
  document.querySelectorAll('[data-signup]').forEach(function (box) {
    var wrap = box.querySelector('[data-signup-frame]');
    var iframe = wrap && wrap.querySelector('iframe');
    if (!iframe) return;
    if (!canEmbed) {
      iframe.remove();
      wrap.hidden = true;
      var alt = box.querySelector('[data-signup-alt]');
      if (alt) alt.hidden = true;
      var fb = box.querySelector('[data-signup-fallback]');
      if (fb) {
        fb.querySelector('[data-fallback-en]').textContent = 'Preview mode: Substack only shows its form on a live website, so here this opens Substack instead. On aiwareness.space the form appears right in this box.';
        fb.querySelector('[data-fallback-de]').textContent = 'Vorschau: Substack zeigt sein Formular nur auf einer echten Website. Hier öffnet der Button deshalb Substack. Auf aiwareness.space erscheint das Formular direkt in diesem Feld.';
        fb.hidden = false;
      }
      return;
    }
    var done = performance.getEntriesByName && performance.getEntriesByName(iframe.src).some(function (e) { return e.responseEnd > 0; });
    if (done) wrap.classList.add('ready');
    // Once someone types into the form, the next reload is Substack's reply: give it room.
    var engaged = false;
    window.addEventListener('blur', function () {
      setTimeout(function () { if (document.activeElement === iframe) engaged = true; }, 0);
    });
    iframe.addEventListener('load', function () {
      wrap.classList.add('ready');
      if (engaged) wrap.classList.add('expanded');
    });
  });

  /* ---------- Reading progress (newsletter notes) ---------- */
  var bar = document.querySelector('.progress i');
  var article = document.querySelector('[data-article]');
  if (bar && article) {
    var upd = function () {
      var r = article.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, -r.top / (total > 0 ? total : 1)));
      bar.style.transform = 'scaleX(' + p + ')';
    };
    upd();
    window.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
  }

  /* ---------- Legal pages: highlight the current section in the table of contents ---------- */
  var tocLinks = document.querySelectorAll('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          tocLinks.forEach(function (a) { a.classList.remove('on'); });
          map[en.target.id].classList.add('on');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) {
      var t = document.getElementById(id); if (t) tio.observe(t);
    });
  }

  /* ---------- Contact form: writes an email in the visitor's own mail app ---------- */
  // GitHub Pages cannot run a server script, so nothing is sent or stored by the site itself.
  var form = document.getElementById('contactForm');
  if (form) {
    var success = document.getElementById('formSuccess');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var v = function (id) { var el = form.querySelector('#' + id); return el ? el.value.trim() : ''; };
      var topic = form.querySelector('#topic');
      var topicText = topic ? topic.options[topic.selectedIndex].text : '';
      var subject = tr('Discovery call: ', 'Kennenlerngespräch: ') + topicText;
      var body = [
        tr('Name: ', 'Name: ') + v('name'),
        tr('Email: ', 'E-Mail: ') + v('email'),
        v('company') ? tr('Company & role: ', 'Organisation & Rolle: ') + v('company') : '',
        tr('Topic: ', 'Thema: ') + topicText,
        '',
        v('challenge')
      ].filter(function (line, i) { return line !== '' || i === 4; }).join('\n');
      location.href = 'mailto:hello@aiwareness.space?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      form.hidden = true;
      success.hidden = false;
    });
  }
  function syncOptions() {
    document.querySelectorAll('option[data-de]').forEach(function (o) {
      if (!o.hasAttribute('data-en')) o.setAttribute('data-en', o.textContent);
      o.textContent = o.getAttribute('data-' + lang());
    });
  }
  window.addEventListener('aiw-lang', syncOptions);

  /* ---------- Footer year ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* An old or shared link with ?lang=en|de still works: apply and remember it, then tidy the address bar. */
  var langParam = null;
  try { langParam = new URLSearchParams(location.search).get('lang'); } catch (e) { /* very old browsers */ }
  if (langParam === 'en' || langParam === 'de') {
    applyLang(langParam, true);
    try {
      var clean = new URL(location.href);
      clean.searchParams.delete('lang');
      history.replaceState(history.state, '', clean.pathname + clean.search + clean.hash);
    } catch (e) { /* very old browsers */ }
  } else {
    applyLang(lang(), false);
  }
})();
