/* AIwareness — site behaviour (no dependencies) */
(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  window.AIW = true;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header: scroll state + mobile menu ---------- */
  var header = document.querySelector('.site-header');
  var toggle = document.getElementById('menuToggle');
  var links = document.getElementById('navLinks');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) {
    if (!header || !toggle) return;
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      setMenu(!header.classList.contains('menu-open'));
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (header.classList.contains('menu-open') && !header.contains(e.target)) setMenu(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal, .steps');
  // Content already on screen at load reveals right away; the rest waits for scroll.
  var showInView = function () {
    revealEls.forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
    });
  };
  if ('IntersectionObserver' in window && !reduceMotion) {
    setTimeout(showInView, 60);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Spotlight cards (cursor-follow glow) ---------- */
  document.querySelectorAll('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Particle constellation ---------- */
  document.querySelectorAll('canvas[data-particles]').forEach(function (canvas) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var density = parseFloat(canvas.getAttribute('data-particles')) || 1;
    var pts = [], w = 0, h = 0, raf = null, visible = true;
    var mouse = { x: -9999, y: -9999 };
    var colors = ['201,166,255', '76,201,240', '168,85,247', '255,255,255'];

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
            ctx.strokeStyle = 'rgba(' + p.c + ',' + (0.16 * (1 - d / max2)).toFixed(3) + ')';
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        var md2 = (p.x - mouse.x) * (p.x - mouse.x) + (p.y - mouse.y) * (p.y - mouse.y);
        if (md2 < 32000) {
          ctx.strokeStyle = 'rgba(201,166,255,' + (0.35 * (1 - md2 / 32000)).toFixed(3) + ')';
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

  /* ---------- Events: live / past state + countdown ---------- */
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  document.querySelectorAll('[data-event-start]').forEach(function (el) {
    var start = new Date(el.getAttribute('data-event-start')).getTime();
    var end = new Date(el.getAttribute('data-event-end') || el.getAttribute('data-event-start')).getTime();
    var cd = el.querySelector('[data-countdown]');
    var status = el.querySelector('[data-status]');
    var timer;
    function tick() {
      var now = Date.now();
      if (now >= end) {
        el.classList.add('is-past'); el.classList.remove('is-live');
        if (status) status.textContent = 'This evening has taken place';
        clearInterval(timer); return;
      }
      if (now >= start) {
        el.classList.add('is-live');
        if (status) status.textContent = 'Happening now';
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
    }
    tick();
    timer = setInterval(tick, 1000);
  });

  /* ---------- Reading progress ---------- */
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

  /* ---------- Legal TOC: highlight current section ---------- */
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

  /* ---------- Contact form (posts to send.php) ---------- */
  var form = document.getElementById('contactForm');
  if (form) {
    var statusEl = document.getElementById('formStatus');
    var success = document.getElementById('formSuccess');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var btn = form.querySelector('button[type=submit]');
      var label = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = 'Sending…';
      statusEl.hidden = true;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('http'); return r.json().catch(function () { return { ok: true }; }); })
        .then(function (d) {
          if (d && d.ok === false) throw new Error(d.error || 'failed');
          form.hidden = true; success.hidden = false;
          success.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        })
        .catch(function () {
          btn.disabled = false; btn.innerHTML = label; statusEl.hidden = false;
          statusEl.innerHTML = 'Sorry, something went wrong sending your message. Please email us directly at <a href="mailto:hello@aiwareness.space">hello@aiwareness.space</a> and we\'ll get right back to you.';
        });
    });
  }
})();
