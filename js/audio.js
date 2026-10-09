// Общий менеджер звуков и состояния громкости.
export const Sound = {
  sounds: {},
  enabled: true,
  inited: false,
  backgroundStarted: false,
  backgroundId: null,
  activeEffects: new Set(),

  // Создаём звуки один раз; при отсутствии Howler отключаем воспроизведение.
  init() {
    if (this.inited) return;
    this.inited = true;
    if (typeof Howl === "undefined") {
      console.warn("Howler.js не загружен — звуки отключены");
      this.enabled = false;
      return;
    }
    // Громкость, скорость и повтор задаются отдельно для каждой записи.
    this.sounds = {
      click:   new Howl({ src: ["snd-click.mp3"],   volume: 1.0 }),
      whoosh:  new Howl({ src: ["snd-whoosh.mp3"],  volume: 1.0 }),
      beep:    new Howl({ src: ["snd-beep.mp3"],    volume: 0.35 }),
      connect: new Howl({ src: ["snd-connect.mp3"], volume: 0.85, rate: 2 }),
      victory: new Howl({ src: ["akto_yy_zal-nachalomeropriyatiy_[cut_10sec].mp3"], volume: 0.7 }),
      bg:      new Howl({ src: ["snd-bg.mp3"],      volume: 0.25, loop: true })
    };
  },

  // Неизвестное имя и выключенный звук пропускаются.
  play(name) {
    if (!this.enabled || !this.sounds[name]) return;
    if (name === "bg") return this.startBackground();
    const sound = this.sounds[name];
    const id = sound.play();
    if (id === null) return;

    // Считаем все активные эффекты: фон возвращается после последнего.
    const effect = { sound, id };
    this.activeEffects.add(effect);
    const finish = () => {
      if (!this.activeEffects.delete(effect)) return;
      for (const event of ["end", "stop", "pause", "playerror"]) {
        sound.off(event, finish, id);
      }
      sound.off("loaderror", finish);
      this.updateBackground();
    };
    for (const event of ["end", "stop", "pause", "playerror"]) {
      sound.once(event, finish, id);
    }
    sound.once("loaderror", finish);
    this.updateBackground();
    return id;
  },

  // Запоминаем запуск даже при выключенном звуке; музыка играет по кругу.
  startBackground() {
    this.backgroundStarted = true;
    if (!this.enabled || !this.sounds.bg) return;
    if (this.backgroundId === null) this.backgroundId = this.sounds.bg.play();
    else if (!this.sounds.bg.playing(this.backgroundId)) this.sounds.bg.play(this.backgroundId);
    this.updateBackground();
  },

  // Приглушаем музыку под эффекты и плавно возвращаем её в паузах.
  updateBackground() {
    if (!this.enabled || this.backgroundId === null) return;
    const background = this.sounds.bg;
    const volume = background.volume(this.backgroundId);
    const target = this.activeEffects.size ? 0.04 : 0.25;
    background.volume(volume, this.backgroundId);
    background.fade(volume, target, this.activeEffects.size ? 150 : 800, this.backgroundId);
  },

  // Фон ставится на паузу и возобновляется; разовые эффекты останавливаются.
  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      for (const [name, sound] of Object.entries(this.sounds)) {
        if (name === "bg") {
          if (this.backgroundId !== null) sound.pause(this.backgroundId);
        } else sound.stop();
      }
    } else if (this.backgroundStarted) {
      this.startBackground();
    }
    return this.enabled;
  }
};

// Подготавливаем звук после жеста пользователя и связываем кнопку.
export function initializeAudio(button) {
  // Первый клик или нажатие клавиши создаёт аудиообъекты.
  const initialize = () => Sound.init();
  window.addEventListener("pointerdown", initialize, { once: true });
  window.addEventListener("keydown", initialize, { once: true });
  button.addEventListener("click", () => {
    Sound.init();
    const enabled = Sound.toggle();
    // Иконка и доступное описание отражают текущее состояние.
    button.textContent = enabled ? "🔊" : "🔇";
    button.classList.toggle("muted", !enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Выключить звук" : "Включить звук");
  });
}
