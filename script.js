// ============================================================
// 0. АУДИО-МЕНЕДЖЕР (Howler.js)
// ============================================================
const Sound = {
  sounds: {},
  enabled: true,
  inited: false,

  init() {
    if (this.inited) return;
    this.inited = true;
    if (typeof Howl === "undefined") {
      console.warn("Howler.js не загружен — звуки отключены");
      this.enabled = false;
      return;
    }
    this.sounds = {
      click:   new Howl({ src: ["snd-click.mp3"],   volume: 1.0 }),
      whoosh:  new Howl({ src: ["snd-whoosh.mp3"],  volume: 1.0 }),
      beep:    new Howl({ src: ["snd-beep.mp3"],    volume: 0.35 }),
      connect: new Howl({ src: ["snd-connect.mp3"], volume: 0.85, rate: 2 })
    };
      },

  play(name) {
    if (!this.enabled || !this.sounds[name]) return;
    this.sounds[name].play();
  },

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      Object.values(this.sounds).forEach(s => s.stop());
    }
    return this.enabled;
  }
};

// Инициализация при первом действии пользователя
let soundInited = false;
function initSoundOnce() {
  if (soundInited) return;
  soundInited = true;
  Sound.init();
}
window.addEventListener("click", initSoundOnce, { once: true });
window.addEventListener("keydown", initSoundOnce, { once: true });

// Кнопка вкл/выкл
window.addEventListener("load", () => {
  const btn = document.getElementById("soundBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const enabled = Sound.toggle();
    btn.textContent = enabled ? "🔊" : "🔇";
    btn.classList.toggle("muted", !enabled);
  });
});

// ============================================================
// 1. ЗВЁЗДЫ
// ============================================================
const starsCanvas = document.getElementById("stars");
const starsCtx = starsCanvas.getContext("2d");
let stars = [];

function resizeStars() {
  starsCanvas.width = window.innerWidth;
  starsCanvas.height = window.innerHeight;
  generateStars();
}
function generateStars() {
  const count = Math.floor((starsCanvas.width * starsCanvas.height) / 8000);
  stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * starsCanvas.width,
      y: Math.random() * starsCanvas.height,
      r: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.6 + 0.3,
      twinkle: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2
    });
  }
}
function drawStars(t) {
  starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
  stars.forEach(s => {
    const a = s.alpha * (0.6 + 0.4 * Math.sin(t * s.twinkle + s.phase));
    starsCtx.beginPath();
    starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    starsCtx.fillStyle = `rgba(200, 220, 255, ${a})`;
    starsCtx.fill();
  });
}
window.addEventListener("resize", resizeStars);
resizeStars();
function starLoop(ts) {
  drawStars(ts / 1000);
  requestAnimationFrame(starLoop);
}
requestAnimationFrame(starLoop);

// ============================================================
// 2. ГЛОБУС
// ============================================================
const globeSvg = d3.select("#globeSvg");
const gW = 1000, gH = 700;

const globeProjection = d3.geoOrthographic()
  .scale(280)
  .translate([gW / 2, gH / 2])
  .rotate([-51.5, -55.2])
  .clipAngle(90);

const globePath = d3.geoPath().projection(globeProjection);

globeSvg.append("circle")
  .attr("class", "globe-sphere")
  .attr("cx", gW / 2).attr("cy", gH / 2).attr("r", 280);

let autoRotate = true;
let rotation = [-51.5, -55.2];
const rotateSpeed = 0.08;

