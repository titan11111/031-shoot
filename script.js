// ビームシューターゲーム - script.js

// ゲーム要素の取得
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const lifeElement = document.getElementById('life');
const powerElement = document.getElementById('power');
const shieldElement = document.getElementById('shield');
const stageElement = document.getElementById('stage');
const gameContainer = document.getElementById('gameContainer');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const gameClearElement = document.getElementById('gameClear');
const clearScoreElement = document.getElementById('clearScore');
const clearHighScoreElement = document.getElementById('clearHighScore');
const clearRestartBtn = document.getElementById('clearRestartBtn');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const bombContainer = document.getElementById('bombContainer');
const bombCountDisplay = document.getElementById('bombCountDisplay');
const bombBtn = document.getElementById('bombBtn');
const pauseScreen = document.getElementById('pauseScreen');
const resumeBtn = document.getElementById('resumeBtn');
const muteBtn = document.getElementById('muteBtn');
const playArea = document.getElementById('playArea');

const STAGE_DURATION = 60 * 60; // 1 minute at 60 FPS
const MAX_SATELLITES = 4; // Maximum number of support satellites
let clearTimer = null;

// ステージごとのボス設定を取得
function getBossConfig(stage) {
    const pattern = (stage - 1) % 3;
    let attackPattern = (stage - 1) % 5;
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#00ffff', '#ffff00', '#ffffff', '#ffa500', '#ff1493'];
    let color = colors[(stage - 1) % colors.length];
    if (stage === 6) {
        attackPattern = 4;
        color = '#ff0000';
    }
    const hpValues = [100, 500, 600, 660, 770, 1000];
    const hp = hpValues[stage - 1] || (stage + 1) * 100;
    return { pattern, attackPattern, color, hp };
}

// ボス画像の読み込み
const bossImg = new Image();
bossImg.src = 'boss.svg';
bossImg.onload = () => { bossImg.loaded = true; };
const finalBossImg = new Image();
finalBossImg.src = 'boss_final.svg';
finalBossImg.onload = () => { finalBossImg.loaded = true; };

// BGM
const bgm = new Audio('audio/Dreaming_Stargazer.mp3');
const bossBgm = new Audio('audio/Assault_of_enemy.mp3');
bgm.preload = 'none';
bossBgm.preload = 'none';
bgm.loop = true;
bossBgm.loop = true;

// 【最新技術 #3】Web Audio API / AudioContext - リアルタイムサウンド
let audioContext = null;
let masterGain = null;

function initAudioContext() {
    if (!audioContext) {
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
            masterGain = audioContext.createGain();
            masterGain.connect(audioContext.destination);
            masterGain.gain.value = 0.3;
        } catch (e) {
            console.warn('Web Audio API not supported');
            audioContext = null;
        }
    }
}

// シンプルなシンセ音生成（効果音）
function playTone(frequency, duration, type = 'sine', volume = 0.1) {
    if (!audioContext) initAudioContext();
    if (!audioContext) return;

    try {
        const now = audioContext.currentTime;
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(masterGain);
        osc.frequency.value = frequency;
        osc.type = type;

        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    } catch (e) {
        console.error('Tone playback failed:', e);
    }
}

function playBombSound() {
    if (!audioContext) initAudioContext();
    if (!audioContext || !masterGain || muted) return;
    const now = audioContext.currentTime;

    // 機械的な低音インパクト
    const bass = audioContext.createOscillator();
    const bassGain = audioContext.createGain();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(150, now);
    bass.frequency.exponentialRampToValueAtTime(38, now + 0.55);
    bassGain.gain.setValueAtTime(0.22, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    bass.connect(bassGain).connect(masterGain);
    bass.start(now);
    bass.stop(now + 0.6);

    // EMPが展開する電子スイープ
    const sweep = audioContext.createOscillator();
    const sweepGain = audioContext.createGain();
    sweep.type = 'square';
    sweep.frequency.setValueAtTime(260, now);
    sweep.frequency.exponentialRampToValueAtTime(1320, now + 0.28);
    sweepGain.gain.setValueAtTime(0.08, now);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    sweep.connect(sweepGain).connect(masterGain);
    sweep.start(now);
    sweep.stop(now + 0.34);

    // 短い爆風ノイズ。音声ファイルを使わず内部生成する
    const noiseLength = Math.floor(audioContext.sampleRate * 0.42);
    const noiseBuffer = audioContext.createBuffer(1, noiseLength, audioContext.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseLength; i++) {
        samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLength, 2.4);
    }
    const noise = audioContext.createBufferSource();
    const noiseFilter = audioContext.createBiquadFilter();
    const noiseGain = audioContext.createGain();
    noise.buffer = noiseBuffer;
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(2200, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(180, now + 0.42);
    noiseGain.gain.setValueAtTime(0.16, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    noise.connect(noiseFilter).connect(noiseGain).connect(masterGain);
    noise.start(now);
}

// ユーザー操作後にBGMを開始
let audioInitialized = false;
function initAudio() {
    if (!audioInitialized) {
        initAudioContext();
        bgm.play().catch(() => {});
        bossBgm.play()
            .then(() => {
                bossBgm.pause();
                bossBgm.currentTime = 0;
            })
            .catch(() => {});
        audioInitialized = true;
    }
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }
    applyMute();
}

let muted = localStorage.getItem('beamShooterMuted') === '1';
function applyMute() {
    bgm.muted = muted;
    bossBgm.muted = muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.3;
    if (muteBtn) muteBtn.textContent = muted ? '🔇' : '🔊';
}
applyMute();

function toggleMute() {
    muted = !muted;
    localStorage.setItem('beamShooterMuted', muted ? '1' : '0');
    applyMute();
}

// 【最新技術 #1】Vibration API - タップフィードバック
function vibrate(pattern) {
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    } else if (navigator.webkitVibrate) {
        navigator.webkitVibrate(pattern);
    }
}

// モバイル操作時の画面スクロールやズームを防止
document.addEventListener('touchmove', (e) => {
    if (e.target.closest('[data-scrollable]')) return;
    e.preventDefault();
}, { passive: false });
document.addEventListener('selectstart', (e) => e.preventDefault());
document.addEventListener('dragstart', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, { passive: false });
let lastTap = 0;
document.addEventListener('touchstart', (e) => {
    const now = Date.now();
    if (now - lastTap < 300) e.preventDefault();
    lastTap = now;
}, { passive: false });

// 【最新技術 #7】IndexedDB - スコア永続化
let db = null;
function initIndexedDB() {
    if (!window.indexedDB) return;
    const req = indexedDB.open('beamShooter', 1);
    req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('scores')) {
            db.createObjectStore('scores', { keyPath: 'id' });
        }
    };
    req.onsuccess = (e) => { db = e.target.result; };
}
initIndexedDB();

// ハイスコア管理（IndexedDB + localStorage フォールバック）
function getHighScore() {
    return parseInt(localStorage.getItem('beamShooterHighScore') || '0', 10);
}

function saveHighScore(score) {
    const currentHigh = getHighScore();
    if (score > currentHigh) {
        localStorage.setItem('beamShooterHighScore', score.toString());
        if (db) {
            db.transaction('scores', 'readwrite')
                .objectStore('scores')
                .put({ id: 'highScore', score: score, timestamp: Date.now() });
        }
        return true;
    }
    return false;
}

// ゲーム状態
let gameState = {
    playing: false,
    paused: false,
    score: 0,
    life: 3,
    power: 1,
    frameCount: 0,
    stage: 1,
    stageFrame: 0,
    bossActive: false,
    enemySlowTimer: 0,
    doubleScoreTimer: 0
};

// プレイヤー
let player = {
    x: canvas.width / 2 - 18,
    y: canvas.height - 80,
    width: 36,
    height: 36,
    speed: 5,
    vx: 0,
    vy: 0,
    shootCooldown: 0,
    shotDelay: 10,
    shield: 0,
    isWide: false,
    isHoming: false,
    bombCount: 0,
    isPenetrate: false,
    isMagnet: false,
    invincible: 0,
    sleepMissile: false,
    sleepCooldown: 0,
    laserTimer: 0,
    laserCooldown: 0,
    rearShotTimer: 0,
    sideShotTimer: 0,
    criticalTimer: 0,
    overdriveTimer: 0
};

