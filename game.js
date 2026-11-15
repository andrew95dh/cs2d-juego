const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Referencias UI
const levelNumEl = document.getElementById('level-num');
const hpEl = document.getElementById('hp');
const weaponNameEl = document.getElementById('weapon-name');
const ammoEl = document.getElementById('ammo');
const reserveEl = document.getElementById('reserve');
const grenadesEl = document.getElementById('grenades');
const rescuedEl = document.getElementById('rescued');
const totalHostagesEl = document.getElementById('total-hostages');
const enemiesEl = document.getElementById('enemies');

// ==========================================
// SISTEMA DE AUDIO PROCEDURAL (WEB AUDIO API)
// ==========================================
const AudioSys = {
    ctx: null,
    muted: false,

    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    createNoiseBuffer(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    },

    playShoot(weaponKey) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        const duration = weaponKey === 'awp' ? 0.45 : (weaponKey === 'nova' ? 0.35 : 0.14);
        noise.buffer = this.createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(weaponKey === 'm4a1' ? 1400 : (weaponKey === 'awp' ? 2800 : 2200), now);
        filter.frequency.exponentialRampToValueAtTime(120, now + duration);

        const gain = this.ctx.createGain();
        const vol = weaponKey === 'awp' ? 0.45 : (weaponKey === 'm4a1' ? 0.22 : 0.32);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        noise.start(now);

        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = weaponKey === 'awp' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(weaponKey === 'awp' ? 180 : 140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + duration * 0.8);
        oscGain.gain.setValueAtTime(vol * 0.9, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);

        osc.connect(oscGain); oscGain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + duration * 0.8);
    },

    playExplosion() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.9);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(45, now + 0.9);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        noise.start(now);
    },

    playReload() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.42].forEach((offset, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(idx === 0 ? 520 : 780, now + offset);
            gain.gain.setValueAtTime(0.12, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + offset); osc.stop(now + offset + 0.08);
        });
    },

    playEmptyClick() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(950, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.04);
    },

    playPickup() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.12);
    },

    playLevelUp() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.09);
            gain.gain.setValueAtTime(0.18, now + i * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.25);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.25);
        });
    }
};

function toggleMute() {
    AudioSys.muted = !AudioSys.muted;
    document.getElementById('mute-btn').innerText = AudioSys.muted ? '🔇 Mute' : '🔊 Audio ON';
}

// ==========================================
// CATÁLOGO DE ARMAS Y DISEÑO DE 3 NIVELES
// ==========================================
const WEAPONS = {
    usp:   { name: 'USP-S',        damage: 22,  magSize: 12, reserve: 48, fireRate: 240,  speed: 13, spread: 0.04, pellets: 1, auto: false, length: 14, color: '#94a3b8' },
    m4a1:  { name: 'M4A1-S',       damage: 28,  magSize: 30, reserve: 90, fireRate: 110,  speed: 15, spread: 0.06, pellets: 1, auto: true,  length: 24, color: '#38bdf8' },
    nova:  { name: 'Nova',         damage: 18,  magSize: 8,  reserve: 24, fireRate: 750,  speed: 12, spread: 0.28, pellets: 6, auto: false, length: 22, color: '#fb923c' },
    awp:   { name: 'AWP',          damage: 135, magSize: 5,  reserve: 15, fireRate: 1100, speed: 22, spread: 0.01, pellets: 1, auto: false, length: 30, color: '#22c55e' },
    ak47:  { name: 'AK-47',        damage: 34,  magSize: 30, reserve: 90, fireRate: 130,  speed: 14, spread: 0.09, pellets: 1, auto: true,  length: 23, color: '#ef4444' },
    mac10: { name: 'MAC-10',       damage: 16,  magSize: 32, reserve: 96, fireRate: 75,   speed: 13, spread: 0.16, pellets: 1, auto: true,  length: 15, color: '#facc15' },
    rpg:   { name: 'Lanzacohetes', damage: 150, magSize: 1,  reserve: 3,  fireRate: 1200, speed: 10, spread: 0.02, pellets: 1, auto: false, length: 28, explosive: true, color: '#a855f7' }
};

