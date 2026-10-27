// ============================================================================
// MÓDULO 1: GOOGLE CLOUD FIRESTORE INTEGRATION
// ============================================================================

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqcoqj5ml2bAN2J8Os-pcS7paCap98jxw",
  authDomain: "galang-cee38.firebaseapp.com",
  projectId: "galang-cee38",
  storageBucket: "galang-cee38.firebasestorage.app",
  messagingSenderId: "484525930676",
  appId: "1:484525930676:web:03df92610d99df55f4ffe1",
  measurementId: "G-EY8V2P5ZKB"
};

// Inicializa o Firebase apenas se a chave for informada
let db = null;
try {
    if (firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Conectado ao Google Cloud Firestore!");
    } else {
        console.warn("Aviso: Adicione as credenciais do seu projeto Firebase no topo do arquivo game.js para salvar placares online.");
    }
} catch (e) {
    console.error("Erro na inicialização do Google Cloud:", e);
}

// Salva pontuação no banco em nuvem
async function saveHighScoreToCloud(name, score, level) {
    if (!db) return;
    try {
        await db.collection("highscores").add({
            name: name.toUpperCase() || "AAA",
            score: Number(score),
            level: Number(level),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log("Pontuação registrada no Google Cloud com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar pontuação para o Google Cloud:", error);
    }
}

// Busca o TOP 10 de Jogadores
async function fetchCloudLeaderboard() {
    const listElement = document.getElementById('leaderboardList');
    listElement.innerHTML = '<p class="text-center text-slate-500 py-8">Buscando do Google Cloud...</p>';

    if (!db) {
        listElement.innerHTML = `
            <div class="text-center py-6 text-yellow-400">
                <p class="font-bold mb-2">MODO OFFLINE (LOCAL)</p>
                <p class="text-[10px] text-slate-400">Para ver o ranking global, insira suas credenciais do Firebase no arquivo <span class="text-cyan-400">game.js</span>.</p>
            </div>
        `;
        return;
    }

    try {
        const snapshot = await db.collection("highscores")
            .orderBy("score", "desc")
            .limit(10)
            .get();

        if (snapshot.empty) {
            listElement.innerHTML = '<p class="text-center text-slate-500 py-8">Nenhum registro encontrado na nuvem.</p>';
            return;
        }

        let html = '';
        let rank = 1;
        snapshot.forEach(doc => {
            const data = doc.data();
            const color = rank === 1 ? 'text-yellow-400 font-bold' : (rank === 2 ? 'text-slate-300' : (rank === 3 ? 'text-amber-600' : 'text-slate-400'));
            html += `
                <div class="flex justify-between items-center py-1.5 border-b border-slate-800">
                    <span class="w-8 ${color}">#${rank}</span>
                    <span class="flex-1 font-bold text-cyan-400 tracking-widest">${data.name}</span>
                    <span class="text-pink-400 mr-4">L${data.level || 1}</span>
                    <span class="text-yellow-400 font-bold">${String(data.score).padStart(6, '0')}</span>
                </div>
            `;
            rank++;
        });
        listElement.innerHTML = html;
    } catch (error) {
        console.error("Erro ao carregar o ranking da nuvem:", error);
        listElement.innerHTML = '<p class="text-center text-red-400 py-8">Falha ao se conectar com a nuvem.</p>';
    }
}

// ============================================================================
// MÓDULO 2: DOM & EVENT LISTENERS
// ============================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 600;
canvas.height = 800;

const scoreText = document.getElementById('scoreText');
const levelText = document.getElementById('levelText');
const livesContainer = document.getElementById('livesContainer');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySubtitle = document.getElementById('overlaySubtitle');
const startBtn = document.getElementById('startBtn');
const nameInputContainer = document.getElementById('nameInputContainer');
const playerNameInput = document.getElementById('playerNameInput');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');

const keys = { left: false, right: false, shoot: false };

window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === ' ' || e.key === 'Spacebar') keys.shoot = true;
});

window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === ' ' || e.key === 'Spacebar') keys.shoot = false;
});

// Suporte Touch Mobile
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnFire = document.getElementById('btnFire');

