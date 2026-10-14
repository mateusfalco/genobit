/* Rede animada do topo: pontos que se deslocam e se ligam quando ficam próximos.
   O movimento é periódico (ciclo de CICLO segundos), então repete sem emendas.
   Respeita "reduzir movimento" (desenha um quadro parado) e pausa fora da tela.
   ?quadro=N&fps=F desenha só o instante N/F (usado para gerar o GIF de prévia). */
(function () {
  var hero = document.querySelector('.hero');
  if (!hero || !window.HTMLCanvasElement) return;

  var CICLO = 12;            // segundos para o movimento se repetir
  var DIST = 140;            // distância máxima (px) para ligar dois pontos
  var VERDE = '0,184,141', LARANJA = '255,106,0';

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-rede';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);
  hero.classList.add('com-rede');
  var ctx = canvas.getContext('2d');

  // Gerador pseudoaleatório com semente: a rede tem sempre o mesmo desenho
  var s = 20261014;
  function rnd() { s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }

  var pontos = [], L = 0, A = 0, dpr = 1, livre = null;
  function criar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    L = hero.clientWidth; A = hero.clientHeight;
    canvas.width = L * dpr; canvas.height = A * dpr;
    canvas.style.width = L + 'px'; canvas.style.height = A + 'px';
    s = 20261014; pontos = [];
    // Zona livre ao redor do emblema (some no celular, quando o emblema fica oculto)
    var img = hero.querySelector('.hero-arte img'), h = hero.getBoundingClientRect();
    livre = null;
    if (img && img.offsetWidth) {
      var r = img.getBoundingClientRect();
      livre = { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2, r: Math.max(r.width, r.height) * 0.62 };
    }
    var n = Math.round(Math.min(150, Math.max(45, L * A / 7500)));
    for (var i = 0; i < n; i++) {
      pontos.push({
        x: rnd() * L, y: rnd() * A,
        ax: 35 + rnd() * 70, ay: 30 + rnd() * 55,          // amplitude do deslocamento
        kx: 2 + Math.floor(rnd() * 2), ky: 2 + Math.floor(rnd() * 2), // voltas por ciclo
        fx: rnd() * 6.283, fy: rnd() * 6.283,
        r: 1.6 + rnd() * 2.6,
        cor: rnd() < 0.22 ? LARANJA : VERDE
      });
    }
  }

  function desenhar(t) {
    var w = 6.283185 * t / CICLO;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, L, A);
    var P = pontos.map(function (p) {
      var x = p.x + p.ax * Math.sin(p.kx * w + p.fx), y = p.y + p.ay * Math.cos(p.ky * w + p.fy), a = 1;
      if (livre) {  // 0 dentro da zona do emblema, sobe suavemente até 1 na borda
        var d = Math.sqrt((x - livre.x) * (x - livre.x) + (y - livre.y) * (y - livre.y)) / livre.r;
        a = Math.min(1, Math.max(0, (d - 0.75) / 0.45));
      }
      return { x: x, y: y, a: a, p: p };
    });
    ctx.lineWidth = 1;
    for (var i = 0; i < P.length; i++) {
      for (var j = i + 1; j < P.length; j++) {
        var dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d = Math.sqrt(dx * dx + dy * dy);
        var a = Math.min(P[i].a, P[j].a);
        if (d < DIST && a > 0) {
          var cor = P[i].p.cor === LARANJA && P[j].p.cor === LARANJA ? LARANJA : VERDE;
          ctx.strokeStyle = 'rgba(' + cor + ',' + (0.45 * a * (1 - d / DIST)).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y); ctx.stroke();
        }
      }
    }
    P.forEach(function (q) {
      if (!q.a) return;
      ctx.fillStyle = 'rgba(' + q.p.cor + ',' + (0.8 * q.a).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(q.x, q.y, q.p.r, 0, 6.283); ctx.fill();
    });
  }

  criar();
  var params = new URLSearchParams(location.search);
  if (params.has('quadro')) {             // modo prévia: desenha um instante fixo
    var t = Number(params.get('quadro')) / Number(params.get('fps') || 12);
    desenhar(t);
    return;
  }

  var reduzir = window.matchMedia('(prefers-reduced-motion: reduce)');
  var visivel = true, inicio = performance.now(), quadro = 0;
  function laco(agora) {
    quadro = 0;
    if (!visivel || document.hidden || reduzir.matches) return;
    desenhar((agora - inicio) / 1000);
    quadro = requestAnimationFrame(laco);
  }
  function retomar() { if (!quadro) quadro = requestAnimationFrame(laco); }
  desenhar(0);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; if (visivel) retomar(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', retomar);
  var tempo;
  window.addEventListener('resize', function () { clearTimeout(tempo); tempo = setTimeout(function () { criar(); desenhar((performance.now() - inicio) / 1000); }, 150); });
  retomar();
})();