const LEVELS = [
    {
        name: "NIVEL 1: ALMACÉN PORTUARIO",
        floorColor: "#2c3038",
        spawn: { x: 80, y: 80 },
        rescueZone: { x: 20, y: 20, width: 120, height: 120 },
        walls: [
            { x: 210, y: 0,   width: 32, height: 220, type: 'wall' },
            { x: 210, y: 330, width: 32, height: 290, type: 'wall' },
            { x: 430, y: 150, width: 190, height: 32, type: 'wall' },
            { x: 430, y: 440, width: 190, height: 32, type: 'wall' },
            { x: 710, y: 110, width: 32, height: 400, type: 'wall' },
            { x: 330, y: 270, width: 55, height: 55,  type: 'crate' }
        ],
        terrorists: [
            { x: 350, y: 80,  hp: 70,  speed: 1.4, weaponKey: 'mac10' },
            { x: 520, y: 300, hp: 90,  speed: 1.4, weaponKey: 'ak47' },
            { x: 820, y: 160, hp: 90,  speed: 1.4, weaponKey: 'ak47' },
            { x: 820, y: 460, hp: 80,  speed: 1.3, weaponKey: 'nova' }
        ],
        hostages: [
            { x: 870, y: 80 },
            { x: 870, y: 310 },
            { x: 870, y: 540 }
        ]
    },
    {
        name: "NIVEL 2: COMPLEJO INDUSTRIAL",
        floorColor: "#282c34",
        spawn: { x: 80, y: 310 },
        rescueZone: { x: 20, y: 240, width: 120, height: 140 },
        walls: [
            { x: 220, y: 80,  width: 32, height: 180, type: 'wall' },
            { x: 220, y: 360, width: 32, height: 180, type: 'wall' },
            { x: 420, y: 0,   width: 32, height: 210, type: 'wall' },
            { x: 420, y: 410, width: 32, height: 210, type: 'wall' },
            { x: 640, y: 140, width: 32, height: 340, type: 'wall' },
            { x: 310, y: 280, width: 60, height: 60,  type: 'crate' },
            { x: 520, y: 100, width: 60, height: 60,  type: 'crate' },
            { x: 520, y: 460, width: 60, height: 60,  type: 'crate' }
        ],
        terrorists: [
            { x: 340, y: 120, hp: 85,  speed: 1.5, weaponKey: 'mac10' },
            { x: 340, y: 500, hp: 95,  speed: 1.5, weaponKey: 'nova' },
            { x: 550, y: 310, hp: 100, speed: 1.5, weaponKey: 'ak47' },
            { x: 780, y: 120, hp: 100, speed: 1.5, weaponKey: 'ak47' },
            { x: 780, y: 500, hp: 110, speed: 1.3, weaponKey: 'rpg' },
            { x: 850, y: 310, hp: 100, speed: 1.5, weaponKey: 'ak47' }
        ],
        hostages: [
            { x: 890, y: 80 },
            { x: 890, y: 240 },
            { x: 890, y: 380 },
            { x: 890, y: 540 }
        ]
    },
    {
        name: "NIVEL 3: BÚNKER CENTRAL",
        floorColor: "#24272e",
        spawn: { x: 480, y: 550 },
        rescueZone: { x: 410, y: 500, width: 140, height: 100 },
        walls: [
            { x: 180, y: 130, width: 220, height: 32, type: 'wall' },
            { x: 560, y: 130, width: 220, height: 32, type: 'wall' },
            { x: 180, y: 130, width: 32,  height: 260, type: 'wall' },
            { x: 748, y: 130, width: 32,  height: 260, type: 'wall' },
            { x: 330, y: 330, width: 300, height: 32, type: 'wall' },
            { x: 450, y: 210, width: 60,  height: 60, type: 'crate' },
            { x: 260, y: 440, width: 60,  height: 60, type: 'crate' },
            { x: 640, y: 440, width: 60,  height: 60, type: 'crate' }
        ],
        terrorists: [
            { x: 250, y: 230, hp: 100, speed: 1.6, weaponKey: 'nova' },
            { x: 700, y: 230, hp: 100, speed: 1.6, weaponKey: 'nova' },
            { x: 480, y: 70,  hp: 120, speed: 1.4, weaponKey: 'rpg' },
            { x: 100, y: 280, hp: 100, speed: 1.6, weaponKey: 'ak47' },
            { x: 860, y: 280, hp: 100, speed: 1.6, weaponKey: 'ak47' },
            { x: 300, y: 70,  hp: 95,  speed: 1.7, weaponKey: 'mac10' },
            { x: 660, y: 70,  hp: 95,  speed: 1.7, weaponKey: 'mac10' }
        ],
        hostages: [
            { x: 240, y: 70 },
            { x: 480, y: 280 },
            { x: 720, y: 70 },
            { x: 90,  y: 80 },
            { x: 870, y: 80 }
        ]
    }
];

