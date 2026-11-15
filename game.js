const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Dimensiones del Mundo Abierto
const WORLD_WIDTH = 3200;
const WORLD_HEIGHT = 3200;

// Cámara con seguimiento suave
const camera = { x: 0, y: 0 };

// Referencias UI
const moneyEl = document.getElementById('money');
const hpEl = document.getElementById('hp');
const weaponNameEl = document.getElementById('weapon-name');
const ammoEl = document.getElementById('ammo');
const reserveEl = document.getElementById('reserve');
const grenadesEl = document.getElementById('grenades');
const rescuedEl = document.getElementById('rescued');
const killsEl = document.getElementById('kills');

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
        const duration = weaponKey === 'awp' ? 0.45 : (weaponKey === 'nova' ? 0.35 : 0.13);
        noise.buffer = this.createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(weaponKey === 'm4a1' ? 1400 : (weaponKey === 'awp' ? 2800 : 2100), now);
        filter.frequency.exponentialRampToValueAtTime(120, now + duration);

        const gain = this.ctx.createGain();
        const vol = weaponKey === 'awp' ? 0.4 : (weaponKey === 'minigun' ? 0.16 : 0.25);
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

    playCash() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [659.25, 987.77].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);
            gain.gain.setValueAtTime(0.18, now + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.22);
        });
    }
};

function toggleMute() {
    AudioSys.muted = !AudioSys.muted;
    document.getElementById('mute-btn').innerText = AudioSys.muted ? '🔇 Mute' : '🔊 Audio';
}

// ==========================================
// CATÁLOGO DE ARMAS
// ==========================================
const WEAPONS = {
    usp:     { name: 'USP-S',        damage: 24,  magSize: 12,  reserve: 60,  fireRate: 220,  speed: 14, spread: 0.04, pellets: 1, auto: false, length: 14, color: '#94a3b8' },
    m4a1:    { name: 'M4A1-S',       damage: 28,  magSize: 30,  reserve: 120, fireRate: 110,  speed: 16, spread: 0.05, pellets: 1, auto: true,  length: 24, color: '#38bdf8' },
    nova:    { name: 'Nova',         damage: 19,  magSize: 8,   reserve: 32,  fireRate: 700,  speed: 13, spread: 0.28, pellets: 6, auto: false, length: 22, color: '#fb923c' },
    awp:     { name: 'AWP',          damage: 140, magSize: 5,   reserve: 20,  fireRate: 1050, speed: 24, spread: 0.01, pellets: 1, auto: false, length: 30, color: '#22c55e' },
    ak47:    { name: 'AK-47',        damage: 35,  magSize: 30,  reserve: 120, fireRate: 125,  speed: 15, spread: 0.08, pellets: 1, auto: true,  length: 23, color: '#ef4444' },
    mac10:   { name: 'MAC-10',       damage: 16,  magSize: 32,  reserve: 128, fireRate: 75,   speed: 13, spread: 0.15, pellets: 1, auto: true,  length: 15, color: '#facc15' },
    minigun: { name: 'Minigun M134', damage: 22,  magSize: 150, reserve: 300, fireRate: 45,   speed: 17, spread: 0.14, pellets: 1, auto: true,  length: 28, color: '#f43f5e' },
    rpg:     { name: 'Lanzacohetes', damage: 160, magSize: 1,   reserve: 5,   fireRate: 1100, speed: 11, spread: 0.02, pellets: 1, auto: false, length: 28, explosive: true, color: '#a855f7' }
};

// ==========================================
// CONSTRUCCIÓN DEL MUNDO ABIERTO (3200x3200)
// ==========================================
const baseZone = { x: 180, y: 180, width: 340, height: 340, label: 'BASE ALIADA (TIENDA [B])' };

