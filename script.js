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

  // hero globe (only if canvas present)
  var canvas = document.getElementById('globe');
  if (canvas && canvas.getContext){
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = 0, R = 0, cx = 0, cy = 0;
    var points = [];
    var N = 760;

    for (var i = 0; i < N; i++){
      var phi = Math.acos(1 - 2 * (i + 0.5) / N);
      var theta = Math.PI * (1 + Math.sqrt(5)) * i;
      points.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        lime: (i % 23 === 0)
      });
    }

    var resize = function(){
      var rect = canvas.getBoundingClientRect();
      size = rect.width;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = size * 0.42;
      cx = size / 2;
      cy = size / 2;
    };
    resize();
    window.addEventListener('resize', resize);

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var ang = 0;

    var frame = function(){
      ang += reduce ? 0 : 0.0035;
      ctx.clearRect(0, 0, size, size);

      var cosA = Math.cos(ang), sinA = Math.sin(ang);
      var tilt = -0.42, cosT = Math.cos(tilt), sinT = Math.sin(tilt);

      for (var i = 0; i < points.length; i++){
        var p = points[i];
        var x = p.x * cosA - p.z * sinA;
        var z = p.x * sinA + p.z * cosA;
        var yv = p.y;
        var y2 = yv * cosT - z * sinT;
        var z2 = yv * sinT + z * cosT;

        var sx = cx + x * R;
        var sy = cy + y2 * R;
        var depth = (z2 + 1) / 2;
        var r = 0.6 + depth * 1.7;
        var alpha = 0.12 + depth * 0.7;

        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        if (p.lime){
          ctx.fillStyle = 'rgba(200,255,61,' + (0.35 + depth * 0.6) + ')';
        } else {
          ctx.fillStyle = 'rgba(30,138,69,' + alpha + ')';
        }
        ctx.fill();
      }
      requestAnimationFrame(frame);
    };
    frame();
  }
})();
