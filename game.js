const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Referencias UI
const hpEl = document.getElementById('hp');
const weaponNameEl = document.getElementById('weapon-name');
const ammoEl = document.getElementById('ammo');
const reserveEl = document.getElementById('reserve');
const grenadesEl = document.getElementById('grenades');
const rescuedEl = document.getElementById('rescued');
const enemiesEl = document.getElementById('enemies');

// ==========================================
// SISTEMA DE AUDIO PROCEDURAL (WEB AUDIO API)
// ==========================================
const AudioSys = {
    ctx: null,
    muted: false,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    createNoiseBuffer(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    },

    playShoot(weaponKey) {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;

        // Ruido blanco filtrado para la pólvora
        const noise = this.ctx.createBufferSource();
        const duration = weaponKey === 'awp' ? 0.45 : (weaponKey === 'nova' ? 0.35 : 0.14);
        noise.buffer = this.createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(
            weaponKey === 'm4a1' ? 1400 : (weaponKey === 'awp' ? 2800 : 2200),
            now
        );
        filter.frequency.exponentialRampToValueAtTime(120, now + duration);

        const gain = this.ctx.createGain();
        const vol = weaponKey === 'awp' ? 0.45 : (weaponKey === 'm4a1' ? 0.22 : 0.32);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);

        // Golpe grave (punch) con oscilador
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = weaponKey === 'awp' ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(weaponKey === 'awp' ? 180 : 140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + duration * 0.8);

        oscGain.gain.setValueAtTime(vol * 0.9, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration * 0.8);

        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + duration * 0.8);
    },

    playExplosion() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 0.9;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(duration);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(45, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
    },

    playReload() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        // Doble clic metálico de cargador
        [0, 0.45].forEach((offset, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(idx === 0 ? 520 : 780, now + offset);
            gain.gain.setValueAtTime(0.12, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.08);
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
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
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
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    },

    playHostageRescue() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.1);
            gain.gain.setValueAtTime(0.18, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.25);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.25);
        });
    }
};

function toggleMute() {
    AudioSys.muted = !AudioSys.muted;
    document.getElementById('mute-btn').innerText = AudioSys.muted ? '🔇 Mute' : '🔊 Audio ON';
}

// ==========================================
// CATÁLOGO DE ARMAS Y ESTADO DEL JUEGO
// ==========================================
const WEAPONS = {
    usp:   { name: 'USP-S',        damage: 22,  magSize: 12, reserve: 36, fireRate: 240,  speed: 13, spread: 0.04, pellets: 1, auto: false, color: '#94a3b8' },
    m4a1:  { name: 'M4A1-S',       damage: 28,  magSize: 30, reserve: 90, fireRate: 110,  speed: 15, spread: 0.06, pellets: 1, auto: true,  color: '#38bdf8' },
    nova:  { name: 'Nova',         damage: 18,  magSize: 8,  reserve: 24, fireRate: 750,  speed: 12, spread: 0.28, pellets: 6, auto: false, color: '#fb923c' },
    awp:   { name: 'AWP',          damage: 130, magSize: 5,  reserve: 15, fireRate: 1100, speed: 22, spread: 0.01, pellets: 1, auto: false, color: '#22c55e' },
    ak47:  { name: 'AK-47',        damage: 34,  magSize: 30, reserve: 90, fireRate: 130,  speed: 14, spread: 0.09, pellets: 1, auto: true,  color: '#ef4444' },
    mac10: { name: 'MAC-10',       damage: 16,  magSize: 32, reserve: 96, fireRate: 75,   speed: 13, spread: 0.16, pellets: 1, auto: true,  color: '#facc15' },
    rpg:   { name: 'Lanzacohetes', damage: 150, magSize: 1,  reserve: 3,  fireRate: 1200, speed: 10, spread: 0.02, pellets: 1, auto: false, explosive: true, color: '#a855f7' }
};

