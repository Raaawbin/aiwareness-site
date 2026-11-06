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

  /* ---------- Shared links with an anchor (e.g. events#Talk): land exactly there once images have loaded ---------- */
  window.addEventListener('load', function () {
    var id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
    var target = id && document.getElementById(id);
    if (!target) return;
    /* Jump without the smooth animation from the CSS, then restore it. */
    var html = document.documentElement, prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'start' });
    html.style.scrollBehavior = prev;
  });

  /* ---------- Click-to-play YouTube: the player (youtube-nocookie.com) loads only after a click ---------- */
  document.querySelectorAll('[data-yt]').forEach(function (box) {
    var btn = box.querySelector('.yt-poster');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.getAttribute('data-yt') + '?autoplay=1&rel=0';
      f.title = btn.textContent.replace(/\s+/g, ' ').trim();
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      btn.replaceWith(f);
      f.focus();
    });
  });

  /* ---------- Starfield (AIwareness), now in the rebrand colours ---------- */
  document.querySelectorAll('canvas[data-particles]').forEach(function (canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    /* Phones and tablets: fewer stars, no per-star blur and a lighter pixel ratio, so the animation stays smooth. */
    var coarse = window.matchMedia('(pointer: coarse)').matches;
    var dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    var density = parseFloat(canvas.getAttribute('data-particles')) || 1;
    var pts = [], w = 0, h = 0, raf = null, last = 0, visible = true;
    var mouse = { x: -9999, y: -9999 };
    var colors = document.body.classList.contains('theme-classic')
      ? ['201,166,255', '76,201,240', '168,85,247', '255,255,255']
      : ['110,231,255', '167,139,250', '244,114,182', '253,186,116', '255,255,255', '255,255,255'];

    function spawn() {
      return {
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.4,
        c: colors[Math.floor(Math.random() * colors.length)],
        a: Math.random() * 0.5 + 0.35
      };
    }
    function countFor() {
      var n = Math.round(Math.min(110, (w * h) / 14000) * density);
      return coarse ? Math.min(n, 55) : n;
    }

    /* Matches the bitmap to the size on screen. The stars are kept and only moved with the new size, never
       drawn again from scratch: that restart was what made them jump on phones, where scrolling slides the
       browser bars in and out and fires resize events. */
    function fit() {
      var rect = canvas.getBoundingClientRect();
      var nw = rect.width, nh = rect.height;
      if (!nw || !nh) return;
      if (Math.abs(nw - w) < 1 && Math.abs(nh - h) < 1) return;
      var sx = w ? nw / w : 1, sy = h ? nh / h : 1;
      w = nw; h = nh;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts.forEach(function (p) { p.x *= sx; p.y *= sy; });
      var n = countFor();
      while (pts.length < n) pts.push(spawn());
      if (pts.length > n) pts.length = n;
      draw(0);
    }

    /* dt is the time since the last frame in 60 Hz frames, so the speed is the same on 60, 90 and 120 Hz screens. */
    function draw(dt) {
      ctx.clearRect(0, 0, w, h);
      var max = coarse ? 110 : 130, max2 = max * max;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduceMotion && dt) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
          if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
          var mdx = p.x - mouse.x, mdy = p.y - mouse.y, md = mdx * mdx + mdy * mdy;
          if (md < 22000) { var f = (22000 - md) / 22000 * 0.6 * dt; p.x += mdx / Math.sqrt(md + 1) * f; p.y += mdy / Math.sqrt(md + 1) * f; }
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
        if (coarse) {   /* a soft halo instead of shadowBlur, which is slow on phones */
          ctx.fillStyle = 'rgba(' + p.c + ',' + (p.a * 0.18).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(' + p.c + ',' + p.a + ')';
          ctx.shadowColor = 'rgba(' + p.c + ',.9)';
          ctx.shadowBlur = 6;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    function loop(t) {
      var dt = last ? Math.min((t - last) / 16.667, 3) : 1;   /* capped, so a pause never makes the stars leap */
      last = t;
      draw(dt);
      raf = (visible && !document.hidden) ? requestAnimationFrame(loop) : null;
      if (!raf) last = 0;
    }
    function start() { if (!raf && !reduceMotion) { last = 0; raf = requestAnimationFrame(loop); } }

    fit(); draw(0); start();

    var host = canvas.parentElement;
    /* Only a mouse pushes the stars. A finger that scrolls the page must not. */
    host.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

    /* The hero can change height after load (fonts, images, language), without any window resize. */
    var ft = 0;
    function refit() { cancelAnimationFrame(ft); ft = requestAnimationFrame(fit); }
    if ('ResizeObserver' in window) new ResizeObserver(refit).observe(canvas);
    else window.addEventListener('resize', refit);

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

  /* ---------- Lead forms (contact, event sign-up and more): Google Apps Script ----------
     Posts to the web app in data-leads (source: _server/apps-script/aiwareness-leads.gs), which saves
     the row in the Google Sheet "AIwareness Leads", emails the team inbox and, if the
     optional newsletter box is ticked, adds the person to Mailchimp with double opt-in. */
  document.querySelectorAll('form[data-leads]').forEach(function (lf) {
    var card = lf.parentNode;
    var ok = card.querySelector('[data-success]');
    var err = lf.querySelector('[data-error]');
    var pre = null;   /* ?event=key (or the form's data-param, e.g. ?topic=key) preselects an option */
    try { pre = new URLSearchParams(location.search).get(lf.getAttribute('data-param') || 'event'); } catch (e) { /* very old browsers */ }
    if (pre) {
      var opt = lf.querySelector('option[data-key="' + pre.replace(/[^\w-]/g, '') + '"]');
      if (opt) opt.selected = true;
    }
    lf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!lf.checkValidity()) { lf.reportValidity(); return; }
      if (lf.getAttribute('data-busy')) return;   /* already sending: a second submit must not send twice */
      lf.setAttribute('data-busy', '1');
      var url = lf.getAttribute('data-leads');
      var btn = lf.querySelector('button[type=submit]');
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = tr('Sending…', 'Wird gesendet…');
      err.hidden = true;
      lf.elements.lang.value = lang();
      lf.elements.page.value = location.pathname;
      var nlField = lf.elements.newsletter;   /* a checkbox, or a hidden field when one box covers privacy and newsletter */
      var wantsNl = !!nlField && (nlField.type === 'checkbox' ? nlField.checked : nlField.value === 'yes');
      var fail = function () { lf.removeAttribute('data-busy'); btn.disabled = false; btn.innerHTML = label; err.hidden = false; };
      if (!url) { fail(); return; }
      var ctrl = window.AbortController ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 45000) : null;
      /* URL-encoded body: a "simple" request, so the browser sends no CORS preflight to Google. */
      fetch(url, { method: 'POST', body: new URLSearchParams(new FormData(lf)), signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error((d && d.error) || 'failed');
          lf.hidden = true;
          ok.hidden = false;
          var nl = ok.querySelector('[data-success-nl]');
          if (nl) nl.hidden = !wantsNl;
          ok.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        })
        .catch(fail)
        .then(function () { if (timer) clearTimeout(timer); });
    });
  });

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