function awardScore(points) {
    gameState.score += points * (gameState.doubleScoreTimer > 0 ? 2 : 1);
}

// 配列の初期化
let bullets = [];
let beams = [];
let enemies = [];
let items = [];
let explosions = [];
let satellites = [];
let bombEffects = [];
let bossDefeatEffects = [];
let screenShake = 0;

// キー入力管理
let keys = {};
let touchButtons = {
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false
};
let touchStick = { x: 0, y: 0, active: false, pointerId: null, direction: '' };
let lastShotSoundAt = 0;

function playControlTick() {
    playTone(720, 0.035, 'square', 0.035);
}

function updateStickFromPointer(e) {
    const pad = document.getElementById('moveControls');
    const rect = pad.getBoundingClientRect();
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const rawX = (e.clientX - (rect.left + halfW)) / Math.max(1, halfW);
    const rawY = (e.clientY - (rect.top + halfH)) / Math.max(1, halfH);
    const magnitude = Math.hypot(rawX, rawY);
    const deadZone = 0.16;
    if (magnitude <= deadZone) {
        touchStick.x = 0;
        touchStick.y = 0;
    } else {
        const scale = Math.min(1, (magnitude - deadZone) / (1 - deadZone)) / magnitude;
        touchStick.x = rawX * scale;
        touchStick.y = rawY * scale;
    }

    const horizontal = touchStick.x < -0.3 ? 'left' : touchStick.x > 0.3 ? 'right' : '';
    const vertical = touchStick.y < -0.3 ? 'up' : touchStick.y > 0.3 ? 'down' : '';
    const direction = `${vertical}-${horizontal}`;
    if (direction && direction !== '-' && direction !== touchStick.direction) {
        playControlTick();
        vibrate(8);
    }
    touchStick.direction = direction;
    ['left', 'right', 'up', 'down'].forEach(key => {
        const active = key === horizontal || key === vertical;
        document.getElementById(`${key}Btn`).classList.toggle('is-pressed', active);
    });
}

function setupAnalogPad() {
    const pad = document.getElementById('moveControls');
    pad.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        initAudio();
        touchStick.active = true;
        touchStick.pointerId = e.pointerId;
        pad.setPointerCapture(e.pointerId);
        updateStickFromPointer(e);
    }, { passive: false });
    pad.addEventListener('pointermove', (e) => {
        if (touchStick.active && e.pointerId === touchStick.pointerId) updateStickFromPointer(e);
    }, { passive: false });
    const release = (e) => {
        if (e.pointerId !== touchStick.pointerId) return;
        touchStick = { x: 0, y: 0, active: false, pointerId: null, direction: '' };
        ['left', 'right', 'up', 'down'].forEach(key => {
            document.getElementById(`${key}Btn`).classList.remove('is-pressed');
        });
    };
    pad.addEventListener('pointerup', release);
    pad.addEventListener('pointercancel', release);
}

// 【最新技術 #2】Pointer Events - マルチタッチ・統一操作
function setupPointerEventHandlers() {
    const buttons = [
        { id: 'shootBtn', key: 'shoot' }
    ];

    buttons.forEach(({ id, key }) => {
        const btn = document.getElementById(id);
        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            btn.setPointerCapture(e.pointerId);
            btn.classList.add('is-pressed');
            vibrate(15);
            initAudio();
            touchButtons[key] = true;
            if (key === 'shoot' && player.shootCooldown <= 0) {
                shoot();
                player.shootCooldown = player.shotDelay;
            }
        }, { passive: false });
        btn.addEventListener('pointerup', (e) => {
            e.preventDefault();
            btn.classList.remove('is-pressed');
            touchButtons[key] = false;
        }, { passive: false });
        btn.addEventListener('pointercancel', () => {
            btn.classList.remove('is-pressed');
            touchButtons[key] = false;
        });
    });

    bombBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        bombBtn.setPointerCapture(e.pointerId);
        bombBtn.classList.add('is-pressed');
        vibrate(15);
        initAudio();
        useBomb();
    }, { passive: false });
    bombBtn.addEventListener('pointerup', () => bombBtn.classList.remove('is-pressed'));
    bombBtn.addEventListener('pointercancel', () => bombBtn.classList.remove('is-pressed'));
}
setupPointerEventHandlers();
setupAnalogPad();

function bindTap(el, handler) {
    if (!el) return;
    const fire = (e) => {
        e.preventDefault();
        el.classList.add('is-pressed');
        vibrate(15);
        initAudio();
        handler(e);
    };
    const release = () => el.classList.remove('is-pressed');
    el.addEventListener('pointerdown', fire);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
}

// イベントリスナー設定
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyB') {
        useBomb();
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});
bindTap(startBtn, startGame);
bindTap(restartBtn, restartGame);
bindTap(clearRestartBtn, restartGame);
bindTap(resumeBtn, togglePause);
bindTap(muteBtn, toggleMute);
pauseScreen.addEventListener('pointerdown', (e) => {
    if (e.target === pauseScreen) {
        togglePause();
    }
});
document.addEventListener('pointerdown', () => initAudio(), { once: true });
document.addEventListener('keydown', () => initAudio(), { once: true });

// 弾丸クラス
class Bullet {
    constructor(x, y, dx, dy, color = '#ffff00', homing = false, penetrate = false, isEnemy = false, sleep = false) {
        this.x = x;
        this.y = y;
        this.dx = dx;
        this.dy = dy;
        this.width = 4;
        this.height = 8;
        this.color = color;
        this.homing = homing;
        this.penetrate = penetrate;
        this.isEnemy = isEnemy;
        this.sleep = sleep;
        this.damage = !isEnemy && player.criticalTimer > 0 ? 2 : 1;
    }

    update() {
        if (this.homing) {
            if (this.isEnemy) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const speed = Math.hypot(this.dx, this.dy);
                this.dx = Math.cos(angle) * speed;
                this.dy = Math.sin(angle) * speed;
            } else if (enemies.length > 0) {
                let target = null;
                let minDist = Infinity;
                enemies.forEach(enemy => {
                    const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                    if (dist < minDist) {
                        minDist = dist;
                        target = enemy;
                    }
                });
                if (target) {
                    const angle = Math.atan2(target.y - this.y, target.x - this.x);
                    const speed = Math.hypot(this.dx, this.dy);
                    this.dx = Math.cos(angle) * speed;
                    this.dy = Math.sin(angle) * speed;
                }
            }
        }
        this.x += this.dx;
        this.y += this.dy;
    }

    draw() {
        if (typeof Sprites !== 'undefined') {
            Sprites.drawBullet(ctx, this);
            return;
        }
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
    }
}

// ビームクラス
class Beam {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = canvas.height;
        this.duration = 15; // ビーム持続時間
    }

    update() {
        this.duration--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(this.x - this.width/2, 0, this.width, canvas.height);
        
        // ビームの光エフェクト
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x - this.width/2 - 2, 0, this.width + 4, canvas.height);
        ctx.restore();
    }
}