// Zonas temáticas del mapa
const mapSectors = [
    { x: 100,  y: 100,  w: 600,  h: 600,  color: '#1e293b', name: 'SECTOR 1: BASE DE OPERACIONES' },
    { x: 1100, y: 200,  w: 950,  h: 850,  color: '#292524', name: 'SECTOR 2: PUEBLO ABANDONADO' },
    { x: 300,  y: 1300, w: 1050, h: 950,  color: '#1f2421', name: 'SECTOR 3: CAMPAMENTO DE LA SELVA' },
    { x: 1950, y: 1750, w: 1050, h: 1150, color: '#27272a', name: 'SECTOR 4: FORTALEZA DEL NORTE' }
];

// Carreteras de asfalto conectando los sectores
const roads = [
    { x: 520,  y: 310,  w: 850, h: 90 },
    { x: 1300, y: 310,  w: 90,  h: 450 },
    { x: 310,  y: 520,  w: 90,  h: 1100 },
    { x: 310,  y: 1550, w: 1950, h: 90 },
    { x: 2200, y: 1550, w: 90,  h: 650 }
];

// Estructuras, edificios y coberturas del mundo abierto
const walls = [
    // Perímetro exterior de la Base Aliada (con entradas sur y este)
    { x: 160, y: 160, width: 380, height: 24, type: 'wall' },
    { x: 160, y: 160, width: 24,  height: 380, type: 'wall' },
    { x: 516, y: 160, width: 24,  height: 130, type: 'wall' },
    { x: 516, y: 420, width: 24,  height: 120, type: 'wall' },
    { x: 160, y: 516, width: 130, height: 24, type: 'wall' },
    { x: 420, y: 516, width: 120, height: 24, type: 'wall' },

    // Edificios Sector 2 (Pueblo Abandonado)
    { x: 1200, y: 280, width: 260, height: 28, type: 'wall' },
    { x: 1200, y: 280, width: 28,  height: 220, type: 'wall' },
    { x: 1432, y: 280, width: 28,  height: 220, type: 'wall' },
    { x: 1620, y: 580, width: 300, height: 28, type: 'wall' },
    { x: 1620, y: 820, width: 300, height: 28, type: 'wall' },
    { x: 1892, y: 580, width: 28,  height: 268, type: 'wall' },
    { x: 1320, y: 650, width: 65,  height: 65, type: 'crate' },
    { x: 1520, y: 400, width: 65,  height: 65, type: 'crate' },

    // Sector 3 (Campamento)
    { x: 480,  y: 1420, width: 320, height: 28, type: 'wall' },
    { x: 480,  y: 1720, width: 320, height: 28, type: 'wall' },
    { x: 960,  y: 1450, width: 28,  height: 380, type: 'wall' },
    { x: 600,  y: 1550, width: 65,  height: 65, type: 'crate' },
    { x: 820,  y: 1850, width: 65,  height: 65, type: 'crate' },
    { x: 1120, y: 1700, width: 65,  height: 65, type: 'crate' },

    // Sector 4 (Fortaleza del Norte)
    { x: 2050, y: 1880, width: 360, height: 32, type: 'wall' },
    { x: 2550, y: 1880, width: 360, height: 32, type: 'wall' },
    { x: 2050, y: 1880, width: 32,  height: 550, type: 'wall' },
    { x: 2878, y: 1880, width: 32,  height: 550, type: 'wall' },
    { x: 2050, y: 2650, width: 860, height: 32, type: 'wall' },
    { x: 2430, y: 2220, width: 80,  height: 80, type: 'crate' },
    { x: 2220, y: 2450, width: 70,  height: 70, type: 'crate' },
    { x: 2660, y: 2450, width: 70,  height: 70, type: 'crate' }
];

// Puntos de aparición de campamentos enemigos y rehenes en el mundo
const CAMP_SPAWNS = [
    { x: 1330, y: 380, weapon: 'mac10', hasHostage: true },
    { x: 1760, y: 700, weapon: 'ak47',  hasHostage: true },
    { x: 1500, y: 920, weapon: 'nova',  hasHostage: false },
    { x: 640,  y: 1580, weapon: 'ak47', hasHostage: true },
    { x: 1080, y: 1620, weapon: 'nova', hasHostage: false },
    { x: 750,  y: 2050, weapon: 'mac10', hasHostage: true },
    { x: 2250, y: 2050, weapon: 'ak47', hasHostage: true },
    { x: 2680, y: 2050, weapon: 'rpg',  hasHostage: false },
    { x: 2480, y: 2520, weapon: 'ak47', hasHostage: true },
    { x: 2750, y: 2350, weapon: 'nova', hasHostage: true }
];

