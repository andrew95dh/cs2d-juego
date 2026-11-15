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
        filter.frequency.setValueAtTime(type === 'awp' ? 2800 : 1800, now);
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
        osc.frequency.setValueAtTime(1800, now);
        gain.gain.setValueAtTime(0.2, now);
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
// CONFIGURACIÓN DEL MOTOR 3D (THREE.JS)
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87a5b8);
scene.fog = new THREE.FogExp2(0x87a5b8, 0.0075);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminación Solar Realista
const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f3f46, 0.65);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.1);
dirLight.position.set(80, 140, 60);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 10;
dirLight.shadow.camera.far = 350;
const d = 140;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

// Suelo del Mundo Abierto (Concreto y Tierra)
const groundGeo = new THREE.PlaneGeometry(320, 320);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3b4038, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Carreteras cruzadas en el mapa
const roadMat = new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.85 });
const road1 = new THREE.Mesh(new THREE.PlaneGeometry(16, 300), roadMat);
road1.rotation.x = -Math.PI / 2; road1.position.y = 0.02; road1.receiveShadow = true;
scene.add(road1);

const road2 = new THREE.Mesh(new THREE.PlaneGeometry(300, 16), roadMat);
road2.rotation.x = -Math.PI / 2; road2.position.y = 0.02; road2.receiveShadow = true;
scene.add(road2);

// Punto de Extracción (Zona Verde Brillante en la Base)
const basePos = new THREE.Vector3(0, 0, 85);
const zoneGeo = new THREE.RingGeometry(4, 6.5, 32);
const zoneMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
zoneMesh.rotation.x = -Math.PI / 2;
zoneMesh.position.set(basePos.x, 0.05, basePos.z);
scene.add(zoneMesh);

// Haz de luz vertical en la zona de rescate para orientarte desde lejos
const beaconGeo = new THREE.CylinderGeometry(3.5, 3.5, 60, 16, 1, true);
const beaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.18, side: THREE.DoubleSide });
const beacon = new THREE.Mesh(beaconGeo, beaconMat);
beacon.position.set(basePos.x, 30, basePos.z);
scene.add(beacon);

// ==========================================
// CONSTRUCCIÓN DE EDIFICIOS Y COBERTURAS 3D
// ==========================================
const colliders = []; // Cajas de colisión { minX, maxX, minZ, maxZ }
const obstaclesMeshes = [];

function createBuilding(x, z, w, h, d, color = 0x64748b) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstaclesMeshes.push(mesh);

    colliders.push({
        minX: x - w / 2 - 0.7,
        maxX: x + w / 2 + 0.7,
        minZ: z - d / 2 - 0.7,
        maxZ: z + d / 2 + 0.7
    });
}

// Muros perimetrales del mundo abierto
createBuilding(0, -155, 310, 12, 4, 0x334155);
createBuilding(0, 155, 310, 12, 4, 0x334155);
createBuilding(-155, 0, 4, 12, 310, 0x334155);
createBuilding(155, 0, 4, 12, 310, 0x334155);

// Edificios urbanos, muros tácticos y cajas militares
const mapLayout = [
    // Zona cercana a la base
    [-18, 60, 14, 7, 10, 0x57534e],
    [22, 55, 16, 8, 12, 0x475569],
    [0, 35, 8, 2.2, 2, 0x78350f], // Barricada

    // Sector Central (Cruce de carreteras)
    [-28, 12, 18, 11, 18, 0x52525b],
    [30, -15, 20, 13, 16, 0x475569],
    [-15, -25, 10, 3, 3, 0x78350f],
    [14, 18, 5, 2.5, 5, 0x78350f],

    // Complejo Norte (Campamentos enemigos)
    [-45, -65, 24, 10, 18, 0x3f3f46],
    [45, -70, 26, 12, 20, 0x57534e],
    [0, -85, 32, 9, 14, 0x475569],
    [-20, -105, 8, 3, 8, 0x78350f],
    [22, -105, 8, 3, 8, 0x78350f],

    // Flancos Este y Oeste
    [-75, 20, 20, 9, 25, 0x52525b],
    [78, 25, 22, 10, 22, 0x475569],
    [-80, -35, 18, 8, 18, 0x57534e],
    [82, -40, 18, 8, 18, 0x57534e]
];
mapLayout.forEach(b => createBuilding(...b));