if (btnLeft && btnRight && btnFire) {
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.left = true; });
    btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.left = false; });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.right = true; });
    btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.right = false; });
    btnFire.addEventListener('touchstart', (e) => { e.preventDefault(); keys.shoot = true; });
    btnFire.addEventListener('touchend', (e) => { e.preventDefault(); keys.shoot = false; });
}

leaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.remove('hidden');
    leaderboardModal.classList.add('flex');
    fetchCloudLeaderboard();
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.add('hidden');
    leaderboardModal.classList.remove('flex');
});

// ============================================================================
// MÓDULO 3: SINTETIZADOR DE ÁUDIO (WEB AUDIO API)
// ============================================================================
class SoundFX {
    constructor() { this.ctx = null; }
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    playLaser(isFast = false, isTriple = false) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isTriple ? 'triangle' : 'sawtooth';
        osc.frequency.setValueAtTime(isFast ? 1200 : (isTriple ? 1000 : 850), this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + (isFast ? 0.08 : 0.12));
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isFast ? 0.08 : 0.12));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + (isFast ? 0.08 : 0.12));
    }
    playPowerUp() {
        if (!this.ctx) return;
        [300, 500, 700, 900, 1200].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.04);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.04 + 0.1);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.04);
            osc.stop(this.ctx.currentTime + idx * 0.04 + 0.1);
        });
    }
    playBomb() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
    playExplosion(isBoss = false) {
        if (!this.ctx) return;
        const dur = isBoss ? 0.6 : 0.3;
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(isBoss ? 400 : 900, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(isBoss ? 0.5 : 0.35, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start();
        noise.stop(this.ctx.currentTime + dur);
    }
    playLevelUp() {
        if (!this.ctx) return;
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.2, this.ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.08);
            osc.stop(this.ctx.currentTime + idx * 0.08 + 0.2);
        });
    }
    playLifeUp() {
        if (!this.ctx) return;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);
            gain.gain.setValueAtTime(0.25, this.ctx.currentTime + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.06 + 0.15);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(this.ctx.currentTime + idx * 0.06);
            osc.stop(this.ctx.currentTime + idx * 0.06 + 0.15);
        });
    }
}
const audio = new SoundFX();

// ============================================================================
// MÓDULO 4: AMBIENTE E ELEMENTOS VISUAIS
// ============================================================================
const stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * 600,
    y: Math.random() * 800,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 2 + 0.8,
    color: ['#ffffff', '#00f0ff', '#ff0055', '#ffcc00'][Math.floor(Math.random() * 4)]
}));

const backgroundAsteroids = Array.from({ length: 5 }, () => ({
    x: Math.random() * 600,
    y: Math.random() * 800,
    radius: Math.random() * 25 + 15,
    speed: Math.random() * 0.8 + 0.3,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02
}));

function updateStars() {
    stars.forEach(star => {
        star.y += star.speed * warpSpeed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    });
}

function drawStageBackground(level) {
    // Define um tom de cor único baseado diretamente no número da fase usando HSL
    const hue = (level * 45) % 360;

    if (level === 1) { 
        // Fase 1: Azul Espacial Clássico
        ctx.fillStyle = '#03030d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (level === 2) { 
        // Fase 2: Nebulosa Laranja com Asteroides Flutuantes
        ctx.fillStyle = '#0d0703';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        backgroundAsteroids.forEach(ast => {
            ast.y += ast.speed * warpSpeed;
            ast.rot += ast.rotSpeed;
            if (ast.y - ast.radius > canvas.height) {
                ast.y = -ast.radius;
                ast.x = Math.random() * canvas.width;
            }
            ctx.save();
            ctx.translate(ast.x, ast.y);
            ctx.rotate(ast.rot);
            ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, ast.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    } else if (level === 3) { 
        // Fase 3: Gradiente Radial Roxo Profundo
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 20,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.7
        );
        grad.addColorStop(0, '#2a0826');
        grad.addColorStop(1, '#05020c');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (level === 4) { 
        // Fase 4: Grid Cibernético Neon
        ctx.fillStyle = '#020b14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        const gridSpacing = 40;
        const offset = (Date.now() * 0.05 * warpSpeed) % gridSpacing;
        for (let x = 0; x < canvas.width; x += gridSpacing) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = offset; y < canvas.height; y += gridSpacing) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
    } else { 
        // Fase 5 em diante: Gradientes Dinâmicos Únicos gerados por matemática (muda a cor a cada fase nova)
        const grad = ctx.createRadialGradient(
            canvas.width / 2, canvas.height * 0.3, 10,
            canvas.width / 2, canvas.height * 0.3, canvas.width
        );
        grad.addColorStop(0, `hsl(${hue}, 70%, 18%)`);
        grad.addColorStop(0.5, `hsl(${hue}, 60%, 8%)`);
        grad.addColorStop(1, '#010408');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    drawStars();
}

function drawStars() {
    stars.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.fillRect(star.x, star.y, star.size, star.size * (warpSpeed > 2 ? 4 : 1));
    });
}