// Estado global
let gameState = 'menu'; // 'menu', 'playing', 'shop', 'lost'
let money = 500;
let rescuedCount = 0;
let totalKills = 0;
let screenShake = 0;
let walkCycle = 0;
let spawnTimer = 0;

const keys = {};
const mouse = { screenX: canvas.width / 2, screenY: canvas.height / 2, worldX: 0, worldY: 0, down: false };

const player = {
    x: 340, y: 340, radius: 17, speed: 4.1, hp: 100, angle: 0,
    inventory: [null, null],
    activeSlot: 0,
    grenades: 2,
    reloading: false,
    lastShot: 0
};

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

function populateWorld() {
    CAMP_SPAWNS.forEach(camp => {
        // Evitar duplicar si ya hay un enemigo o rehén muy cerca
        const enemyNear = terrorists.some(t => Math.hypot(t.x - camp.x, t.y - camp.y) < 180);
        if (!enemyNear) {
            terrorists.push({
                x: camp.x,
                y: camp.y,
                homeX: camp.x,
                homeY: camp.y,
                radius: 17,
                hp: camp.weapon === 'rpg' ? 120 : 90,
                speed: 1.65,
                cooldown: 30,
                angle: Math.random() * Math.PI * 2,
                walkPhase: Math.random() * 6,
                weaponKey: camp.weapon
            });
        }
        if (camp.hasHostage) {
            const hostageNear = hostages.some(h => Math.hypot(h.x - (camp.x + 45), h.y - (camp.y + 45)) < 150);
            if (!hostageNear) {
                hostages.push({
                    x: camp.x + 45,
                    y: camp.y + 45,
                    radius: 15,
                    following: false,
                    angle: Math.PI / 2,
                    walkPhase: 0
                });
            }
        }
    });
}

function selectLoadout(primaryKey) {
    AudioSys.init();
    AudioSys.playReload();
    player.inventory[0] = createWeaponInstance(primaryKey);
    player.inventory[1] = createWeaponInstance('usp');
    player.activeSlot = 0;
    money = primaryKey === 'nova' ? 600 : (primaryKey === 'm4a1' ? 500 : 400);
    player.hp = 100;
    player.grenades = 2;
    player.x = 340;
    player.y = 340;
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    terrorists = [];
    hostages = [];
    populateWorld();

    document.getElementById('loadout-screen').style.display = 'none';
    gameState = 'playing';
    updateHUD();
}

function isPlayerInBase() {
    return player.x > baseZone.x && player.x < baseZone.x + baseZone.width &&
           player.y > baseZone.y && player.y < baseZone.y + baseZone.height;
}

function toggleShop() {
    if (gameState !== 'playing' && gameState !== 'shop') return;
    const modal = document.getElementById('shop-modal');
    if (gameState === 'playing') {
        if (!isPlayerInBase()) {
            alert('Debes regresar a la BASE ALIADA (cuadro verde en el mapa) para abrir la tienda.');
            return;
        }
        gameState = 'shop';
        mouse.down = false;
        document.getElementById('shop-money').innerText = `$${money}`;
        modal.style.display = 'flex';
    } else {
        gameState = 'playing';
        modal.style.display = 'none';
    }
}