// 敵クラス
class Enemy {
    constructor(x, y, type = 'normal', movement = 'straight') {
        this.x = x;
        this.y = y;
        this.type = type;
        if (type === 'boss') {
            const stage = gameState.stage;
            this.width = this.height = stage === 6 ? 320 : 270;
            const config = getBossConfig(stage);
            this.hp = config.hp;
            this.maxHp = this.hp;
            this.speed = 1 + stage * 0.5;
            this.bulletSpeed = 4 + stage;
            if (stage === 4) {
                // ステージ4のボスの追尾弾を遅めにする
                this.bulletSpeed = 6;
            }
            this.shootInterval = Math.max(15, 60 - stage * 7);
            if (stage === 6) {
                this.bulletSpeed += 2;
                this.shootInterval = 10;
            }
            this.shootCooldown = this.shootInterval;
            this.pattern = config.pattern;
            this.attackPattern = config.attackPattern;
            this.color = config.color;
            this.dx = this.speed; // for bouncing pattern
            this.img = stage === 6 ? finalBossImg : bossImg;
        } else {
            this.width = 40;
            this.height = 40;
            this.speed = 3;
            this.hp = gameState.stage + 2;
            this.maxHp = this.hp;
            this.shootCooldown = 0;
            this.movement = movement;
            this.direction = Math.random() < 0.5 ? -1 : 1;
            this.color = this.getColor();
        }
        this.sleepTimer = 0;
    }

    getColor() {
        switch (this.movement) {
            case 'zigzag':
                return '#ffa500';
            case 'chase':
                return '#66ff66';
            case 'fromBottom':
                return '#ff66ff';
            default:
                return '#ff6666';
        }
    }

    update() {
        if (this.sleepTimer > 0) {
            this.sleepTimer--;
            return;
        }
        const speedFactor = gameState.enemySlowTimer > 0 ? 0.5 : 1;
        if (this.type === 'boss') {
            if (this.y < 150) {
                this.y += this.speed * speedFactor;
            }
            const frame = gameState.frameCount;
            switch (this.pattern) {
                case 0:
                    // 横方向にサイン波移動
                    this.x += Math.sin(frame * 0.05) * (2 + gameState.stage) * speedFactor;
                    break;
                case 1:
                    // 画面端で反射する左右移動
                    this.x += this.dx * speedFactor;
                    if (this.x < this.width / 2 || this.x > canvas.width - this.width / 2) {
                        this.dx *= -1;
                    }
                    break;
                case 2:
                    // 円を描くように移動
                    this.x = canvas.width / 2 + Math.sin(frame * 0.02 * speedFactor) * (canvas.width / 2 - this.width / 2);
                    this.y = 100 + Math.cos(frame * 0.02 * speedFactor) * 50;
                    break;
            }

            this.shootCooldown--;
            if (this.shootCooldown <= 0) {
                this.shoot();
                this.shootCooldown = this.shootInterval;
            }
        } else {
            switch (this.movement) {
                case 'zigzag':
                    this.y += this.speed * speedFactor;
                    this.x += Math.sin(gameState.frameCount * 0.1) * 2 * this.direction * speedFactor;
                    break;
                case 'chase':
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    this.x += Math.cos(angle) * this.speed * speedFactor;
                    this.y += Math.sin(angle) * this.speed * speedFactor;
                    break;
                case 'fromBottom':
                    this.y -= this.speed * speedFactor;
                    break;
                default:
                    this.y += this.speed * speedFactor;
            }
        }
    }

    shoot() {
        const speed = this.bulletSpeed || 3;
        switch (this.attackPattern) {
            case 0:
                bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, speed, '#ff4444', false, false, true));
                break;
            case 1:
                bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, speed, '#ff4444', false, false, true));
                bullets.push(new Bullet(this.x, this.y + this.height / 2, -2, speed, '#ff4444', false, false, true));
                bullets.push(new Bullet(this.x, this.y + this.height / 2, 2, speed, '#ff4444', false, false, true));
                break;
            case 2:
                const angle = Math.atan2(player.y - (this.y + this.height / 2), player.x - this.x);
                bullets.push(new Bullet(this.x, this.y + this.height / 2, Math.cos(angle) * speed, Math.sin(angle) * speed, '#ff4444', false, false, true));
                break;
            case 3:
                bullets.push(new Bullet(this.x, this.y + this.height / 2, 0, speed, '#ff4444', true, false, true));
                break;
            case 4:
                for (let i = 0; i < 12; i++) {
                    const a = (Math.PI * 2 / 12) * i;
                    bullets.push(new Bullet(this.x, this.y + this.height / 2, Math.cos(a) * speed, Math.sin(a) * speed, '#ff4444', false, false, true));
                }
                break;
        }
    }

    draw() {
        if (this.type === 'boss') {
            if (typeof Sprites !== 'undefined') {
                Sprites.drawBoss(ctx, this, gameState.frameCount);
            } else if (this.img && this.img.loaded) {
                ctx.drawImage(this.img, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            }
            if (typeof Sprites !== 'undefined') {
                Sprites.drawHpBar(ctx, this);
            } else {
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2 - 10, this.width, 4);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(
                    this.x - this.width / 2,
                    this.y - this.height / 2 - 10,
                    this.width * (this.hp / this.maxHp),
                    4
                );
            }
        } else if (typeof Sprites !== 'undefined') {
            Sprites.drawEnemy(ctx, this);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }
}

// アイテムクラス
class PowerUp {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.active = true;
    }

    update() {
        this.y += 2;
        if (player.isMagnet) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 100) {
                this.x += dx * 0.05;
                this.y += dy * 0.05;
            }
        }
        if (this.checkCollision(player)) {
            this.applyEffect();
            this.active = false;
        }
    }

    applyEffect() {
        switch (this.type) {
            case 'shotLevelUp':
                gameState.power = Math.min(gameState.power + 1, 3);
                break;
            case 'wide':
                player.isWide = true;
                setTimeout(() => player.isWide = false, 15000);
                break;
            case 'homing':
                player.isHoming = true;
                setTimeout(() => player.isHoming = false, 10000);
                break;
            case 'heal':
                gameState.life = Math.min(gameState.life + 1, 5);
                break;
            case 'barrier':
                player.shield++;
                break;
            case 'bomb':
                player.bombCount = Math.min(player.bombCount + 1, 5);
                break;
            case 'satellite':
                if (satellites.length < MAX_SATELLITES) {
                    satellites.push({ angle: 0, shootCooldown: 0 });
                }
                satellites.forEach((sat, index) => {
                    sat.angle = (index * Math.PI * 2) / satellites.length;
                });
                break;
            case 'rapid':
                player.shotDelay = 5;
                setTimeout(() => player.shotDelay = 10, 10000);
                break;
            case 'penetrate':
                player.isPenetrate = true;
                setTimeout(() => player.isPenetrate = false, 10000);
                break;
            case 'magnet':
                player.isMagnet = true;
                setTimeout(() => player.isMagnet = false, 15000);
                break;
            case 'speed':
                player.speed += 2;
                setTimeout(() => player.speed -= 2, 10000);
                break;
            case 'slow':
                gameState.enemySlowTimer = 300;
                break;
            case 'sleep':
                player.sleepMissile = true;
                player.sleepCooldown = 0;
                break;
            case 'laser':
                player.laserTimer = 600;
                player.laserCooldown = 0;
                break;
            case 'doubleScore':
                gameState.doubleScoreTimer = 900;
                break;
            case 'armor':
                player.shield = Math.min(player.shield + 3, 9);
                break;
            case 'overdrive':
                gameState.power = 3;
                player.overdriveTimer = 480;
                player.shotDelay = 3;
                break;
            case 'rearShot':
                player.rearShotTimer = 900;
                break;
            case 'sideShot':
                player.sideShotTimer = 900;
                break;
            case 'critical':
                player.criticalTimer = 600;
                break;
            case 'phase':
                player.invincible = Math.max(player.invincible, 480);
                break;
            case 'purge':
                bullets = bullets.filter(bullet => !bullet.isEnemy);
                break;
            case 'timeWarp': {
                const boss = enemies.find(enemy => enemy.type === 'boss');
                if (boss) {
                    boss.hp -= Math.max(1, Math.floor(boss.maxHp * 0.1));
                } else {
                    gameState.stageFrame = Math.min(STAGE_DURATION, gameState.stageFrame + 900);
                }
                break;
            }
        }
        // どのアイテムを取得しても自機のパワーを強化
        gameState.power = Math.min(gameState.power + 1, 3);
        // パワーアップ取得直後の被弾を防ぐため無敵時間を付与
        player.invincible = 60;
    }

    checkCollision(p) {
        const dx = this.x - p.x;
        const dy = this.y - p.y;
        return Math.hypot(dx, dy) < this.radius + p.width / 2;
    }

    draw(ctx) {
        ctx.save();
        const pulse = Math.sin(gameState.frameCount * 0.1) * 2;
        const r = this.radius + pulse;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.getColor();
        const gradient = ctx.createRadialGradient(this.x, this.y, r * 0.3, this.x, this.y, r);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, this.getColor());
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    getColor() {
        return {
            'shotLevelUp': 'red',
            'wide': 'orange',
            'homing': 'purple',
            'heal': 'green',
            'barrier': 'blue',
            'bomb': 'black',
            'satellite': 'silver',
            'rapid': 'deepskyblue',
            'penetrate': 'magenta',
            'magnet': 'pink',
            'sleep': 'darkviolet',
            'speed': 'aqua',
            'slow': 'lavenderblush',
            'laser': '#00ffff',
            'doubleScore': '#ffd700',
            'armor': '#4169e1',
            'overdrive': '#ff4500',
            'rearShot': '#8b4513',
            'sideShot': '#7fff00',
            'critical': '#ff1493',
            'phase': '#f0ffff',
            'purge': '#708090',
            'timeWarp': '#00bfff',
        }[this.type] || 'white';
    }
}