// ==========================================
// MODELO 3D DE PERSONAJES (ESTILO SOLDADO FPS)
// ==========================================
function createCharacterMesh(isEnemy) {
    const group = new THREE.Group();

    // Materiales realistas
    const uniformMat = new THREE.MeshStandardMaterial({ color: isEnemy ? 0x4a2c2a : 0x1d4ed8, roughness: 0.7 });
    const vestMat = new THREE.MeshStandardMaterial({ color: isEnemy ? 0x1f2937 : 0x1e3a8a, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.6 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });

    // Piernas articuladas
    const legGeo = new THREE.BoxGeometry(0.28, 0.95, 0.3);
    const leftLeg = new THREE.Mesh(legGeo, uniformMat);
    leftLeg.position.set(-0.2, 0.48, 0);
    leftLeg.castShadow = true;
    const rightLeg = new THREE.Mesh(legGeo, uniformMat);
    rightLeg.position.set(0.2, 0.48, 0);
    rightLeg.castShadow = true;

    // Botas
    const bootGeo = new THREE.BoxGeometry(0.3, 0.25, 0.42);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.4, 0.06);
    leftLeg.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.4, 0.06);
    rightLeg.add(rightBoot);

    // Torso + Chaleco antibalas
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.0, 0.42), vestMat);
    torso.position.y = 1.45;
    torso.castShadow = true;

    // Cabeza con pasamontañas o cabello
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.44), isEnemy ? bootMat : skinMat);
    head.position.y = 2.22;
    head.castShadow = true;

    if (isEnemy) {
        // Banda roja táctica en la frente
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.46), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
        band.position.y = 2.34;
        group.add(band);
    }

    // Brazos
    const armGeo = new THREE.BoxGeometry(0.22, 0.8, 0.22);
    const leftArm = new THREE.Mesh(armGeo, uniformMat);
    leftArm.position.set(-0.5, 1.55, 0.2);
    leftArm.rotation.x = isEnemy ? -Math.PI / 2.3 : 0;

    const rightArm = new THREE.Mesh(armGeo, uniformMat);
    rightArm.position.set(0.5, 1.55, 0.2);
    rightArm.rotation.x = isEnemy ? -Math.PI / 2.3 : 0;

    group.add(leftLeg, rightLeg, torso, head, leftArm, rightArm);

    // Rifle AK-47 3D si es enemigo
    if (isEnemy) {
        const gunGroup = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.95), new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.7 }));
        const wood = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.35), new THREE.MeshStandardMaterial({ color: 0x78350f }));
        wood.position.z = -0.35;
        gunGroup.add(body, wood);
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

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const accentMat = new THREE.MeshStandardMaterial({ color: type === 'awp' ? 0x15803d : (type === 'nova' ? 0x78350f : 0x334155) });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });

    // Cuerpo principal del arma
    const length = type === 'awp' ? 1.4 : (type === 'nova' ? 1.1 : 0.95);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, length), accentMat);
    receiver.position.set(0.26, -0.24, -0.55);

    // Cañón metálico
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length * 0.7, 12), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0.26, -0.20, -0.85);

    // Mira óptica
    const scope = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, type === 'awp' ? 0.35 : 0.14), gunMat);
    scope.position.set(0.26, -0.14, -0.45);

    // Mano derecha e izquierda tácticas
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.22), gloveMat);
    rightHand.position.set(0.26, -0.32, -0.35);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.24), gloveMat);
    leftHand.position.set(0.22, -0.28, -0.68);

    // Luz de fogonazo al disparar
    const muzzleLight = new THREE.PointLight(0xfacc15, 0, 12);
    muzzleLight.position.set(0.26, -0.18, -1.2);

    weaponHolder.add(receiver, barrel, scope, rightHand, leftHand, muzzleLight);
    return muzzleLight;
}

