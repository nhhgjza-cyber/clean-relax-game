const appShell = document.querySelector('.app-shell');
const homeScreen = document.querySelector('#home-screen');
const gameScreen = document.querySelector('#game-screen');
const scoreDisplay = document.querySelector('#score');
const progressFill = document.querySelector('#progress-fill');
const progressLabel = document.querySelector('#progress-label');
const levelTitle = document.querySelector('#level-title');
const levelKicker = document.querySelector('#level-kicker');
const stageLabel = document.querySelector('#stage-label');
const levelDots = document.querySelector('.level-dots');
const faceScene = document.querySelector('#face-scene');
const earScene = document.querySelector('#ear-scene');
const completeCard = document.querySelector('#complete-card');
const completeCopy = document.querySelector('#complete-copy');
const nextButton = document.querySelector('#next-button');
const hintChip = document.querySelector('#hint-chip');
const sparkleLayer = document.querySelector('#sparkle-layer');
const soundToggle = document.querySelector('#sound-toggle');
const volumeControl = document.querySelector('#volume-control');

let score = 0;
let level = 1;
let cleaned = 0;
const counts = { 1: 6, 2: 5 };

/* -----------------------------
   Soft ASMR sound system
   Uses Web Audio API, so no MP3 files are required.
------------------------------ */
let audioContext = null;
let masterGain = null;
let soundEnabled = true;
let volume = 0.55;

function ensureAudio() {
  if (!soundEnabled) return false;
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    audioContext = new AudioCtx();
    masterGain = audioContext.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return true;
}

function setMasterVolume(value) {
  volume = Number(value) / 100;
  if (masterGain) masterGain.gain.setTargetAtTime(volume, audioContext.currentTime, 0.02);
}

function tone({ frequency = 440, duration = 0.12, type = 'sine', gain = 0.05, detune = 0, delay = 0, endFrequency = null }) {
  if (!ensureAudio()) return;
  const now = audioContext.currentTime + delay;
  const oscillator = audioContext.createOscillator();
  const amp = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  oscillator.detune.setValueAtTime(detune, now);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);

  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + Math.min(0.025, duration * 0.22));
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(amp);
  amp.connect(masterGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.03);
}

function noiseBurst({ duration = 0.12, gain = 0.018, filter = 1700, delay = 0 }) {
  if (!ensureAudio()) return;
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const envelope = 1 - i / length;
    data[i] = (Math.random() * 2 - 1) * envelope;
  }

  const source = audioContext.createBufferSource();
  const lowpass = audioContext.createBiquadFilter();
  const amp = audioContext.createGain();
  const now = audioContext.currentTime + delay;

  lowpass.type = 'lowpass';
  lowpass.frequency.value = filter;
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  source.buffer = buffer;
  source.connect(lowpass);
  lowpass.connect(amp);
  amp.connect(masterGain);
  source.start(now);
  source.stop(now + duration + 0.02);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function playFaceCleanSound() {
  const pitch = randomBetween(320, 390);
  tone({ frequency: pitch, endFrequency: pitch * randomBetween(1.18, 1.32), duration: 0.11, type: 'sine', gain: 0.055, detune: randomBetween(-7, 7) });
  tone({ frequency: pitch * 1.7, endFrequency: pitch * 1.35, duration: 0.075, type: 'triangle', gain: 0.018, delay: 0.018 });
  noiseBurst({ duration: 0.065, gain: 0.008, filter: 2600, delay: 0.01 });
}

function playEarCleanSound() {
  const pitch = randomBetween(190, 245);
  noiseBurst({ duration: randomBetween(0.11, 0.18), gain: randomBetween(0.012, 0.019), filter: randomBetween(900, 1500) });
  tone({ frequency: pitch, endFrequency: pitch * 0.86, duration: 0.13, type: 'sine', gain: 0.026, delay: 0.025 });
}

function playButtonSound(kind = 'soft') {
  const settings = {
    start: [520, 660],
    next: [430, 570],
    back: [300, 380],
    soft: [470, 540]
  }[kind] || [470, 540];

  tone({ frequency: settings[0], endFrequency: settings[1], duration: 0.075, type: 'sine', gain: 0.032 });
  tone({ frequency: settings[1], duration: 0.055, type: 'sine', gain: 0.018, delay: 0.055 });
}

function playCompleteSound() {
  tone({ frequency: 392, duration: 0.18, type: 'sine', gain: 0.035 });
  tone({ frequency: 523.25, duration: 0.2, type: 'sine', gain: 0.038, delay: 0.09 });
  tone({ frequency: 659.25, duration: 0.32, type: 'sine', gain: 0.035, delay: 0.18 });
}