d3.json("countries-110m.json").then(world => {
  const countries = topojson.feature(world, world.objects.countries);
  globeSvg.selectAll("path.country")
    .data(countries.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", globePath);
  console.log("✓ Глобус загружен");
}).catch(err => console.error("✗ countries-110m.json:", err));

function rotateGlobe() {
  if (autoRotate) {
    rotation[0] += rotateSpeed;
    globeProjection.rotate(rotation);
    globeSvg.selectAll("path.country").attr("d", globePath);
  }
  requestAnimationFrame(rotateGlobe);
}
rotateGlobe();

// ============================================================
// 3. ГОРОДА
// ============================================================
const cities = [
  { name: "Казань",         lat: 55.79, lon: 49.12, hub: true, labelOffset: [-20, 30], anchor: "end" },
  { name: "Высокая Гора",   lat: 55.91, lon: 49.31, labelOffset: [-20, -18], anchor: "end" },
  { name: "Агрыз",          lat: 56.52, lon: 53.00, labelOffset: [16, -10],  anchor: "start" },
  { name: "Терси",          lat: 56.38, lon: 53.13, labelOffset: [16, 4],    anchor: "start" },
  { name: "Муслюмово",      lat: 55.30, lon: 53.18, labelOffset: [16, -10],  anchor: "start" },
  { name: "Лениногорск",    lat: 54.60, lon: 52.55, labelOffset: [16, -6],   anchor: "start" },
  { name: "Тимяшево",       lat: 54.58, lon: 52.48, labelOffset: [-16, 14],  anchor: "end" },
  { name: "Чистополь",      lat: 55.37, lon: 50.63, labelOffset: [-16, -10], anchor: "end" },
  { name: "Новошешминск",   lat: 55.05, lon: 51.15, labelOffset: [-16, 14],  anchor: "end" },
  { name: "Аксубаево",      lat: 54.82, lon: 50.78, labelOffset: [-16, 14],  anchor: "end" },
  { name: "Елабуга",        lat: 55.76, lon: 52.06, labelOffset: [-16, -14], anchor: "end" },
  { name: "Мамадыш",        lat: 55.72, lon: 51.40, labelOffset: [-16, -10], anchor: "end" },
  { name: "Заинск",         lat: 55.30, lon: 52.02, labelOffset: [16, 4],    anchor: "start" },
  { name: "Нижнекамск",     lat: 55.64, lon: 51.82, labelOffset: [-16, 14],  anchor: "end" }
];

const schoolCity = { name: "Лицей «Прогресс»", lat: 55.81, lon: 49.44, labelOffset: [22, -20], anchor: "start" };

// ============================================================
// 4. LEAFLET КАРТА
// ============================================================
const map = L.map("leafletMap", {
  zoomControl: false,
  attributionControl: false,
  center: [55.4, 51.0],
  zoom: 7.6,
  zoomSnap: 0.1,
  zoomAnimation: false,
  fadeAnimation: false,
  markerZoomAnimation: false,
  dragging: false,
  touchZoom: false,
  doubleClickZoom: false,
  scrollWheelZoom: false,
  boxZoom: false,
  keyboard: false,
  tap: false,
  inertia: false
});

L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  maxZoom: 18,
  crossOrigin: true
}).addTo(map);

const boundaryPane = map.createPane("boundaryPane");
boundaryPane.style.zIndex = 500;
boundaryPane.style.pointerEvents = "none";

// ============================================================
// 5. ОВЕРЛЕЙ
// ============================================================
const overlaySvg = document.getElementById("mapOverlay");
const threadsLayer = document.getElementById("threadsLayer");
const citiesLayer  = document.getElementById("citiesLayer");
const fxLayer      = document.getElementById("fxLayer");

function project(lat, lon) {
  const p = map.latLngToContainerPoint([lat, lon]);
  return [p.x, p.y];
}

function syncOverlaySize() {
  const size = map.getSize();
  overlaySvg.setAttribute("viewBox", `0 0 ${size.x} ${size.y}`);
  overlaySvg.setAttribute("width", size.x);
  overlaySvg.setAttribute("height", size.y);
}
map.on("resize", syncOverlaySize);
syncOverlaySize();

// ============================================================
// 6. ЗАГРУЗКА КОНТУРА
// ============================================================
let TATARSTAN_GEOJSON = null;