// ==========================================
// VARIABLES DE JUEGO Y ARMAMENTO
// ==========================================
const WEAPON_STATS = {
    m4a1: { name: 'M4A1 CARBINE', damage: 34, mag: 30, reserve: 120, rate: 110, pellets: 1, spread: 0.015, auto: true,  zoomFov: 52 },
    nova: { name: 'NOVA TACTICAL', damage: 22, mag: 8,  reserve: 32,  rate: 750, pellets: 8, spread: 0.08,  auto: false, zoomFov: 62 },
    awp:  { name: 'AWP .338 SNIPER', damage: 150, mag: 5, reserve: 20, rate: 1100, pellets: 1, spread: 0.001, auto: false, zoomFov: 22 }
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
// GENERACIÓN DE ENEMIGOS Y REHENES EN EL MAPA
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
        enemies.push({
            ...model,
            hp: 100,
            speed: 4.2,
            shootCooldown: Math.random() * 2
        });
    });

    const hostageCoords = [
        [-35, -5],
        [45, -62],
        [-72, -25],
        [0, -115]
    ];
    hostageCoords.forEach(([x, z]) => {
        const model = createCharacterMesh(false);
        model.mesh.position.set(x, 0, z);
        scene.add(model.mesh);
        hostages.push({
            ...model,
            following: false,
            rescued: false
        });
    });
}

function startGame(weaponKey) {
    AudioSys.init();
    AudioSys.playReload();

    currentWeapon = { key: weaponKey, ...WEAPON_STATS[weaponKey], ammo: WEAPON_STATS[weaponKey].mag };
    if (weaponKey === 'nova') { player.hp = 125; player.maxHp = 125; }
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
    document.getElementById('mission-text').innerText = `OBJETIVO: Rescata a los rehenes (${player.rescued}/4) y llévalos a la Luz Verde`;
}

// ==========================================
// CONTROLES FPS (RATÓN BLOQUEADO Y TECLADO)
// ==========================================
const keys = {};
let mouseDown = false;

document.addEventListener('pointerlockchange', () => {
    isPlaying = document.pointerLockElement === renderer.domElement;
    document.getElementById('pause-overlay').style.display = (!isPlaying && player.hp > 0 && player.rescued < 4 && currentWeapon) ? 'flex' : 'none';
});

document.getElementById('pause-overlay').addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!isPlaying) return;
    if (e.code === 'KeyR') reloadWeapon();
    if (e.code === 'KeyG') throwGrenade();
    if (e.code === 'Space' && player.canJump) {
        player.vel.y = 8.5;
        player.canJump = false;
    }
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
    if (e.button === 0) {
        mouseDown = true;
        shootWeapon();
    } else if (e.button === 2) {
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

// ==========================================
// MECÁNICAS DE DISPARO, RECARGA Y GRANADAS
// ==========================================
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

        // Comprobar impacto en paredes vs enemigos
        const wallHits = raycaster.intersectObjects(obstaclesMeshes);
        const wallDist = wallHits.length > 0 ? wallHits[0].distance : 250;

        const enemyHits = raycaster.intersectObjects(enemyMeshes, true);
        let hitPoint = camera.position.clone().addScaledVector(dir, wallDist);

        if (enemyHits.length > 0 && enemyHits[0].distance < wallDist) {
            hitPoint = enemyHits[0].point;
            // Buscar a qué enemigo pertenece la parte impactada
            let hitObj = enemyHits[0].object;
            while (hitObj.parent && !enemyMeshes.includes(hitObj)) hitObj = hitObj.parent;
            const enemyIdx = enemyMeshes.indexOf(hitObj);

            if (enemyIdx !== -1) {
                showHitmarker();
                enemies[enemyIdx].hp -= currentWeapon.damage;
                if (enemies[enemyIdx].hp <= 0) {
                    killEnemy(enemyIdx);
                }
            }
        }

        // Trazadora visual de bala 3D
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            camera.position.clone().add(new THREE.Vector3(0.2, -0.2, -0.8).applyQuaternion(camera.quaternion)),
            hitPoint
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.7 });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);
        tracerLines.push({ mesh: line, life: 4 });
    }

    if (currentWeapon.ammo === 0 && currentWeapon.reserve > 0) reloadWeapon();
}

function killEnemy(index) {
    const enemy = enemies[index];
    // Soltar caja de munición y botiquín en 3D
    const boxGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.4 });
    const loot = new THREE.Mesh(boxGeo, boxMat);
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

    const geo = new THREE.SphereGeometry(0.18, 12, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x15803d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(camera.position);

    const dir = new THREE.Vector3(0, 0.25, -1).applyQuaternion(camera.quaternion).normalize();
    scene.add(mesh);
    grenades.push({
        mesh,
        vel: dir.multiplyScalar(22),
        timer: 2.2
    });
}