let currentLevelIndex = 0;
let gameState = 'menu'; // 'menu', 'playing', 'level_complete', 'won', 'lost'
let rescuedCount = 0;
let totalHostages = 3;
let screenShake = 0;
let walkCycle = 0;

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

const player = {
    x: 80, y: 80, radius: 17, speed: 3.7, hp: 100, angle: 0,
    inventory: [null, null],
    activeSlot: 0,
    grenades: 2,
    reloading: false,
    lastShot: 0
};

let rescueZone = {};
let walls = [];
let terrorists = [];
let hostages = [];
let bullets = [];
let grenades = [];
let explosions = [];
let droppedItems = [];
let particles = [];
let muzzleFlashes = [];
let bloodDecals = [];

function createWeaponInstance(key) {
    const base = WEAPONS[key];
    return { key, ...base, ammo: base.magSize, reserve: base.reserve };
}

function loadLevel(index) {
    currentLevelIndex = index;
    const lvl = LEVELS[index];

    player.x = lvl.spawn.x;
    player.y = lvl.spawn.y;
    player.hp = Math.min(100, player.hp + 35); // Recupera salud entre niveles
    player.grenades = Math.max(player.grenades, 2);
    player.reloading = false;

    rescueZone = { ...lvl.rescueZone };
    walls = lvl.walls.map(w => ({ ...w }));
    terrorists = lvl.terrorists.map(t => ({
        ...t,
        radius: 17,
        cooldown: 30,
        angle: Math.PI,
        walkPhase: Math.random() * 6
    }));
    hostages = lvl.hostages.map(h => ({
        ...h,
        radius: 15,
        following: false,
        rescued: false,
        angle: Math.PI / 2,
        walkPhase: 0
    }));

    rescuedCount = 0;
    totalHostages = hostages.length;
    bullets = [];
    grenades = [];
    explosions = [];
    droppedItems = [];
    particles = [];
    muzzleFlashes = [];
    bloodDecals = [];

    gameState = 'playing';
    updateHUD();
}

function selectLoadout(primaryKey) {
    AudioSys.init();
    AudioSys.playReload();
    player.inventory[0] = createWeaponInstance(primaryKey);
    player.inventory[1] = createWeaponInstance('usp');
    player.activeSlot = 0;
    player.hp = 100;
    player.grenades = 2;
    document.getElementById('loadout-screen').style.display = 'none';
    loadLevel(0);
}

function updateHUD() {
    const w = player.inventory[player.activeSlot];
    levelNumEl.innerText = `${currentLevelIndex + 1} / ${LEVELS.length}`;
    hpEl.innerText = Math.max(0, player.hp);
    weaponNameEl.innerText = w ? w.name : 'Ninguna';
    ammoEl.innerText = player.reloading ? '...' : (w ? w.ammo : 0);
    reserveEl.innerText = w ? w.reserve : 0;
    grenadesEl.innerText = player.grenades;
    rescuedEl.innerText = rescuedCount;
    totalHostagesEl.innerText = totalHostages;
    enemiesEl.innerText = terrorists.length;
}

// ==========================================
// EFECTOS VISUALES
// ==========================================
function spawnParticles(x, y, color, count, speedMax = 4) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * speedMax + 1;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            size: Math.random() * 3 + 1.5,
            life: 1.0,
            decay: Math.random() * 0.04 + 0.03
        });
    }
}

function addMuzzleFlash(x, y, angle, dist = 28, size = 14) {
    muzzleFlashes.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        angle,
        size,
        life: 3
    });
}

// ==========================================
// CONTROLES
// ==========================================
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Enter') {
        if (gameState === 'level_complete') loadLevel(currentLevelIndex + 1);
        else if (gameState === 'won' || gameState === 'lost') location.reload();
        return;
    }
    if (gameState !== 'playing') return;
    if (e.code === 'Digit1' && player.inventory[0]) { player.activeSlot = 0; player.reloading = false; AudioSys.playReload(); updateHUD(); }
    if (e.code === 'Digit2' && player.inventory[1]) { player.activeSlot = 1; player.reloading = false; AudioSys.playReload(); updateHUD(); }
    if (e.code === 'KeyR') reload();
    if (e.code === 'KeyG') throwGrenade();
    if (e.code === 'KeyE') pickupNearbyItem();
});
window.addEventListener('keyup', e => keys[e.code] = false);

canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', e => {
    if (gameState !== 'playing') return;
    if (e.button === 0) {
        mouse.down = true;
        tryShootPlayer();
    } else if (e.button === 2) {
        throwGrenade();
    }
});
window.addEventListener('mouseup', () => mouse.down = false);
canvas.addEventListener('contextmenu', e => e.preventDefault());

function reload() {
    const w = player.inventory[player.activeSlot];
    if (!w || player.reloading || w.ammo === w.magSize || w.reserve <= 0) return;
    player.reloading = true;
    AudioSys.playReload();
    updateHUD();
    setTimeout(() => {
        if (!player.reloading) return;
        const needed = w.magSize - w.ammo;
        const toLoad = Math.min(needed, w.reserve);
        w.ammo += toLoad;
        w.reserve -= toLoad;
        player.reloading = false;
        updateHUD();
    }, 1050);
}

function tryShootPlayer() {
    const w = player.inventory[player.activeSlot];
    if (!w || player.reloading) return;
    const now = Date.now();
    if (now - player.lastShot < w.fireRate) return;

    if (w.ammo <= 0) {
        AudioSys.playEmptyClick();
        if (w.reserve > 0) reload();
        return;
    }

    w.ammo--;
    player.lastShot = now;
    AudioSys.playShoot(w.key);
    addMuzzleFlash(player.x, player.y, player.angle, 16 + w.length, w.key === 'awp' ? 22 : 14);
    if (w.key === 'awp' || w.key === 'nova') screenShake = 5;

    spawnProjectiles(player.x, player.y, player.angle, w, 'ct');
    updateHUD();
    if (w.ammo === 0 && w.reserve > 0) reload();
}

function spawnProjectiles(x, y, baseAngle, weapon, team) {
    spawnParticles(x, y, '#eab308', 1, 2.5);
    const barrelDist = 14 + (weapon.length || 18);

    for (let i = 0; i < weapon.pellets; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * weapon.spread;
        bullets.push({
            x: x + Math.cos(angle) * barrelDist,
            y: y + Math.sin(angle) * barrelDist,
            prevX: x + Math.cos(angle) * barrelDist,
            prevY: y + Math.sin(angle) * barrelDist,
            vx: Math.cos(angle) * weapon.speed,
            vy: Math.sin(angle) * weapon.speed,
            damage: weapon.damage,
            explosive: weapon.explosive || false,
            team
        });
    }
}

function throwGrenade() {
    if (player.grenades <= 0) return;
    player.grenades--;
    AudioSys.playReload();
    updateHUD();
    grenades.push({
        x: player.x + Math.cos(player.angle) * 22,
        y: player.y + Math.sin(player.angle) * 22,
        vx: Math.cos(player.angle) * 8,
        vy: Math.sin(player.angle) * 8,
        timer: 90
    });
}

function createExplosion(x, y, radius, maxDamage) {
    AudioSys.playExplosion();
    screenShake = 15;
    explosions.push({ x, y, radius, alpha: 1 });
    spawnParticles(x, y, '#f97316', 28, 7);
    spawnParticles(x, y, '#facc15', 16, 5);
    spawnParticles(x, y, '#64748b', 16, 4);

    for (let j = terrorists.length - 1; j >= 0; j--) {
        let t = terrorists[j];
        let dist = Math.hypot(t.x - x, t.y - y);
        if (dist <= radius) {
            t.hp -= maxDamage * (1 - dist / (radius * 1.2));
            if (t.hp <= 0) killTerrorist(j);
        }
    }

    let distPlayer = Math.hypot(player.x - x, player.y - y);
    if (distPlayer <= radius) {
        player.hp -= Math.round((maxDamage * 0.6) * (1 - distPlayer / radius));
        updateHUD();
        if (player.hp <= 0) gameState = 'lost';
    }
}

function checkLevelCompletion() {
    if (rescuedCount >= totalHostages) {
        AudioSys.playLevelUp();
        if (currentLevelIndex + 1 < LEVELS.length) {
            gameState = 'level_complete';
        } else {
            gameState = 'won';
        }
    }
}

function killTerrorist(index) {
    const t = terrorists[index];
    bloodDecals.push({ x: t.x, y: t.y, radius: 18 + Math.random() * 8 });
    spawnParticles(t.x, t.y, '#dc2626', 18, 4.5);

    droppedItems.push({
        x: t.x - 10, y: t.y,
        type: 'weapon',
        weapon: createWeaponInstance(t.weaponKey)
    });
    droppedItems.push({
        x: t.x + 12, y: t.y + 8,
        type: Math.random() < 0.35 ? 'grenade' : 'ammo'
    });
    terrorists.splice(index, 1);
    updateHUD();
}