let gameState = 'menu';
let rescuedCount = 0;
const totalHostages = 3;
let screenShake = 0;

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, down: false };

const player = {
    x: 80, y: 80, radius: 16, speed: 3.6, hp: 100, angle: 0,
    inventory: [null, null],
    activeSlot: 0,
    grenades: 2,
    reloading: false,
    lastShot: 0
};

let bullets = [];
let grenades = [];
let explosions = [];
let droppedItems = [];
let particles = [];
let muzzleFlashes = [];
let bloodDecals = [];

const rescueZone = { x: 20, y: 20, width: 120, height: 120 };

const walls = [
    { x: 210, y: 0,   width: 30, height: 220 },
    { x: 210, y: 330, width: 30, height: 290 },
    { x: 430, y: 150, width: 190, height: 30 },
    { x: 430, y: 440, width: 190, height: 30 },
    { x: 710, y: 110, width: 30, height: 400 }
];

let terrorists = [
    { x: 350, y: 80,  radius: 16, hp: 70,  speed: 1.5, cooldown: 0, weaponKey: 'mac10' },
    { x: 520, y: 300, radius: 16, hp: 90,  speed: 1.4, cooldown: 0, weaponKey: 'ak47' },
    { x: 820, y: 160, radius: 16, hp: 90,  speed: 1.4, cooldown: 0, weaponKey: 'ak47' },
    { x: 820, y: 460, radius: 16, hp: 80,  speed: 1.3, cooldown: 0, weaponKey: 'nova' },
    { x: 340, y: 520, radius: 16, hp: 100, speed: 1.2, cooldown: 0, weaponKey: 'rpg' }
];

let hostages = [
    { x: 870, y: 80,  radius: 14, following: false, rescued: false },
    { x: 870, y: 310, radius: 14, following: false, rescued: false },
    { x: 870, y: 540, radius: 14, following: false, rescued: false }
];

function createWeaponInstance(key) {
    const base = WEAPONS[key];
    return { key, ...base, ammo: base.magSize, reserve: base.reserve };
}

function selectLoadout(primaryKey) {
    AudioSys.init();
    AudioSys.playReload();
    player.inventory[0] = createWeaponInstance(primaryKey);
    player.inventory[1] = createWeaponInstance('usp');
    player.activeSlot = 0;
    document.getElementById('loadout-screen').style.display = 'none';
    gameState = 'playing';
    updateHUD();
}

function updateHUD() {
    const w = player.inventory[player.activeSlot];
    hpEl.innerText = Math.max(0, player.hp);
    weaponNameEl.innerText = w ? w.name : 'Ninguna';
    ammoEl.innerText = player.reloading ? '...' : (w ? w.ammo : 0);
    reserveEl.innerText = w ? w.reserve : 0;
    grenadesEl.innerText = player.grenades;
    rescuedEl.innerText = rescuedCount;
    enemiesEl.innerText = terrorists.length;
}

// ==========================================
// EFECTOS VISUALES (PARTÍCULAS Y FOGONAZOS)
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

function addMuzzleFlash(x, y, angle, size = 14) {
    muzzleFlashes.push({
        x: x + Math.cos(angle) * 24,
        y: y + Math.sin(angle) * 24,
        angle,
        size,
        life: 3
    });
}

// ==========================================
// CONTROLES Y ACCIONES
// ==========================================
window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (gameState !== 'playing') {
        if (e.code === 'Enter' && gameState !== 'menu') location.reload();
        return;
    }
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
    addMuzzleFlash(player.x, player.y, player.angle, w.key === 'awp' ? 22 : 14);
    if (w.key === 'awp' || w.key === 'nova') screenShake = 5;

    spawnProjectiles(player.x, player.y, player.angle, w, 'ct');
    updateHUD();
    if (w.ammo === 0 && w.reserve > 0) reload();
}

