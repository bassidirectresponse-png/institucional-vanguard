(function(){
  'use strict';

  // dynamic year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // header scrolled state
  var header = document.getElementById('header');
  if (header){
    var onScroll = function(){
      if (window.scrollY > 10) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
  }

  // mobile menu
  var burger = document.getElementById('burger');
  var navLinks = document.getElementById('navLinks');
  if (burger && navLinks){
    burger.addEventListener('click', function(){
      var open = navLinks.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navLinks.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(){
        navLinks.classList.remove('open');
        burger.setAttribute('aria-expanded','false');
      });
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(other){
        if (other !== item){
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
          other.querySelector('.faq-q').setAttribute('aria-expanded','false');
        }
      });
      if (isOpen){
        item.classList.remove('open');
        a.style.maxHeight = null;
        q.setAttribute('aria-expanded','false');
      } else {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded','true');
      }
    });
  });

  // reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('in'); });
  }

  var REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Run an rAF render loop only while `el` is in the viewport (saves CPU).
  function runWhileVisible(el, render){
    var raf = null, running = false, start = 0;
    function loop(ts){
      if (!start) start = ts;
      render((ts - start) / 1000);
      raf = requestAnimationFrame(loop);
    }
    if ('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting && !running){ running = true; start = 0; raf = requestAnimationFrame(loop); }
          else if (!e.isIntersecting && running){ running = false; cancelAnimationFrame(raf); }
        });
      }, {threshold: 0}).observe(el);
    } else {
      raf = requestAnimationFrame(loop);
    }
  }

  // ===== Hero globe: rotating point sphere + capital connection arcs =====
  (function initGlobe(){
    var canvas = document.getElementById('globe');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = 0, R = 0, cx = 0, cy = 0;

    // sphere points (Fibonacci distribution)
    var points = [], N = 1600;
    for (var i = 0; i < N; i++){
      var phi = Math.acos(1 - 2 * (i + 0.5) / N);
      var theta = Math.PI * (1 + Math.sqrt(5)) * i;
      points.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.cos(phi),
        z: Math.sin(phi) * Math.sin(theta)
      });
    }

    // real capitals (lat, lng) → unit vectors
    function toVec(lat, lng){
      var p = (90 - lat) * Math.PI / 180, t = lng * Math.PI / 180;
      return { x: Math.sin(p) * Math.cos(t), y: Math.cos(p), z: Math.sin(p) * Math.sin(t) };
    }
    var caps = [
      [48.85, 2.35], [40.71, -74.0], [-23.55, -46.63], [51.51, -0.13],
      [35.68, 139.69], [-33.87, 151.21], [1.35, 103.82], [-26.2, 28.04]
    ].map(function(c){ return toVec(c[0], c[1]); });
    var routes = [[0,1],[1,2],[2,5],[5,4],[4,6],[6,3],[3,0],[0,4],[1,3]];

    function norm(v){ var m = Math.hypot(v.x, v.y, v.z) || 1; return { x:v.x/m, y:v.y/m, z:v.z/m }; }
    function arcMid(a, b){
      var m = norm({ x:(a.x+b.x)/2, y:(a.y+b.y)/2, z:(a.z+b.z)/2 });
      var d = Math.hypot(a.x-b.x, a.y-b.y, a.z-b.z);
      var lift = 1 + 0.16 + d * 0.12;
      return { x:m.x*lift, y:m.y*lift, z:m.z*lift };
    }
    var mids = routes.map(function(r){ return arcMid(caps[r[0]], caps[r[1]]); });

    var ang = REDUCE ? -0.5 : 0, tilt = -0.42;
    function project(v, cosA, sinA, cosT, sinT){
      var x = v.x * cosA + v.z * sinA;
      var z = -v.x * sinA + v.z * cosA;
      var y2 = v.y * cosT - z * sinT;
      var z2 = v.y * sinT + z * cosT;
      return { x: cx + x * R, y: cy - y2 * R, z: z2 };
    }

    function resize(){
      var rect = canvas.getBoundingClientRect();
      size = rect.width;
      canvas.width = size * dpr; canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = size * 0.40; cx = size / 2; cy = size / 2;
    }
    resize();
    window.addEventListener('resize', resize);

    runWhileVisible(canvas, function(time){
      if (!REDUCE) ang += 0.0026;
      var cosA = Math.cos(ang), sinA = Math.sin(ang);
      var cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      ctx.clearRect(0, 0, size, size);

      // atmosphere glow
      var g = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.28);
      g.addColorStop(0, 'rgba(200,255,61,0.10)');
      g.addColorStop(0.55, 'rgba(30,138,69,0.05)');
      g.addColorStop(1, 'rgba(30,138,69,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.28, 0, Math.PI * 2); ctx.fill();

      // sphere points (depth-shaded)
      for (var i = 0; i < points.length; i++){
        var s = project(points[i], cosA, sinA, cosT, sinT);
        var depth = (s.z + 1) / 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 0.5 + depth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(30,138,69,' + (0.05 + depth * 0.5) + ')';
        ctx.fill();
      }

      // connection arcs between capitals
      for (var k = 0; k < routes.length; k++){
        var a = caps[routes[k][0]], b = caps[routes[k][1]];
        var pa = project(a, cosA, sinA, cosT, sinT);
        var pb = project(b, cosA, sinA, cosT, sinT);
        var pm = project(mids[k], cosA, sinA, cosT, sinT);
        var vis = ((pa.z + pb.z) / 2 + 0.55) / 1.55;
        if (vis <= 0.02) continue;
        if (vis > 1) vis = 1;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.quadraticCurveTo(pm.x, pm.y, pb.x, pb.y);
        ctx.strokeStyle = 'rgba(30,138,69,' + (0.08 + vis * 0.32) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
        if (!REDUCE){
          var tp = (time * 0.32 + k * 0.13) % 1, it = 1 - tp;
          var px = it * it * pa.x + 2 * it * tp * pm.x + tp * tp * pb.x;
          var py = it * it * pa.y + 2 * it * tp * pm.y + tp * tp * pb.y;
          ctx.beginPath(); ctx.arc(px, py, 2.1, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200,255,61,' + (0.45 + vis * 0.5) + ')';
          ctx.fill();
        }
      }

      // capital markers
      for (var c = 0; c < caps.length; c++){
        var pc = project(caps[c], cosA, sinA, cosT, sinT);
        if (pc.z < -0.2) continue;
        var d = (pc.z + 1) / 2;
        ctx.beginPath(); ctx.arc(pc.x, pc.y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200,255,61,' + (0.55 + d * 0.45) + ')';
        ctx.fill();
        ctx.beginPath(); ctx.arc(pc.x, pc.y, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200,255,61,' + (0.2 * d) + ')';
        ctx.lineWidth = 1; ctx.stroke();
      }
    });
  })();

  // ===== Scroll-scrubbed network: central hub grows and links to satellites =====
  (function initNetFx(){
    var canvas = document.getElementById('netfx-canvas');
    if (!canvas || !canvas.getContext) return;
    var section = canvas.closest('.netfx');
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var labels = ['Plans', 'Protocols', 'Recipes', 'Content', 'Support', 'Data', 'Community', 'Insights'];

    function resize(){
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function ease(t){ return t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t); }
    function scrollProgress(){
      if (!section) return 1;
      var rect = section.getBoundingClientRect();
      var total = section.offsetHeight - window.innerHeight;
      if (total <= 0) return rect.top < window.innerHeight ? 1 : 0;
      var scrolled = Math.min(Math.max(-rect.top, 0), total);
      return scrolled / total;
    }

    var prog = REDUCE ? 1 : 0;

    runWhileVisible(canvas, function(time){
      var target = REDUCE ? 1 : scrollProgress();
      prog += (target - prog) * 0.1;
      var p = prog, n = labels.length;
      ctx.clearRect(0, 0, W, H);

      var ccx = W / 2, ccy = H / 2;
      var unit = Math.min(W, H);
      var pad = Math.max(64, unit * 0.16);          // keep nodes + labels off the edges
      var ring = Math.min(unit * 0.34, (W / 2) - pad, (H / 2) - 28);
      var hubScale = ease(p / 0.45);
      var hubR = unit * 0.05 + hubScale * unit * 0.07;
      var nodeR = Math.max(5, unit * 0.012);
      var fontPx = unit < 480 ? 10 : 11;

      // faint concentric guide rings
      ctx.lineWidth = 1;
      [0.52, 0.78, 1].forEach(function(f){
        ctx.beginPath(); ctx.arc(ccx, ccy, ring * f, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(30,138,69,' + (0.05 * hubScale) + ')';
        ctx.stroke();
      });

      // slow-moving dashed orbit (data-flow feel, nodes stay put)
      ctx.save();
      ctx.setLineDash([2, 9]);
      ctx.lineDashOffset = REDUCE ? 0 : -time * 14;
      ctx.beginPath(); ctx.arc(ccx, ccy, ring, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(30,138,69,' + (0.14 * hubScale) + ')';
      ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();

      ctx.textBaseline = 'middle';
      for (var i = 0; i < n; i++){
        var a = (i / n) * Math.PI * 2 - Math.PI / 2;
        var ca = Math.cos(a), sa = Math.sin(a);
        var sx = ccx + ca * ring, sy = ccy + sa * ring;
        var lp = ease((p - 0.24 - i * 0.05) / 0.5);
        var ux = ca, uy = sa;
        var x0 = ccx + ux * hubR, y0 = ccy + uy * hubR;
        var x1 = ccx + ux * (hubR + (ring - hubR) * lp);
        var y1 = ccy + uy * (hubR + (ring - hubR) * lp);

        if (lp > 0.002){
          var grad = ctx.createLinearGradient(x0, y0, sx, sy);
          grad.addColorStop(0, 'rgba(30,138,69,' + (0.45 * lp) + ')');
          grad.addColorStop(1, 'rgba(30,138,69,' + (0.12 * lp) + ')');
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
          ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.stroke();
          if (!REDUCE && lp > 0.6){
            var tp = (time * 0.45 + i * 0.18) % 1;
            ctx.beginPath();
            ctx.arc(x0 + (sx - x0) * tp, y0 + (sy - y0) * tp, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(200,255,61,' + (0.85 * lp) + ')'; ctx.fill();
          }
        }

        // node: hollow ring that fills as it connects
        ctx.beginPath(); ctx.arc(sx, sy, nodeR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(30,138,69,' + (0.35 + lp * 0.55) + ')';
        ctx.stroke();
        if (lp > 0.5){
          ctx.beginPath(); ctx.arc(sx, sy, nodeR * 0.42, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(30,138,69,' + ((lp - 0.5) * 2) + ')'; ctx.fill();
        }

        // label (clamped so it never clips the canvas edge)
        ctx.globalAlpha = lp;
        ctx.fillStyle = '#586056';
        ctx.font = '600 ' + fontPx + 'px "JetBrains Mono", monospace';
        ctx.textAlign = ca > 0.25 ? 'left' : (ca < -0.25 ? 'right' : 'center');
        var lx = sx + ca * (nodeR + 8);
        var tw = ctx.measureText(labels[i].toUpperCase()).width;
        if (ctx.textAlign === 'left') lx = Math.min(lx, W - tw - 6);
        else if (ctx.textAlign === 'right') lx = Math.max(lx, tw + 6);
        ctx.fillText(labels[i].toUpperCase(), lx, sy + sa * (nodeR + 9));
        ctx.globalAlpha = 1;
      }

      // hub pulse rings (subtle)
      if (!REDUCE && hubScale > 0.4){
        for (var pr = 0; pr < 2; pr++){
          var tt = (time * 0.45 + pr * 0.5) % 1;
          ctx.beginPath(); ctx.arc(ccx, ccy, hubR * (1 + tt * 0.7), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(200,255,61,' + (0.28 * (1 - tt) * hubScale) + ')';
          ctx.lineWidth = 1.5; ctx.stroke();
        }
      }

      // hub disc
      var hg = ctx.createRadialGradient(ccx - hubR * 0.3, ccy - hubR * 0.4, hubR * 0.1, ccx, ccy, hubR);
      hg.addColorStop(0, '#3FC76A'); hg.addColorStop(0.5, '#1E8A45'); hg.addColorStop(1, '#0A3A1E');
      ctx.beginPath(); ctx.arc(ccx, ccy, hubR, 0, Math.PI * 2);
      ctx.fillStyle = hg; ctx.fill();
      ctx.beginPath(); ctx.arc(ccx, ccy, hubR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,255,61,' + (0.25 + hubScale * 0.35) + ')';
      ctx.lineWidth = 1.5; ctx.stroke();

      // hub mark
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.font = '700 ' + Math.round(hubR * 0.85) + 'px "Space Grotesk", sans-serif';
      ctx.fillText('V', ccx, ccy + hubR * 0.04);
    });
  })();

  // ===== Per-letter heading reveal: fade in + slide up + de-blur =====
  function splitLetters(root){
    var nodes = Array.prototype.slice.call(root.childNodes);
    nodes.forEach(function(node){
      if (node.nodeType === 3){
        var frag = document.createDocumentFragment();
        var text = node.nodeValue;
        for (var i = 0; i < text.length; i++){
          var ch = text[i];
          if (ch === ' '){ frag.appendChild(document.createTextNode(' ')); continue; }
          var span = document.createElement('span');
          span.className = 'ltr';
          span.textContent = ch;
          frag.appendChild(span);
        }
        root.replaceChild(frag, node);
      } else if (node.nodeType === 1){
        splitLetters(node); // recurse to keep inner markup (e.g. .accent)
      }
    });
  }
  (function initHeadingLetters(){
    if (REDUCE) return;
    var heads = document.querySelectorAll('.hero h1, .sec-head h2, .about-text h2, .netfx-head h2, .final-box h2');
    if (!heads.length) return;
    heads.forEach(function(h){
      h.classList.add('fx-letters');
      splitLetters(h);
      var letters = h.querySelectorAll('.ltr');
      Array.prototype.forEach.call(letters, function(l, i){ l.style.transitionDelay = (i * 0.028) + 's'; });
    });
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('fx-in'); io.unobserve(e.target); } });
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
      heads.forEach(function(h){ io.observe(h); });
    } else {
      heads.forEach(function(h){ h.classList.add('fx-in'); });
    }
  })();

  // ===== Count-up numbers (triggered on scroll into view) =====
  (function initCountUp(){
    var els = document.querySelectorAll('.stat b');
    if (!els.length) return;
    els.forEach(function(el){
      var m = el.textContent.trim().match(/^(\D*)(\d+)(.*)$/);
      if (!m) return;
      var prefix = m[1], target = parseInt(m[2], 10), suffix = m[3];
      if (REDUCE) return;
      el.textContent = prefix + '0' + suffix;
      var run = function(){
        var dur = 1400, start = null;
        var step = function(ts){
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = prefix + target + suffix;
        };
        requestAnimationFrame(step);
      };
      if ('IntersectionObserver' in window){
        var io = new IntersectionObserver(function(es){
          es.forEach(function(e){ if (e.isIntersecting){ run(); io.unobserve(e.target); } });
        }, { threshold: 0.5 });
        io.observe(el);
      } else { run(); }
    });
  })();

  // ===== Interactive premium cards (spotlight, glow, tilt, magnetism, particles, ripple) =====
  (function initCardFx(){
    if (REDUCE) return;
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;
    var cards = document.querySelectorAll('.mcard, .val');
    Array.prototype.forEach.call(cards, function(card){
      card.classList.add('fx-card');
      var border = document.createElement('span'); border.className = 'fx-border';
      var spot = document.createElement('span'); spot.className = 'fx-spot';
      card.insertBefore(border, card.firstChild);
      card.insertBefore(spot, card.firstChild);

      var rect = null, raf = null, hovering = false;
      var tx = 0, ty = 0, rx = 0, ry = 0;
      var particles = [], timers = [];

      function applyTransform(){
        card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translate(' + tx + 'px,' + ty + 'px)';
      }

      card.addEventListener('mouseenter', function(){
        hovering = true; rect = card.getBoundingClientRect();
        for (var i = 0; i < 10; i++){
          (function(idx){
            var t = setTimeout(function(){
              if (!hovering || !rect) return;
              var pa = document.createElement('span'); pa.className = 'fx-particle';
              pa.style.left = (Math.random() * rect.width) + 'px';
              pa.style.top = (Math.random() * rect.height) + 'px';
              card.appendChild(pa); particles.push(pa);
              pa.animate([
                { transform: 'translate(0,0) scale(0)', opacity: 0 },
                { transform: 'translate(0,0) scale(1)', opacity: 1, offset: 0.18 },
                { transform: 'translate(' + ((Math.random() - 0.5) * 44) + 'px,' + (-20 - Math.random() * 34) + 'px) scale(1)', opacity: 0 }
              ], { duration: 2200 + Math.random() * 1200, easing: 'ease-out', iterations: Infinity });
            }, idx * 120);
            timers.push(t);
          })(i);
        }
      });

      card.addEventListener('mousemove', function(e){
        if (!rect) rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left, y = e.clientY - rect.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        card.style.setProperty('--fx-r', '260px');
        var cxp = rect.width / 2, cyp = rect.height / 2;
        ry = ((x - cxp) / cxp) * 6;
        rx = ((y - cyp) / cyp) * -6;
        tx = (x - cxp) * 0.04;
        ty = (y - cyp) * 0.04;
        if (!raf) raf = requestAnimationFrame(function(){ raf = null; applyTransform(); });
      });

      card.addEventListener('mouseleave', function(){
        hovering = false; rect = null;
        rx = ry = tx = ty = 0; card.style.transform = '';
        timers.forEach(clearTimeout); timers = [];
        particles.forEach(function(p){
          p.style.transition = 'opacity .3s ease'; p.style.opacity = '0';
          setTimeout(function(){ if (p.parentNode) p.parentNode.removeChild(p); }, 300);
        });
        particles = [];
      });

      card.addEventListener('click', function(e){
        var r = card.getBoundingClientRect();
        var rip = document.createElement('span'); rip.className = 'fx-ripple';
        rip.style.left = (e.clientX - r.left) + 'px';
        rip.style.top = (e.clientY - r.top) + 'px';
        var size = Math.max(r.width, r.height) * 1.5;
        card.appendChild(rip);
        rip.animate([
          { width: '0px', height: '0px', opacity: 0.5 },
          { width: size + 'px', height: size + 'px', opacity: 0 }
        ], { duration: 700, easing: 'ease-out' });
        setTimeout(function(){ if (rip.parentNode) rip.parentNode.removeChild(rip); }, 720);
      });
    });
  })();
})();