// 爆発エフェクトクラス
// 【最新技術 #4】Canvas Transformations - パーティクルエフェクト
class Explosion {
    constructor(x, y, isBoss = false) {
        this.x = x;
        this.y = y;
        this.particles = [];
        const particleCount = isBoss ? 20 : 8;
        const maxLife = isBoss ? 40 : 20;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3 + Math.random() * 5;
            this.particles.push({
                x: x,
                y: y,
                dx: Math.cos(angle) * speed,
                dy: Math.sin(angle) * speed,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.3,
                scale: 1.0,
                life: maxLife,
                maxLife: maxLife,
                color: isBoss ? ['#ff6600', '#ffaa00', '#ff00ff'][Math.floor(Math.random() * 3)] : '#ffaa00'
            });
        }
    }

    update() {
        this.particles.forEach(particle => {
            particle.x += particle.dx;
            particle.y += particle.dy;
            particle.dx *= 0.98; // 摩擦
            particle.dy *= 0.98;
            particle.rotation += particle.rotationSpeed;
            // スケール減衰
            particle.scale = (particle.life / particle.maxLife) * 1.2;
            particle.life--;
        });
        this.particles = this.particles.filter(particle => particle.life > 0);
    }

    draw() {
        this.particles.forEach(particle => {
            ctx.save();

            // 【Canvas Transformation】回転・スケーリング・位置変換
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.scale(particle.scale, particle.scale);

            // 【Canvas Property】アルファ・色設定
            ctx.globalAlpha = particle.life / particle.maxLife;
            ctx.fillStyle = particle.color;
            ctx.fillRect(-2, -2, 4, 4);

            ctx.restore();
        });
    }

    isDead() {
        return this.particles.length === 0;
    }
}

class BombEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.life = 48;
        this.maxLife = 48;
        this.shards = Array.from({ length: 28 }, (_, index) => {
            const angle = (Math.PI * 2 * index) / 28 + Math.random() * 0.12;
            const speed = 4 + Math.random() * 7;
            return {
                angle,
                speed,
                length: 8 + Math.random() * 18,
                color: index % 3 === 0 ? '#ff2bd6' : index % 2 === 0 ? '#ffffff' : '#00eaff'
            };
        });
    }

    update() {
        this.life--;
    }

    draw() {
        const progress = 1 - this.life / this.maxLife;
        const fade = Math.max(0, 1 - progress);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 初動の画面フラッシュ
        if (progress < 0.22) {
            ctx.globalAlpha = (0.22 - progress) * 2.2;
            ctx.fillStyle = '#bffcff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // EMP六角リング
        [0.62, 0.82, 1].forEach((scale, index) => {
            const radius = progress * canvas.width * scale;
            ctx.globalAlpha = fade * (0.9 - index * 0.2);
            ctx.strokeStyle = index === 1 ? '#ff2bd6' : '#00eaff';
            ctx.lineWidth = Math.max(1, 8 - progress * 6 - index);
            ctx.beginPath();
            for (let point = 0; point < 6; point++) {
                const angle = Math.PI / 6 + point * Math.PI / 3 + progress * (index % 2 ? -0.35 : 0.35);
                const px = this.x + Math.cos(angle) * radius;
                const py = this.y + Math.sin(angle) * radius;
                if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
        });

        // 放射するエネルギー破片
        this.shards.forEach(shard => {
            const distance = progress * shard.speed * 42;
            const sx = this.x + Math.cos(shard.angle) * distance;
            const sy = this.y + Math.sin(shard.angle) * distance;
            ctx.globalAlpha = fade;
            ctx.strokeStyle = shard.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(
                sx - Math.cos(shard.angle) * shard.length * fade,
                sy - Math.sin(shard.angle) * shard.length * fade
            );
            ctx.stroke();
        });

        const coreRadius = 55 * Math.sin(Math.min(1, progress * 2.2) * Math.PI / 2) * fade;
        const core = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, Math.max(1, coreRadius));
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.25, '#00eaff');
        core.addColorStop(0.62, '#6a19ff');
        core.addColorStop(1, 'rgba(255,43,214,0)');
        ctx.globalAlpha = Math.min(1, fade * 1.4);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(this.x, this.y, Math.max(1, coreRadius), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class BossDefeatEffect {
    constructor(x, y, color = '#ff304f') {
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 110;
        this.maxLife = 110;
        this.fragments = Array.from({ length: 54 }, (_, index) => {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 8.5;
            return {
                x, y, angle, speed,
                rotation: Math.random() * Math.PI,
                spin: (Math.random() - 0.5) * 0.35,
                size: 3 + Math.random() * 9,
                color: index % 4 === 0 ? '#ffffff' : index % 3 === 0 ? '#00eaff' : index % 2 === 0 ? '#ffcc00' : color
            };
        });
    }

    update() {
        this.life--;
        this.fragments.forEach(fragment => {
            fragment.x += Math.cos(fragment.angle) * fragment.speed;
            fragment.y += Math.sin(fragment.angle) * fragment.speed;
            fragment.speed *= 0.965;
            fragment.rotation += fragment.spin;
        });
    }

    draw() {
        const age = this.maxLife - this.life;
        const fade = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 時間差で開く三重衝撃波
        [0, 14, 30].forEach((delay, index) => {
            const waveAge = Math.max(0, age - delay);
            if (waveAge <= 0 || waveAge > 58) return;
            const radius = waveAge * (4.2 + index * 0.7);
            ctx.globalAlpha = (1 - waveAge / 58) * 0.9;
            ctx.strokeStyle = index === 1 ? '#00eaff' : index === 2 ? '#ff2bd6' : '#ffffff';
            ctx.lineWidth = Math.max(2, 12 - waveAge * 0.16);
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.stroke();
        });

        // 中心で脈動する炉心崩壊
        const pulse = Math.max(1, 92 * Math.sin(Math.min(1, age / 34) * Math.PI / 2) * fade);
        const core = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, pulse);
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.18, '#ffcc00');
        core.addColorStop(0.48, this.color);
        core.addColorStop(1, 'rgba(255,0,80,0)');
        ctx.globalAlpha = Math.min(1, fade * 1.6);
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(this.x, this.y, pulse, 0, Math.PI * 2);
        ctx.fill();

        // 回転する金属装甲片
        this.fragments.forEach(fragment => {
            ctx.save();
            ctx.translate(fragment.x, fragment.y);
            ctx.rotate(fragment.rotation);
            ctx.globalAlpha = fade;
            ctx.fillStyle = fragment.color;
            ctx.fillRect(-fragment.size / 2, -2, fragment.size, 4);
            ctx.restore();
        });
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

function triggerBossDefeatEffects(enemy) {
    bossDefeatEffects.push(new BossDefeatEffect(enemy.x, enemy.y, enemy.color || '#ff304f'));
    explosions.push(new Explosion(enemy.x - 60, enemy.y + 20, true));
    explosions.push(new Explosion(enemy.x + 55, enemy.y - 30, true));
    explosions.push(new Explosion(enemy.x, enemy.y + 55, true));
    screenShake = Math.max(screenShake, 26);
    vibrate([180, 45, 140, 45, 220, 70, 320]);
    playTone(95, 0.65, 'sawtooth', 0.18);
    playTone(740, 0.32, 'square', 0.09);
}

// プレイヤーの移動
function updatePlayer() {
    // アナログパッドとキー入力を同じ加速モデルで処理する
    let inputX = touchStick.active ? touchStick.x : 0;
    let inputY = touchStick.active ? touchStick.y : 0;
    if (keys['ArrowLeft']) inputX -= 1;
    if (keys['ArrowRight']) inputX += 1;
    if (keys['ArrowUp']) inputY -= 1;
    if (keys['ArrowDown']) inputY += 1;
    const inputLength = Math.hypot(inputX, inputY);
    if (inputLength > 1) {
        inputX /= inputLength;
        inputY /= inputLength;
    }
    const targetVx = inputX * player.speed;
    const targetVy = inputY * player.speed;
    player.vx += (targetVx - player.vx) * 0.38;
    player.vy += (targetVy - player.vy) * 0.38;
    if (Math.abs(targetVx) < 0.01) player.vx *= 0.62;
    if (Math.abs(targetVy) < 0.01) player.vy *= 0.62;
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x + player.vx));
    player.y = Math.max(player.height / 2, Math.min(canvas.height - player.height / 2, player.y + player.vy));

    // 射撃処理
    if (player.invincible > 0) {
        player.invincible--;
    }
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }
    ['laserTimer', 'rearShotTimer', 'sideShotTimer', 'criticalTimer'].forEach(timer => {
        if (player[timer] > 0) player[timer]--;
    });
    if (player.overdriveTimer > 0) {
        player.overdriveTimer--;
        if (player.overdriveTimer === 0) player.shotDelay = 10;
    }
    if (player.laserTimer > 0) {
        player.laserCooldown--;
        if (player.laserCooldown <= 0) {
            beams.push(new Beam(player.x, player.y));
            player.laserCooldown = 90;
        }
    }

    if ((keys['Space'] || touchButtons.shoot) && player.shootCooldown <= 0) {
        shoot();
        player.shootCooldown = player.shotDelay;
    }

    if (player.sleepMissile) {
        player.sleepCooldown--;
        if (player.sleepCooldown <= 0) {
            bullets.push(new Bullet(player.x, player.y - player.height/2, 0, -6, '#9932cc', true, false, false, true));
            player.sleepCooldown = 600;
        }
    }
}

