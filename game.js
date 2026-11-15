// ==========================================
// SISTEMA DE SONIDO TÁCTICO (WEB AUDIO API)
// ==========================================
const AudioSys = {
    ctx: null,
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    noiseBuffer(duration) {
        const len = this.ctx.sampleRate * duration;
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        return buf;
    },
    playShoot(type) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = type === 'awp' ? 0.5 : (type === 'nova' ? 0.35 : 0.14);
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer(dur);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(type === 'awp' ? 2800 : 1700, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + dur);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(type === 'awp' ? 0.5 : 0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        noise.start(now);

        const osc = this.ctx.createOscillator();
        const og = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(28, now + dur * 0.8);
        og.gain.setValueAtTime(0.3, now);
        og.gain.exponentialRampToValueAtTime(0.01, now + dur * 0.8);
        osc.connect(og); og.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + dur * 0.8);
    },
    playHitmarker() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1850, now);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.05);
    },
    playExplosion() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer(1.0);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, now);
        filter.frequency.exponentialRampToValueAtTime(40, now + 1.0);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.0);
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
        noise.start(now);
    },
    playReload() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [0, 0.45].forEach((t, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(i === 0 ? 480 : 760, now + t);
            g.gain.setValueAtTime(0.12, now + t);
            g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.08);
            osc.connect(g); g.connect(this.ctx.destination);
            osc.start(now + t); osc.stop(now + t + 0.08);
        });
    }
};

// ==========================================
// GENERADOR DE TEXTURAS PBR REALISTAS
// ==========================================
function createProceduralTexture(type, repeatX = 1, repeatY = 1) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const g = c.getContext('2d');

    if (type === 'ground') {
        g.fillStyle = '#3f4238';
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 4000; i++) {
            g.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.06)';
            g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
    } else if (type === 'asphalt') {
        g.fillStyle = '#1e2126';
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 3500; i++) {
            g.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.07)';
            g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
        }
        g.fillStyle = '#ca8a04';
        g.fillRect(124, 0, 8, 256);
    } else if (type === 'concrete') {
        g.fillStyle = '#525866';
        g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2500; i++) {
            g.fillStyle = 'rgba(0,0,0,0.12)';
            g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
        }
        g.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        g.lineWidth = 3;
        g.strokeRect(2, 2, 252, 124);
        g.strokeRect(2, 130, 252, 124);
    } else if (type === 'wood') {
        g.fillStyle = '#78350f';
        g.fillRect(0, 0, 256, 256);
        g.strokeStyle = '#451a03';
        g.lineWidth = 8;
        g.strokeRect(4, 4, 248, 248);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 256); g.stroke();
        g.beginPath(); g.moveTo(256, 0); g.lineTo(0, 256); g.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    return tex;
}

// ==========================================
// CONFIGURACIÓN DEL MOTOR 3D (THREE.JS)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cb3c9);
scene.fog = new THREE.FogExp2(0x9cb3c9, 0.0068);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 450);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

// Iluminación Atmosférica Cinematográfica
const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x3f3f46, 0.65);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
dirLight.position.set(90, 150, 70);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 360;
const d = 150;
dirLight.shadow.camera.left = -d; dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d; dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// Suelo Texturizado
const groundMat = new THREE.MeshStandardMaterial({ map: createProceduralTexture('ground', 32, 32), roughness: 0.92 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 320), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Carreteras de Asfalto con líneas amarillas
const road1 = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 300),
    new THREE.MeshStandardMaterial({ map: createProceduralTexture('asphalt', 1, 20), roughness: 0.85 })
);
road1.rotation.x = -Math.PI / 2; road1.position.y = 0.02; road1.receiveShadow = true;
scene.add(road1);

const road2 = new THREE.Mesh(
    new THREE.PlaneGeometry(300, 16),
    new THREE.MeshStandardMaterial({ map: createProceduralTexture('asphalt', 1, 20), roughness: 0.85 })
);
road2.rotation.x = -Math.PI / 2; road2.rotation.z = Math.PI / 2; road2.position.y = 0.02; road2.receiveShadow = true;
scene.add(road2);