function spawnProjectiles(x, y, baseAngle, weapon, team) {
    // Casquillo expulsado
    spawnParticles(x, y, '#eab308', 1, 2.5);

    for (let i = 0; i < weapon.pellets; i++) {
        const angle = baseAngle + (Math.random() - 0.5) * weapon.spread;
        bullets.push({
            x: x + Math.cos(angle) * 20,
            y: y + Math.sin(angle) * 20,
            prevX: x + Math.cos(angle) * 20,
            prevY: y + Math.sin(angle) * 20,
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
        x: player.x + Math.cos(player.angle) * 20,
        y: player.y + Math.sin(player.angle) * 20,
        vx: Math.cos(player.angle) * 8,
        vy: Math.sin(player.angle) * 8,
        timer: 90
    });
}

function createExplosion(x, y, radius, maxDamage) {
    AudioSys.playExplosion();
    screenShake = 14;
    explosions.push({ x, y, radius, alpha: 1 });
    spawnParticles(x, y, '#f97316', 25, 7);
    spawnParticles(x, y, '#facc15', 15, 5);
    spawnParticles(x, y, '#64748b', 15, 4);

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

function killTerrorist(index) {
    const t = terrorists[index];
    bloodDecals.push({ x: t.x, y: t.y, radius: 18 + Math.random() * 8 });
    spawnParticles(t.x, t.y, '#dc2626', 16, 4.5);

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
    if (terrorists.length === 0 && rescuedCount === totalHostages) gameState = 'won';
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
    const steps = 30;
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
// BUCLE DE ACTUALIZACIÓN (FÍSICAS E IA)
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
        if (dist < 45 && !h.following) {
            h.following = true;
            AudioSys.playPickup();
        }
        if (h.following && dist > 38) {
            let angle = Math.atan2(player.y - h.y, player.x - h.x);
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
            AudioSys.playHostageRescue();
            updateHUD();
            if (rescuedCount >= totalHostages) gameState = 'won';
        }
    });

    // IA Terroristas
    terrorists.forEach(t => {
        let dist = Math.hypot(player.x - t.x, player.y - t.y);
        let canSee = dist < 450 && hasLineOfSight(t.x, t.y, player.x, player.y);
        if (canSee) {
            const angle = Math.atan2(player.y - t.y, player.x - t.x);
            if (dist > 190) {
                let nextX = t.x + Math.cos(angle) * t.speed;
                let nextY = t.y + Math.sin(angle) * t.speed;
                if (!checkWallCollision(t, nextX, t.y)) t.x = nextX;
                if (!checkWallCollision(t, t.x, nextY)) t.y = nextY;
            }
            if (t.cooldown <= 0) {
                const tWeapon = WEAPONS[t.weaponKey];
                AudioSys.playShoot(t.weaponKey);
                addMuzzleFlash(t.x, t.y, angle, 12);
                spawnProjectiles(t.x, t.y, angle, tWeapon, 't');
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
        g.x += g.vx;
        g.y += g.vy;
        g.vx *= 0.94;
        g.vy *= 0.94;
        g.timer--;

        if (g.timer <= 0) {
            createExplosion(g.x, g.y, 125, 145);
            grenades.splice(i, 1);
        }
    }

    // Balas y cohetes
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.prevX = b.x;
        b.prevY = b.y;
        b.x += b.vx;
        b.y += b.vy;

        // Estela de humo para cohetes RPG
        if (b.explosive) spawnParticles(b.x, b.y, '#cbd5e1', 1, 1);

        let hitWall = b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height;
        for (let w of walls) {
            if (b.x > w.x && b.x < w.x + w.width && b.y > w.y && b.y < w.y + w.height) hitWall = true;
        }
        if (hitWall) {
            spawnParticles(b.x, b.y, '#fde047', 6, 3.5); // Chispas en pared
            if (b.explosive) createExplosion(b.x, b.y, 100, 110);
            bullets.splice(i, 1);
            continue;
        }

        if (b.team === 'ct') {
            for (let j = terrorists.length - 1; j >= 0; j--) {
                let t = terrorists[j];
                if (Math.hypot(b.x - t.x, b.y - t.y) < t.radius) {
                    spawnParticles(b.x, b.y, '#ef4444', 7, 3); // Sangre al impactar
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

    // Actualizar efectos visuales
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.92;
        p.vy *= 0.92;
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
// RENDERIZADO GRÁFICO
// ==========================================
function draw() {
    ctx.save();
    // Aplicar sacudida de cámara (Screen Shake)
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake;
        const shakeY = (Math.random() - 0.5) * screenShake;
        ctx.translate(shakeX, shakeY);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cuadrícula táctica sutil en el suelo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Zona Segura
    ctx.fillStyle = 'rgba(34, 197, 94, 0.18)';
    ctx.fillRect(rescueZone.x, rescueZone.y, rescueZone.width, rescueZone.height);
    ctx.strokeStyle = '#22c55e';
    ctx.strokeRect(rescueZone.x, rescueZone.y, rescueZone.width, rescueZone.height);
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ZONA SEGURA', rescueZone.x + 18, rescueZone.y + 65);

    // Marcas permanentes en el suelo
    bloodDecals.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(127, 29, 29, 0.55)';
        ctx.fill();
    });

    // Paredes con sombra
    walls.forEach(w => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(w.x + 5, w.y + 5, w.width, w.height);
        ctx.fillStyle = '#475569';
        ctx.fillRect(w.x, w.y, w.width, w.height);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(w.x, w.y, w.width, w.height);
    });

    // Objetos caídos (Loot)
    droppedItems.forEach(item => {
        if (item.type === 'weapon') {
            ctx.fillStyle = item.weapon.color;
            ctx.fillRect(item.x - 10, item.y - 4, 20, 8);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`[E] ${item.weapon.name}`, item.x - 24, item.y - 9);
        } else if (item.type === 'ammo') {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(item.x - 6, item.y - 6, 12, 12);
        } else if (item.type === 'grenade') {
            ctx.beginPath();
            ctx.arc(item.x, item.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#22c55e';
            ctx.fill();
        }
    });

    // Rehenes
    hostages.forEach(h => {
        if (h.rescued) return;
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2);
        ctx.fillStyle = h.following ? '#38bdf8' : '#fde047';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('R', h.x - 4, h.y + 3);
    });

    // Terroristas
    terrorists.forEach(t => {
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.strokeStyle = '#7f1d1d';
        ctx.stroke();
        ctx.fillStyle = '#fca5a5';
        ctx.font = '10px sans-serif';
        ctx.fillText(WEAPONS[t.weaponKey].name, t.x - 18, t.y - 20);
    });

    // Jugador CT
    if (gameState !== 'menu') {
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        const w = player.inventory[player.activeSlot];
        ctx.fillStyle = w ? w.color : '#94a3b8';
        ctx.fillRect(10, -3, 19, 6);
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.stroke();
        ctx.restore();
    }

    // Fogonazos de disparo (Muzzle Flashes)
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
        ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.fill();
        ctx.restore();
    });

    // Trazadoras de balas
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

    // Partículas (Chispas, sangre, casquillos)
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    // Explosiones con onda expansiva
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

    // Pantalla Final
    if (gameState === 'won' || gameState === 'lost') {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.font = 'bold 42px sans-serif';
        ctx.fillStyle = gameState === 'won' ? '#38bdf8' : '#ef4444';
        ctx.fillText(
            gameState === 'won' ? 'COUNTER-TERRORISTS WIN' : 'TERRORISTS WIN',
            canvas.width / 2, canvas.height / 2 - 15
        );
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '18px sans-serif';
        ctx.fillText('Presiona ENTER para volver a jugar', canvas.width / 2, canvas.height / 2 + 25);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();