function pickupNearbyItem() {
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        const item = droppedItems[i];
        if (Math.hypot(player.x - item.x, player.y - item.y) < 42) {
            AudioSys.playPickup();
            if (item.type === 'weapon') {
                const oldWeapon = player.inventory[0];
                player.inventory[0] = item.weapon;
                player.activeSlot = 0;
                player.reloading = false;
                if (oldWeapon) item.weapon = oldWeapon;
                else droppedItems.splice(i, 1);
            } else if (item.type === 'ammo') {
                player.inventory.forEach(w => { if (w) w.reserve += w.magSize; });
                droppedItems.splice(i, 1);
            } else if (item.type === 'grenade') {
                player.grenades++;
                droppedItems.splice(i, 1);
            }
            updateHUD();
            break;
        }
    }
}

function checkWallCollision(circle, nextX, nextY) {
    if (nextX - circle.radius < 0 || nextX + circle.radius > canvas.width ||
        nextY - circle.radius < 0 || nextY + circle.radius > canvas.height) return true;
    for (let w of walls) {
        let closestX = Math.max(w.x, Math.min(nextX, w.x + w.width));
        let closestY = Math.max(w.y, Math.min(nextY, w.y + w.height));
        let dx = nextX - closestX;
        let dy = nextY - closestY;
        if ((dx * dx + dy * dy) < (circle.radius * circle.radius)) return true;
    }
    return false;
}

function hasLineOfSight(x1, y1, x2, y2) {
    const steps = 32;
    for (let i = 1; i < steps; i++) {
        let checkX = x1 + (x2 - x1) * (i / steps);
        let checkY = y1 + (y2 - y1) * (i / steps);
        for (let w of walls) {
            if (checkX > w.x && checkX < w.x + w.width && checkY > w.y && checkY < w.y + w.height) return false;
        }
    }
    return true;
}