// Punto de Extracción (Zona Verde en la Base)
const basePos = new THREE.Vector3(0, 0, 85);
const zoneMesh = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 6.8, 32),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })
);
zoneMesh.rotation.x = -Math.PI / 2;
zoneMesh.position.set(basePos.x, 0.05, basePos.z);
scene.add(zoneMesh);

const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(3.8, 3.8, 65, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
);
beacon.position.set(basePos.x, 32, basePos.z);
scene.add(beacon);

// ==========================================
// CONSTRUCCIÓN DE EDIFICIOS Y CAJAS 3D
// ==========================================
const colliders = [];
const obstaclesMeshes = [];
const buildingDataForRadar = []; // Para dibujar edificios en el minimapa

const concreteMat = new THREE.MeshStandardMaterial({ map: createProceduralTexture('concrete', 3, 2), roughness: 0.82 });
const woodMat = new THREE.MeshStandardMaterial({ map: createProceduralTexture('wood', 1, 1), roughness: 0.88 });

function createBuilding(x, z, w, h, d, isCrate = false) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, isCrate ? woodMat : concreteMat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstaclesMeshes.push(mesh);
    buildingDataForRadar.push({ x, z, w, d });

    colliders.push({
        minX: x - w / 2 - 0.7,
        maxX: x + w / 2 + 0.7,
        minZ: z - d / 2 - 0.7,
        maxZ: z + d / 2 + 0.7
    });
}

// Muros perimetrales
createBuilding(0, -155, 310, 12, 4);
createBuilding(0, 155, 310, 12, 4);
createBuilding(-155, 0, 4, 12, 310);
createBuilding(155, 0, 4, 12, 310);

const mapLayout = [
    [-18, 60, 14, 7, 10, false],
    [22, 55, 16, 8, 12, false],
    [0, 35, 8, 2.2, 2.5, true],
    [-28, 12, 18, 11, 18, false],
    [30, -15, 20, 13, 16, false],
    [-15, -25, 10, 3, 3, true],
    [14, 18, 5, 2.5, 5, true],
    [-45, -65, 24, 10, 18, false],
    [45, -70, 26, 12, 20, false],
    [0, -85, 32, 9, 14, false],
    [-20, -105, 8, 3, 8, true],
    [22, -105, 8, 3, 8, true],
    [-75, 20, 20, 9, 25, false],
    [78, 25, 22, 10, 22, false],
    [-80, -35, 18, 8, 18, false],
    [82, -40, 18, 8, 18, false]
];
mapLayout.forEach(b => createBuilding(...b));

// ==========================================
// MODELO 3D REALISTA DE SOLDADOS Y REHENES
// ==========================================
function createCharacterMesh(isEnemy) {
    const group = new THREE.Group();

    const uniformMat = new THREE.MeshStandardMaterial({ color: isEnemy ? 0x3f2e26 : 0x1d4ed8, roughness: 0.75 });
    const vestMat = new THREE.MeshStandardMaterial({ color: isEnemy ? 0x1c1917 : 0x1e3a8a, roughness: 0.65 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdba674, roughness: 0.6 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.85 });

    // Piernas y botas tácticas
    const legGeo = new THREE.BoxGeometry(0.28, 0.95, 0.3);
    const leftLeg = new THREE.Mesh(legGeo, uniformMat);
    leftLeg.position.set(-0.2, 0.48, 0); leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, uniformMat);
    rightLeg.position.set(0.2, 0.48, 0); rightLeg.castShadow = true;

    const bootGeo = new THREE.BoxGeometry(0.3, 0.25, 0.42);
    const lBoot = new THREE.Mesh(bootGeo, bootMat); lBoot.position.set(0, -0.4, 0.06); leftLeg.add(lBoot);
    const rBoot = new THREE.Mesh(bootGeo, bootMat); rBoot.position.set(0, -0.4, 0.06); rightLeg.add(rBoot);

    // Torso, chaleco y mochila trasera
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.42), vestMat);
    torso.position.y = 1.45; torso.castShadow = true;

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.28), uniformMat);
    backpack.position.set(0, 1.5, -0.32);

    // Cabeza con pasamontañas y visor/ojos
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.44), isEnemy ? bootMat : skinMat);
    head.position.y = 2.22; head.castShadow = true;

    if (isEnemy) {
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.46), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        band.position.y = 2.34;
        const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.05), skinMat);
        eyes.position.set(0, 2.23, 0.21);
        group.add(band, eyes);
    }

    // Brazos articulados
    const armGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
    const leftArm = new THREE.Mesh(armGeo, uniformMat);
    leftArm.position.set(-0.5, 1.55, 0.22);
    leftArm.rotation.x = isEnemy ? -Math.PI / 2.2 : 0;

    const rightArm = new THREE.Mesh(armGeo, uniformMat);
    rightArm.position.set(0.5, 1.55, 0.22);
    rightArm.rotation.x = isEnemy ? -Math.PI / 2.2 : 0;

    group.add(leftLeg, rightLeg, torso, backpack, head, leftArm, rightArm);

    // Rifle AK-47 3D detallado en enemigos
    if (isEnemy) {
        const gunGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.95), new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.75 }));
        const wood = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.35), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        wood.position.z = -0.35;
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.12), new THREE.MeshStandardMaterial({ color: 0x27272a }));
        mag.position.set(0, -0.16, 0.15); mag.rotation.x = 0.25;
        gunGroup.add(body, wood, mag);
        gunGroup.position.set(0.25, 1.55, 0.65);
        group.add(gunGroup);
    }

    return { mesh: group, leftLeg, rightLeg, walkCycle: Math.random() * 6 };
}

