export const Sound = {
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

export function initializeAudio(button) {
  const initialize = () => Sound.init();
  window.addEventListener("pointerdown", initialize, { once: true });
  window.addEventListener("keydown", initialize, { once: true });
  button.addEventListener("click", () => {
    Sound.init();
    const enabled = Sound.toggle();
    button.textContent = enabled ? "🔊" : "🔇";
    button.classList.toggle("muted", !enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? "Выключить звук" : "Включить звук");
  });
}
