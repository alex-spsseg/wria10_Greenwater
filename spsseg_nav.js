/* spsseg_nav.js
   Shared by the SPSSEG tour, terrain and flow viewers: the Tour / Terrain / Flow pill and the first visit help chips.
   Host ONE copy of this file (the viewers load it from SHARED_NAV_URL), so a change here reaches every published site
   without republishing. Each viewer also keeps a same folder copy named spsseg_nav.js as a fallback.

   SpssegNav.version
   SpssegNav.renderPill(el, opts)   draws the pill into el
     opts.current      'tour' | 'terrain' | 'flow'   (the viewer drawing it)
     opts.links        { tour, terrain, flow }        addresses, '' or missing when unknown
     opts.hrefFor      { tour, terrain, flow }        optional functions that return the address at click time
     opts.showMissing  true shows unlinked viewers greyed out; false leaves them out
     opts.hideEmpty    true hides the whole pill when nothing else is linked
     opts.newTab       { tour, terrain, flow } true opens that one in a new tab
   SpssegNav.tips(opts)             first visit help chips, returns { start, startWhen, used, mark, place, hide }
     opts.key          localStorage key that remembers which tips were seen
     opts.defs()       returns [{ id, title, text, find(), side, art() }]
     opts.panel        the side panel element (chips for side controls sit beside it)
     opts.onPhone()    true on a phone sized screen
     opts.artRoom()    optional, false leaves the small example pictures out
     opts.help         the ? button, optional
     opts.toggle       the show or hide controls button, optional
     opts.beforeHelp() optional, runs before the ? replays the tips
*/
(function () {
  if (window.SpssegNav) return;

  var CSS = [
    '.snav { display: flex; align-items: center; background: rgba(14,27,51,0.94); border: 1px solid #1b3f95; border-radius: 22px; padding: 4px; }',
    '.snav a, .snav span { padding: 7px 14px; border-radius: 16px; font-size: 13px; text-decoration: none; color: #e8eef7; }',
    '.snav a:hover { background: #132447; }',
    '.snav span.cur { background: #019fc4; color: #fff; font-weight: 600; }',
    '.snav span.off { color: #5d7396; cursor: default; }',
    '@media (max-width: 700px) { .snav a, .snav span { padding: 6px 12px; font-size: 12px; } }',
    '.hintchip { position: fixed; z-index: 4000; background: #0e1b33; border: 1px solid #ffd23f; border-radius: 12px; padding: 15px 17px 13px; color: #fff; font-size: 16px; line-height: 1.4; box-shadow: 0 6px 22px rgba(0,0,0,0.55); font-family: -apple-system, Segoe UI, Roboto, sans-serif; }',
    '.hintchip b { display: block; margin-bottom: 3px; font-size: 17.5px; }',
    '.hintchip .hbtns { display: flex; align-items: center; gap: 10px; margin-top: 12px; }',
    '.hintchip .hbtns button { width: auto; margin: 0; background: #132447; border: 1px solid #1b3f95; color: #fff; border-radius: 18px; padding: 8px 20px; font-size: 15px; cursor: pointer; font-family: inherit; }',
    '.hintchip .hbtns .go { background: #019fc4; border-color: #019fc4; }',
    '.hintchip .hbtns .skip { background: none; border: 0; color: #9fb2cc; text-decoration: underline; padding: 6px 2px; }',
    '.hintchip .hstep { margin-left: auto; font-size: 13px; color: #9fb2cc; }',
    '.hintchip .arrow { position: absolute; width: 13px; height: 13px; background: #0e1b33; border: 1px solid #ffd23f; transform: rotate(45deg); display: none; }',
    '.hintchip.side .arrow { display: block; left: -7px; border-top: 0; border-right: 0; }',
    '.hintchip.above .arrow { display: block; bottom: -7px; border-top: 0; border-left: 0; }',
    '.hintchip.below .arrow { display: block; top: -7px; border-bottom: 0; border-right: 0; }',
    '.hintglow { outline: 3px solid rgba(255,210,63,0.95) !important; outline-offset: 2px; animation: hintpulse 1.4s ease-in-out infinite; }',
    '@keyframes hintpulse { 0%, 100% { outline-color: rgba(255,210,63,0.95); } 50% { outline-color: rgba(255,210,63,0.25); } }'
  ].join('\n');
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  (document.head || document.documentElement).appendChild(styleEl);

  // ---- the Tour / Terrain / Flow pill ---------------------------------------
  var NAMES = [['tour', 'Tour'], ['terrain', 'Terrain'], ['flow', 'Flow']];

  function renderPill(el, o) {
    if (!el) return;
    o = o || {};
    var links = o.links || {}, hrefFor = o.hrefFor || {}, any = false;
    el.classList.add('snav');
    el.setAttribute('role', 'navigation');
    el.setAttribute('aria-label', 'Other viewers for this place');
    el.innerHTML = '';
    NAMES.forEach(function (p) {
      var k = p[0], label = p[1], node;
      if (k === o.current) {
        node = document.createElement('span'); node.className = 'cur';
      } else if (links[k]) {
        any = true;
        node = document.createElement('a');
        node.href = hrefFor[k] ? hrefFor[k]() : links[k];
        if (hrefFor[k]) {
          node.onmouseenter = function () { node.href = hrefFor[k](); };
          node.onclick = function (e) {
            e.preventDefault();
            if (o.newTab && o.newTab[k]) window.open(hrefFor[k](), '_blank', 'noopener'); else location.href = hrefFor[k]();
          };
        }
      } else if (o.showMissing) {
        node = document.createElement('span'); node.className = 'off';
        node.title = 'No ' + label.toLowerCase() + ' linked for this site';
      } else {
        return;
      }
      node.id = 'sw' + k;
      node.textContent = label;
      el.appendChild(node);
    });
    el.style.display = (any || o.showMissing || !o.hideEmpty) ? '' : 'none';
    return any;
  }

  // ---- first visit help chips ------------------------------------------------
  function tips(o) {
    var T = { list: [], i: 0, el: null, target: null, onUse: null };
    var key = o.key || 'spssegTips';
    function done() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; } }
    function mark(id) { var d = done(); d[id] = 1; try { localStorage.setItem(key, JSON.stringify(d)); } catch (e) {} }
    function phone() { return o.onPhone ? !!o.onPhone() : !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches); }
    function seen(el) { if (!el) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }

    function hide() {
      if (T.el) { T.el.remove(); T.el = null; }
      if (T.target) { T.target.classList.remove('hintglow'); if (T.onUse) T.target.removeEventListener('click', T.onUse); }
      T.target = null; T.onUse = null;
    }
    function place() {
      var el = T.el, d = T.list[T.i]; if (!el || !d) return;
      var vw = window.innerWidth, vh = window.innerHeight, w = Math.min(340, vw - 16), left, top, t = d.find ? d.find() : null;
      el.style.width = w + 'px'; el.classList.remove('above', 'below', 'side');
      if (d.find && !seen(t)) { el.style.display = 'none'; return; }
      el.style.display = '';
      var h = el.offsetHeight;
      if (!d.find) { left = (vw - w) / 2; top = Math.max(8, vh * 0.3); }
      else if (d.side && !phone() && o.panel) {
        var rs = t.getBoundingClientRect(), pr = o.panel.getBoundingClientRect();
        left = Math.min(vw - w - 8, pr.right + 14); top = Math.max(8, Math.min(vh - h - 8, rs.top + rs.height / 2 - h / 2));
        el.classList.add('side'); el.querySelector('.arrow').style.top = Math.max(10, Math.min(h - 22, rs.top + rs.height / 2 - top - 6)) + 'px';
      } else {
        var r = t.getBoundingClientRect(), cx = r.left + r.width / 2, above = (r.top + r.height / 2) > vh / 2;
        left = Math.max(8, Math.min(vw - w - 8, cx - w / 2)); top = above ? r.top - h - 14 : r.bottom + 14; top = Math.max(8, Math.min(vh - h - 8, top));
        el.classList.add(above ? 'above' : 'below'); el.querySelector('.arrow').style.left = Math.max(10, Math.min(w - 22, cx - left - 6)) + 'px';
      }
      el.style.left = left + 'px'; el.style.top = top + 'px';
    }
    function show() {
      hide();
      while (T.i < T.list.length) { var d0 = T.list[T.i]; if (!d0.find || seen(d0.find())) break; T.i++; }
      if (T.i >= T.list.length) return;
      var d = T.list[T.i], t = d.find ? d.find() : null, last = T.i === T.list.length - 1;
      var el = document.createElement('div'); el.className = 'hintchip'; el.setAttribute('role', 'dialog');
      el.innerHTML = '<b></b><span></span><div class="hbtns"><button type="button" class="go"></button><button type="button" class="skip">Skip tips</button><span class="hstep"></span></div><i class="arrow"></i>';
      el.querySelector('b').textContent = d.title; el.querySelector('span').textContent = d.text;
      if (d.art && (!o.artRoom || o.artRoom())) el.insertBefore(d.art(), el.querySelector('.hbtns'));
      el.querySelector('.go').textContent = last ? 'Done' : 'Got it'; el.querySelector('.hstep').textContent = (T.i + 1) + ' of ' + T.list.length;
      el.querySelector('.go').addEventListener('click', function () { mark(d.id); next(); });
      el.querySelector('.skip').addEventListener('click', function () { T.list.forEach(function (x) { mark(x.id); }); hide(); });
      document.body.appendChild(el); T.el = el;
      if (t) {
        try { if (d.side) t.scrollIntoView({ block: 'nearest' }); } catch (e) {}
        T.target = t; t.classList.add('hintglow');
        T.onUse = function () { mark(d.id); setTimeout(next, 150); };
        t.addEventListener('click', T.onUse);
      }
      place();
    }
    function next() { T.i++; show(); }
    function start(force) {
      var d = force ? {} : done();
      T.list = o.defs().filter(function (x) { return !d[x.id]; }); T.i = 0;
      if (!T.list.length) return;
      show();
    }
    // waits (up to about 16 seconds) for ready() to be true, then starts after a short pause
    function startWhen(ready, pause) {
      (function poll(n) {
        var ok = false; try { ok = ready(); } catch (e) {}
        if (!ok) { if (n < 40) setTimeout(function () { poll(n + 1); }, 400); else start(false); return; }
        setTimeout(function () { start(false); }, pause == null ? 1200 : pause);
      })(0);
    }
    function used(id) {                       // you did the thing the tip was about
      mark(id);
      if (T.el && T.list[T.i] && T.list[T.i].id === id) next();
    }

    window.addEventListener('resize', place);
    if (o.toggle) o.toggle.addEventListener('click', function () { setTimeout(place, 60); });
    if (o.help) o.help.addEventListener('click', function () {
      try { localStorage.removeItem(key); } catch (e) {}
      if (o.beforeHelp) o.beforeHelp();
      setTimeout(function () { start(true); }, 350);
    });
    return { start: start, startWhen: startWhen, used: used, mark: mark, place: place, hide: hide };
  }

  window.SpssegNav = { version: 1, renderPill: renderPill, tips: tips };
})();