// ==========================================
// ARMA EN PRIMERA PERSONA (VIEWMODEL FPS)
// ==========================================
const weaponHolder = new THREE.Group();
camera.add(weaponHolder);
scene.add(camera);

function buildFirstPersonWeapon(type) {
    while (weaponHolder.children.length > 0) weaponHolder.remove(weaponHolder.children[0]);

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.85, roughness: 0.25 });
    const accentMat = new THREE.MeshStandardMaterial({ color: type === 'awp' ? 0x15803d : (type === 'nova' ? 0x78350f : 0x27272a), roughness: 0.5 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });

    const length = type === 'awp' ? 1.45 : (type === 'nova' ? 1.15 : 0.95);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.13, length), accentMat);
    receiver.position.set(0.25, -0.24, -0.55);

    // Cañón + Silenciador en M4A1
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, length * 0.75, 12), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.25, -0.20, -0.88);

    // Mira Holográfica / Telescópica con punto rojo
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, type === 'awp' ? 0.36 : 0.14), gunMat);
    scope.position.set(0.25, -0.14, -0.46);

    const redDot = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.015, 0.01), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    redDot.position.set(0.25, -0.14, -0.38);

    // Antebrazos y guantes tácticos
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.38), sleeveMat);
    rightArm.position.set(0.32, -0.36, -0.22);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.18), gloveMat);
    rightHand.position.set(0.25, -0.31, -0.38);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.42), sleeveMat);
    leftArm.position.set(0.08, -0.35, -0.45);
    leftArm.rotation.y = -0.35;
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.2), gloveMat);
    leftHand.position.set(0.21, -0.27, -0.68);

    const muzzleLight = new THREE.PointLight(0xfacc15, 0, 14);
    muzzleLight.position.set(0.25, -0.18, -1.25);

    weaponHolder.add(receiver, barrel, scope, redDot, rightArm, rightHand, leftArm, leftHand, muzzleLight);
    return muzzleLight;
}

// ==========================================
// SISTEMA DE PARTÍCULAS 3D (CHISPAS Y SANGRE)
// ==========================================
const particles3D = [];

function spawnImpactParticles(point, colorHex, count = 8) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex });
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(point);
        scene.add(mesh);
        particles3D.push({
            mesh,
            vel: new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6 + 1, (Math.random() - 0.5) * 8),
            life: 0.45
        });
    }
}

// ==========================================
// VARIABLES DE JUEGO Y ARMAMENTO
// ==========================================
const WEAPON_STATS = {
    m4a1: { name: 'M4A1 SOPMOD', damage: 35, mag: 30, reserve: 120, rate: 110, pellets: 1, spread: 0.015, auto: true,  zoomFov: 50 },
    nova: { name: 'ESCOPETA M870', damage: 24, mag: 8, reserve: 32, rate: 750, pellets: 8, spread: 0.08,  auto: false, zoomFov: 60 },
    awp:  { name: 'FRANCOTIRADOR L115A3', damage: 160, mag: 5, reserve: 20, rate: 1100, pellets: 1, spread: 0.001, auto: false, zoomFov: 20 }
};

