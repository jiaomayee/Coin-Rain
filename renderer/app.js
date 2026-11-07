(function () {
  'use strict';

  const bridge = window.coinRain || null;
  const L = window.CoinRainLocale;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const t = (key, ...args) => L.t(cfg.lang, key, ...args);
  const cur = () => activeCurrency;

  const DEFAULTS = {
    rate: 0,
    rateDays: 21.75,
    rateHours: 8,
    total: 0,
    hasRate: false,
    days: 21.75,
    hours: 8,
    scale: 'sec',
    lang: 'en-US',
    currency: 'USD',
    onboarded: false,
    theme: 'cyber',
    shape: 'coin',
    density: 26,
    speed: 1,
    motion: 1,
    praiseFreq: 0.6,
    sound: true,
    bump: true,
    alwaysOnTop: true,
    keepAwake: false,
    mini: true,
    immersive: true,
    idleSec: 4,
    milestoneIndex: 0
  };

  let cfg = Object.assign({}, DEFAULTS);
  let lastTs = Date.now();
  let lastRender = 0;
  let lastSave = 0;
  let lastPraise = 0;
  let running = true;
  let canvas = null;
  let ctx = null;
  let W = 1;
  let H = 1;
  let DPR = 1;
  let colors = {};
  let particles = [];
  let sparks = [];
  let impacts = [];
  let tubes = [];
  let trackEl = null;
  let trackTop = 0;
  let trackH = 12;
  let trackMidY = 0;
  let fillX = 0;
  let fillFlash = 0;
  let audioCtx = null;
  let bubbleTimer = null;
  let achievementTimer = null;
  const MINI_H = 210;
  const MAX_H = 800;
  let immersiveOn = false;
  let idleTimer = null;
  let lastWake = 0;
  let resizeDrag = null;
  let observer = null;
  let goalsCache = null;
  let goalsCacheKey = '';
  let activeCurrency = L.currency('USD');
  let localeOptionsBuilt = false;
  let onboardLang = 'en-US';
  let onboardCurrency = 'USD';
  let pendingConfirm = null;
  const ONBOARD_SIZE = { width: 300, height: 400 };

  // Purchasing-power goals are CNY reference values, converted for the active currency.
  function goals() {
    const key = cfg.lang + '|' + cfg.currency;
    if (goalsCacheKey !== key) {
      goalsCache = L.goals(cfg.lang);
      goalsCacheKey = key;
    }
    return goalsCache;
  }
  function goalAmount(cnyValue) { return cnyValue * cur().perCny; }

  function secondsPerMonth() {
    return cfg.days * cfg.hours * 3600;
  }

  async function loadConfig() {
    let fromDisk = {};
    if (bridge && bridge.isElectron) {
      try {
        fromDisk = (await bridge.load()) || {};
      } catch (_) {
        fromDisk = {};
      }
    }
    let local = {};
    try {
      local = JSON.parse(localStorage.getItem('coinrain.cfg') || '{}') || {};
    } catch (_) {
      local = {};
    }
    cfg = Object.assign({}, DEFAULTS, local, fromDisk);
    cfg.days = clamp(Number(cfg.days) || 21.75, 1, 31);
    cfg.hours = clamp(Number(cfg.hours) || 8, 1, 24);
    cfg.rateDays = clamp(Number(cfg.rateDays) || cfg.days, 1, 31);
    cfg.rateHours = clamp(Number(cfg.rateHours) || cfg.hours, 1, 24);
    cfg.rate = Math.max(0, Number(cfg.rate) || 0);
    cfg.total = Math.max(0, Number(cfg.total) || 0);
    cfg.hasRate = !!cfg.hasRate && cfg.rate > 0;
    cfg.milestoneIndex = clamp(Number(cfg.milestoneIndex) || 0, 0, L.MILESTONES.length);
    cfg.lang = L.normalizeLang(cfg.lang);
    cfg.currency = L.normalizeCurrency(cfg.currency);
    cfg.onboarded = cfg.onboarded === true;
    cfg.density = clamp(Number(cfg.density) || 26, 6, 60);
    cfg.speed = clamp(Number(cfg.speed) || 1, 0.4, 2.4);
    cfg.motion = clamp(Number(cfg.motion) || 1, 0.4, 1.8);
    cfg.praiseFreq = clamp(Number(cfg.praiseFreq) || 0, 0, 1);
    cfg.idleSec = clamp(Number(cfg.idleSec) || 4, 3, 8);
    if (!L.scales(cfg.lang)[cfg.scale]) cfg.scale = 'sec';
    if (['warm', 'cyber', 'cream', 'minimal'].indexOf(cfg.theme) < 0) cfg.theme = 'cyber';
    if (['coin', 'envelope', 'star'].indexOf(cfg.shape) < 0) cfg.shape = 'coin';
  }

  function persist() {
    const out = Object.assign({}, cfg);
    delete out.monthlyIncome;
    delete out.monthly;
    delete out.salary;
    if (bridge && bridge.isElectron) {
      try {
        const p = bridge.save(out);
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {
        // ignore transient IPC failure
      }
    }
    try {
      localStorage.setItem('coinrain.cfg', JSON.stringify(out));
    } catch (_) {
      // storage unavailable
    }
  }

  function fmt(v, digits) {
    return Number(v).toLocaleString(L.langMeta(cfg.lang).num, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function money(v) {
    if (v < 1) return fmt(v, cur().digits === 0 ? 2 : 3);
    return fmt(v, cur().digits);
  }

  // Compact amount for goal / milestone labels (goals are round CNY reference values).
  function moneyShort(v) {
    const d = cur().digits === 0 ? 0 : (v < 10 ? 2 : 0);
    return cur().symbol + fmt(v, d);
  }

  function scaleMul() {
    switch (cfg.scale) {
      case 'min': return 60;
      case 'hour': return 3600;
      case 'day': return cfg.hours * 3600;
      case 'drama': return 2700;
      default: return 1;
    }
  }

  function rateText() {
    const label = L.scales(cfg.lang)[cfg.scale] || L.t(cfg.lang, 'scale.sec');
    const v = cfg.rate * scaleMul();
    const digits = v < 0.01 ? 4 : (v < 1 ? 3 : cur().digits);
    return label + ' +' + cur().symbol + fmt(v, digits);
  }

  function goalInfo() {
    const list = goals();
    let prev = 0;
    for (let i = 0; i < list.length; i++) {
      const target = goalAmount(list[i].v);
      if (cfg.total < target) {
        const pct = clamp((cfg.total - prev) / Math.max(0.0001, target - prev) * 100, 0, 100);
        return { text: t('goal.next', list[i].name, moneyShort(target)), pct: pct };
      }
      prev = target;
    }
    return { text: t('goal.allDone'), pct: 100 };
  }

  function renderUI() {
    const text = cur().symbol + ' ' + money(cfg.total);
    const el = $('#amount');
    el.textContent = text;
    // Long amounts (KRW / JPY / large totals) must still fit the 260px mini window.
    el.style.fontSize = (text.length > 17 ? 19 : text.length > 13 ? 24 : 32) + 'px';
    const g = goalInfo();
    $('#goalText').textContent = g.text;
    $('#goalPct').textContent = Math.round(g.pct) + '%';
    $('#goalFill').style.width = g.pct + '%';
  }

  function readColors() {
    const s = getComputedStyle(document.body);
    const get = (name, fallback) => (s.getPropertyValue(name) || '').trim() || fallback;
    colors = {
      coin: get('--coin', '#FAC775'),
      edge: get('--coin-edge', '#BA7517'),
      ink: get('--coin-ink', '#633806'),
      accent: get('--accent', '#EF9F27'),
      accent2: get('--accent-2', '#FFD37A'),
      muted: get('--muted', '#A17C3E')
    };
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width);
    H = Math.max(1, rect.height);
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (trackEl) {
      const t = trackEl.getBoundingClientRect();
      trackTop = t.top - rect.top;
      trackH = Math.max(4, t.height);
      trackMidY = trackTop + trackH / 2;
    }
  }

  function spawn() {
    const r = (5 + Math.random() * 7) * (cfg.mini ? 0.7 : 1);
    particles.push({
      x: 8 + Math.random() * Math.max(1, W - 16),
      y: -r * 2 - Math.random() * H * 0.45,
      r: r,
      r0: r,
      vy: 34 + Math.random() * 52,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 2.4,
      a: cfg.mini ? 0.3 + Math.random() * 0.32 : 0.48 + Math.random() * 0.48,
      shape: cfg.shape,
      mode: 'fall',
      melt: 0
    });
  }

  // 金币只在碰到进度条的那一刻才改变行为；接触之前严格垂直下落。
  function contact(p) {
    p.y = trackTop - p.r * 0.2;
    if (p.x <= fillX) {
      // 左侧已有区域：直接砸入 —— 碰撞、压扁、融入
      p.mode = 'melt';
      p.melt = 0;
      impacts.push({ x: p.x, y: trackTop + 1, age: 0, life: 0.46, kind: 'hit' });
      burst(5, p.x, trackTop, 0.34 * cfg.motion);
      fillFlash = 1;
    } else {
      // 右侧未有区域：被管状光槽吸走，沿轨道汇入已有部分
      p.mode = 'tube';
      p.y = trackTop;
      // 相近落点合并成同一条管道，避免轨道上堆出许多重复的管口
      let near = null;
      for (let j = 0; j < tubes.length; j++) {
        if (Math.abs(tubes[j].from - p.x) < 38 && tubes[j].age < 0.35) { near = tubes[j]; break; }
      }
      if (near) {
        near.age = Math.min(near.age, 0.1);
        near.from = Math.max(near.from, p.x);
      } else {
        tubes.push({ from: p.x, age: 0, life: 0.7 });
        if (tubes.length > 3) tubes.shift();
      }
    }
  }

  function updateParticles(dt) {
    const target = Math.max(4, Math.round(cfg.density * (cfg.mini ? 0.48 : 1)));
    if (particles.length < target && Math.random() < 0.24) spawn();
    fillX = Math.max(2, W * goalInfo().pct / 100);
    fillFlash = Math.max(0, fillFlash - dt * 2.4);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.mode === 'fall') {
        p.y += p.vy * cfg.speed * dt;
        p.rot += p.vr * dt * cfg.motion;
        if (p.y + p.r >= trackTop) contact(p);
        else if (p.y - p.r > H + 12) particles.splice(i, 1);
      } else if (p.mode === 'melt') {
        p.melt += dt * 4.4;
        if (p.melt >= 1) particles.splice(i, 1);
      } else {
        p.y += (trackMidY - p.y) * Math.min(1, dt * 14);
        const dist = p.x - fillX;
        const pull = (90 + 240 * (1 - Math.min(1, dist / Math.max(1, W * 0.5)))) * cfg.speed;
        p.x -= Math.min(Math.max(0, dist), pull * dt);
        p.r = Math.max(2, p.r0 * 0.5);
        p.rot += p.vr * dt * 0.6;
        if (p.x <= fillX + 1.5) {
          impacts.push({ x: fillX, y: trackMidY, age: 0, life: 0.5, kind: 'merge' });
          burst(5, fillX, trackMidY, 0.3 * cfg.motion);
          fillFlash = 1;
          particles.splice(i, 1);
        }
      }
    }
  }

  function drawShape(p) {
    const c = ctx;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.globalAlpha = p.a;
    if (p.shape === 'star') {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5;
        const rr = i % 2 === 0 ? p.r : p.r * 0.45;
        const px = Math.cos(ang) * rr;
        const py = Math.sin(ang) * rr;
        if (i === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.closePath();
      c.fillStyle = colors.coin;
      c.fill();
      c.lineWidth = 1;
      c.strokeStyle = colors.edge;
      c.stroke();
    } else if (p.shape === 'envelope') {
      const w = p.r * 2.1;
      const h = p.r * 1.6;
      c.fillStyle = colors.coin;
      c.strokeStyle = colors.edge;
      c.lineWidth = 1;
      c.beginPath();
      if (typeof c.roundRect === 'function') c.roundRect(-w / 2, -h / 2, w, h, 3);
      else c.rect(-w / 2, -h / 2, w, h);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(-w / 2, -h / 2);
      c.lineTo(0, h * 0.1);
      c.lineTo(w / 2, -h / 2);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(0, 0, p.r, 0, Math.PI * 2);
      c.fillStyle = colors.coin;
      c.fill();
      c.lineWidth = 1.4;
      c.strokeStyle = colors.edge;
      c.stroke();
      c.beginPath();
      c.arc(0, 0, p.r * 0.68, 0, Math.PI * 2);
      c.lineWidth = 0.8;
      c.globalAlpha = p.a * 0.5;
      c.stroke();
      c.globalAlpha = p.a;
      c.fillStyle = colors.ink;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const glyph = cur().glyph;
      c.font = '600 ' + Math.round(p.r * (glyph.length > 1 ? 0.62 : 1.05)) +
        'px "Segoe UI", "Microsoft YaHei", sans-serif';
      c.fillText(glyph, 0, 0.5);
    }
    c.restore();
  }

  function drawFillGlow() {
    if (fillFlash <= 0 || fillX <= 1) return;
    ctx.globalAlpha = fillFlash * 0.32;
    ctx.fillStyle = colors.accent2;
    ctx.fillRect(0, trackTop + 1, fillX, trackH - 2);
    // 已有部分的右端亮起，作为金币汇入的接收口
    ctx.globalAlpha = fillFlash * 0.9;
    ctx.fillRect(Math.max(0, fillX - 1.5), trackTop + 1, 3, trackH - 2);
    ctx.globalAlpha = 1;
  }

  function drawMelt(p) {
    const t = clamp(p.melt, 0, 1);
    ctx.save();
    ctx.translate(p.x, trackTop + trackH * (0.1 + 0.5 * t));
    ctx.scale(1 + t * 0.6, Math.max(0.06, 1 - t * 0.95));
    ctx.globalAlpha = p.a * (1 - t);
    ctx.beginPath();
    ctx.arc(0, 0, p.r0, 0, Math.PI * 2);
    ctx.fillStyle = colors.coin;
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = colors.edge;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawTubeBead(p) {
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = Math.max(2, trackH * 0.42);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 24, p.y);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = colors.coin;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2, p.r * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.mode === 'fall') {
        ctx.globalAlpha = p.a * 0.16;
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = Math.max(1, p.r * 0.35);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.r * 1.5);
        ctx.lineTo(p.x, p.y - p.r * 3.4);
        ctx.stroke();
        drawShape(p);
      } else if (p.mode === 'melt') {
        drawMelt(p);
      } else {
        drawTubeBead(p);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawTubes(dt) {
    for (let i = tubes.length - 1; i >= 0; i--) {
      const t = tubes[i];
      t.age += dt;
      if (t.age >= t.life) {
        tubes.splice(i, 1);
        continue;
      }
      const k = 1 - t.age / t.life;
      const x0 = Math.min(fillX, t.from);
      const x1 = Math.max(fillX, t.from);
      const w = Math.max(2, x1 - x0);
      const top = trackTop + 1;
      const h = trackH - 2;
      ctx.globalAlpha = k * 0.22;
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') ctx.roundRect(x0, top, w, h, h / 2);
      else ctx.rect(x0, top, w, h);
      ctx.fill();
      ctx.globalAlpha = k * 0.7;
      ctx.strokeStyle = colors.accent2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, top + 0.5);
      ctx.lineTo(x1, top + 0.5);
      ctx.moveTo(x0, top + h - 0.5);
      ctx.lineTo(x1, top + h - 0.5);
      ctx.stroke();
      // 管内向左流动的流线，明确「被吸向已有部分」的方向
      ctx.globalAlpha = k * 0.9;
      ctx.strokeStyle = colors.accent2;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let j = 0; j < 4; j++) {
        const phase = (t.age * 1.8 + j / 4) % 1;
        const px = x1 - w * phase;
        ctx.beginPath();
        ctx.moveTo(px + 6, trackMidY);
        ctx.lineTo(px, trackMidY);
        ctx.stroke();
      }
      // 落点是漏斗形吸入口（尖端朝左），x0 是汇入已有部分的终点
      ctx.globalAlpha = k * 0.75;
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x1 + 3, top);
      ctx.lineTo(x1 - 4, trackMidY);
      ctx.lineTo(x1 + 3, top + h);
      ctx.stroke();
      ctx.globalAlpha = k * 0.9;
      ctx.fillStyle = colors.accent2;
      ctx.beginPath();
      ctx.arc(x0, trackMidY, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawImpacts(dt) {
    for (let i = impacts.length - 1; i >= 0; i--) {
      const s = impacts[i];
      s.age += dt;
      if (s.age >= s.life) {
        impacts.splice(i, 1);
        continue;
      }
      const t = s.age / s.life;
      const a = 1 - t;
      ctx.globalAlpha = a * 0.8;
      ctx.strokeStyle = colors.accent2;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 3 + t * 20, 1.5 + t * 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = colors.coin;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(0.5, 3 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function burst(count, x, y, power) {
    const cx = x == null ? W * 0.5 : x;
    const cy = y == null ? H * 0.5 : y;
    const k = (power || 1) * cfg.motion;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * 170) * k;
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.55 + Math.random() * 0.65,
        age: 0,
        r: 1.4 + Math.random() * 3,
        color: Math.random() < 0.5 ? colors.accent : colors.coin
      });
    }
  }

  function drawSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.age += dt;
      if (s.age >= s.life) {
        sparks.splice(i, 1);
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 250 * dt;
      ctx.globalAlpha = 1 - s.age / s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function ding(pitch) {
    if (!cfg.sound) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const base = 1180 * (pitch || 1);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 0.62, t + 0.13);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    } catch (_) {
      // audio unavailable
    }
  }

  function bump() {
    if (!cfg.bump) return;
    const app = $('#app');
    app.classList.remove('bump', 'bump-back');
    void app.offsetWidth;
    app.classList.add('bump');
    setTimeout(() => {
      app.classList.remove('bump');
      app.classList.add('bump-back');
    }, 130);
    setTimeout(() => app.classList.remove('bump-back'), 240);
  }

  function showBubble(text) {
    const el = $('#bubble');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function showAchievement(text) {
    $('#bubble').classList.remove('show');
    const el = $('#achievement');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(achievementTimer);
    achievementTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function checkMilestone() {
    let changed = false;
    const marks = L.MILESTONES;
    while (cfg.milestoneIndex < marks.length && cfg.total >= goalAmount(marks[cfg.milestoneIndex])) {
      const value = goalAmount(marks[cfg.milestoneIndex]);
      cfg.milestoneIndex++;
      changed = true;
      showAchievement(t('achievement', moneyShort(value)));
      burst(44, null, null, 1.25);
      ding(1.35);
    }
    if (changed) persist();
  }

  function maybePraise(now) {
    if (!cfg.hasRate || cfg.praiseFreq <= 0) return;
    const gap = 28000 - cfg.praiseFreq * 19000;
    if (now - lastPraise > gap) {
      lastPraise = now;
      showBubble(pick(L.list(cfg.lang, 'praise')));
    }
  }

  function loop() {
    const now = Date.now();
    let dt = (now - lastTs) / 1000;
    lastTs = now;
    if (dt > 3600) dt = 3600;
    // Freeze the counter while a dialog / onboarding screen is up.
    if (running && cfg.hasRate && !isOverlayOpen()) cfg.total += dt * cfg.rate;

    updateParticles(dt);
    ctx.clearRect(0, 0, W, H);
    drawFillGlow();
    drawTubes(dt);
    drawParticles();
    drawImpacts(dt);
    drawSparks(dt);

    if (now - lastRender > 90) {
      renderUI();
      lastRender = now;
    }
    if (now - lastSave > 1500) {
      persist();
      lastSave = now;
    }
    checkMilestone();
    maybePraise(now);
    requestAnimationFrame(loop);
  }

  function setIncome(raw) {
    const value = Number(String(raw).replace(/[^\d.]/g, ''));
    if (!isFinite(value) || value <= 0 || value > 1e9) {
      showBubble(t('msg.invalidIncome'));
      return;
    }
    cfg.rate = value / secondsPerMonth();
    cfg.rateDays = cfg.days;
    cfg.rateHours = cfg.hours;
    cfg.hasRate = true;
    $('#income').value = '';
    document.body.classList.remove('needs-setup');
    persist();
    renderUI();
    showBubble(t('msg.incomeSet'));
    burst(20, null, null, 1);
    ding();
  }

  function recalibrate() {
    if (!cfg.hasRate) return;
    const oldSeconds = cfg.rateDays * cfg.rateHours * 3600;
    const monthlyInMemory = cfg.rate * oldSeconds;
    cfg.rate = monthlyInMemory / secondsPerMonth();
    cfg.rateDays = cfg.days;
    cfg.rateHours = cfg.hours;
  }

  function updateSliderLabels() {
    $('#densityVal').textContent = t('unit.count', cfg.density);
    $('#speedVal').textContent = cfg.speed.toFixed(1) + '×';
    $('#motionVal').textContent = cfg.motion.toFixed(1) + '×';
    $('#freqVal').textContent = cfg.praiseFreq === 0 ? t('unit.off') : Math.round(cfg.praiseFreq * 100) + '%';
    $('#idleVal').textContent = t('unit.seconds', cfg.idleSec);
  }

  function applySize() {
    if (!bridge || !bridge.isElectron) return;
    bridge.resize(cfg.mini ? 260 : 330, cfg.mini ? MINI_H : 560);
  }

  // Re-render every static string, the two locale selects, and all dynamic labels.
  function applyI18n() {
    document.documentElement.lang = L.langMeta(cfg.lang).html;
    document.title = 'Coin-Rain';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
    $$('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    $('#btnPause').textContent = t(running ? 'panel.pause' : 'panel.resume');
    $('#btnMore').title = t(cfg.mini ? 'tip.expand' : 'tip.expanded');
    $('#caliber').textContent = t('income.caliber', cfg.days, cfg.hours,
      Math.round(secondsPerMonth()).toLocaleString(L.langMeta(cfg.lang).num));

    if (!localeOptionsBuilt) {
      const langSel = $('#lang');
      L.LANGS.forEach((l) => {
        const o = document.createElement('option');
        o.value = l.code;
        o.textContent = l.label;
        langSel.appendChild(o);
      });
      const curSel = $('#currency');
      L.CURRENCIES.forEach((c) => {
        const o = document.createElement('option');
        o.value = c.code;
        o.textContent = c.label;
        curSel.appendChild(o);
      });
      localeOptionsBuilt = true;
    }
    $('#lang').value = cfg.lang;
    $('#currency').value = cfg.currency;

    updateSliderLabels();
    renderUI();
    if (bridge && bridge.isElectron && typeof bridge.setLocale === 'function') {
      bridge.setLocale(cfg.lang);
    }
  }

  // Language / currency switch. Currency conversion uses the offline reference
  // table; the monthly income itself is never persisted, so privacy is intact.
  function setLocale(lang, code) {
    const nextLang = L.normalizeLang(lang || cfg.lang);
    const nextCode = L.normalizeCurrency(code || cfg.currency);
    const changedCurrency = nextCode !== cfg.currency;
    if (changedCurrency) {
      cfg.rate = L.convert(cfg.rate, cfg.currency, nextCode);
      cfg.total = L.convert(cfg.total, cfg.currency, nextCode);
    }
    cfg.lang = nextLang;
    cfg.currency = nextCode;
    activeCurrency = L.currency(nextCode);
    goalsCacheKey = '';
    persist();
    syncControls();
    if (changedCurrency) showBubble(t('msg.currencyChanged'));
  }

  function syncControls() {
    activeCurrency = L.currency(cfg.currency);
    document.body.dataset.theme = cfg.theme;
    document.body.classList.toggle('mini', !!cfg.mini);
    document.body.classList.toggle('needs-setup', !cfg.hasRate);
    $('#days').value = cfg.days;
    $('#hours').value = cfg.hours;
    $('#scale').value = cfg.scale;
    $('#density').value = cfg.density;
    $('#speed').value = cfg.speed;
    $('#motion').value = cfg.motion;
    $('#freq').value = cfg.praiseFreq;
    $('#optSound').checked = !!cfg.sound;
    $('#optBump').checked = !!cfg.bump;
    $('#optTop').checked = !!cfg.alwaysOnTop;
    $('#optAwake').checked = !!cfg.keepAwake;
    $$('.theme-chip').forEach((b) => b.classList.toggle('active', b.dataset.theme === cfg.theme));
    $$('.shape-chip').forEach((b) => b.classList.toggle('active', b.dataset.shape === cfg.shape));
    $('#btnMore').classList.toggle('active', !cfg.mini);
    $('#optImmersive').checked = !!cfg.immersive;
    $('#idle').value = cfg.idleSec;
    readColors();
    applyI18n();
  }

  function saveAndSync() {
    persist();
    syncControls();
  }

  // Immersive: after idle, the titlebar and resize handle collapse so the rain fills the window.
  function setImmersive(on) {
    const allow = !!on && !!cfg.immersive && !!cfg.mini && !resizeDrag;
    if (allow === immersiveOn) return;
    immersiveOn = allow;
    document.body.classList.toggle('immersive', allow);
    resizeCanvas();
    clearTimeout(setImmersive.t);
    setImmersive.t = setTimeout(resizeCanvas, 360);
  }

  function scheduleIdle() {
    clearTimeout(idleTimer);
    if (!cfg.immersive || !cfg.mini || resizeDrag) {
      setImmersive(false);
      return;
    }
    idleTimer = setTimeout(() => setImmersive(true), cfg.idleSec * 1000);
  }

  function wake(throttle) {
    const now = Date.now();
    if (throttle && now - lastWake < 180) return;
    lastWake = now;
    if (immersiveOn) setImmersive(false);
    scheduleIdle();
  }

  function togglePanel() {
    cfg.mini = !cfg.mini;
    if (!cfg.mini) setImmersive(false);
    syncControls();
    persist();
    applySize();
    if (!bridge || !bridge.isElectron) {
      const appEl = $('#app');
      appEl.style.height = '';
      appEl.style.maxHeight = '';
    }
    scheduleIdle();
    setTimeout(resizeCanvas, 120);
  }

  function openPanel() {
    if (cfg.mini) togglePanel();
    setTimeout(() => $('#income').focus(), 100);
  }

  // 下边缘手柄：拖拽改变窗口高度，下限固定为挂机小窗高度。
  function beginResize(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    wake(true);
    const startH = (bridge && bridge.isElectron)
      ? window.innerHeight
      : Math.round($('#app').getBoundingClientRect().height);
    resizeDrag = { y: e.clientY, h: startH, w: window.innerWidth, last: startH };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    document.body.classList.add('resizing');
    clearTimeout(idleTimer);
  }

  function moveResize(e) {
    if (!resizeDrag) return;
    const h = clamp(Math.round(resizeDrag.h + (e.clientY - resizeDrag.y)), MINI_H, MAX_H);
    if (h === resizeDrag.last) return;
    resizeDrag.last = h;
    if (bridge && bridge.isElectron) {
      bridge.resize(resizeDrag.w, h);
    } else {
      const appEl = $('#app');
      appEl.style.height = h + 'px';
      appEl.style.maxHeight = h + 'px';
    }
    resizeCanvas();
  }

  function endResize() {
    if (!resizeDrag) return;
    resizeDrag = null;
    document.body.classList.remove('resizing');
    resizeCanvas();
    scheduleIdle();
  }

  /* ---------- Overlays: in-app dialog + first-run onboarding ----------
   * IMPORTANT: never use window.confirm() here. Electron renders it as a
   * synchronous native modal parented to a frameless, always-on-top window;
   * the dialog can end up behind the widget and keyboard focus is not restored
   * to the webContents afterwards. That made every input (including the
   * monthly-income field) look frozen after clicking Reset. */
  function isOverlayOpen() {
    return !$('#onboardOverlay').hidden || !$('#confirmOverlay').hidden;
  }

  function refreshOverlayState() {
    document.body.classList.toggle('overlay-open', isOverlayOpen());
  }

  function focusBackToWidget() {
    const target = cfg.mini ? $('#btnMore') : $('#income');
    if (!target) return;
    try { target.focus({ preventScroll: true }); } catch (_) {
      try { target.focus(); } catch (_) { /* not focusable in this state */ }
    }
  }

  function openConfirm(title, message, onOk) {
    $('#confirmTitle').textContent = title;
    $('#confirmMessage').textContent = message;
    $('#confirmCancel').textContent = t('dialog.cancel');
    $('#confirmOk').textContent = t('dialog.confirm');
    pendingConfirm = onOk;
    $('#confirmOverlay').hidden = false;
    refreshOverlayState();
    try { $('#confirmCancel').focus({ preventScroll: true }); } catch (_) {}
  }

  function closeConfirm(accepted) {
    const callback = pendingConfirm;
    pendingConfirm = null;
    $('#confirmOverlay').hidden = true;
    refreshOverlayState();
    if (accepted && typeof callback === 'function') callback();
    // Explicitly hand keyboard focus back: this is what the native modal broke.
    focusBackToWidget();
    wake(false);
  }

  /* First-run: pick language + currency before the rain starts. Defaults are
   * en-US / USD; returning users keep their saved pair as the initial choice. */
  function renderOnboard(previewLang) {
    const lang = L.normalizeLang(previewLang);
    $('#onboardEyebrow').textContent = L.t(lang, 'onboard.eyebrow');
    $('#onboardTitle').textContent = L.t(lang, 'onboard.title');
    $('#onboardSubtitle').textContent = L.t(lang, 'onboard.subtitle');
    $('#onboardLangLabel').textContent = L.t(lang, 'onboard.language');
    $('#onboardCurrencyLabel').textContent = L.t(lang, 'onboard.currency');
    $('#onboardStart').textContent = L.t(lang, 'onboard.start');
    $('#onboardNote').textContent = L.t(lang, 'onboard.note');
    const c = L.currency(onboardCurrency);
    const digits = c.digits === 0 ? 0 : 2;
    $('#onboardPreview').textContent = c.symbol + ' ' +
      Number(0).toLocaleString(L.langMeta(lang).num, {
        minimumFractionDigits: digits, maximumFractionDigits: digits
      });
  }

  function fillOnboardSelects() {
    const langSel = $('#onboardLang');
    const curSel = $('#onboardCurrency');
    if (!langSel.options.length) {
      L.LANGS.forEach((l) => {
        const o = document.createElement('option');
        o.value = l.code; o.textContent = l.label;
        langSel.appendChild(o);
      });
      L.CURRENCIES.forEach((c) => {
        const o = document.createElement('option');
        o.value = c.code; o.textContent = c.label;
        curSel.appendChild(o);
      });
    }
    langSel.value = onboardLang;
    curSel.value = onboardCurrency;
  }

  function openOnboarding() {
    onboardLang = cfg.lang;
    onboardCurrency = cfg.currency;
    fillOnboardSelects();
    renderOnboard(onboardLang);
    $('#onboardOverlay').hidden = false;
    refreshOverlayState();
    clearTimeout(idleTimer);
    setImmersive(false);
    if (bridge && bridge.isElectron) {
      bridge.resize(ONBOARD_SIZE.width, ONBOARD_SIZE.height);
    } else {
      const appEl = $('#app');
      appEl.style.height = ONBOARD_SIZE.height + 'px';
      appEl.style.maxHeight = ONBOARD_SIZE.height + 'px';
      appEl.style.maxWidth = ONBOARD_SIZE.width + 'px';
    }
    setTimeout(() => { try { $('#onboardLang').focus({ preventScroll: true }); } catch (_) {} }, 80);
    setTimeout(resizeCanvas, 140);
  }

  function finishOnboarding() {
    const lang = L.normalizeLang($('#onboardLang').value);
    const code = L.normalizeCurrency($('#onboardCurrency').value);
    $('#onboardOverlay').hidden = true;
    // This is the initial choice, not a currency switch: no conversion applied.
    cfg.lang = lang;
    cfg.currency = code;
    cfg.mini = true;
    cfg.onboarded = true;
    activeCurrency = L.currency(code);
    goalsCacheKey = '';
    persist();
    syncControls();
    renderUI();
    refreshOverlayState();
    applySize();
    if (!(bridge && bridge.isElectron)) {
      const appEl = $('#app');
      appEl.style.height = '';
      appEl.style.maxHeight = '';
      appEl.style.maxWidth = '';
    }
    focusBackToWidget();
    scheduleIdle();
    setTimeout(resizeCanvas, 160);
  }

  function bindEvents() {
    $('#btnIncome').addEventListener('click', () => setIncome($('#income').value));
    $('#income').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') setIncome($('#income').value);
    });

    ['days', 'hours'].forEach((key) => {
      $('#' + key).addEventListener('change', (e) => {
        const v = Number(e.target.value);
        cfg[key] = key === 'days' ? clamp(v || 21.75, 1, 31) : clamp(v || 8, 1, 24);
        recalibrate();
        saveAndSync();
        renderUI();
      });
    });

    $('#scale').addEventListener('change', (e) => {
      cfg.scale = e.target.value;
      saveAndSync();
      renderUI();
    });

    $$('.theme-chip').forEach((btn) => btn.addEventListener('click', () => {
      cfg.theme = btn.dataset.theme;
      saveAndSync();
      burst(12, null, null, 0.8);
    }));

    $$('.shape-chip').forEach((btn) => btn.addEventListener('click', () => {
      cfg.shape = btn.dataset.shape;
      particles.length = 0;
      tubes.length = 0;
      impacts.length = 0;
      saveAndSync();
    }));

    [['density', 'density'], ['speed', 'speed'], ['motion', 'motion'], ['freq', 'praiseFreq'], ['idle', 'idleSec']].forEach((pair) => {
      $('#' + pair[0]).addEventListener('input', (e) => {
        cfg[pair[1]] = Number(e.target.value);
        updateSliderLabels();
        persist();
      });
    });

    [['optSound', 'sound'], ['optBump', 'bump'], ['optTop', 'alwaysOnTop'], ['optAwake', 'keepAwake']].forEach((pair) => {
      $('#' + pair[0]).addEventListener('change', (e) => {
        cfg[pair[1]] = e.target.checked;
        persist();
        if (bridge && bridge.isElectron) {
          if (pair[1] === 'alwaysOnTop') bridge.setAlwaysOnTop(cfg.alwaysOnTop);
          if (pair[1] === 'keepAwake') bridge.setKeepAwake(cfg.keepAwake);
        }
      });
    });

    $('#btnRandom').addEventListener('click', () => {
      cfg.theme = pick(['warm', 'cyber', 'cream', 'minimal']);
      cfg.shape = pick(['coin', 'envelope', 'star']);
      cfg.density = 12 + Math.floor(Math.random() * 40);
      cfg.speed = Number((0.7 + Math.random() * 1.2).toFixed(1));
      particles.length = 0;
      tubes.length = 0;
      impacts.length = 0;
      saveAndSync();
      burst(24, null, null, 1);
      ding(1.15);
      showBubble(t('msg.random'));
    });

    $('#btnMore').addEventListener('click', togglePanel);
    $('#btnCollapse').addEventListener('click', togglePanel);

    $('#btnPause').addEventListener('click', () => {
      running = !running;
      syncControls();
      showBubble(t(running ? 'msg.resume' : 'msg.pause'));
    });

    $('#btnReset').addEventListener('click', () => {
      openConfirm(t('msg.resetTitle'), t('msg.resetConfirm'), () => {
        cfg.total = 0;
        cfg.milestoneIndex = 0;
        // rate / hasRate are intentionally untouched: income can be re-entered
        // at any time and the rain keeps growing from 0.
        persist();
        renderUI();
        showBubble(t('msg.reset'));
      });
    });

    $('#confirmCancel').addEventListener('click', () => closeConfirm(false));
    $('#confirmOk').addEventListener('click', () => closeConfirm(true));
    $('#onboardLang').addEventListener('change', (e) => {
      onboardLang = L.normalizeLang(e.target.value);
      renderOnboard(onboardLang);
    });
    $('#onboardCurrency').addEventListener('change', (e) => {
      onboardCurrency = L.normalizeCurrency(e.target.value);
      renderOnboard(onboardLang);
    });
    $('#onboardStart').addEventListener('click', finishOnboarding);

    $('#lang').addEventListener('change', (e) => setLocale(e.target.value, cfg.currency));
    $('#currency').addEventListener('change', (e) => setLocale(cfg.lang, e.target.value));

    $('#setupTip').addEventListener('click', openPanel);

    $('#optImmersive').addEventListener('change', (e) => {
      cfg.immersive = e.target.checked;
      persist();
      if (cfg.immersive) scheduleIdle();
      else setImmersive(false);
    });

    if (bridge && bridge.isElectron) {
      $('#btnMin').addEventListener('click', () => bridge.minimize());
      $('#btnClose').addEventListener('click', () => {
        persist();
        bridge.close();
      });
    }

    window.addEventListener('pointerdown', (e) => {
      wake(true);
      // Clicks on an overlay must not be misread as coin hits on the canvas.
      if (isOverlayOpen() || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x < 0 || y < 0 || x > W || y > H) return;
      let hit = -1;
      let nearest = Infinity;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (p.mode !== 'fall') continue;
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < p.r + 12 && d < nearest) {
          nearest = d;
          hit = i;
        }
      }
      if (hit < 0) return;
      particles.splice(hit, 1);
      burst(14, x, y, 1);
      showBubble(pick(L.list(cfg.lang, 'praise')));
      ding();
      bump();
    });

    const handle = $('#resizeHandle');
    handle.addEventListener('pointerdown', beginResize);
    handle.addEventListener('pointermove', moveResize);
    handle.addEventListener('pointerup', endResize);
    handle.addEventListener('pointercancel', endResize);
    handle.addEventListener('lostpointercapture', endResize);

    window.addEventListener('pointermove', () => {
      if (!resizeDrag) wake(true);
    });
    document.documentElement.addEventListener('pointerenter', () => wake(false));
    document.documentElement.addEventListener('pointerleave', () => wake(false));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !$('#confirmOverlay').hidden) closeConfirm(false);
      wake(false);
    });
    window.addEventListener('wheel', () => wake(true), { passive: true });

    window.addEventListener('resize', resizeCanvas);
    // 沉浸收起 / 面板展开 / 手柄拖拽都会改变雨区尺寸，需实时重算画布与进度条位置
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(() => resizeCanvas());
      observer.observe($('#rainZone'));
      observer.observe($('#track'));
    }
    window.addEventListener('beforeunload', persist);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) persist();
      else wake(false);
      lastTs = Date.now();
    });
  }

  async function init() {
    if (bridge && bridge.isElectron) {
      document.body.classList.add('is-electron');
      if (typeof bridge.onSync === 'function') {
        bridge.onSync((data) => {
          Object.assign(cfg, data || {});
          syncControls();
          persist();
        });
      }
    }
    await loadConfig();
    cfg.mini = true;
    canvas = $('#rain');
    trackEl = $('#track');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    syncControls();
    renderUI();
    bindEvents();
    applySize();
    if (bridge && bridge.isElectron) {
      bridge.setAlwaysOnTop(cfg.alwaysOnTop);
      if (cfg.keepAwake) bridge.setKeepAwake(true);
    }
    lastTs = Date.now();
    lastPraise = Date.now();
    scheduleIdle();
    // Automated screenshot runs use a throw-away profile; skip onboarding so
    // the captured frame is always the widget itself.
    if (bridge && bridge.selfCheck && !cfg.onboarded) {
      cfg.onboarded = true;
      persist();
    }
    if (!cfg.onboarded) openOnboarding();
    refreshOverlayState();
    // 自检钩子：让截图脚本能强制进入沉浸态、验证自动收起定时器
    window.coinRainDebug = {
      setImmersive(on) {
        clearTimeout(idleTimer);
        immersiveOn = !!on;
        document.body.classList.toggle('immersive', immersiveOn);
        resizeCanvas();
        clearTimeout(setImmersive.t);
        setImmersive.t = setTimeout(resizeCanvas, 360);
      },
      autoIdle(ms) {
        cfg.immersive = true;
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => setImmersive(true), ms || 800);
      },
      wake,
      togglePanel,
      setLocale,
      showOnboarding: openOnboarding,
      finishOnboarding,
      isOverlayOpen,
      getLocale: () => ({
        lang: cfg.lang, currency: cfg.currency, total: cfg.total, rate: cfg.rate,
        onboarded: cfg.onboarded
      }),
      getState: () => ({
        lang: cfg.lang, currency: cfg.currency, onboarded: cfg.onboarded,
        hasRate: cfg.hasRate, rate: cfg.rate, total: cfg.total, mini: cfg.mini,
        onboardVisible: !$('#onboardOverlay').hidden,
        confirmVisible: !$('#confirmOverlay').hidden,
        incomeValue: $('#income').value,
        activeElement: document.activeElement ? document.activeElement.id : ''
      })
    };
    requestAnimationFrame(loop);
  }

  init();
})();
