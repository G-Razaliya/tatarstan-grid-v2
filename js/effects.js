import { svgElement, wait } from "./svg.js";

// Запускает импульс по линии, затем вспышку у лицея.
export function playConnectionEffects(scene) {
  const impulse = svgElement("path", { class: "impulse", d: scene.connectionPath() });
  scene.fxLayer.append(impulse);
  setTimeout(() => impulse.classList.add("run"), 100);
  // Временный путь удаляется после завершения эффекта.
  setTimeout(() => impulse.remove(), 2000);
  setTimeout(() => burst(scene), 1300);
}

// Вспышка и восемь лучей используют локальные координаты лицея.
async function burst(scene) {
  const flash = svgElement("circle", { class: "flash", r: 8 });
  const group = scene.addSchoolEffect(flash);
  // Лучи расходятся равномерно по полной окружности.
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = Math.PI * 2 * index / 8;
    const element = svgElement("line", { class: "ray", x1: 0, y1: 0, x2: 0, y2: 0 });
    group.append(element);
    return { element, angle };
  });
  await wait(80);
  flash.classList.add("burst");
  const start = performance.now();
  // Длина лучей зависит от прошедшего времени, а не частоты кадров.
  function extend(now) {
    const progress = Math.min((now - start) / 420, 1);
    rays.forEach(({ element, angle }) => {
      element.setAttribute("x2", Math.cos(angle) * 90 * progress);
      element.setAttribute("y2", Math.sin(angle) * 90 * progress);
    });
    if (progress < 1) requestAnimationFrame(extend);
  }
  requestAnimationFrame(extend);
  // CSS управляет затуханием; в конце удаляем всю группу.
  await wait(170);
  rays.forEach(({ element }) => element.classList.add("burst"));
  await wait(1700);
  group.remove();
}
