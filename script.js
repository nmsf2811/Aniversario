// Cola aqui o endereço do Google Apps Script (termina em /exec). Ver apps-script.gs.
// Enquanto estiver vazio, a resposta não é guardada em lado nenhum.
const RSVP_ENDPOINT = "https://script.google.com/macros/s/AKfycbx56MXFDqP0SobIVbJx--Li7WM1CsjujF3r4rtAxLc3ZTMHGWeZ37UPuw9Tawy5qhuOGw/exec";

// Para tirar uma foto, apaga o nome daqui. Para pôr outra, mete o ficheiro em img/ e acrescenta o nome.
const PHOTOS = [
  "p00", "p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "p09", "p10",
  "n01", "n02", "n03", "n04", "n05", "n06", "n07", "n08", "n09", "n10", "n11", "n12", "n13", "n14",
];

// gerador pseudo-aleatório fixo: o desenho é igual em todos os ecrãs do mesmo tamanho
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const $ = (id) => document.getElementById(id);
const env = $("env"), card = $("card"), yes = $("yes"), pols = $("polaroids"), stage = $("stage");
const small = () => window.innerWidth < 600;

// nome opcional: ?nome=Ana
const nome = new URLSearchParams(location.search).get("nome");
if (nome) $("who").textContent = nome.slice(0, 40) + ",";

// área de sobreposição de a com b, como fração da área de a
function overlap(a, b) {
  const w = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
  const h = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
  return w > 0 && h > 0 ? (w * h) / ((a.x2 - a.x1) * (a.y2 - a.y1)) : 0;
}

// espalha as fotos à volta do cartão, todas dentro do ecrã, podendo sobrepor-se um pouco
function layout() {
  seed = 11;
  const VW = window.innerWidth, VH = window.innerHeight;
  const cw = card.offsetWidth, ch = card.offsetHeight;
  const cx = VW / 2, cy = VH / 2;
  stage.style.height = VH + "px";
  const cardBox = { x1: cx - cw / 2, x2: cx + cw / 2, y1: cy - ch / 2, y2: cy + ch / 2 };
  // por defeito: no máx. 22% de cada foto tapada por outra, e 30% (65% no telemóvel) atrás do cartão
  const base = small() ? 110 : 150;
  const order = PHOTOS.map((f) => ({ f, k: rnd() })).sort((a, b) => a.k - b.k).map((o) => o.f);

  let placed = null;
  // se não couber, vai-se tolerando um pouco mais de sobreposição, nunca deixa de aparecer
  for (const relax of [1, 1.6, 2.6, 4, 99]) {
  const maxPhoto = Math.min(relax === 99 ? 1 : 0.8, 0.22 * relax);
  const maxCard = relax === 99 ? 1 : Math.min(0.92, (small() ? 0.65 : 0.3) * relax);
  for (let s = 1; s >= 0.3 && !placed; s -= 0.04) {
    const boxes = [], out = [];
    let ok = true;
    for (const f of order) {
      const w = Math.round(base * s * (0.92 + rnd() * 0.16));
      const bw = w * 1.1, bh = (w * 1.12 + 30) * 1.1;
      let best = null, bestScore = -1;
      for (let t = 0; t < 160; t++) {
        const x = bw / 2 + 4 + rnd() * (VW - bw - 8);
        const y = bh / 2 + 4 + rnd() * (VH - bh - 8);
        const b = { x1: x - bw / 2, x2: x + bw / 2, y1: y - bh / 2, y2: y + bh / 2 };
        if (overlap(b, cardBox) > maxCard) continue;
        let bad = false, d = 1e9;
        for (const o of boxes) {
          if (overlap(b, o) > maxPhoto || overlap(o, b) > maxPhoto) { bad = true; break; }
          d = Math.min(d, Math.hypot(x - (o.x1 + o.x2) / 2, y - (o.y1 + o.y2) / 2));
        }
        if (bad) continue;
        if (d > bestScore) { bestScore = d; best = { x, y, b }; }
      }
      if (!best) { ok = false; break; }
      boxes.push(best.b);
      out.push({ f, w, x: best.x, y: best.y });
    }
    if (ok) placed = out;
  }
  if (placed) break;
  }

  pols.innerHTML = "";
  placed.forEach((p, i) => {
    const r = Math.round(rnd() * 20 - 10);
    const el = document.createElement("div");
    el.className = "pol";
    el.style.cssText = `--x:${Math.round(p.x)}px;--y:${Math.round(p.y)}px;--r:${r}deg;--r0:${r + Math.round(rnd() * 120 - 60)}deg;--w:${p.w}px;--d:${(i * 0.09).toFixed(2)}s`;
    const img = new Image();
    img.src = `img/${p.f}.jpg`;
    img.alt = "";
    el.appendChild(img);
    pols.appendChild(el);
  });
}

const timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));
let shown = false;

// as fotos só aparecem depois de o envelope desaparecer por completo
function play() {
  later(() => (env.className = "in"), 200);
  later(() => (env.className = "in open"), 1500);
  later(() => (env.className = "in open out"), 3000);
  later(() => {
    card.classList.add("show");
    shown = true;
    document.querySelectorAll(".pol").forEach((p) => p.classList.add("in"));
  }, 3700);
}

// se rodares o telemóvel ou mudares o tamanho da janela, volta a arrumar
let lastW = window.innerWidth, lastH = window.innerHeight, rt;
window.addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    layout();
    if (shown) document.querySelectorAll(".pol").forEach((p) => { p.style.transition = "none"; p.classList.add("in"); });
  }, 250);
});

// botões que fogem
function flee(btn) {
  const slot = btn.parentNode.getBoundingClientRect();
  const y = yes.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = slot.width, h = slot.height, m = 8;
  let x, yy, ok = false, n = 0;
  while (!ok && n++ < 60) {
    x = m + Math.random() * (vw - w - 2 * m);
    yy = m + Math.random() * (vh - h - 2 * m);
    const near = Math.abs(x - slot.left) < 140 && Math.abs(yy - slot.top) < 90;
    const hit = x < y.right + 14 && x + w > y.left - 14 && yy < y.bottom + 14 && yy + h > y.top - 14;
    ok = !near && !hit;
  }
  btn.classList.add("moved");
  btn.style.transform = `translate(${x - slot.left}px,${yy - slot.top}px) rotate(${Math.random() * 16 - 8}deg)`;
}
document.querySelectorAll(".runaway").forEach((b) => {
  b.addEventListener("mouseenter", () => flee(b));
  b.addEventListener("focus", () => flee(b));
  b.addEventListener("touchstart", (e) => { e.preventDefault(); flee(b); }, { passive: false });
  b.addEventListener("click", (e) => { e.preventDefault(); flee(b); });
});

// resposta
function confetti() {
  const colors = ["#7ee02b", "#0f6b3a", "#fbf8f0", "#f5c542", "#ffffff"];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement("i");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2 + Math.random() * 2.5 + "s";
    c.style.animationDelay = Math.random() * 0.8 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 6000);
  }
}
const nameIn = $("nameIn"), nameErr = $("nameErr");
if (nome) nameIn.value = nome.slice(0, 40);
nameIn.addEventListener("input", () => (nameErr.textContent = ""));
nameIn.addEventListener("keydown", (e) => { if (e.key === "Enter") yes.click(); });
yes.addEventListener("click", () => {
  const quem = nameIn.value.trim();
  if (!quem) {
    nameErr.textContent = "Escreve o teu nome primeiro";
    nameIn.focus({ preventScroll: true });
    return;
  }
  // 2.º passo: escolher a que programas vai
  $("msg").textContent = "Boa, " + quem + "!";
  card.classList.add("step2");
});

// 3.º passo: programas, confirmar, guardar e mostrar a informação
// Horas em Lisboa (em novembro = UTC+0). Para mudar uma hora, altera "inicio" (ano-mês-diaThora:min) e "hora".
const EVENTS = [
  { id: "sexta_jantar", dia: "Sexta, 27", hora: "21h", titulo: "Jantar na Taska da Txika e noitinha", local: "Taska da Txika",
    inicio: "2026-11-27T21:00", mapa: "https://maps.app.goo.gl/9QCzX3ZYV1GHSjaq9" },
  { id: "sabado_almoco", dia: "Sábado, 28", hora: "13h", titulo: "Almoço na Dona Maria e tardinha", local: "Dona Maria",
    inicio: "2026-11-28T13:00", mapa: "https://maps.app.goo.gl/3itzqi2MAzBtBFu56" },
  { id: "sabado_jantar", dia: "Sábado, 28", hora: "20h", titulo: "Jantar no Lucimar Gemini e noitar", local: "Lucimar Gemini",
    inicio: "2026-11-28T20:00", mapa: "https://maps.app.goo.gl/W6hL18t5kCY65zv19" },
];
const DURACAO_H = 3;
const jantarGrande = EVENTS.find((e) => e.id === "sabado_jantar");

// lista de programas no 2.º passo
const evList = $("evList");
EVENTS.forEach((ev) => {
  const lab = document.createElement("label");
  lab.className = "ev";
  const inp = document.createElement("input");
  inp.type = "checkbox"; inp.name = "ev"; inp.value = ev.id;
  const box = document.createElement("span");
  box.className = "evb";
  const small = document.createElement("small");
  small.textContent = ev.dia + " · " + ev.hora;
  const b = document.createElement("b");
  b.textContent = ev.titulo;
  box.append(small, b);
  lab.append(inp, box);
  evList.appendChild(lab);
});