class Particle {
    constructor(x, y, color, sizeMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * (6 * sizeMultiplier);
        this.vy = (Math.random() - 0.5) * (6 * sizeMultiplier);
        this.size = (Math.random() * 3 + 2) * sizeMultiplier;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

// ============================================================================
// MÓDULO 5: ENTIDADES DO JOGO
// ============================================================================

// Nave do Jogador
class Player {
    constructor() {
        this.width = 44;
        this.height = 44;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 75;
        this.speed = 6.5;
        this.invulnerable = 0;
        this.weaponLevel = 1; // 1: Single, 2: Double, 3: Triple, 4: Quad Burst
        this.fireRateTimer = 0;
        this.shieldTimer = 0;
        this.tilt = 0;
    }
    update() {
        this.tilt = 0;
        if (keys.left && this.x > 10) { this.x -= this.speed; this.tilt = -0.15; }
        if (keys.right && this.x < canvas.width - this.width - 10) { this.x += this.speed; this.tilt = 0.15; }

        if (this.invulnerable > 0) this.invulnerable--;
        if (this.fireRateTimer > 0) this.fireRateTimer--;
        if (this.shieldTimer > 0) this.shieldTimer--;

        // Propulsores e Efeitos de Rastro
        if (Math.random() < 0.75) {
            const engineColor = this.fireRateTimer > 0 ? '#ffcc00' : (this.weaponLevel >= 3 ? '#ff0055' : '#00f0ff');
            particles.push(new Particle(this.x + 10, this.y + this.height - 2, engineColor, 0.6));
            particles.push(new Particle(this.x + this.width - 10, this.y + this.height - 2, engineColor, 0.6));
        }
    }
    draw() {
        if (this.invulnerable > 0 && Math.floor(this.invulnerable / 4) % 2 === 0) return;

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.tilt);

        // Escudo de Energia
        if (this.shieldTimer > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, 34, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.18)';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.shadowBlur = 18;
            ctx.shadowColor = '#00f0ff';
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Render da Aeronave Principal
        const glowColor = this.weaponLevel >= 3 ? '#ff0055' : (this.fireRateTimer > 0 ? '#ffcc00' : '#00f0ff');
        ctx.shadowBlur = 18;
        ctx.shadowColor = glowColor;

        // Asas
        ctx.fillStyle = '#0066aa';
        ctx.beginPath();
        ctx.moveTo(-26, 18); ctx.lineTo(-28, 2); ctx.lineTo(-14, -12); ctx.lineTo(-10, 16);
        ctx.closePath(); ctx.fill();

        ctx.beginPath();
        ctx.moveTo(26, 18); ctx.lineTo(28, 2); ctx.lineTo(14, -12); ctx.lineTo(10, 16);
        ctx.closePath(); ctx.fill();

        // Fuselagem
        ctx.fillStyle = glowColor;
        ctx.beginPath();
        ctx.moveTo(0, -26); ctx.lineTo(12, -8); ctx.lineTo(18, 14); ctx.lineTo(8, 22);
        ctx.lineTo(0, 18); ctx.lineTo(-8, 22); ctx.lineTo(-18, 14); ctx.lineTo(-12, -8);
        ctx.closePath(); ctx.fill();

        // Canhões Adicionais de Acordo com Nível da Arma
        if (this.weaponLevel >= 2) {
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(-28, -6, 4, 20);
            ctx.fillRect(24, -6, 4, 20);
        }

        // Cockpit
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -20); ctx.lineTo(6, -6); ctx.lineTo(0, 3); ctx.lineTo(-6, -6);
        ctx.closePath(); ctx.fill();

        ctx.restore();
    }
}