fetch("tatarstan.geojson")
  .then(r => r.json())
  .then(geoData => {
    if (geoData.type === "FeatureCollection") {
      TATARSTAN_GEOJSON = geoData.features[0];
    } else {
      TATARSTAN_GEOJSON = geoData;
    }

    function flip(coords) {
      if (typeof coords[0] === "number") return [coords[1], coords[0]];
      return coords.map(flip);
    }
    const coords = flip(TATARSTAN_GEOJSON.geometry.coordinates);

    let rings = [];
    if (TATARSTAN_GEOJSON.geometry.type === "Polygon") {
      rings = [coords[0]];
    } else if (TATARSTAN_GEOJSON.geometry.type === "MultiPolygon") {
      rings = coords.map(p => p[0]);
    }

    const worldBox = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
    L.polygon([worldBox, ...rings], {
      color: "none",
      fillColor: "#010818",
      fillOpacity: 0.85,
      interactive: false
    }).addTo(map);

    L.polygon(rings, {
      color: "#00e8ff",
      weight: 3.5,
      opacity: 1,
      fill: false,
      className: "tatar-glow-border",
      interactive: false
    }).addTo(map);

    console.log("✓ Контур и свечение загружены");

    setTimeout(() => {
      syncOverlaySize();
      drawCities();
    }, 300);
  })
  .catch(err => console.error("✗ tatarstan.geojson:", err));

// ============================================================
// 7. ОТРИСОВКА ГОРОДОВ
// ============================================================
function drawCities() {
  threadsLayer.innerHTML = "";
  citiesLayer.innerHTML = "";
  fxLayer.innerHTML = "";

  const hub = cities.find(c => c.hub);
  const hubP = project(hub.lat, hub.lon);

  cities.forEach((city, index) => {
    if (city.hub) return;
    const p = project(city.lat, city.lon);

    const dx = p[0] - hubP[0];
    const dy = p[1] - hubP[1];
    const dist = Math.hypot(dx, dy);

    const direction = (index % 2 === 0) ? 1 : -1;
    const curveAmount = 0.08 + (index % 4) * 0.04;

    const nx = -dy / dist;
    const ny = dx / dist;
    const offset = dist * curveAmount * direction;

    const ctrlX = (hubP[0] + p[0]) / 2 + nx * offset;
    const ctrlY = (hubP[1] + p[1]) / 2 + ny * offset;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "thread");
    path.setAttribute("d", `M ${hubP[0]} ${hubP[1]} Q ${ctrlX} ${ctrlY} ${p[0]} ${p[1]}`);
    threadsLayer.appendChild(path);

    setTimeout(() => path.classList.add("visible", "drawn"), 300);
  });

  cities.forEach((city, i) => {
    const p = project(city.lat, city.lon);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "city" + (city.hub ? " hub" : ""));
    g.setAttribute("transform", `translate(${p[0]}, ${p[1]})`);

    const glowR = city.hub ? 42 : 22;
    const coreR = city.hub ? 9  : 5;

    const glow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    glow.setAttribute("class", "city-glow");
    glow.setAttribute("r", glowR);
    g.appendChild(glow);

    const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    core.setAttribute("class", "city-core");
    core.setAttribute("r", coreR);
    g.appendChild(core);

    const off = city.labelOffset || [16, -10];
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "city-label");
    text.setAttribute("x", off[0]);
    text.setAttribute("y", off[1]);
    text.setAttribute("text-anchor", city.anchor || "start");
    text.textContent = city.name;
    g.appendChild(text);

    citiesLayer.appendChild(g);
    setTimeout(() => g.classList.add("visible"), 500 + i * 200);
  });

  const schoolP = project(schoolCity.lat, schoolCity.lon);
  const schoolG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  schoolG.setAttribute("class", "school-marker");
  schoolG.setAttribute("transform", `translate(${schoolP[0]}, ${schoolP[1]})`);

  const sGlow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  sGlow.setAttribute("class", "school-glow");
  sGlow.setAttribute("r", 30);
  schoolG.appendChild(sGlow);

  const sHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  sHalo.setAttribute("class", "school-halo");
  sHalo.setAttribute("r", 18);
  schoolG.appendChild(sHalo);

  const sCore = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  sCore.setAttribute("class", "school-core");
  sCore.setAttribute("r", 6);
  schoolG.appendChild(sCore);

  const sLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
  sLabel.setAttribute("class", "school-label");
  sLabel.setAttribute("x", schoolCity.labelOffset[0]);
  sLabel.setAttribute("y", schoolCity.labelOffset[1]);
  sLabel.setAttribute("text-anchor", schoolCity.anchor);
  sLabel.textContent = "Лицей «Прогресс»";
  schoolG.appendChild(sLabel);

  citiesLayer.appendChild(schoolG);

  setTimeout(() => {
    document.getElementById("schoolPanel").classList.add("show");
  }, 2000);

  window.__data = { hubP, schoolP, schoolG };
}