let currentWeapon = null;
let muzzleLight = null;
let isPlaying = false;
let isAiming = false;
let isReloading = false;
let lastShotTime = 0;
let weaponRecoil = 0;

const player = {
    pos: new THREE.Vector3(basePos.x, 1.75, basePos.z),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    hp: 100,
    maxHp: 100,
    grenades: 2,
    money: 500,
    kills: 0,
    rescued: 0,
    canJump: true
};

let enemies = [];
let hostages = [];
let grenades = [];
let tracerLines = [];
let lootBoxes = [];

// ==========================================
// GENERACIÓN DE ENEMIGOS Y REHENES
// ==========================================
function spawnEntities() {
    const enemyCoords = [
        [-22, 48], [25, 42], [-32, 0], [34, -5], [0, -18],
        [-45, -52], [45, -56], [-12, -75], [15, -75], [0, -110],
        [-68, 12], [72, 15], [-72, -45], [75, -50]
    ];
    enemyCoords.forEach(([x, z]) => {
        const model = createCharacterMesh(true);
        model.mesh.position.set(x, 0, z);
        scene.add(model.mesh);
        enemies.push({ ...model, hp: 100, speed: 4.3, shootCooldown: Math.random() * 2 });
    });

    const hostageCoords = [[-35, -5], [45, -62], [-72, -25], [0, -115]];
    hostageCoords.forEach(([x, z]) => {
        const model = createCharacterMesh(false);
        model.mesh.position.set(x, 0, z);
        scene.add(model.mesh);
        hostages.push({ ...model, following: false, rescued: false });
    });
}

function startGame(weaponKey) {
    AudioSys.init();
    AudioSys.playReload();

    currentWeapon = { key: weaponKey, ...WEAPON_STATS[weaponKey], ammo: WEAPON_STATS[weaponKey].mag };
    if (weaponKey === 'nova') { player.hp = 130; player.maxHp = 130; }
    muzzleLight = buildFirstPersonWeapon(weaponKey);

    spawnEntities();
    updateHUD();

    document.getElementById('loadout-screen').style.display = 'none';
    renderer.domElement.requestPointerLock();
}

function updateHUD() {
    document.getElementById('hp').innerText = Math.max(0, Math.round(player.hp));
    document.getElementById('weapon-name').innerText = currentWeapon.name;
    document.getElementById('ammo').innerText = isReloading ? 'REC...' : currentWeapon.ammo;
    document.getElementById('reserve').innerText = currentWeapon.reserve;
    document.getElementById('grenades').innerText = player.grenades;
    document.getElementById('kills').innerText = player.kills;
    document.getElementById('rescued').innerText = player.rescued;
    document.getElementById('money').innerText = player.money;
    document.getElementById('mission-text').innerText = `OBJETIVO: Rescata a los rehenes (${player.rescued}/4) hacia la Luz Verde`;
}

// ==========================================
// RENDERIZADO DEL MINIMAPA CIRCULAR UAV
// ==========================================
const minimapCanvas = document.getElementById('minimap');
const mCtx = minimapCanvas.getContext('2d');