// 射撃システム
function shoot() {
    const power = gameState.power;
    const now = performance.now();
    if (now - lastShotSoundAt > 65) {
        playTone(player.overdriveTimer > 0 ? 1040 : 880, 0.035, 'square', 0.035);
        lastShotSoundAt = now;
    }

    if (player.isWide) {
        bullets.push(new Bullet(player.x, player.y - player.height/2, -3, -8, '#ffff00', player.isHoming, player.isPenetrate));
        bullets.push(new Bullet(player.x, player.y - player.height/2, 0, -8, '#ffff00', player.isHoming, player.isPenetrate));
        bullets.push(new Bullet(player.x, player.y - player.height/2, 3, -8, '#ffff00', player.isHoming, player.isPenetrate));
    } else if (power === 1) {
        bullets.push(new Bullet(player.x, player.y - player.height/2, 0, -8, '#ffff00', player.isHoming, player.isPenetrate));
    } else if (power === 2) {
        bullets.push(new Bullet(player.x - 8, player.y - player.height/2, 0, -8, '#ffff00', player.isHoming, player.isPenetrate));
        bullets.push(new Bullet(player.x + 8, player.y - player.height/2, 0, -8, '#ffff00', player.isHoming, player.isPenetrate));
    } else if (power === 3) {
        bullets.push(new Bullet(player.x, player.y - player.height/2, 0, -8, '#ffff00', player.isHoming, player.isPenetrate));
        bullets.push(new Bullet(player.x - 10, player.y - player.height/2, -2, -8, '#ffff00', player.isHoming, player.isPenetrate));
        bullets.push(new Bullet(player.x + 10, player.y - player.height/2, 2, -8, '#ffff00', player.isHoming, player.isPenetrate));
    }

    if (player.rearShotTimer > 0) {
        bullets.push(new Bullet(player.x, player.y + player.height/2, 0, 8, '#ff9933', false, player.isPenetrate));
    }
    if (player.sideShotTimer > 0) {
        bullets.push(new Bullet(player.x - player.width/2, player.y, -8, 0, '#7fff00', false, player.isPenetrate));
        bullets.push(new Bullet(player.x + player.width/2, player.y, 8, 0, '#7fff00', false, player.isPenetrate));
    }
}