function updateSoundUI() {
  if (!soundToggle) return;
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
  soundToggle.title = soundEnabled ? 'Sound on' : 'Sound off';
  if (volumeControl) volumeControl.value = Math.round(volume * 100);
}

soundToggle?.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    ensureAudio();
    playButtonSound('soft');
  }
  updateSoundUI();
});

volumeControl?.addEventListener('input', event => {
  setMasterVolume(event.target.value);
});

function setScreen(screen) {
  homeScreen.classList.toggle('hidden', screen !== 'home');
  gameScreen.classList.toggle('hidden', screen !== 'game');
  appShell.classList.toggle('home-active', screen === 'home');
}

function openLevel(number) {
  level = number;
  cleaned = 0;
  const face = number === 1;
  const scene = face ? faceScene : earScene;

  levelTitle.textContent = face ? 'Face cleaning' : 'Ear cleaning';
  levelKicker.textContent = face ? 'LITTLE RESET · LEVEL 1' : 'LITTLE RESET · LEVEL 2';
  stageLabel.innerHTML = face ? 'a little face refresh <span>☁</span>' : 'a tiny ear tidy <span>☁</span>';
  levelDots.setAttribute('aria-label', 'Level ' + number + ' of 2');
  levelDots.querySelectorAll('span').forEach((dot, index) => dot.classList.toggle('active', index < number));

  faceScene.classList.toggle('hidden', !face);
  earScene.classList.toggle('hidden', face);

  scene.querySelectorAll('.target').forEach(target => {
    target.classList.remove('cleaned');
    target.disabled = false;
  });

  completeCard.classList.add('hidden');
  hintChip.classList.remove('hidden');
  progressFill.style.width = '0%';
  progressLabel.textContent = '0 / ' + counts[level];
  setScreen('game');
}

function makeSparkles(x, y) {
  const glyphs = ['✦', '✧', '✦', '·'];

  glyphs.forEach((glyph, index) => {
    const sparkle = document.createElement('span');
    sparkle.className = 'sparkle';
    sparkle.textContent = glyph;
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';
    sparkle.style.setProperty('--dx', (Math.random() * 58 - 29) + 'px');
    sparkle.style.setProperty('--dy', (-25 - Math.random() * 45) + 'px');
    sparkle.style.animationDelay = (index * 25) + 'ms';
    sparkleLayer.append(sparkle);
    sparkle.addEventListener('animationend', () => sparkle.remove(), { once: true });
  });
}

function cleanTarget(event) {
  const target = event.currentTarget;
  if (target.disabled || !completeCard.classList.contains('hidden')) return;

  // Browsers require audio to start after a user gesture; this click is the gesture.
  ensureAudio();

  target.disabled = true;

  const rect = target.getBoundingClientRect();
  const stageRect = document.querySelector('#stage').getBoundingClientRect();

  makeSparkles(
    rect.left + rect.width / 2 - stageRect.left,
    rect.top + rect.height / 2 - stageRect.top
  );

  target.classList.add('cleaned');
  cleaned += 1;
  score += 10;
  scoreDisplay.textContent = score;
  progressLabel.textContent = cleaned + ' / ' + counts[level];
  progressFill.style.width = (cleaned / counts[level] * 100) + '%';

  if (level === 1) {
    playFaceCleanSound();
  } else {
    playEarCleanSound();
  }

  if (cleaned === counts[level]) {
    window.setTimeout(() => {
      hintChip.classList.add('hidden');
      completeCopy.textContent = level === 1
        ? 'Look at that lovely glow.'
        : 'Everything is fresh and sparkly!';

      nextButton.innerHTML = level === 1
        ? 'Next level <span>→</span>'
        : 'Back to home <span>♡</span>';

      completeCard.classList.remove('hidden');
      playCompleteSound();

      if (level === 2) {
        for (let index = 0; index < 9; index++) {
          window.setTimeout(
            () => makeSparkles(Math.random() * stageRect.width, Math.random() * stageRect.height),
            index * 90
          );
        }
      }
    }, 420);
  }
}

document.querySelectorAll('.target').forEach(target => {
  target.addEventListener('click', cleanTarget);
});

document.querySelector('#start-button').addEventListener('click', () => {
  ensureAudio();
  playButtonSound('start');
  openLevel(1);
});

document.querySelector('#back-button').addEventListener('click', () => {
  playButtonSound('back');
  setScreen('home');
});

document.querySelector('#home-link').addEventListener('click', event => {
  event.preventDefault();
  playButtonSound('back');
  setScreen('home');
});

nextButton.addEventListener('click', () => {
  playButtonSound(level === 1 ? 'next' : 'back');
  if (level === 1) openLevel(2);
  else setScreen('home');
});

updateSoundUI();