function drawMinimap() {
    const w = minimapCanvas.width;
    const h = minimapCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarScale = 0.85; // Escala de zoom del radar

    mCtx.clearRect(0, 0, w, h);

    mCtx.save();
    mCtx.translate(cx, cy);
    // Rotar el radar según hacia donde miras (player.yaw)
    mCtx.rotate(player.yaw);

    // Anillos de distancia del radar
    mCtx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    mCtx.lineWidth = 1;
    [30, 58].forEach(r => {
        mCtx.beginPath();
        mCtx.arc(0, 0, r, 0, Math.PI * 2);
        mCtx.stroke();
    });

    // Edificios en el radar
    mCtx.fillStyle = 'rgba(148, 163, 184, 0.35)';
    buildingDataForRadar.forEach(b => {
        const rx = (b.x - player.pos.x) * radarScale;
        const rz = (b.z - player.pos.z) * radarScale;
        if (Math.hypot(rx, rz) < 90) {
            mCtx.fillRect(rx - (b.w * radarScale) / 2, rz - (b.d * radarScale) / 2, b.w * radarScale, b.d * radarScale);
        }
    });

    // Punto de Extracción (Zona Verde)
    const bx = (basePos.x - player.pos.x) * radarScale;
    const bz = (basePos.z - player.pos.z) * radarScale;
    const bDist = Math.hypot(bx, bz);
    const clampB = Math.min(bDist, 68);
    const bAngle = Math.atan2(bz, bx);
    mCtx.fillStyle = '#22c55e';
    mCtx.beginPath();
    mCtx.arc(Math.cos(bAngle) * clampB, Math.sin(bAngle) * clampB, 5, 0, Math.PI * 2);
    mCtx.fill();

    // Rehenes (Puntos Azules)
    mCtx.fillStyle = '#38bdf8';
    hostages.forEach(hos => {
        if (hos.rescued) return;
        const hx = (hos.mesh.position.x - player.pos.x) * radarScale;
        const hz = (hos.mesh.position.z - player.pos.z) * radarScale;
        if (Math.hypot(hx, hz) < 72) {
            mCtx.beginPath();
            mCtx.arc(hx, hz, 3.5, 0, Math.PI * 2);
            mCtx.fill();
        }
    });

    // Enemigos Terroristas (Puntos Rojos brillantes)
    mCtx.fillStyle = '#ef4444';
    enemies.forEach(en => {
        const ex = (en.mesh.position.x - player.pos.x) * radarScale;
        const ez = (en.mesh.position.z - player.pos.z) * radarScale;
        if (Math.hypot(ex, ez) < 74) {
            mCtx.beginPath();
            mCtx.arc(ex, ez, 3.8, 0, Math.PI * 2);
            mCtx.fill();
        }
    });

    mCtx.restore();

    // Cono de visión del jugador en el centro del radar
    mCtx.fillStyle = 'rgba(56, 189, 248, 0.18)';
    mCtx.beginPath();
    mCtx.moveTo(cx, cy);
    mCtx.arc(cx, cy, 65, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
    mCtx.closePath();
    mCtx.fill();

    // Triángulo del jugador siempre apuntando hacia arriba
    mCtx.fillStyle = '#facc15';
    mCtx.beginPath();
    mCtx.moveTo(cx, cy - 6);
    mCtx.lineTo(cx - 4.5, cy + 5);
    mCtx.lineTo(cx + 4.5, cy + 5);
    mCtx.closePath();
    mCtx.fill();
}

// ==========================================
// CONTROLES Y ACCIONES DE COMBATE
// ==========================================
const keys = {};
let mouseDown = false;

document.addEventListener('pointerlockchange', () => {
    isPlaying = document.pointerLockElement === renderer.domElement;
    document.getElementById('pause-overlay').style.display = (!isPlaying && player.hp > 0 && player.rescued < 4 && currentWeapon) ? 'flex' : 'none';
});

document.getElementById('pause-overlay').addEventListener('click', () => renderer.domElement.requestPointerLock());

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!isPlaying) return;
    if (e.code === 'KeyR') reloadWeapon();
    if (e.code === 'KeyG') throwGrenade();
    if (e.code === 'Space' && player.canJump) { player.vel.y = 8.5; player.canJump = false; }
});
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener('mousemove', e => {
    if (!isPlaying) return;
    const sens = isAiming && currentWeapon.key === 'awp' ? 0.0008 : 0.0022;
    player.yaw -= e.movementX * sens;
    player.pitch -= e.movementY * sens;
    player.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.pitch));
});

window.addEventListener('mousedown', e => {
    if (!isPlaying) return;
    if (e.button === 0) { mouseDown = true; shootWeapon(); }
    else if (e.button === 2) {
        isAiming = true;
        if (currentWeapon.key === 'awp') {
            document.getElementById('sniper-scope').style.display = 'block';
            weaponHolder.visible = false;
        }
    }
});

window.addEventListener('mouseup', e => {
    if (e.button === 0) mouseDown = false;
    if (e.button === 2) {
        isAiming = false;
        document.getElementById('sniper-scope').style.display = 'none';
        weaponHolder.visible = true;
    }
});
window.addEventListener('contextmenu', e => e.preventDefault());