function spawnPowerUp(x, y) {
    const types = [
        'shotLevelUp', 'wide', 'homing', 'heal', 'barrier', 'bomb', 'satellite', 'rapid',
        'penetrate', 'magnet', 'sleep', 'speed', 'slow', 'laser', 'doubleScore', 'armor',
        'overdrive', 'rearShot', 'sideShot', 'critical', 'phase', 'purge', 'timeWarp'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    items.push(new PowerUp(type, x, y));
}

// 敵の生成
function spawnEnemies() {
    if (!gameState.bossActive) {
        if (gameState.stageFrame % 45 === 0) {
            const x = Math.random() * (canvas.width - 60) + 30;
            const patterns = ['straight', 'zigzag', 'chase'];
            const movement = patterns[Math.floor(Math.random() * patterns.length)];
            enemies.push(new Enemy(x, -30, 'normal', movement));
        }

        if (gameState.stageFrame % 120 === 0) {
            const x = Math.random() * (canvas.width - 60) + 30;
            enemies.push(new Enemy(x, canvas.height + 30, 'normal', 'fromBottom'));
        }

        if (gameState.stageFrame >= STAGE_DURATION) {
            // Clear existing enemies while keeping reference for homing bullets
            enemies.length = 0;
            // Spawn the boss slightly above the visible area
            const x = canvas.width / 2;
            enemies.push(new Enemy(x, -150, 'boss'));
            gameState.bossActive = true;
            bgm.pause();
            if (gameState.stage !== 6) {
                bossBgm.currentTime = 0;
                bossBgm.play();
            }
        }
    }
}

// 当たり判定
function checkCollisions() {
    // プレイヤーの弾と敵の当たり判定
    bullets.forEach((bullet, bulletIndex) => {
        if (!bullet.isEnemy) { // プレイヤーの弾のみ
            enemies.forEach((enemy, enemyIndex) => {
                if (Math.abs(bullet.x - enemy.x) < enemy.width/2 + bullet.width/2 &&
                    Math.abs(bullet.y - enemy.y) < enemy.height/2 + bullet.height/2) {

                    enemy.hp -= bullet.damage;
                    if (bullet.sleep) {
                        enemy.sleepTimer = 180;
                    }
                    if (!bullet.penetrate) {
                        bullets.splice(bulletIndex, 1);
                    }
                    
                    if (enemy.hp <= 0) {
                        // 【Canvas Transformations】ボス撃破時の豪華な爆発
                        explosions.push(new Explosion(enemy.x, enemy.y, enemy.type === 'boss'));
                        awardScore(enemy.type === 'boss' ? 100 : 10);

                        // 【Vibration API + Web Audio API】敵撃破時のフィードバック
                        if (enemy.type === 'boss') {
                            triggerBossDefeatEffects(enemy);
                            playTone(1200, 0.3, 'square', 0.15);
                        } else {
                            vibrate(30);
                            playTone(1000, 0.1, 'sine', 0.1);
                        }

                        if (Math.random() < 0.3) {
                            spawnPowerUp(enemy.x, enemy.y);
                        }

                        enemies.splice(enemyIndex, 1);
                        if (enemy.type === 'boss') {
                            nextStage();
                        }
                    }
                }
            });
        }
    });

    // ビームと敵の当たり判定
    beams.forEach((beam) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (Math.abs(beam.x - enemy.x) < enemy.width/2 + beam.width/2) {
                enemy.hp -= 2; // ビームは高威力

                if (enemy.hp <= 0) {
                    // 【Canvas Transformations】ボス撃破時の豪華な爆発
                    explosions.push(new Explosion(enemy.x, enemy.y, enemy.type === 'boss'));
                    awardScore(enemy.type === 'boss' ? 100 : 10);

                    // 【Vibration API + Web Audio API】敵撃破時のフィードバック
                    if (enemy.type === 'boss') {
                        triggerBossDefeatEffects(enemy);
                        playTone(1200, 0.3, 'square', 0.15);
                    } else {
                        vibrate(30);
                        playTone(1000, 0.1, 'sine', 0.1);
                    }

                    if (Math.random() < 0.3) {
                        spawnPowerUp(enemy.x, enemy.y);
                    }

                    enemies.splice(enemyIndex, 1);
                    if (enemy.type === 'boss') {
                        triggerBossDefeatEffects(enemy);
                        nextStage();
                    }
                }
            }
        });
    });

    // 敵の弾とプレイヤーの当たり判定
    bullets.forEach((bullet, bulletIndex) => {
        if (bullet.isEnemy) { // 敵の弾のみ
            if (Math.abs(bullet.x - player.x) < player.width/2 + bullet.width/2 &&
                Math.abs(bullet.y - player.y) < player.height/2 + bullet.height/2) {

                bullets.splice(bulletIndex, 1);
                if (player.invincible > 0) {
                    return;
                }

                // 【Vibration API + Web Audio API】被弾時のフィードバック
                vibrate([50, 30, 50]);
                playTone(400, 0.15, 'sine', 0.1);

                if (player.shield > 0) {
                    player.shield--;
                    explosions.push(new Explosion(player.x, player.y));
                } else {
                    gameState.life--;
                    explosions.push(new Explosion(player.x, player.y));

                    if (gameState.life <= 0) {
                        gameOver();
                    }
                }
            }
        }
    });

    // 敵とプレイヤーの当たり判定
    enemies.forEach((enemy, enemyIndex) => {
        if (Math.abs(enemy.x - player.x) < enemy.width/2 + player.width/2 &&
            Math.abs(enemy.y - player.y) < enemy.height/2 + player.height/2) {
            if (player.invincible > 0) {
                explosions.push(new Explosion(enemy.x, enemy.y));
                enemies.splice(enemyIndex, 1);
            } else if (player.shield > 0) {
                player.shield--;
                explosions.push(new Explosion(player.x, player.y));
                explosions.push(new Explosion(enemy.x, enemy.y));
                enemies.splice(enemyIndex, 1);
            } else {
                gameState.life--;
                explosions.push(new Explosion(player.x, player.y));
                explosions.push(new Explosion(enemy.x, enemy.y));
                enemies.splice(enemyIndex, 1);

                if (gameState.life <= 0) {
                    gameOver();
                }
            }
        }
    });

    // サテライトと敵の当たり判定（接触ダメージ）
    satellites.forEach(sat => {
        enemies.forEach((enemy, enemyIndex) => {
            const dist = Math.hypot(sat.x - enemy.x, sat.y - enemy.y);
            const enemyRadius = Math.max(enemy.width, enemy.height) / 2;
            if (dist < enemyRadius + 8) {
                enemy.hp--;
                if (enemy.hp <= 0) {
                    explosions.push(new Explosion(enemy.x, enemy.y));
                    awardScore(enemy.type === 'boss' ? 100 : 10);

                    if (Math.random() < 0.3) {
                        spawnPowerUp(enemy.x, enemy.y);
                    }

                    enemies.splice(enemyIndex, 1);
                    if (enemy.type === 'boss') {
                        nextStage();
                    }
                }
            }
        });
    });

}

function useBomb() {
    if (player.bombCount > 0) {
        // 【Vibration API + Web Audio API】ボム使用時のフィードバック
        vibrate([70, 30, 110, 35, 170, 45, 240]);
        screenShake = Math.max(screenShake, 16);

        playBombSound();
        bombEffects.push(new BombEffect(player.x, player.y));

        player.bombCount--;
        let bossKilled = false;
        enemies = enemies.filter(enemy => {
            explosions.push(new Explosion(enemy.x, enemy.y));
            if (enemy.type === 'boss') {
                // ボムはボスを即死させず、一定ダメージを与える
                enemy.hp -= Math.floor(enemy.maxHp * 0.25);
                if (enemy.hp <= 0) {
                    bossKilled = true;
                    triggerBossDefeatEffects(enemy);
                    awardScore(100);
                    return false;
                }
                return true;
            } else {
                awardScore(10);
                if (Math.random() < 0.3) {
                    spawnPowerUp(enemy.x, enemy.y);
                }
                return false;
            }
        });
        bullets = bullets.filter(b => b.dy < 0);
        if (bossKilled) {
            nextStage();
        }
        updateUI();
    }
}

// ポーズ機能
function togglePause() {
    if (!gameState.playing) return;
    gameState.paused = !gameState.paused;
    if (gameState.paused) {
        pauseScreen.classList.remove('hidden');
        bgm.pause();
        bossBgm.pause();
    } else {
        pauseScreen.classList.add('hidden');
        if (gameState.bossActive && gameState.stage === 6) {
            bossBgm.play().catch(() => {});
        } else if (gameState.bossActive) {
            bossBgm.play().catch(() => {});
        } else {
            bgm.play().catch(() => {});
        }
    }
}

// ゲームオーバー
function gameOver() {
    gameState.playing = false;
    const isNewRecord = saveHighScore(gameState.score);
    finalScoreElement.textContent = gameState.score;
    
    // 既存の新記録メッセージを削除
    const existingMsg = gameOverElement.querySelector('.newRecordMsg');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    if (isNewRecord) {
        const highScoreMsg = document.createElement('p');
        highScoreMsg.textContent = '🎉 新記録！';
        highScoreMsg.className = 'newRecordMsg';
        highScoreMsg.style.color = '#ffd700';
        highScoreMsg.style.fontWeight = 'bold';
        highScoreMsg.style.marginTop = '10px';
        gameOverElement.appendChild(highScoreMsg);
    }
    gameOverElement.classList.remove('hidden');
    bgm.pause();
    bossBgm.pause();
}

function gameClear() {
    gameState.playing = false;
    const isNewRecord = saveHighScore(gameState.score);
    clearScoreElement.textContent = gameState.score;
    clearHighScoreElement.textContent = getHighScore();
    
    // 既存の新記録メッセージを削除
    const existingMsg = gameClearElement.querySelector('.newRecordMsg');
    if (existingMsg) {
        existingMsg.remove();
    }
    
    if (isNewRecord) {
        const highScoreMsg = document.createElement('p');
        highScoreMsg.textContent = '🎉 新記録！';
        highScoreMsg.className = 'newRecordMsg';
        highScoreMsg.style.color = '#ffd700';
        highScoreMsg.style.fontWeight = 'bold';
        highScoreMsg.style.marginTop = '10px';
        gameClearElement.appendChild(highScoreMsg);
    }
    gameClearElement.classList.remove('hidden');
    bgm.pause();
    bossBgm.pause();
}

function startGame() {
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameState.playing = true;
    gameState.paused = false;
    initAudio();
    bgm.play().catch(() => {});
    updateUI(); // ハイスコアを表示
}