// ==========================================
// BUCLE DE ACTUALIZACIÓN
// ==========================================
function update() {
    if (gameState !== 'playing') return;

    if (screenShake > 0) screenShake *= 0.85;
    if (screenShake < 0.3) screenShake = 0;

    const currentWeapon = player.inventory[player.activeSlot];
    if (mouse.down && currentWeapon && currentWeapon.auto) tryShootPlayer();

    // Movimiento jugador
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    if (dx !== 0 || dy !== 0) {
        let len = Math.hypot(dx, dy);
        dx = (dx / len) * player.speed;
        dy = (dy / len) * player.speed;
        if (!checkWallCollision(player, player.x + dx, player.y)) player.x += dx;
        if (!checkWallCollision(player, player.x, player.y + dy)) player.y += dy;
        walkCycle += 0.25;
    }
    player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    // Recolección automática de cajas
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        const item = droppedItems[i];
        if (item.type !== 'weapon' && Math.hypot(player.x - item.x, player.y - item.y) < 28) {
            AudioSys.playPickup();
            if (item.type === 'ammo') player.inventory.forEach(w => { if (w) w.reserve += w.magSize; });
            if (item.type === 'grenade') player.grenades++;
            droppedItems.splice(i, 1);
            updateHUD();
        }
    }

    // Rehenes
    hostages.forEach(h => {
        if (h.rescued) return;
        let dist = Math.hypot(player.x - h.x, player.y - h.y);
        if (dist < 46 && !h.following) {
            h.following = true;
            AudioSys.playPickup();
        }
        if (h.following && dist > 38) {
            let angle = Math.atan2(player.y - h.y, player.x - h.x);
            h.angle = angle;
            h.walkPhase += 0.22;
            let nextX = h.x + Math.cos(angle) * (player.speed * 0.92);
            let nextY = h.y + Math.sin(angle) * (player.speed * 0.92);
            if (!checkWallCollision(h, nextX, h.y)) h.x = nextX;
            if (!checkWallCollision(h, h.x, nextY)) h.y = nextY;
        }
        if (h.x > rescueZone.x && h.x < rescueZone.x + rescueZone.width &&
            h.y > rescueZone.y && h.y < rescueZone.y + rescueZone.height) {
            h.rescued = true;
            h.following = false;
            rescuedCount++;
            AudioSys.playLevelUp();
            updateHUD();
            checkLevelCompletion();
        }
    });

    // IA Terroristas
    terrorists.forEach(t => {
        let dist = Math.hypot(player.x - t.x, player.y - t.y);
        let canSee = dist < 470 && hasLineOfSight(t.x, t.y, player.x, player.y);
        if (canSee) {
            t.angle = Math.atan2(player.y - t.y, player.x - t.x);
            if (dist > 190) {
                t.walkPhase += 0.16;
                let nextX = t.x + Math.cos(t.angle) * t.speed;
                let nextY = t.y + Math.sin(t.angle) * t.speed;
                if (!checkWallCollision(t, nextX, t.y)) t.x = nextX;
                if (!checkWallCollision(t, t.x, nextY)) t.y = nextY;
            }
            if (t.cooldown <= 0) {
                const tWeapon = WEAPONS[t.weaponKey];
                AudioSys.playShoot(t.weaponKey);
                addMuzzleFlash(t.x, t.y, t.angle, 14 + tWeapon.length, 12);
                spawnProjectiles(t.x, t.y, t.angle, tWeapon, 't');
                t.cooldown = Math.max(25, Math.round(tWeapon.fireRate / 10));
            }
        }
        if (t.cooldown > 0) t.cooldown--;
    });

    // Granadas
    for (let i = grenades.length - 1; i >= 0; i--) {
        let g = grenades[i];
        if (checkWallCollision({ radius: 6 }, g.x + g.vx, g.y)) g.vx *= -0.6;
        if (checkWallCollision({ radius: 6 }, g.x, g.y + g.vy)) g.vy *= -0.6;
        g.x += g.vx; g.y += g.vy;
        g.vx *= 0.94; g.vy *= 0.94;
        g.timer--;
        if (g.timer <= 0) {
            createExplosion(g.x, g.y, 125, 145);
            grenades.splice(i, 1);
        }
    }

    // Balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.prevX = b.x; b.prevY = b.y;
        b.x += b.vx; b.y += b.vy;

        if (b.explosive) spawnParticles(b.x, b.y, '#cbd5e1', 1, 1);

        let hitWall = b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height;
        for (let w of walls) {
            if (b.x > w.x && b.x < w.x + w.width && b.y > w.y && b.y < w.y + w.height) hitWall = true;
        }
        if (hitWall) {
            spawnParticles(b.x, b.y, '#fde047', 6, 3.5);
            if (b.explosive) createExplosion(b.x, b.y, 100, 110);
            bullets.splice(i, 1);
            continue;
        }

        if (b.team === 'ct') {
            for (let j = terrorists.length - 1; j >= 0; j--) {
                let t = terrorists[j];
                if (Math.hypot(b.x - t.x, b.y - t.y) < t.radius) {
                    spawnParticles(b.x, b.y, '#ef4444', 7, 3);
                    if (b.explosive) createExplosion(b.x, b.y, 100, 120);
                    else {
                        t.hp -= b.damage;
                        if (t.hp <= 0) killTerrorist(j);
                    }
                    bullets.splice(i, 1);
                    break;
                }
            }
        } else if (b.team === 't') {
            if (Math.hypot(b.x - player.x, b.y - player.y) < player.radius) {
                spawnParticles(b.x, b.y, '#ef4444', 7, 3);
                screenShake = 4;
                if (b.explosive) createExplosion(b.x, b.y, 90, 65);
                else {
                    player.hp -= Math.round(b.damage * 0.45);
                    updateHUD();
                    if (player.hp <= 0) gameState = 'lost';
                }
                bullets.splice(i, 1);
            }
        }
    }

    // Partículas y explosiones
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.92; p.vy *= 0.92;
        p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        muzzleFlashes[i].life--;
        if (muzzleFlashes[i].life <= 0) muzzleFlashes.splice(i, 1);
    }
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].alpha -= 0.045;
        if (explosions[i].alpha <= 0) explosions.splice(i, 1);
    }
}