function reloadWeapon() {
    if (isReloading || currentWeapon.ammo === currentWeapon.mag || currentWeapon.reserve <= 0) return;
    isReloading = true;
    AudioSys.playReload();
    updateHUD();
    setTimeout(() => {
        const needed = currentWeapon.mag - currentWeapon.ammo;
        const load = Math.min(needed, currentWeapon.reserve);
        currentWeapon.ammo += load;
        currentWeapon.reserve -= load;
        isReloading = false;
        updateHUD();
    }, 1100);
}

function showHitmarker() {
    AudioSys.playHitmarker();
    const hm = document.getElementById('hitmarker');
    hm.style.opacity = '1';
    setTimeout(() => hm.style.opacity = '0', 120);
}

function shootWeapon() {
    if (isReloading) return;
    const now = Date.now();
    if (now - lastShotTime < currentWeapon.rate) return;

    if (currentWeapon.ammo <= 0) {
        if (currentWeapon.reserve > 0) reloadWeapon();
        return;
    }

    currentWeapon.ammo--;
    lastShotTime = now;
    weaponRecoil = currentWeapon.key === 'awp' ? 0.14 : 0.05;
    muzzleLight.intensity = 4;
    setTimeout(() => muzzleLight.intensity = 0, 50);

    AudioSys.playShoot(currentWeapon.key);
    updateHUD();

    const raycaster = new THREE.Raycaster();
    const enemyMeshes = enemies.map(e => e.mesh);

    for (let i = 0; i < currentWeapon.pellets; i++) {
        const spreadX = (Math.random() - 0.5) * currentWeapon.spread * (isAiming ? 0.25 : 1);
        const spreadY = (Math.random() - 0.5) * currentWeapon.spread * (isAiming ? 0.25 : 1);

        const dir = new THREE.Vector3(spreadX, spreadY, -1).applyQuaternion(camera.quaternion).normalize();
        raycaster.set(camera.position, dir);

        const wallHits = raycaster.intersectObjects(obstaclesMeshes);
        const wallDist = wallHits.length > 0 ? wallHits[0].distance : 250;

        const enemyHits = raycaster.intersectObjects(enemyMeshes, true);
        let hitPoint = camera.position.clone().addScaledVector(dir, wallDist);

        if (enemyHits.length > 0 && enemyHits[0].distance < wallDist) {
            hitPoint = enemyHits[0].point;
            spawnImpactParticles(hitPoint, 0xdc2626, 8); // Partículas de sangre 3D

            let hitObj = enemyHits[0].object;
            while (hitObj.parent && !enemyMeshes.includes(hitObj)) hitObj = hitObj.parent;
            const enemyIdx = enemyMeshes.indexOf(hitObj);

            if (enemyIdx !== -1) {
                showHitmarker();
                enemies[enemyIdx].hp -= currentWeapon.damage;
                if (enemies[enemyIdx].hp <= 0) killEnemy(enemyIdx);
            }
        } else if (wallHits.length > 0) {
            spawnImpactParticles(hitPoint, 0xfacc15, 5); // Chispas en pared
        }

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            camera.position.clone().add(new THREE.Vector3(0.2, -0.2, -0.8).applyQuaternion(camera.quaternion)),
            hitPoint
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75 });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
        tracerLines.push({ mesh: line, life: 4 });
    }

    if (currentWeapon.ammo === 0 && currentWeapon.reserve > 0) reloadWeapon();
}

function killEnemy(index) {
    const enemy = enemies[index];
    const loot = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.4, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.4 })
    );
    loot.position.set(enemy.mesh.position.x, 0.3, enemy.mesh.position.z);
    scene.add(loot);
    lootBoxes.push(loot);

    scene.remove(enemy.mesh);
    enemies.splice(index, 1);
    player.kills++;
    player.money += 150;
    updateHUD();
}

function throwGrenade() {
    if (player.grenades <= 0) return;
    player.grenades--;
    updateHUD();

    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x15803d })
    );
    mesh.position.copy(camera.position);

    const dir = new THREE.Vector3(0, 0.25, -1).applyQuaternion(camera.quaternion).normalize();
    scene.add(mesh);
    grenades.push({ mesh, vel: dir.multiplyScalar(22), timer: 2.2 });
}