map.on("move zoom", () => {
  if (TATARSTAN_GEOJSON) drawCities();
});

// ============================================================
// 8. ПЕРЕХОД ГЛОБУС → КАРТА
// ============================================================
const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const globeWrap = document.getElementById("globeWrap");
const mapWrap = document.getElementById("mapWrap");

let started = false;

startBtn.addEventListener("click", () => {
  if (started) return;
  started = true;
  startBtn.disabled = true;
  startBtn.textContent = "🌍 Приближаем…";
  autoRotate = false;

  // 1. Клик — сразу
  Sound.play("click");

  // 2. Whoosh — через 250 мс (когда начинается сама анимация)
  setTimeout(() => {
    Sound.play("whoosh");
  }, 250);

  const targetRot = [-51.5, -55.2];
  const startRot = [...rotation];

  d3.transition()
    .duration(1200)
    .ease(d3.easeCubicInOut)
    .tween("rotate", () => {
      const i0 = d3.interpolate(startRot[0], targetRot[0]);
      const i1 = d3.interpolate(startRot[1], targetRot[1]);
      return t => {
        rotation[0] = i0(t);
        rotation[1] = i1(t);
        globeProjection.rotate(rotation);
        globeSvg.selectAll("path.country").attr("d", globePath);
      };
    })
    .transition()
    .duration(1400)
    .ease(d3.easeCubicIn)
    .tween("zoom", () => {
      const iScale = d3.interpolate(280, 2400);
      return t => {
        const s = iScale(t);
        globeProjection.scale(s);
        globeSvg.select(".globe-sphere").attr("r", s);
        globeSvg.selectAll("path.country").attr("d", globePath);
      };
    })
    .on("end", () => {
      globeWrap.style.opacity = "0";
      setTimeout(() => {
        globeWrap.style.display = "none";
        mapWrap.classList.add("show");
        startScreen.classList.add("hide");
        setTimeout(() => {
          map.invalidateSize();
          syncOverlaySize();
          if (TATARSTAN_GEOJSON) drawCities();
        }, 300);
      }, 500);
    });
});

// ============================================================
// 9. ПОДКЛЮЧЕНИЕ (ОТСЧЁТ 10 → 1)
// ============================================================
const connectBtn = document.getElementById("connectBtn");
const counter = document.getElementById("counter");
const schoolStatus = document.getElementById("schoolStatus");
const finalPlate = document.getElementById("finalPlate");
const countdown = document.getElementById("countdown");
const countdownNumber = document.getElementById("countdownNumber");

let connected = false;

connectBtn.addEventListener("click", () => {
  if (connected) return;
  connected = true;
  connectBtn.disabled = true;
  connectBtn.textContent = "⏳ Подготовка...";

  // Клик при запуске отсчёта
  Sound.play("click");

  countdown.classList.add("show");

  // Сначала запускаем звук
  Sound.play("beep");

  // Небольшая задержка — пока голос начнёт говорить "десять"
  setTimeout(() => {
    let n = 10;
    countdownNumber.textContent = n;
    restartCountAnim();

    const t = setInterval(() => {
      n--;
      if (n >= 1) {
        countdownNumber.textContent = n;
        restartCountAnim();
      } else {
        clearInterval(t);
        countdown.classList.remove("show");
        startConnection();
      }
    }, 1750);
  }, 500);  // ← ЗАДЕРЖКА перед первой цифрой
});

function restartCountAnim() {
  countdownNumber.style.animation = "none";
  void countdownNumber.offsetWidth;
  countdownNumber.style.animation = "";
}