// ゲーム再開
function restartGame() {
    if (clearTimer) {
        clearTimeout(clearTimer);
        clearTimer = null;
    }
    startScreen.classList.add('hidden');
    pauseScreen.classList.add('hidden');
    gameState = {
        playing: true,
        paused: false,
        score: 0,
        life: 3,
        power: 1,
        frameCount: 0,
        stage: 1,
        stageFrame: 0,
        bossActive: false,
        enemySlowTimer: 0,
        doubleScoreTimer: 0
    };
    
    player = {
        x: canvas.width / 2 - 18,
        y: canvas.height - 80,
        width: 36,
        height: 36,
        speed: 5,
        vx: 0,
        vy: 0,
        shootCooldown: 0,
        shotDelay: 10,
        shield: 0,
        isWide: false,
        isHoming: false,
        bombCount: 0,
        isPenetrate: false,
        isMagnet: false,
        invincible: 0,
        sleepMissile: false,
        sleepCooldown: 0,
        laserTimer: 0,
        laserCooldown: 0,
        rearShotTimer: 0,
        sideShotTimer: 0,
        criticalTimer: 0,
        overdriveTimer: 0
    };

    bullets = [];
    beams = [];
    enemies = [];
    items = [];
    satellites = [];
    explosions = [];
    bombEffects = [];
    bossDefeatEffects = [];
    screenShake = 0;
    gameOverElement.classList.add('hidden');
    gameClearElement.classList.add('hidden');
    bossBgm.pause();
    bossBgm.currentTime = 0;
    bgm.currentTime = 0;
    bgm.play();
}

function nextStage() {
    // Increase total stages to six before clearing the game
    if (gameState.stage >= 6) {
        // 最終爆発を見せ切ってからクリア画面へ移る
        gameState.bossActive = true;
        clearTimer = setTimeout(() => {
            clearTimer = null;
            gameClear();
        }, 1500);
        return;
    }
    gameState.stage++;
    gameState.stageFrame = 0;
    gameState.bossActive = false;
    bossBgm.pause();
    bossBgm.currentTime = 0;
    bgm.pause();
    if (gameState.stage === 6) {
        bossBgm.play();
    } else {
        bgm.currentTime = 0;
        bgm.play();
    }
}

// UI更新
function updateUI() {
    scoreElement.textContent = `スコア ${gameState.score}`;
    highScoreElement.textContent = `HI ${getHighScore()}`;
    lifeElement.textContent = '❤️'.repeat(gameState.life) || '💔';
    powerElement.textContent = `P ${gameState.power}${gameState.power >= 3 ? ' MAX' : ''}`;
    shieldElement.textContent = `バリア ${player.shield}`;
    stageElement.textContent = `ST ${gameState.stage}`;
    if (player.bombCount > 0) {
        bombContainer.classList.remove('hidden');
        bombCountDisplay.textContent = player.bombCount;
    } else {
        bombContainer.classList.add('hidden');
    }
}

const STAGE_BACKGROUNDS = [
    { top: '#02051f', bottom: '#00162c', glow: '#00bfff', nebula: '#163a8c' },
    { top: '#210512', bottom: '#3a1000', glow: '#ff6b00', nebula: '#8b1a1a' },
    { top: '#071a0f', bottom: '#001f22', glow: '#3cff8f', nebula: '#126b55' },
    { top: '#170526', bottom: '#050018', glow: '#da55ff', nebula: '#5f168b' },
    { top: '#261800', bottom: '#080b16', glow: '#ffd54a', nebula: '#8c5b12' },
    { top: '#260000', bottom: '#030007', glow: '#ff1744', nebula: '#7a001c' }
];

function celestialVisibility(offset = 0) {
    const cycle = ((gameState.frameCount + offset) % 1500) / 1500;
    // 約25秒周期で、中央付近だけ柔らかく現れる
    return Math.max(0, Math.sin(cycle * Math.PI) * 1.35 - 0.35);
}