function checkBoxCollision(x, z) {
    if (x < -150 || x > 150 || z < -150 || z > 150) return true;
    for (let c of colliders) {
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
    }
    return false;
}

// ==========================================
// BUCLE PRINCIPAL 3D
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    beacon.rotation.y += dt;

    if (isPlaying) {
        if (mouseDown && currentWeapon.auto) shootWeapon();

        const targetFov = isAiming ? currentWeapon.zoomFov : 75;
        camera.fov += (targetFov - camera.fov) * 12 * dt;
        camera.updateProjectionMatrix();

        const targetGunX = isAiming ? 0 : 0.25;
        const targetGunY = isAiming ? -0.16 : -0.24;
        weaponHolder.position.x += (targetGunX - weaponHolder.position.x) * 15 * dt;
        weaponHolder.position.y += (targetGunY - weaponHolder.position.y) * 15 * dt;
        weaponHolder.position.z = weaponRecoil;
        weaponRecoil *= 0.8;

        const speed = keys['ShiftLeft'] ? 12.5 : 8.0;
        const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
        const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

        const moveDir = new THREE.Vector3();
        if (keys['KeyW']) moveDir.add(forward);
        if (keys['KeyS']) moveDir.sub(forward);
        if (keys['KeyD']) moveDir.add(right);
        if (keys['KeyA']) moveDir.sub(right);
        if (moveDir.lengthSq() > 0) moveDir.normalize();

        const nextX = player.pos.x + moveDir.x * speed * dt;
        const nextZ = player.pos.z + moveDir.z * speed * dt;
        if (!checkBoxCollision(nextX, player.pos.z)) player.pos.x = nextX;
        if (!checkBoxCollision(player.pos.x, nextZ)) player.pos.z = nextZ;

        player.vel.y -= 22 * dt;
        player.pos.y += player.vel.y * dt;
        if (player.pos.y <= 1.75) {
            player.pos.y = 1.75;
            player.vel.y = 0;
            player.canJump = true;
        }

        camera.position.copy(player.pos);
        camera.quaternion.setFromEuler(new THREE.Euler(player.pitch + weaponRecoil * 0.5, player.yaw, 0, 'YXZ'));

        // Actualizar Minimapa Circular UAV
        drawMinimap();

        // Loot
        for (let i = lootBoxes.length - 1; i >= 0; i--) {
            lootBoxes[i].rotation.y += 2 * dt;
            if (lootBoxes[i].position.distanceTo(player.pos) < 2.5) {
                AudioSys.playReload();
                currentWeapon.reserve += currentWeapon.mag;
                player.hp = Math.min(player.maxHp, player.hp + 20);
                scene.remove(lootBoxes[i]);
                lootBoxes.splice(i, 1);
                updateHUD();
            }
        }

        // IA Enemigos
        enemies.forEach(e => {
            const dist = e.mesh.position.distanceTo(player.pos);
            if (dist < 68) {
                e.mesh.lookAt(player.pos.x, 0, player.pos.z);
                if (dist > 14) {
                    const dir = new THREE.Vector3().subVectors(player.pos, e.mesh.position).setY(0).normalize();
                    const nx = e.mesh.position.x + dir.x * e.speed * dt;
                    const nz = e.mesh.position.z + dir.z * e.speed * dt;
                    if (!checkBoxCollision(nx, e.mesh.position.z)) e.mesh.position.x = nx;
                    if (!checkBoxCollision(e.mesh.position.x, nz)) e.mesh.position.z = nz;

                    e.walkCycle += 8 * dt;
                    e.leftLeg.rotation.x = Math.sin(e.walkCycle) * 0.5;
                    e.rightLeg.rotation.x = -Math.sin(e.walkCycle) * 0.5;
                }

                e.shootCooldown -= dt;
                if (e.shootCooldown <= 0) {
                    e.shootCooldown = 1.1 + Math.random() * 0.8;
                    const ray = new THREE.Raycaster(
                        e.mesh.position.clone().add(new THREE.Vector3(0, 1.6, 0)),
                        new THREE.Vector3().subVectors(player.pos, e.mesh.position).normalize()
                    );
                    const wallHits = ray.intersectObjects(obstaclesMeshes);
                    if (wallHits.length === 0 || wallHits[0].distance > dist) {
                        AudioSys.playShoot('m4a1');
                        if (Math.random() < 0.45) {
                            player.hp -= 12;
                            updateHUD();
                            const dmgOverlay = document.getElementById('damage-overlay');
                            dmgOverlay.style.boxShadow = 'inset 0 0 100px rgba(220, 38, 38, 0.8)';
                            setTimeout(() => dmgOverlay.style.boxShadow = 'inset 0 0 100px rgba(220, 38, 38, 0)', 250);
                            if (player.hp <= 0) endGame(false);
                        }
                    }
                }
            }
        });

        // Rehenes
        hostages.forEach(h => {
            if (h.rescued) return;
            const dist = h.mesh.position.distanceTo(player.pos);
            if (dist < 4.5 && !h.following) { h.following = true; AudioSys.playHitmarker(); }
            if (h.following && dist > 3.2) {
                h.mesh.lookAt(player.pos.x, 0, player.pos.z);
                const dir = new THREE.Vector3().subVectors(player.pos, h.mesh.position).setY(0).normalize();
                const nx = h.mesh.position.x + dir.x * 7.2 * dt;
                const nz = h.mesh.position.z + dir.z * 7.2 * dt;
                if (!checkBoxCollision(nx, h.mesh.position.z)) h.mesh.position.x = nx;
                if (!checkBoxCollision(h.mesh.position.x, nz)) h.mesh.position.z = nz;

                h.walkCycle += 10 * dt;
                h.leftLeg.rotation.x = Math.sin(h.walkCycle) * 0.5;
                h.rightLeg.rotation.x = -Math.sin(h.walkCycle) * 0.5;
            }
            if (h.mesh.position.distanceTo(basePos) < 7.0) {
                h.rescued = true; h.following = false; h.mesh.visible = false;
                player.rescued++; player.money += 400;
                AudioSys.playReload();
                updateHUD();
                if (player.rescued >= 4) endGame(true);
            }
        });

        // Granadas
        for (let i = grenades.length - 1; i >= 0; i--) {
            const g = grenades[i];
            g.vel.y -= 25 * dt;
            g.mesh.position.addScaledVector(g.vel, dt);
            if (g.mesh.position.y < 0.2) {
                g.mesh.position.y = 0.2;
                g.vel.y *= -0.4; g.vel.x *= 0.7; g.vel.z *= 0.7;
            }
            g.timer -= dt;
            if (g.timer <= 0) {
                AudioSys.playExplosion();
                spawnImpactParticles(g.mesh.position, 0xf97316, 25);
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (enemies[j].mesh.position.distanceTo(g.mesh.position) < 14) killEnemy(j);
                }
                scene.remove(g.mesh);
                grenades.splice(i, 1);
            }
        }

        // Partículas 3D
        for (let i = particles3D.length - 1; i >= 0; i--) {
            const p = particles3D[i];
            p.vel.y -= 18 * dt;
            p.mesh.position.addScaledVector(p.vel, dt);
            p.life -= dt;
            if (p.life <= 0) {
                scene.remove(p.mesh);
                particles3D.splice(i, 1);
            }
        }

        // Trazadoras
        for (let i = tracerLines.length - 1; i >= 0; i--) {
            tracerLines[i].life--;
            if (tracerLines[i].life <= 0) {
                scene.remove(tracerLines[i].mesh);
                tracerLines.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

function endGame(victory) {
    document.exitPointerLock();
    isPlaying = false;
    const endScreen = document.getElementById('end-screen');
    document.getElementById('end-title').innerText = victory ? '¡MISIÓN CUMPLIDA! REHENES A SALVO' : 'HAS CAÍDO EN COMBATE';
    document.getElementById('end-title').style.color = victory ? '#22c55e' : '#ef4444';
    document.getElementById('end-stats').innerText = `Terroristas eliminados: ${player.kills} | Rehenes rescatados: ${player.rescued}/4 | Dinero acumulado: $${player.money}`;
    endScreen.style.display = 'flex';
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();