function startConnection() {
  connectBtn.textContent = "⚡ Подключение...";
  const { hubP, schoolP, schoolG } = window.__data;

  if (schoolG) schoolG.classList.add("show");

  // Звук подключения
  Sound.play("connect");

  const ctrlX = (hubP[0] + schoolP[0]) / 2 + 60;
  const ctrlY = (hubP[1] + schoolP[1]) / 2 - 60;

  const impulse = document.createElementNS("http://www.w3.org/2000/svg", "path");
  impulse.setAttribute("class", "impulse");
  impulse.setAttribute("d", `M ${hubP[0]} ${hubP[1]} Q ${ctrlX} ${ctrlY} ${schoolP[0]} ${schoolP[1]}`);
  fxLayer.appendChild(impulse);
  setTimeout(() => impulse.classList.add("run"), 100);
  setTimeout(() => impulse.remove(), 2000);

  setTimeout(() => {
    const flash = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    flash.setAttribute("class", "flash");
    flash.setAttribute("cx", schoolP[0]);
    flash.setAttribute("cy", schoolP[1]);
    flash.setAttribute("r", 8);
    fxLayer.appendChild(flash);
    setTimeout(() => flash.classList.add("burst"), 80);
    setTimeout(() => flash.remove(), 1400);
  }, 1300);

  setTimeout(() => {
    const raysG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    fxLayer.appendChild(raysG);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 / 8) * i;
      const len = 90;
      const ray = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ray.setAttribute("class", "ray");
      ray.setAttribute("x1", schoolP[0]);
      ray.setAttribute("y1", schoolP[1]);
      ray.setAttribute("x2", schoolP[0]);
      ray.setAttribute("y2", schoolP[1]);
      raysG.appendChild(ray);

      let prog = 0;
      const step = () => {
        prog += 0.04;
        if (prog <= 1) {
          ray.setAttribute("x2", schoolP[0] + Math.cos(a) * len * prog);
          ray.setAttribute("y2", schoolP[1] + Math.sin(a) * len * prog);
          requestAnimationFrame(step);
        }
      };
      setTimeout(step, 50);
      setTimeout(() => ray.classList.add("burst"), 250);
    }
    setTimeout(() => raysG.remove(), 1900);
  }, 1300);

  setTimeout(() => {
    const newThread = document.createElementNS("http://www.w3.org/2000/svg", "path");
    newThread.setAttribute("class", "thread");
    newThread.setAttribute("d", `M ${hubP[0]} ${hubP[1]} Q ${ctrlX} ${ctrlY} ${schoolP[0]} ${schoolP[1]}`);
    newThread.style.stroke = "#00ffa3";
    newThread.style.filter = "drop-shadow(0 0 6px #00ffa3)";
    threadsLayer.appendChild(newThread);
    newThread.classList.add("visible", "drawn");
  }, 1500);

  setTimeout(() => {
    schoolStatus.textContent = "ПОДКЛЮЧЕНО ✓";
    schoolStatus.classList.add("connected");
  }, 2200);

  setTimeout(() => {
    counter.textContent = "27";
    counter.classList.add("bump");
    setTimeout(() => counter.classList.remove("bump"), 1100);
  }, 2400);

  setTimeout(() => {
    finalPlate.classList.add("show");
  }, 2900);

  setTimeout(() => {
    connectBtn.textContent = "✓ Подключено";
  }, 3100);
}

// ============================================================
// 10. УПРАВЛЕНИЕ ЧЕРЕЗ ENTER
// ============================================================
document.addEventListener("keydown", (e) => {
  const okKeys = ["Enter", "NumpadEnter", " ", "ArrowRight", "PageDown"];
  if (!okKeys.includes(e.key) && e.code !== "NumpadEnter") return;

  e.preventDefault();

  const startBtn = document.getElementById("startBtn");
  if (startBtn && !startBtn.disabled) {
    startBtn.click();
    return;
  }

  const connectBtn = document.getElementById("connectBtn");
  if (connectBtn && !connectBtn.disabled) {
    connectBtn.click();
    return;
  }
});
console.log("✓ script.js загружен");