// Bônus e Power-Ups
class PowerUp {
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        this.size = 24; this.vy = 1.8; this.pulse = 0;
    }
    update() { this.y += this.vy; this.pulse += 0.08; }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        const scale = 1 + Math.sin(this.pulse) * 0.12;
        ctx.scale(scale, scale);

        let color = '#00f0ff', label = '⚡';
        if (this.type === 'DOUBLE_SHOT') { color = '#ffcc00'; label = '🔫'; }
        else if (this.type === 'SHIELD') { color = '#00f0ff'; label = '🛡️'; }
        else if (this.type === 'RAPID_FIRE') { color = '#a855f7'; label = '⚡'; }
        else if (this.type === 'BOMB') { color = '#ff0055'; label = '💣'; }
        else if (this.type === 'EXTRA_LIFE') { color = '#10b981'; label = '💖'; }

        ctx.shadowBlur = 14; ctx.shadowColor = color;
        ctx.fillStyle = 'rgba(10, 10, 25, 0.88)'; ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 1);
        ctx.restore();
    }
}

// Tiros e Projéteis
class Bullet {
    constructor(x, y, vx = 0, isEnemy = false, vy = null) {
        this.x = x; this.y = y; this.vx = vx;
        this.vy = vy !== null ? vy : (isEnemy ? 4.5 : -11);
        this.width = isEnemy ? 5 : 4; this.height = isEnemy ? 12 : 16;
        this.isEnemy = isEnemy;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    draw() {
        ctx.save();
        ctx.fillStyle = this.isEnemy ? '#ff0055' : (player.fireRateTimer > 0 ? '#a855f7' : (player.weaponLevel >= 3 ? '#ffcc00' : '#00f0ff'));
        ctx.shadowBlur = 12; ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(this.x - this.width / 2, this.y, this.width, this.height);
        ctx.restore();
    }
}

// Inimigos e Voo Inteligente
class Enemy {
    constructor(gridX, gridY, type, level) {
        this.gridX = gridX; this.gridY = gridY; this.type = type;
        this.width = type === 2 ? 44 : 34; this.height = type === 2 ? 44 : 34;
        this.originX = 0; this.originY = 0; this.x = 0; this.y = 0;
        this.state = 'FORMATION'; this.pathProgress = 0; this.diveWaypoints = [];
        this.diveSpeed = 0.007; this.animTimer = Math.random() * 10;
        this.hp = type === 2 ? (3 + Math.floor(level / 2)) : (type === 1 ? 2 : 1);
        this.scoreValue = (type + 1) * 100 * level;
    }
    calculateFormationPos(formationOffsetX, formationOffsetY) {
        const spacingX = Math.min(canvas.width / 11, 48);
        const spacingY = 40;
        const startX = (canvas.width - (8 * spacingX)) / 2 + spacingX / 2;
        const startY = 70;
        this.originX = startX + this.gridX * spacingX + formationOffsetX;
        this.originY = startY + this.gridY * spacingY + formationOffsetY;
    }
    startDive(playerX, playerY) {
        if (this.state !== 'FORMATION') return;
        this.state = 'DIVING';
        this.pathProgress = 0;

        if (this.type === 2) {
            const predictedX = Math.max(20, Math.min(canvas.width - 20, playerX + (keys.left ? -80 : (keys.right ? 80 : 0))));
            this.diveWaypoints = [
                { x: this.x, y: this.y },
                { x: this.x + (Math.random() > 0.5 ? 200 : -200), y: this.y + 120 },
                { x: predictedX, y: playerY - 30 },
                { x: this.originX, y: -60 }
            ];
            this.diveSpeed = 0.009 + (currentLevel * 0.0012);
        } else if (this.type === 1) {
            const dir = Math.random() > 0.5 ? 1 : -1;
            this.diveWaypoints = [
                { x: this.x, y: this.y },
                { x: this.x + (180 * dir), y: this.y + 200 },
                { x: this.x - (180 * dir), y: this.y + 380 },
                { x: this.originX, y: -60 }
            ];
            this.diveSpeed = 0.013 + (currentLevel * 0.0015);
        } else {
            const offset = (Math.random() > 0.5 ? 160 : -160);
            this.diveWaypoints = [
                { x: this.x, y: this.y },
                { x: this.x + offset, y: this.y + 180 },
                { x: playerX, y: playerY },
                { x: this.originX, y: -60 }
            ];
            this.diveSpeed = 0.011 + (currentLevel * 0.0012);
        }
    }
    shootWhileMoving(playerX, playerY) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;