// ==========================================
// DIBUJO REALISTA DE PERSONAJES (VISTA CENITAL)
// ==========================================
function drawSoldier(x, y, angle, walkPhase, isCT, weapon) {
    ctx.save();
    ctx.translate(x, y);

    // Sombra realista proyectada en el suelo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(4, 6, 16, 13, angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(angle);

    // Botas / Pies alternando al caminar
    const footOffset = Math.sin(walkPhase) * 6;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(footOffset, -8, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(-footOffset, 8, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Torso y hombros (Uniforme táctico CT azul marino vs Terrorista oliva/marrón)
    ctx.fillStyle = isCT ? '#1e3a8a' : '#7f1d1d';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-8, -15, 16, 30, 7);
    ctx.fill();
    ctx.stroke();

    // Chaleco antibalas / Mochila trasera
    ctx.fillStyle = isCT ? '#172554' : '#451a03';
    ctx.fillRect(-10, -10, 12, 20);

    // Arma sostenida con ambas manos
    if (weapon) {
        // Cañón y cuerpo del arma
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, -2.5, weapon.length, 5);
        // Detalle metálico o mira según el arma
        ctx.fillStyle = weapon.color;
        ctx.fillRect(8, -1.5, weapon.length * 0.45, 3);

        // Brazo izquierdo (sosteniendo el guardamanos delantero)
        ctx.strokeStyle = isCT ? '#2563eb' : '#b91c1c';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2, -12);
        ctx.lineTo(14, -2);
        ctx.stroke();

        // Brazo derecho (en el gatillo)
        ctx.beginPath();
        ctx.moveTo(2, 12);
        ctx.lineTo(8, 2);
        ctx.stroke();

        // Guantes tácticos
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(14, -2, 3, 0, Math.PI * 2);
        ctx.arc(8, 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // Cabeza (Casco Kevlar CT con visor vs Pasamontañas Terrorista)
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = isCT ? '#1d4ed8' : '#292524';
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (isCT) {
        // Gafas tácticas azuladas
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(6, -5, 3, 10);
    } else {
        // Banda roja en la cabeza del terrorista
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-2, -9, 4, 18);
    }

    ctx.restore();
}

