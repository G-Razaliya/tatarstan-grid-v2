import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { Sound, initializeAudio } from '../js/audio.js';

// Substitute audio hardware to check overlapping events and mute deterministically.
class FakeHowl {
  constructor(options) {
    this.options = options;
    this.listeners = [];
    this.ids = new Set();
    this.nextId = 0;
    this.playCalls = [];
    this.level = options.volume;
  }
  play(id = ++this.nextId) { this.ids.add(id); this.playCalls.push(id); return id; }
  playing(id) { return this.ids.has(id); }
  state() { return this.loading ? 'loading' : 'loaded'; }
  once(event, callback, id) { this.listeners.push({ event, callback, id }); }
  off(event, callback, id) {
    this.listeners = this.listeners.filter(item => !(item.event === event && item.callback === callback && item.id === id));
  }
  emit(event, id) {
    const listeners = this.listeners.filter(item => item.event === event && (item.id === undefined || item.id === id));
    for (const item of listeners) {
      this.off(item.event, item.callback, item.id);
      item.callback(id);
    }
  }
  pause(id) { this.ids.delete(id); this.emit('pause', id); }
  stop() { for (const id of this.ids) this.emit('stop', id); this.ids.clear(); }
  volume(value, id) {
    if (value === undefined || (id === undefined && this.playCalls.includes(value))) return this.level;
    this.level = value;
    return this;
  }
  fade(from, to, duration, id) { this.lastFade = { from, to, duration, id }; this.level = to; }
}

beforeEach(() => {
  globalThis.Howl = FakeHowl;
  Object.assign(Sound, { sounds: {}, enabled: true, inited: false, backgroundStarted: false, backgroundId: null, backgroundPending: false, activeEffects: new Set() });
  Sound.init();
});

test('background starts once, loops, and stays quiet until every overlapping effect ends', () => {
  const click = Sound.play('click');
  Sound.startBackground();
  Sound.startBackground();
  const whoosh = Sound.play('whoosh');
  assert.equal(Sound.sounds.bg.options.loop, true);
  assert.equal(Sound.sounds.bg.playCalls.length, 1);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.04);
  Sound.sounds.click.emit('end', click);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.04);
  Sound.sounds.whoosh.emit('end', whoosh);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.25);
  assert.equal(Sound.sounds.bg.lastFade.duration, 800);
  assert.equal(Sound.activeEffects.size, 0);
  assert.equal(Sound.sounds.click.listeners.length, 0);
});

test('failed effects release the background and remove event listeners', () => {
  Sound.startBackground();
  const beep = Sound.play('beep');
  Sound.sounds.beep.emit('playerror', beep);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.25);
  Sound.play('connect');
  Sound.sounds.connect.emit('loaderror');
  assert.equal(Sound.activeEffects.size, 0);
  assert.equal(Sound.sounds.connect.listeners.length, 0);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.25);
});

test('mute pauses background and unmute resumes the same recording without replaying effects', () => {
  Sound.startBackground();
  const backgroundId = Sound.backgroundId;
  Sound.play('beep');
  assert.equal(Sound.toggle(), false);
  assert.equal(Sound.sounds.bg.playing(backgroundId), false);
  assert.equal(Sound.activeEffects.size, 0);
  assert.equal(Sound.toggle(), true);
  assert.equal(Sound.backgroundId, backgroundId);
  assert.deepEqual(Sound.sounds.bg.playCalls, [backgroundId, backgroundId]);
  assert.equal(Sound.sounds.beep.playCalls.length, 1);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.25);
});

test('starting while muted remembers the request and respects subsequent unmute', () => {
  Sound.toggle();
  Sound.startBackground();
  assert.equal(Sound.backgroundId, null);
  assert.equal(Sound.sounds.bg.playCalls.length, 0);
  Sound.toggle();
  assert.equal(Sound.sounds.bg.playCalls.length, 1);
});

test('slow background loading does not queue stale ducking after effects have ended', () => {
  const background = Sound.sounds.bg;
  background.loading = true;
  const click = Sound.play('click');
  Sound.startBackground();
  const whoosh = Sound.play('whoosh');
  Sound.sounds.click.emit('end', click);
  Sound.sounds.whoosh.emit('end', whoosh);
  assert.equal(background.lastFade, undefined);
  background.loading = false;
  background.options.onplay();
  assert.equal(background.lastFade.to, 0.25);
  assert.equal(Sound.activeEffects.size, 0);
});

test('intro attempts background playback immediately and first gesture does not duplicate pending playback', () => {
  const previousWindow = globalThis.window;
  globalThis.window = new EventTarget();
  const button = new EventTarget();
  try {
    initializeAudio(button);
    assert.equal(Sound.backgroundStarted, true);
    assert.equal(Sound.sounds.bg.playCalls.length, 1);
    globalThis.window.dispatchEvent(new Event('pointerdown'));
    assert.equal(Sound.sounds.bg.playCalls.length, 1);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('blocked autoplay retries the same background after audio unlock', () => {
  Sound.startBackground();
  const id = Sound.backgroundId;
  Sound.sounds.bg.ids.delete(id);
  Sound.sounds.bg.options.onplayerror();
  assert.equal(Sound.backgroundPending, false);
  Sound.sounds.bg.emit('unlock');
  assert.deepEqual(Sound.sounds.bg.playCalls, [id, id]);
  Sound.sounds.bg.options.onplay();
  assert.equal(Sound.backgroundPending, false);
  assert.equal(Sound.sounds.bg.lastFade.to, 0.25);
});