function buyItem(itemKey) {
    if (itemKey === 'medkit' && money >= 200 && player.hp < 100) {
        money -= 200; player.hp = Math.min(100, player.hp + 50); AudioSys.playCash();
    } else if (itemKey === 'ammo' && money >= 150) {
        money -= 150;
        player.inventory.forEach(w => { if (w) { w.ammo = w.magSize; w.reserve = w.reserve + w.magSize * 2; } });
        AudioSys.playCash();
    } else if (itemKey === 'grenade' && money >= 250) {
        money -= 250; player.grenades += 2; AudioSys.playCash();
    } else if (itemKey === 'ak47' && money >= 600) {
        money -= 600; player.inventory[0] = createWeaponInstance('ak47'); player.activeSlot = 0; AudioSys.playCash();
    } else if (itemKey === 'minigun' && money >= 1400) {
        money -= 1400; player.inventory[0] = createWeaponInstance('minigun'); player.activeSlot = 0; AudioSys.playCash();
    } else if (itemKey === 'rpg' && money >= 1800) {
        money -= 1800; player.inventory[0] = createWeaponInstance('rpg'); player.activeSlot = 0; AudioSys.playCash();
    }
    document.getElementById('shop-money').innerText = `$${money}`;
    updateHUD();
}

function updateHUD() {
    const w = player.inventory[player.activeSlot];
    moneyEl.innerText = money;
    hpEl.innerText = Math.max(0, player.hp);
    weaponNameEl.innerText = w ? w.name : 'Ninguna';
    ammoEl.innerText = player.reloading ? '...' : (w ? w.ammo : 0);
    reserveEl.innerText = w ? w.reserve : 0;
    grenadesEl.innerText = player.grenades;
    rescuedEl.innerText = rescuedCount;
    killsEl.innerText = totalKills;
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
    if (e.code === 'KeyB' || (e.code === 'Escape' && gameState === 'shop')) {
        toggleShop();
        return;
    }
    if (e.code === 'Enter' && gameState === 'lost') {
        location.reload();
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
    mouse.screenX = e.clientX - rect.left;
    mouse.screenY = e.clientY - rect.top;
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
    }, 1000);
}

function tryShootPlayer() {
    const w = player.inventory[player.activeSlot];
    if (!w || player.reloading) return;
    const now = Date.now();
    if (now - player.lastShot < w.fireRate) return;

    if (w.ammo <= 0) {
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
            team,
            life: 75
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
        vx: Math.cos(player.angle) * 8.5,
        vy: Math.sin(player.angle) * 8.5,
        timer: 85
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
        player.hp -= Math.round((maxDamage * 0.55) * (1 - distPlayer / radius));
        updateHUD();
        if (player.hp <= 0) gameState = 'lost';
    }
}