function drawHostage(h) {
    ctx.save();
    ctx.translate(h.x, h.y);

    // Sombra
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 14, 11, h.angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(h.angle);

    // Pies
    const footOffset = h.following ? Math.sin(h.walkPhase) * 5 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(footOffset, -7, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(-footOffset, 7, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Camisa civil (Amarilla si espera rescate, Celeste si te sigue)
    ctx.fillStyle = h.following ? '#0284c7' : '#eab308';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-7, -13, 14, 26, 6);
    ctx.fill();
    ctx.stroke();

    // Manos al frente (esposadas)
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(9, -3, 3, 0, Math.PI * 2);
    ctx.arc(9, 3, 3, 0, Math.PI * 2);
    ctx.fill();

    // Cabeza
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fed7aa';
    ctx.fill();
    ctx.stroke();

    // Cabello
    ctx.beginPath();
    ctx.arc(-2, 0, 8.5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fillStyle = '#451a03';
    ctx.fill();

    ctx.restore();
}

// ==========================================
// RENDERIZADO DEL MAPA Y ESCENARIO
// ==========================================
function draw() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    const lvl = LEVELS[currentLevelIndex];
    ctx.fillStyle = lvl ? lvl.floorColor : '#262930';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Baldosas de concreto industriales
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Zona Segura de Extracción (Helipuerto / Punto táctico)
    if (gameState !== 'menu') {
        ctx.fillStyle = 'rgba(34, 197, 94, 0.15)';
        ctx.fillRect(rescueZone.x, rescueZone.y, rescueZone.width, rescueZone.height);
        ctx.setLineDash([8, 6]);
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(rescueZone.x, rescueZone.y, rescueZone.width, rescueZone.height);
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(34, 197, 94, 0.85)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PUNTO DE EXTRACCIÓN', rescueZone.x + rescueZone.width / 2, rescueZone.y + rescueZone.height / 2);
        ctx.textAlign = 'left';
    }

    // Manchas de sangre en el suelo
    bloodDecals.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(127, 29, 29, 0.6)';
        ctx.fill();
    });

    // Muros de concreto y cajas de madera con sombra 3D
    walls.forEach(w => {
        // Sombra proyectada
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(w.x + 6, w.y + 6, w.width, w.height);

        if (w.type === 'crate') {
            // Caja militar de madera
            ctx.fillStyle = '#78350f';
            ctx.fillRect(w.x, w.y, w.width, w.height);
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 3;
            ctx.strokeRect(w.x, w.y, w.width, w.height);
            // Cruz diagonal de refuerzo
            ctx.beginPath();
            ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + w.width, w.y + w.height);
            ctx.moveTo(w.x + w.width, w.y); ctx.lineTo(w.x, w.y + w.height);
            ctx.stroke();
        } else {
            // Muro reforzado con borde superior iluminado
            ctx.fillStyle = '#475569';
            ctx.fillRect(w.x, w.y, w.width, w.height);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(w.x, w.y, w.width, 4);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, w.y, w.width, w.height);
        }
    });

    // Objetos caídos (Loot)
    droppedItems.forEach(item => {
        if (item.type === 'weapon') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(item.x - 12, item.y - 3, 24, 6);
            ctx.fillStyle = item.weapon.color;
            ctx.fillRect(item.x - 8, item.y - 2, 14, 4);
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`[E] ${item.weapon.name}`, item.x - 24, item.y - 9);
        } else if (item.type === 'ammo') {
            ctx.fillStyle = '#ca8a04';
            ctx.fillRect(item.x - 7, item.y - 5, 14, 10);
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1;
            ctx.strokeRect(item.x - 7, item.y - 5, 14, 10);
        } else if (item.type === 'grenade') {
            ctx.beginPath();
            ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#15803d';
            ctx.fill();
            ctx.strokeStyle = '#86efac';
            ctx.stroke();
        }
    });

    // Rehenes
    hostages.forEach(h => {
        if (!h.rescued) drawHostage(h);
    });

    // Terroristas
    terrorists.forEach(t => {
        drawSoldier(t.x, t.y, t.angle, t.walkPhase, false, WEAPONS[t.weaponKey]);
        // Barra de vida sutil sobre el enemigo
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(t.x - 15, t.y - 25, 30, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(t.x - 15, t.y - 25, Math.max(0, (t.hp / 110) * 30), 4);
    });

    // Jugador CT
    if (gameState !== 'menu') {
        const w = player.inventory[player.activeSlot];
        drawSoldier(player.x, player.y, player.angle, walkCycle, true, w);
    }

    // Fogonazos
    muzzleFlashes.forEach(mf => {
        ctx.save();
        ctx.translate(mf.x, mf.y);
        ctx.rotate(mf.angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(mf.size, -mf.size * 0.45);
        ctx.lineTo(mf.size * 0.7, 0);
        ctx.lineTo(mf.size, mf.size * 0.45);
        ctx.closePath();
        ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
        ctx.fill();
        ctx.restore();
    });

    // Balas
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.moveTo(b.prevX, b.prevY);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = b.explosive ? '#c084fc' : (b.team === 'ct' ? '#fef08a' : '#fb923c');
        ctx.lineWidth = b.explosive ? 4 : 2.5;
        ctx.stroke();
    });

    // Granadas
    grenades.forEach(g => {
        ctx.beginPath();
        ctx.arc(g.x, g.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#16a34a';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.stroke();
    });

    // Partículas
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // Explosiones
    explosions.forEach(ex => {
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${ex.alpha * 0.55})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius * (1.2 - ex.alpha * 0.4), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(254, 240, 138, ${ex.alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    });

    ctx.restore();

    // Banner superior con el nombre del nivel
    if (gameState === 'playing' && lvl) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(canvas.width / 2 - 150, 8, 300, 24);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(lvl.name, canvas.width / 2, 24);
        ctx.textAlign = 'left';
    }

    // Pantallas de transición entre niveles y victoria/derrota
    if (gameState === 'level_complete' || gameState === 'won' || gameState === 'lost') {
        ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px sans-serif';

        if (gameState === 'level_complete') {
            ctx.fillStyle = '#facc15';
            ctx.fillText(`¡${LEVELS[currentLevelIndex].name} COMPLETADO!`, canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#38bdf8';
            ctx.font = '20px sans-serif';
            ctx.fillText('Presiona ENTER para avanzar al siguiente nivel (+35 HP)', canvas.width / 2, canvas.height / 2 + 25);
        } else if (gameState === 'won') {
            ctx.fillStyle = '#38bdf8';
            ctx.fillText('¡MISIÓN CUMPLIDA! TODOS LOS NIVELES SUPERADOS', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '18px sans-serif';
            ctx.fillText('Presiona ENTER para volver a jugar', canvas.width / 2, canvas.height / 2 + 25);
        } else {
            ctx.fillStyle = '#ef4444';
            ctx.fillText('TERRORISTS WIN - HAS CAÍDO EN COMBATE', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '18px sans-serif';
            ctx.fillText('Presiona ENTER para reintentar', canvas.width / 2, canvas.height / 2 + 25);
        }
        ctx.textAlign = 'left';
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();