// caixa do jantar principal (sempre visível no fim)
$("whenDay").textContent = "Sábado, 28 de novembro · " + jantarGrande.hora;
$("whenPlace").textContent = jantarGrande.local;
$("whenMap").href = jantarGrande.mapa;

// ficheiro de calendário (.ics) com os programas escolhidos
const pad = (n) => String(n).padStart(2, "0");
const icsData = (iso, plusH = 0) => {
  const d = new Date(iso + ":00Z"); // hora de Lisboa = UTC em novembro
  d.setUTCHours(d.getUTCHours() + plusH);
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
};
function baixarCalendario(lista) {
  const agora = icsData(new Date().toISOString().slice(0, 16));
  const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aniversario do Nuno//PT", "CALSCALE:GREGORIAN"];
  lista.forEach((ev) => {
    linhas.push(
      "BEGIN:VEVENT",
      "UID:" + ev.id + "-2026@aniversario-nuno",
      "DTSTAMP:" + agora,
      "DTSTART:" + icsData(ev.inicio),
      "DTEND:" + icsData(ev.inicio, DURACAO_H),
      "SUMMARY:Aniversário do Nuno · " + ev.titulo,
      "LOCATION:" + ev.local,
      "DESCRIPTION:" + ev.titulo + "\n" + ev.mapa,
      "URL:" + ev.mapa,
      "END:VEVENT"
    );
  });
  linhas.push("END:VCALENDAR");
  const blob = new Blob([linhas.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "aniversario-nuno.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

const evErr = $("evErr");
const evs = [...document.querySelectorAll('input[name="ev"]')];
evs.forEach((c) => c.addEventListener("change", () => (evErr.textContent = "")));
const acomps = [...document.querySelectorAll('input[name="acomp"]')];
const acompNome = $("acompNome");
acomps.forEach((c) => c.addEventListener("change", () => {
  evErr.textContent = "";
  const sim = acomps.some((x) => x.checked && x.value === "Sim");
  acompNome.classList.toggle("on", sim);
  if (sim) acompNome.focus({ preventScroll: true });
}));
acompNome.addEventListener("input", () => (evErr.textContent = ""));
let escolhidosEv = [];
$("calBtn").addEventListener("click", () => baixarCalendario(escolhidosEv));

$("confirm").addEventListener("click", () => {
  const quem = nameIn.value.trim();
  const ids = evs.filter((c) => c.checked).map((c) => c.value);
  escolhidosEv = EVENTS.filter((e) => ids.includes(e.id));
  if (!escolhidosEv.length) {
    evErr.textContent = "Escolhe pelo menos um programa";
    return;
  }
  const acomp = (acomps.find((c) => c.checked) || {}).value;
  if (!acomp) {
    evErr.textContent = "Diz-nos se trazes acompanhante";
    return;
  }
  const quemAcomp = acompNome.value.trim();
  if (acomp === "Sim" && !quemAcomp) {
    evErr.textContent = "Escreve o nome do acompanhante";
    acompNome.focus({ preventScroll: true });
    return;
  }
  $("msg").textContent = "Combinado, " + quem + "! Vai ser épico.";
  const lista = $("doneList");
  lista.innerHTML = "";
  escolhidosEv.forEach((ev) => {
    const p = document.createElement("p");
    p.append(ev.dia + " · " + ev.hora + " — " + ev.titulo + " ");
    const a = document.createElement("a");
    a.href = ev.mapa; a.target = "_blank"; a.rel = "noopener"; a.textContent = "mapa";
    p.appendChild(a);
    lista.appendChild(p);
  });
  if (acomp === "Sim") {
    const p = document.createElement("p");
    p.textContent = "Com acompanhante: " + quemAcomp;
    lista.appendChild(p);
  }
  card.classList.remove("step2");
  card.classList.add("done");
  confetti();
  if (RSVP_ENDPOINT) {
    fetch(RSVP_ENDPOINT, {
      method: "POST",
      mode: "no-cors", // o Google Apps Script não responde a CORS; o pedido chega na mesma
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        nome: quem,
        resposta: escolhidosEv.map((e) => e.dia + " " + e.hora + ": " + e.titulo).join(" | "),
        sexta_jantar: ids.includes("sexta_jantar"),
        sabado_almoco: ids.includes("sabado_almoco"),
        sabado_jantar: ids.includes("sabado_jantar"),
        acompanhante: acomp,
        nome_acompanhante: acomp === "Sim" ? quemAcomp : "",
        quando: new Date().toISOString(),
      }),
    }).catch(() => {});
  }
});

(document.fonts ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve()).then(() => {
  try { layout(); } catch (e) { console.error(e); }
  play();
});