        if (this.type === 0) {
            enemyBullets.push(new Bullet(centerX, centerY, 0, true));
        } else if (this.type === 1) {
            enemyBullets.push(new Bullet(centerX - 6, centerY, -1, true));
            enemyBullets.push(new Bullet(centerX + 6, centerY, 1, true));
        } else if (this.type === 2) {
            const dx = (playerX + 18) - centerX;
            const dy = playerY - centerY;
            const angle = Math.atan2(dy, dx);
            const speed = 4.5;
            enemyBullets.push(new Bullet(centerX, centerY, Math.cos(angle) * speed, true, Math.sin(angle) * speed));
        }
    }
    update(level, formationOffsetX, formationOffsetY, playerX, playerY) {
        this.animTimer += 0.1;
        this.calculateFormationPos(formationOffsetX, formationOffsetY);

        if (this.state === 'FORMATION') {
            this.x = this.originX;
            this.y = this.originY;
            if (Math.random() < 0.0012 + (level * 0.0006)) this.startDive(playerX, playerY);
        } else if (this.state === 'DIVING') {
            this.pathProgress += this.diveSpeed;
            if (this.pathProgress >= 1) {
                this.state = 'FORMATION';
                this.pathProgress = 0;
            } else {
                const p = this.diveWaypoints, t = this.pathProgress;
                const cx = 3 * (p[1].x - p[0].x), bx = 3 * (p[2].x - p[1].x) - cx, ax = p[3].x - p[0].x - cx - bx;
                const cy = 3 * (p[1].y - p[0].y), by = 3 * (p[2].y - p[1].y) - cy, ay = p[3].y - p[0].y - cy - by;

                this.x = (ax * Math.pow(t, 3)) + (bx * Math.pow(t, 2)) + (cx * t) + p[0].x;
                this.y = (ay * Math.pow(t, 3)) + (by * Math.pow(t, 2)) + (cy * t) + p[0].y;

                if (Math.random() < (this.type === 1 ? 0.05 : 0.035) + (level * 0.006)) {
                    this.shootWhileMoving(playerX, playerY);
                }
            }
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.shadowBlur = 14;
        ctx.shadowColor = ['#00ff66', '#ffcc00', '#ff0055'][this.type];

        const pulse = Math.sin(this.animTimer) * 2.5;

        if (this.type === 2) { 
            ctx.fillStyle = '#ff0055';
            ctx.beginPath();
            ctx.moveTo(0, 22 + pulse); ctx.lineTo(24, 10); ctx.lineTo(26, -12); ctx.lineTo(14, -22);
            ctx.lineTo(-14, -22); ctx.lineTo(-26, -12); ctx.lineTo(-24, 10); ctx.closePath(); ctx.fill();

            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -2, 6, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 1) { 
            ctx.fillStyle = '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(0, -16); ctx.lineTo(18, -4); ctx.lineTo(22, 14 + pulse); ctx.lineTo(0, 10);
            ctx.lineTo(-22, 14 + pulse); ctx.lineTo(-18, -4); ctx.closePath(); ctx.fill();
        } else { 
            ctx.fillStyle = '#00ff66';
            ctx.beginPath();
            ctx.moveTo(0, 18 + pulse); ctx.lineTo(16, 4); ctx.lineTo(0, -10); ctx.lineTo(-16, 4); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
}

// Estágio e Variáveis Globais de Estado
let gameState = 'START';
let score = 0;
let lives = 3;
let currentLevel = 1;
let lastShootTime = 0;
let levelBannerTimer = 0;
let warpSpeed = 1;

let player = new Player();
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerUps = [];

let formationOffsetX = 0;
let formationOffsetY = 0;
let formationDirection = 1;

function restartCurrentStage() {
    bullets = [];
    enemyBullets = [];
    powerUps = [];
    player = new Player();
    player.invulnerable = 120;
    spawnLevelWave(currentLevel);
}

function updateFormationMovement(level) {
    const speed = 1.3 + (level * 0.25);
    formationOffsetX += speed * formationDirection;
    if (Math.abs(formationOffsetX) > 60) formationDirection *= -1;
    formationOffsetY = Math.sin(Date.now() * 0.003) * 12;
}

function spawnLevelWave(level) {
    enemies = []; powerUps = []; formationOffsetX = 0; formationOffsetY = 0; formationDirection = 1;
    const rows = Math.min(3 + Math.floor(level / 2), 5);
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 8; col++) {
            const type = row === 0 ? 2 : (row === 1 ? 1 : 0);
            enemies.push(new Enemy(col, row, type, level));
        }
    }
}

function triggerExplosion(x, y, color = '#ff0055', count = 20, isBoss = false) {
    audio.playExplosion(isBoss);
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color, isBoss ? 2 : 1));
}