function drawSaturn(alpha, drift) {
    ctx.save();
    ctx.translate(canvas.width * 0.76, 150 + drift * 45);
    ctx.rotate(-0.24);
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = '#f7d794';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 72, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
    const planet = ctx.createRadialGradient(-12, -12, 4, 0, 0, 31);
    planet.addColorStop(0, '#fff5c7');
    planet.addColorStop(0.5, '#d8a85e');
    planet.addColorStop(1, '#6d3e2a');
    ctx.fillStyle = planet;
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * 0.75;
    ctx.strokeStyle = '#ffe6a3';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 72, 20, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawBigDipper(alpha, drift) {
    const points = [[0, 26], [34, 16], [64, 30], [94, 18], [119, -4], [151, 4], [177, -18]];
    ctx.save();
    ctx.translate(55, 135 + drift * 38);
    ctx.globalAlpha = alpha * 0.72;
    ctx.strokeStyle = '#9be7ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.stroke();
    points.forEach(([x, y], index) => {
        const twinkle = 2.2 + Math.sin(gameState.frameCount * 0.08 + index) * 0.8;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, twinkle, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawMilkyWay(alpha, drift) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + drift * 60);
    ctx.rotate(-0.5);
    const band = ctx.createLinearGradient(-220, 0, 220, 0);
    band.addColorStop(0, 'rgba(80,130,255,0)');
    band.addColorStop(0.5, `rgba(215,230,255,${alpha * 0.22})`);
    band.addColorStop(1, 'rgba(120,80,255,0)');
    ctx.fillStyle = band;
    ctx.filter = 'blur(10px)';
    ctx.fillRect(-280, -42, 560, 84);
    ctx.filter = 'none';
    ctx.globalAlpha = alpha * 0.55;
    for (let i = 0; i < 38; i++) {
        const x = (i * 71) % 500 - 250;
        const y = ((i * 29) % 66) - 33;
        ctx.fillStyle = i % 5 === 0 ? '#d8c6ff' : '#ffffff';
        ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.restore();
}

function drawCrabNebula(alpha, drift) {
    ctx.save();
    const x = canvas.width * 0.28;
    const y = 205 + drift * 48;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.28;
    ['#00bfff', '#8a2be2', '#ff3f81'].forEach((color, index) => {
        const radius = 68 - index * 12;
        const cloud = ctx.createRadialGradient(x + index * 9, y - index * 5, 2, x, y, radius);
        cloud.addColorStop(0, color);
        cloud.addColorStop(0.45, `${color}88`);
        cloud.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cloud;
        ctx.beginPath();
        ctx.ellipse(x, y, radius, radius * 0.62, gameState.frameCount * 0.0004 + index, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#bfeaff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 48 + i * 13, y - 28);
        ctx.quadraticCurveTo(x + Math.sin(i) * 25, y, x - 42 + i * 14, y + 31);
        ctx.stroke();
    }
    ctx.restore();
}

function drawAndromeda(alpha, drift) {
    ctx.save();
    ctx.translate(canvas.width * 0.7, 215 + drift * 52);
    ctx.rotate(-0.3);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 4; i >= 0; i--) {
        ctx.globalAlpha = alpha * (0.08 + (4 - i) * 0.045);
        ctx.strokeStyle = i % 2 ? '#9d8cff' : '#dff6ff';
        ctx.lineWidth = 10 - i * 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 92 - i * 12, 31 - i * 3, i * 0.1, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.globalAlpha = alpha * 0.8;
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.25, '#b9eaff');
    core.addColorStop(1, 'rgba(110,70,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawStageCelestialObjects() {
    const drift = ((gameState.frameCount % 1500) / 1500) * 2 - 1;
    const stage = gameState.stage;
    const brightness = gameState.bossActive ? 0.42 : 0.75;
    if (stage === 1) drawSaturn(celestialVisibility(0) * brightness, drift);
    if (stage === 2) drawBigDipper(celestialVisibility(240) * brightness, drift);
    if (stage === 3) drawMilkyWay(celestialVisibility(480) * brightness, drift);
    if (stage === 4) drawCrabNebula(celestialVisibility(720) * brightness, drift);
    if (stage === 5) drawAndromeda(celestialVisibility(960) * brightness, drift);
    if (stage >= 6) {
        drawSaturn(celestialVisibility(0) * brightness * 0.45, drift);
        drawBigDipper(celestialVisibility(300) * brightness * 0.5, drift);
        drawMilkyWay(celestialVisibility(600) * brightness * 0.34, drift);
        drawCrabNebula(celestialVisibility(900) * brightness * 0.36, drift);
        drawAndromeda(celestialVisibility(1200) * brightness * 0.36, drift);
    }
}

function drawStageBackground() {
    const theme = STAGE_BACKGROUNDS[(gameState.stage - 1) % STAGE_BACKGROUNDS.length];
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, theme.top);
    gradient.addColorStop(1, theme.bottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 大きな星雲を少数だけ描き、迫力と軽さを両立する
    ctx.save();
    ctx.globalAlpha = gameState.bossActive ? 0.32 : 0.2;
    for (let i = 0; i < 3; i++) {
        const x = ((i * 197 + gameState.stage * 83) % canvas.width);
        const y = ((i * 263 + gameState.frameCount * (0.08 + i * 0.03)) % (canvas.height + 240)) - 120;
        const radius = 90 + i * 34;
        const nebula = ctx.createRadialGradient(x, y, 0, x, y, radius);
        nebula.addColorStop(0, theme.nebula);
        nebula.addColorStop(1, 'transparent');
        ctx.fillStyle = nebula;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();

    const starSpeed = gameState.bossActive ? 3.2 : 1.5 + gameState.stage * 0.18;
    for (let i = 0; i < 64; i++) {
        const depth = 1 + (i % 3);
        const x = (i * 97 + gameState.stage * 31) % canvas.width;
        const y = (i * 53 + gameState.frameCount * starSpeed * depth) % canvas.height;
        ctx.globalAlpha = 0.35 + depth * 0.2;
        ctx.fillStyle = depth === 3 ? theme.glow : '#ffffff';
        ctx.fillRect(x, y, depth === 3 ? 2 : 1, gameState.bossActive ? depth * 4 : depth);
    }
    ctx.globalAlpha = 1;

    drawStageCelestialObjects();

    if (gameState.bossActive) {
        const pulse = 0.08 + Math.sin(gameState.frameCount * 0.12) * 0.035;
        ctx.fillStyle = `rgba(255, 20, 60, ${pulse})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = theme.glow;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 2;
        for (let y = (gameState.frameCount * 5) % 80; y < canvas.height; y += 80) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y + 35);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }
}

// 描画
function draw() {
    ctx.save();
    if (screenShake > 0) {
        const strength = Math.min(14, screenShake * 0.55);
        ctx.translate((Math.random() - 0.5) * strength, (Math.random() - 0.5) * strength);
    }
    drawStageBackground();

    // プレイヤー描画（無敵時間の点滅エフェクト）
    const invincibleAlpha = player.invincible > 0 ? (Math.floor(gameState.frameCount / 5) % 2 === 0 ? 0.3 : 1.0) : 1.0;
    if (typeof Sprites !== 'undefined') {
        Sprites.drawPlayer(ctx, player, gameState.frameCount, {
            alpha: invincibleAlpha,
            shielded: player.shield > 0,
            invincible: player.invincible > 0
        });
        satellites.forEach(sat => Sprites.drawSatellite(ctx, sat, gameState.frameCount));
    } else {
        ctx.save();
        ctx.globalAlpha = invincibleAlpha;
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(player.x - player.width/2, player.y - player.height/2, player.width, player.height);
        ctx.restore();
        satellites.forEach(sat => {
            ctx.fillStyle = '#cccccc';
            ctx.beginPath();
            ctx.arc(sat.x, sat.y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // 弾丸描画
    bullets.forEach(bullet => bullet.draw());
    
    // ビーム描画
    beams.forEach(beam => beam.draw());

    // 敵描画
    enemies.forEach(enemy => enemy.draw());

    // アイテム描画
    items.forEach(item => item.draw(ctx));

    // 爆発描画
    explosions.forEach(explosion => explosion.draw());

    // ボムのEMP衝撃波は通常爆発より前面に描画
    bombEffects.forEach(effect => effect.draw());
    bossDefeatEffects.forEach(effect => effect.draw());

    // ボス登場までのカウントダウン表示
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    if (!gameState.bossActive) {
        const remaining = Math.max(0, Math.ceil((STAGE_DURATION - gameState.stageFrame) / 60));
        ctx.fillText(`ボス登場まで: ${remaining}秒`, 10, 20);
    } else {
        ctx.fillText('ボス登場！', 10, 20);
    }
    ctx.restore();
}

// 【最新技術 #5】Performance API - フレーム監視
let frameTimings = [];
let lastTime = performance.now();

// メインゲームループ
function gameLoop() {
    // パフォーマンス計測
    const currentTime = performance.now();
    const frameTime = currentTime - lastTime;
    lastTime = currentTime;
    frameTimings.push(frameTime);
    if (frameTimings.length > 60) frameTimings.shift(); // 直近60フレーム保持

    if (gameState.playing && !gameState.paused) {
        gameState.frameCount++;
        if (!gameState.bossActive) {
            gameState.stageFrame++;
        }
        if (gameState.enemySlowTimer > 0) {
            gameState.enemySlowTimer--;
        }
        if (gameState.doubleScoreTimer > 0) {
            gameState.doubleScoreTimer--;
        }

        updatePlayer();
        spawnEnemies();
        
        // 弾丸更新
        bullets.forEach(bullet => bullet.update());
        bullets = bullets.filter(bullet => 
            bullet.y > -10 && bullet.y < canvas.height + 10 &&
            bullet.x > -10 && bullet.x < canvas.width + 10
        );
        if (bullets.length > 360) {
            bullets.splice(0, bullets.length - 360);
        }
        
        // ビーム更新
        beams.forEach(beam => beam.update());
        beams = beams.filter(beam => beam.duration > 0);

        // 敵更新
        enemies.forEach(enemy => enemy.update());
        enemies = enemies.filter(enemy => enemy.y < canvas.height + 50 && (enemy.y > -50 || enemy.type === 'boss'));

        // アイテム更新
        items.forEach(item => item.update());
        items = items.filter(item => item.active && item.y < canvas.height + 50);
        if (items.length > 24) items.splice(0, items.length - 24);

        // サテライト更新
        satellites.forEach(sat => {
            sat.angle += 0.05;
            sat.x = player.x + Math.cos(sat.angle) * 40;
            sat.y = player.y + Math.sin(sat.angle) * 40;
            sat.shootCooldown--;
            if (sat.shootCooldown <= 0) {
                bullets.push(new Bullet(sat.x, sat.y, 0, -8, '#ffff00', player.isHoming, player.isPenetrate));
                sat.shootCooldown = player.shotDelay;
            }
        });

        // 爆発更新
        explosions.forEach(explosion => explosion.update());
        explosions = explosions.filter(explosion => !explosion.isDead());
        bombEffects.forEach(effect => effect.update());
        bombEffects = bombEffects.filter(effect => !effect.isDead());
        bossDefeatEffects.forEach(effect => effect.update());
        bossDefeatEffects = bossDefeatEffects.filter(effect => !effect.isDead());
        if (screenShake > 0) screenShake--;

        checkCollisions();
        updateUI();
    }
    
    draw();
    // 【最新技術 #8】RequestAnimationFrame 最適化
    // ブラウザの画面リフレッシュレートに同期して呼び出し（通常60fps）
    // 自動フレームスキップ対応
    requestAnimationFrame(gameLoop);
}

// ゲーム開始
updateUI();
gameLoop();

function resizeGame() {
    if (!playArea) return;
    const rect = playArea.getBoundingClientRect();
    canvas.style.width = Math.floor(Math.max(120, rect.width)) + 'px';
    canvas.style.height = Math.floor(Math.max(160, rect.height)) + 'px';
}

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', () => setTimeout(resizeGame, 120));
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resizeGame);
}
resizeGame();
requestAnimationFrame(resizeGame);