function killTerrorist(index) {
    const t = terrorists[index];
    bloodDecals.push({ x: t.x, y: t.y, radius: 18 + Math.random() * 8 });
    if (bloodDecals.length > 60) bloodDecals.shift();
    spawnParticles(t.x, t.y, '#dc2626', 18, 4.5);

    money += 120;
    totalKills++;

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
        if (Math.hypot(player.x - item.x, player.y - item.y) < 45) {
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
    if (nextX - circle.radius < 40 || nextX + circle.radius > WORLD_WIDTH - 40 ||
        nextY - circle.radius < 40 || nextY + circle.radius > WORLD_HEIGHT - 40) return true;
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
// BUCLE DE ACTUALIZACIÓN (MUNDO ABIERTO)
// ==========================================
function update() {
    if (gameState !== 'playing') return;

    // Reaparición periódica de patrullas lejanas en el mundo abierto
    spawnTimer++;
    if (spawnTimer > 900) {
        spawnTimer = 0;
        if (Math.hypot(player.x - 340, player.y - 340) > 700) {
            populateWorld();
        }
    }

    if (screenShake > 0) screenShake *= 0.85;
    if (screenShake < 0.3) screenShake = 0;

    // Coordenadas reales del mouse en el mundo
    mouse.worldX = mouse.screenX + camera.x;
    mouse.worldY = mouse.screenY + camera.y;

    const currentWeapon = player.inventory[player.activeSlot];
    if (mouse.down && currentWeapon && currentWeapon.auto) tryShootPlayer();

    // Movimiento del jugador
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
    player.angle = Math.atan2(mouse.worldY - player.y, mouse.worldX - player.x);

    // Actualizar cámara centrada en el jugador con límites del mundo
    const targetCamX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, player.x - canvas.width / 2));
    const targetCamY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, player.y - canvas.height / 2));
    camera.x += (targetCamX - camera.x) * 0.15;
    camera.y += (targetCamY - camera.y) * 0.15;

    // Recolección automática de cajas
    for (let i = droppedItems.length - 1; i >= 0; i--) {
        const item = droppedItems[i];
        if (item.type !== 'weapon' && Math.hypot(player.x - item.x, player.y - item.y) < 30) {
            AudioSys.playPickup();
            if (item.type === 'ammo') player.inventory.forEach(w => { if (w) w.reserve += w.magSize; });
            if (item.type === 'grenade') player.grenades++;
            droppedItems.splice(i, 1);
            updateHUD();
        }
    }

    // Rehenes en el mundo abierto
    for (let i = hostages.length - 1; i >= 0; i--) {
        let h = hostages[i];
        let dist = Math.hypot(player.x - h.x, player.y - h.y);
        if (dist < 48 && !h.following) {
            h.following = true;
            AudioSys.playPickup();
        }
        if (h.following && dist > 38) {
            let angle = Math.atan2(player.y - h.y, player.x - h.x);
            h.angle = angle;
            h.walkPhase += 0.22;
            let nextX = h.x + Math.cos(angle) * (player.speed * 0.94);
            let nextY = h.y + Math.sin(angle) * (player.speed * 0.94);
            if (!checkWallCollision(h, nextX, h.y)) h.x = nextX;
            if (!checkWallCollision(h, h.x, nextY)) h.y = nextY;
        }
        // Rescate al llegar a la Base Aliada
        if (h.x > baseZone.x && h.x < baseZone.x + baseZone.width &&
            h.y > baseZone.y && h.y < baseZone.y + baseZone.height) {
            rescuedCount++;
            money += 350;
            AudioSys.playCash();
            hostages.splice(i, 1);
            updateHUD();
        }
    }

    // IA Terroristas (solo se activan si están cerca de la cámara para optimizar rendimiento)
    terrorists.forEach(t => {
        let dist = Math.hypot(player.x - t.x, player.y - t.y);
        if (dist > 950) return;

        let canSee = dist < 520 && hasLineOfSight(t.x, t.y, player.x, player.y);
        if (canSee) {
            t.angle = Math.atan2(player.y - t.y, player.x - t.x);
            if (dist > 200) {
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
            createExplosion(g.x, g.y, 130, 150);
            grenades.splice(i, 1);
        }
    }

    // Balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.prevX = b.x; b.prevY = b.y;
        b.x += b.vx; b.y += b.vy;
        b.life--;

        if (b.explosive) spawnParticles(b.x, b.y, '#cbd5e1', 1, 1);

        let hitWall = b.life <= 0 || b.x < 40 || b.x > WORLD_WIDTH - 40 || b.y < 40 || b.y > WORLD_HEIGHT - 40;
        for (let w of walls) {
            if (b.x > w.x && b.x < w.x + w.width && b.y > w.y && b.y < w.y + w.height) hitWall = true;
        }
        if (hitWall) {
            if (b.life > 0) spawnParticles(b.x, b.y, '#fde047', 6, 3.5);
            if (b.explosive) createExplosion(b.x, b.y, 105, 115);
            bullets.splice(i, 1);
            continue;
        }

        if (b.team === 'ct') {
            for (let j = terrorists.length - 1; j >= 0; j--) {
                let t = terrorists[j];
                if (Math.hypot(b.x - t.x, b.y - t.y) < t.radius) {
                    spawnParticles(b.x, b.y, '#ef4444', 7, 3);
                    if (b.explosive) createExplosion(b.x, b.y, 105, 125);
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
                if (b.explosive) createExplosion(b.x, b.y, 90, 60);
                else {
                    player.hp -= Math.round(b.damage * 0.42);
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
// DIBUJO REALISTA DE PERSONAJES
// ==========================================
function drawSoldier(x, y, angle, walkPhase, isCT, weapon) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(4, 6, 16, 13, angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(angle);

    const footOffset = Math.sin(walkPhase) * 6;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(footOffset, -8, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.ellipse(-footOffset, 8, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isCT ? '#1e3a8a' : '#7f1d1d';
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-8, -15, 16, 30, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isCT ? '#172554' : '#451a03';
    ctx.fillRect(-10, -10, 12, 20);

    if (weapon) {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, -2.5, weapon.length, 5);
        ctx.fillStyle = weapon.color;
        ctx.fillRect(8, -1.5, weapon.length * 0.45, 3);

        ctx.strokeStyle = isCT ? '#2563eb' : '#b91c1c';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(2, -12); ctx.lineTo(14, -2);
        ctx.moveTo(2, 12);  ctx.lineTo(8, 2);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(14, -2, 3, 0, Math.PI * 2);
        ctx.arc(8, 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fillStyle = isCT ? '#1d4ed8' : '#292524';
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (isCT) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(6, -5, 3, 10);
    } else {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-2, -9, 4, 18);
    }

    ctx.restore();
}

function drawHostage(h) {
    ctx.save();
    ctx.translate(h.x, h.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(3, 5, 14, 11, h.angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(h.angle);

    const footOffset = h.following ? Math.sin(h.walkPhase) * 5 : 0;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(footOffset, -7, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(-footOffset, 7, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = h.following ? '#0284c7' : '#eab308';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-7, -13, 14, 26, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(9, -3, 3, 0, Math.PI * 2);
    ctx.arc(9, 3, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fed7aa';
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-2, 0, 8.5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fillStyle = '#451a03';
    ctx.fill();

    ctx.restore();
}

// ==========================================
// RENDERIZADO DEL MUNDO ABIERTO Y MINIMAPA
// ==========================================
function draw() {
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    // Trasladar el lienzo según la cámara del mundo
    ctx.translate(-camera.x, -camera.y);

    // Terreno base
    ctx.fillStyle = '#232823';
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Sectores temáticos
    mapSectors.forEach(s => {
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(s.name, s.x + 25, s.y + 35);
    });

    // Carreteras conectando el mundo abierto
    roads.forEach(r => {
        ctx.fillStyle = '#18181b';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([20, 20]);
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (r.w > r.h) {
            ctx.moveTo(r.x, r.y + r.h / 2);
            ctx.lineTo(r.x + r.w, r.y + r.h / 2);
        } else {
            ctx.moveTo(r.x + r.w / 2, r.y);
            ctx.lineTo(r.x + r.w / 2, r.y + r.h);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Cuadrícula táctica del terreno
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const startX = Math.floor(camera.x / 80) * 80;
    const startY = Math.floor(camera.y / 80) * 80;
    for (let x = startX; x < camera.x + canvas.width + 80; x += 80) {
        ctx.beginPath(); ctx.moveTo(x, camera.y); ctx.lineTo(x, camera.y + canvas.height); ctx.stroke();
    }
    for (let y = startY; y < camera.y + canvas.height + 80; y += 80) {
        ctx.beginPath(); ctx.moveTo(camera.x, y); ctx.lineTo(camera.x + canvas.width, y); ctx.stroke();
    }

    // Muros perimetrales del mundo abierto
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(40, 40, WORLD_WIDTH - 80, WORLD_HEIGHT - 80);

    // Base Aliada (Zona de Rescate + Tienda)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.16)';
    ctx.fillRect(baseZone.x, baseZone.y, baseZone.width, baseZone.height);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.strokeRect(baseZone.x, baseZone.y, baseZone.width, baseZone.height);
    ctx.setLineDash([]);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(baseZone.label, baseZone.x + baseZone.width / 2, baseZone.y + baseZone.height / 2);
    ctx.textAlign = 'left';

    // Manchas de sangre
    bloodDecals.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(127, 29, 29, 0.6)';
        ctx.fill();
    });

    // Edificios y cajas
    walls.forEach(w => {
        if (w.x + w.width < camera.x || w.x > camera.x + canvas.width ||
            w.y + w.height < camera.y || w.y > camera.y + canvas.height) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(w.x + 6, w.y + 6, w.width, w.height);

        if (w.type === 'crate') {
            ctx.fillStyle = '#78350f';
            ctx.fillRect(w.x, w.y, w.width, w.height);
            ctx.strokeStyle = '#451a03';
            ctx.lineWidth = 3;
            ctx.strokeRect(w.x, w.y, w.width, w.height);
            ctx.beginPath();
            ctx.moveTo(w.x, w.y); ctx.lineTo(w.x + w.width, w.y + w.height);
            ctx.moveTo(w.x + w.width, w.y); ctx.lineTo(w.x, w.y + w.height);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#475569';
            ctx.fillRect(w.x, w.y, w.width, w.height);
            ctx.fillStyle = '#64748b';
            ctx.fillRect(w.x, w.y, w.width, 4);
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 2;
            ctx.strokeRect(w.x, w.y, w.width, w.height);
        }
    });

    // Loot en el suelo
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
        } else if (item.type === 'grenade') {
            ctx.beginPath();
            ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#15803d';
            ctx.fill();
        }
    });

    // Rehenes
    hostages.forEach(h => drawHostage(h));

    // Terroristas
    terrorists.forEach(t => {
        drawSoldier(t.x, t.y, t.angle, t.walkPhase, false, WEAPONS[t.weaponKey]);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(t.x - 15, t.y - 25, 30, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(t.x - 15, t.y - 25, Math.max(0, (t.hp / 120) * 30), 4);
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

    // ==========================================
    // INTERFAZ FIJA EN PANTALLA (RADAR / MINIMAPA)
    // ==========================================
    if (gameState === 'playing' || gameState === 'shop') {
        const mapSize = 170;
        const mapX = canvas.width - mapSize - 15;
        const mapY = 15;
        const scale = mapSize / WORLD_WIDTH;

        // Fondo del radar
        ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
        ctx.fillRect(mapX, mapY, mapSize, mapSize);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);

        // Base Aliada en radar
        ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
        ctx.fillRect(mapX + baseZone.x * scale, mapY + baseZone.y * scale, baseZone.width * scale, baseZone.height * scale);

        // Muros en radar
        ctx.fillStyle = '#64748b';
        walls.forEach(w => {
            ctx.fillRect(mapX + w.x * scale, mapY + w.y * scale, Math.max(2, w.width * scale), Math.max(2, w.height * scale));
        });

        // Rehenes en radar (Amarillo)
        ctx.fillStyle = '#facc15';
        hostages.forEach(h => {
            ctx.beginPath();
            ctx.arc(mapX + h.x * scale, mapY + h.y * scale, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Terroristas en radar (Rojo)
        ctx.fillStyle = '#ef4444';
        terrorists.forEach(t => {
            ctx.beginPath();
            ctx.arc(mapX + t.x * scale, mapY + t.y * scale, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Jugador en radar (Blanco/Azul)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(mapX + player.x * scale, mapY + player.y * scale, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Aviso si estás dentro de la Base Aliada
        if (isPlayerInBase()) {
            ctx.fillStyle = 'rgba(22, 163, 74, 0.88)';
            ctx.fillRect(15, 15, 310, 30);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText('🛡️ ZONA SEGURA: Presiona [B] para abrir Tienda', 25, 35);
        }
    }

    // Pantalla de Derrota
    if (gameState === 'lost') {
        ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('HAS CAÍDO EN ZONA DE GUERRA', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '18px sans-serif';
        ctx.fillText(`Bajas totales: ${totalKills} | Rehenes rescatados: ${rescuedCount} — Presiona ENTER para reiniciar`, canvas.width / 2, canvas.height / 2 + 25);
        ctx.textAlign = 'left';
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();