function triggerSmartBomb() {
    audio.playBomb();
    enemyBullets = [];
    enemies.forEach(enemy => {
        enemy.hp--;
        triggerExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ff0055', 10);
    });
}

function updateLivesUI() {
    livesContainer.innerHTML = '';
    for (let i = 0; i < lives; i++) {
        const icon = document.createElement('div');
        icon.className = 'w-3 h-4 bg-cyan-400 rounded-sm shadow-[0_0_8px_#00f0ff]';
        livesContainer.appendChild(icon);
    }
}

function resetGame() {
    score = 0; lives = 3; currentLevel = 1;
    scoreText.textContent = '000000';
    levelText.textContent = `NÍVEL ${currentLevel}`;
    updateLivesUI();
    player = new Player();
    bullets = []; enemyBullets = []; particles = []; powerUps = [];
    spawnLevelWave(currentLevel);
}

// Variáveis para travar o jogo a 60 FPS fixos
let lastFrameTime = 0;
const fps = 60;
const frameInterval = 1000 / fps; // ~16.66ms por frame

function gameLoop(currentTime) {
    // Solicita o próximo frame
    requestAnimationFrame(gameLoop);

    // Calcula o tempo decorrido desde o último frame
    const elapsed = currentTime - lastFrameTime;

    // Se ainda não passou o tempo de 1 frame (16.6ms), ignora esta atualização
    if (elapsed < frameInterval) return;

    // Ajusta o tempo do último frame ignorando eventuais atrasos acumulados
    lastFrameTime = currentTime - (elapsed % frameInterval);

    // =========================================================================
    // LÓGICA DO JOGO (MANTÉM O TEU CÓDIGO NORMAL ABAIXO)
    // =========================================================================
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateStars();
    drawStageBackground(currentLevel);

    if (gameState === 'PLAYING') {
        updateFormationMovement(currentLevel);

        // Tiro
        const fireDelay = player.fireRateTimer > 0 ? 70 : 150;
        if (keys.shoot && Date.now() - lastShootTime > fireDelay) {
            const pX = player.x + player.width / 2, pY = player.y;
            if (player.weaponLevel === 1) {
                bullets.push(new Bullet(pX, pY));
            } else if (player.weaponLevel === 2) {
                bullets.push(new Bullet(pX - 10, pY));
                bullets.push(new Bullet(pX + 10, pY));
            } else if (player.weaponLevel === 3) {
                bullets.push(new Bullet(pX, pY));
                bullets.push(new Bullet(pX - 14, pY, -2.2));
                bullets.push(new Bullet(pX + 14, pY, 2.2));
            } else {
                bullets.push(new Bullet(pX - 8, pY));
                bullets.push(new Bullet(pX + 8, pY));
                bullets.push(new Bullet(pX - 18, pY, -3));
                bullets.push(new Bullet(pX + 18, pY, 3));
            }
            audio.playLaser(player.fireRateTimer > 0, player.weaponLevel > 1);
            lastShootTime = Date.now();
        }

        player.update();
        player.draw();

        // Tiros do Jogador
        bullets.forEach((bullet, bIdx) => {
            bullet.update(); bullet.draw();
            if (bullet.y < -20 || bullet.x < 0 || bullet.x > canvas.width) bullets.splice(bIdx, 1);
        });

        // Bônus e Power-Ups
        powerUps.forEach((pu, puIdx) => {
            pu.update(); pu.draw();
            const dist = Math.hypot((player.x + player.width / 2) - pu.x, (player.y + player.height / 2) - pu.y);
            if (dist < pu.size / 2 + player.width / 2) {
                audio.playPowerUp();
                if (pu.type === 'RAPID_FIRE') player.fireRateTimer = 240;
                else if (pu.type === 'DOUBLE_SHOT' && player.weaponLevel < 4) player.weaponLevel++;
                else if (pu.type === 'SHIELD') player.shieldTimer = 240;
                else if (pu.type === 'BOMB') triggerSmartBomb();
                else if (pu.type === 'EXTRA_LIFE' && lives < 5) { lives++; updateLivesUI(); audio.playLifeUp(); }
                powerUps.splice(puIdx, 1);
            } else if (pu.y > canvas.height + 30) powerUps.splice(puIdx, 1);
        });

        // Tiros Inimigos
        enemyBullets.forEach((bullet, ebIdx) => {
            bullet.update(); bullet.draw();
            if (player.invulnerable === 0 && player.shieldTimer === 0 && bullet.x > player.x && bullet.x < player.x + player.width && bullet.y > player.y && bullet.y < player.y + player.height) {
                enemyBullets.splice(ebIdx, 1);
                triggerExplosion(player.x + player.width / 2, player.y + player.height / 2, '#00f0ff', 35);
                lives--; 
                updateLivesUI();

                if (lives <= 0) {
                    handleGameOver();
                } else {
                    restartCurrentStage();
                }
            } else if (player.shieldTimer > 0 && bullet.x > player.x - 10 && bullet.x < player.x + player.width + 10 && bullet.y > player.y - 10 && bullet.y < player.y + player.height + 10) {
                enemyBullets.splice(ebIdx, 1);
            }
            if (bullet.y > canvas.height + 20 || bullet.y < -20) enemyBullets.splice(ebIdx, 1);
        });

        // Inimigos e Colisões
        let activeEnemies = 0;
        enemies.forEach((enemy, eIdx) => {
            if (!enemy) return;
            activeEnemies++;
            enemy.update(currentLevel, formationOffsetX, formationOffsetY, player.x, player.y);
            enemy.draw();

            // Lógica de Colisão Corrigida (Caixa contra Caixa + Tolerância de Velocidade)
            bullets.forEach((bullet, bIdx) => {
                const bulletLeft = bullet.x - bullet.width / 2;
                const bulletRight = bullet.x + bullet.width / 2;
                const bulletTop = bullet.y;
                const bulletBottom = bullet.y + bullet.height + 10; // Adicionada tolerância para compensar velocidade alta

                const enemyLeft = enemy.x;
                const enemyRight = enemy.x + enemy.width;
                const enemyTop = enemy.y;
                const enemyBottom = enemy.y + enemy.height;

                // Verificação AABB completa de sobreposição das caixas
                if (bulletRight >= enemyLeft && 
                    bulletLeft <= enemyRight && 
                    bulletBottom >= enemyTop && 
                    bulletTop <= enemyBottom) {
                    
                    bullets.splice(bIdx, 1);
                    enemy.hp--;
                    if (enemy.hp <= 0) {
                        triggerExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.type === 2 ? '#ff0055' : '#00ff66', 20, enemy.type === 2);
                        
                        // Lógica Aprimorada de Drop de Power-Ups
                        if (Math.random() < (enemy.type === 2 ? 0.35 : 0.08)) {
                            const types = ['RAPID_FIRE', 'DOUBLE_SHOT', 'SHIELD', 'BOMB', 'EXTRA_LIFE'];
                            const selectedType = types[Math.floor(Math.random() * types.length)];
                            powerUps.push(new PowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, selectedType));
                        }
                        score += enemy.scoreValue;
                        scoreText.textContent = String(score).padStart(6, '0');
                        enemies.splice(eIdx, 1);
                    }
                }
            });

            // Colisão Direta
            if (enemy.x < player.x + player.width && enemy.x + enemy.width > player.x && enemy.y < player.y + player.height && enemy.y + enemy.height > player.y) {
                triggerExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                enemies.splice(eIdx, 1);
                if (player.shieldTimer === 0 && player.invulnerable === 0) {
                    lives--; 
                    updateLivesUI();
                    if (lives <= 0) {
                        handleGameOver();
                    } else {
                        restartCurrentStage();
                    }
                }
            }
        });

        if (activeEnemies === 0 && gameState === 'PLAYING') {
            gameState = 'LEVEL_TRANSITION';
            levelBannerTimer = 120;
            warpSpeed = 8;

            if (currentLevel % 3 === 0 && lives < 5) {
                lives++;
                updateLivesUI();
                audio.playLifeUp();
            } else {
                audio.playLevelUp();
            }
        }

        particles.forEach((p, pIdx) => {
            p.update(); p.draw();
            if (p.alpha <= 0) particles.splice(pIdx, 1);
        });

    } else if (gameState === 'LEVEL_TRANSITION') {
        levelBannerTimer--;
        ctx.save();
        ctx.fillStyle = '#00f0ff'; ctx.shadowBlur = 20; ctx.shadowColor = '#00f0ff';
        ctx.font = '20px "Press Start 2P"'; ctx.textAlign = 'center';
        ctx.fillText(`FASE ${currentLevel} COMPLETA!`, canvas.width / 2, canvas.height / 2 - 20);

        if (currentLevel % 3 === 0) {
            ctx.fillStyle = '#ffcc00'; ctx.shadowColor = '#ffcc00';
            ctx.font = '12px "Press Start 2P"';
            ctx.fillText(`+1 VIDA BÔNUS ADICIONADA!`, canvas.width / 2, canvas.height / 2 + 15);
        }

        ctx.restore();

        if (levelBannerTimer <= 0) {
            currentLevel++; warpSpeed = 1;
            levelText.textContent = `NÍVEL ${currentLevel}`;
            spawnLevelWave(currentLevel);
            gameState = 'PLAYING';
        }
    }

    updateLivesUI();
    requestAnimationFrame(timestamp => {
    lastFrameTime = timestamp;
    gameLoop(timestamp);
    })
}

// Finalização do Jogo
function handleGameOver() {
    gameState = 'GAMEOVER';
    overlayTitle.textContent = "GAME OVER";
    overlaySubtitle.innerHTML = `Sua pontuação final no Nível ${currentLevel}:<br><span class="text-2xl text-yellow-400 glow-yellow font-bold">${score}</span>`;
    startBtn.textContent = "SALVAR & REINICIAR";
    nameInputContainer.classList.remove('hidden');
    nameInputContainer.classList.add('flex');
    overlay.classList.remove('hidden');
}

startBtn.addEventListener('click', async () => {
    audio.init();
    
    // Se o jogo acabou, salva o score atual antes de resetar
    if (gameState === 'GAMEOVER') {
        const initials = playerNameInput.value.trim() || 'ACE';
        await saveHighScoreToCloud(initials, score, currentLevel);
    }

    // Esconde os campos de input do ranking
    nameInputContainer.classList.add('hidden');
    nameInputContainer.classList.remove('flex');
    
    // Reseta completamente as variáveis, pontuação e fases
    resetGame();
    
    // Altera o estado para jogando e esconde o menu overlay
    gameState = 'PLAYING';
    overlay.classList.add('hidden');
});

updateLivesUI();
requestAnimationFrame(gameLoop);