function checkBoxCollision(x, z) {
    if (x < -150 || x > 150 || z < -150 || z > 150) return true;
    for (let c of colliders) {
        if (x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ) return true;
    }
    return false;
}

// ==========================================
// BUCLE PRINCIPAL DE SIMULACIÓN 3D
// ==========================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    // Rotar luz de zona segura
    beacon.rotation.y += dt;

    if (isPlaying) {
        if (mouseDown && currentWeapon.auto) shootWeapon();

        // Zoom suave al apuntar (Clic derecho)
        const targetFov = isAiming ? currentWeapon.zoomFov : 75;
        camera.fov += (targetFov - camera.fov) * 12 * dt;
        camera.updateProjectionMatrix();

        // Posición del arma en manos (centrada si apunta, lateral si camina)
        const targetGunX = isAiming ? 0 : 0.26;
        const targetGunY = isAiming ? -0.17 : -0.24;
        weaponHolder.position.x += (targetGunX - weaponHolder.position.x) * 15 * dt;
        weaponHolder.position.y += (targetGunY - weaponHolder.position.y) * 15 * dt;
        weaponHolder.position.z = weaponRecoil;
        weaponRecoil *= 0.8;

        // Movimiento del jugador
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

        // Gravedad y salto
        player.vel.y -= 22 * dt;
        player.pos.y += player.vel.y * dt;
        if (player.pos.y <= 1.75) {
            player.pos.y = 1.75;
            player.vel.y = 0;
            player.canJump = true;
        }

        // Aplicar posición y rotación a la cámara
        camera.position.copy(player.pos);
        const euler = new THREE.Euler(player.pitch + weaponRecoil * 0.5, player.yaw, 0, 'YXZ');
        camera.quaternion.setFromEuler(euler);

        // Recoger cajas de munición y botiquines
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

        // IA de Terroristas 3D
        enemies.forEach(e => {
            const dist = e.mesh.position.distanceTo(player.pos);
            if (dist < 65) {
                // Mirar hacia el jugador
                e.mesh.lookAt(player.pos.x, 0, player.pos.z);

                // Avanzar si está lejos
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

                // Disparar al jugador si tiene línea de visión
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
                            dmgOverlay.style.boxShadow = 'inset 0 0 90px rgba(220, 38, 38, 0.75)';
                            setTimeout(() => dmgOverlay.style.boxShadow = 'inset 0 0 90px rgba(220, 38, 38, 0)', 250);

                            if (player.hp <= 0) endGame(false);
                        }
                    }
                }
            }
        });

        // Rehenes 3D
        hostages.forEach(h => {
            if (h.rescued) return;
            const dist = h.mesh.position.distanceTo(player.pos);
            if (dist < 4.5 && !h.following) {
                h.following = true;
                AudioSys.playHitmarker();
            }
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
            // Comprobar llegada a la Luz Verde de Extracción
            if (h.mesh.position.distanceTo(basePos) < 7.0) {
                h.rescued = true;
                h.following = false;
                h.mesh.visible = false;
                player.rescued++;
                player.money += 400;
                AudioSys.playReload();
                updateHUD();
                if (player.rescued >= 4) endGame(true);
            }
        });

        // Granadas 3D
        for (let i = grenades.length - 1; i >= 0; i--) {
            const g = grenades[i];
            g.vel.y -= 25 * dt;
            g.mesh.position.addScaledVector(g.vel, dt);
            if (g.mesh.position.y < 0.2) {
                g.mesh.position.y = 0.2;
                g.vel.y *= -0.4;
                g.vel.x *= 0.7;
                g.vel.z *= 0.7;
            }
            g.timer -= dt;
            if (g.timer <= 0) {
                AudioSys.playExplosion();
                // Daño en área a enemigos
                for (let j = enemies.length - 1; j >= 0; j--) {
                    if (enemies[j].mesh.position.distanceTo(g.mesh.position) < 14) {
                        killEnemy(j);
                    }
                }
                scene.remove(g.mesh);
                grenades.splice(i, 1);
            }
        }

        // Desvanecer trazadoras de balas
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