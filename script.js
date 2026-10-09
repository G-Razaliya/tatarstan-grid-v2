import { initializeAudio, Sound } from "./js/audio.js";
import { initializeStars } from "./js/stars.js";
import { initializeGlobe } from "./js/globe.js";
import { initializeMap } from "./js/map.js";
import { playConnectionEffects } from "./js/effects.js";
import { timing } from "./js/config.js";
import { wait } from "./js/svg.js";

// Ссылки на элементы интерфейса для всех этапов презентации.
const ui = Object.fromEntries([
  "startBtn", "startScreen", "globeWrap", "mapWrap", "connectBtn", "counter",
  "schoolPanel", "schoolStatus", "finalPlate", "countdown", "countdownNumber"
].map(id => [id, document.getElementById(id)]));

// Одна фаза определяет доступные действия мышью и с презентационного пульта.
let phase = "loading";
// Подключение звука, фона и двух сцен.
initializeAudio(document.getElementById("soundBtn"));
initializeStars(document.getElementById("stars"));
const globe = initializeGlobe();
const scene = initializeMap();

// Запуск доступен после загрузки обеих сцен; ошибка предлагает повтор.
Promise.all([globe.ready, scene.ready]).then(() => {
  phase = "globe";
  ui.startBtn.disabled = false;
  ui.startBtn.textContent = "🌍 Приблизиться к Татарстану";
}).catch(error => {
  console.error("Не удалось загрузить презентацию:", error);
  phase = "error";
  ui.startBtn.disabled = false;
  ui.startBtn.textContent = "↻ Не удалось загрузить. Повторить";
});

// Поворот глобуса, приближение и открытие карты.
async function showMap() {
  if (phase === "error") return window.location.reload();
  if (phase !== "globe") return;
  phase = "approaching";
  ui.startBtn.disabled = true;
  ui.startBtn.textContent = "🌍 Приближаем…";
  Sound.init();
  Sound.play("click");
  Sound.startBackground();
  setTimeout(() => Sound.play("whoosh"), 250);
  // Дожидаемся перехода, затем передаём фокус кнопке подключения.
  await globe.approach();
  ui.globeWrap.style.opacity = "0";
  await wait(500);
  ui.globeWrap.hidden = true;
  ui.mapWrap.classList.add("show");
  ui.mapWrap.inert = false;
  ui.startScreen.classList.add("hide");
  scene.fit();
  phase = "map";
  ui.connectBtn.disabled = false;
  ui.connectBtn.focus({ preventScroll: true });
  await wait(800);
  ui.startScreen.hidden = true;
  ui.schoolPanel.classList.add("show");
}

// Однократный сценарий: отсчёт, подключение и финальное сообщение.
async function connectSchool() {
  if (phase !== "map") return;
  phase = "countdown";
  ui.connectBtn.disabled = true;
  ui.connectBtn.textContent = "⏳ Подготовка...";
  Sound.play("click");
  Sound.play("beep");
  ui.countdown.classList.add("show");
  await wait(timing.countdownDelay);
  // Интервал цифр согласован с озвучкой отсчёта.
  for (let number = 10; number >= 1; number--) {
    ui.countdownNumber.textContent = number;
    ui.countdownNumber.style.animation = "none";
    // Пересчёт размеров позволяет повторно запустить CSS-анимацию.
    void ui.countdownNumber.offsetWidth;
    ui.countdownNumber.style.animation = "";
    await wait(timing.countdownStep);
  }
  ui.countdown.classList.remove("show");
  // Показываем лицей и запускаем импульс со вспышкой.
  phase = "connecting";
  ui.connectBtn.textContent = "⚡ Подключение...";
  scene.showSchool();
  Sound.play("connect");
  // После отсчёта включаем торжественную запись; фон остаётся приглушённым.
  Sound.play("victory");
  playConnectionEffects(scene);
  // Последовательно закрепляем линию, статус и новый счётчик.
  await wait(1500);
  scene.addSchoolConnection();
  await wait(700);
  ui.schoolStatus.textContent = "ПОДКЛЮЧЕНО ✓";
  ui.schoolStatus.classList.add("connected");
  await wait(200);
  ui.counter.textContent = "27";
  ui.counter.classList.add("bump");
  setTimeout(() => ui.counter.classList.remove("bump"), 1100);
  await wait(500);
  // Завершение блокирует повторное подключение.
  ui.finalPlate.classList.add("show");
  await wait(200);
  ui.connectBtn.textContent = "✓ Подключено";
  phase = "connected";
}

// Кнопки вызывают те же сценарии, что и клавиши пульта.
ui.startBtn.addEventListener("click", showMap);
ui.connectBtn.addEventListener("click", connectSchool);
// Игнорируем удержание клавиш, сочетания и ввод в полях.
document.addEventListener("keydown", event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  if (!["Enter", " ", "ArrowRight", "PageDown"].includes(event.key)) return;
  event.preventDefault();
  if (phase === "globe" || phase === "error") ui.startBtn.click();
  else if (phase === "map") ui.connectBtn.click();
});
