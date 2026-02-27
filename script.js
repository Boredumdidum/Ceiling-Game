// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 1100;
canvas.height = 680;

// Pre-defined font strings to avoid repeated parsing
const FONT_QUESTION = 'bold 24px Arial';
const FONT_ARROW = '14px Arial';

// ==================== SOUND SYSTEM ====================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let musicGain = null;
let sfxGain = null;
let bgMusicInterval = null;
let musicPlaying = false;
let splashBuffer = null; // Cached splash noise buffer

function initAudio() {
    if (audioCtx) return;
    audioCtx = new AudioCtx();
    // Master gains
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.25;
    musicGain.connect(audioCtx.destination);
    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.35;
    sfxGain.connect(audioCtx.destination);
}

function playSound(type) {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t = audioCtx.currentTime;

    switch (type) {
        case 'jump': {
              // Play Super Mario Jump sound effect
              const audio = new Audio('assets/sounds/Super+Mario+-+Jump+(Sound+Effect).mp3');
              audio.volume = 0.35;
              audio.play();
              break;
        }
        case 'coin': {
            // Two-tone bling
            const o1 = audioCtx.createOscillator();
            const o2 = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o1.type = 'square';
            o2.type = 'square';
            o1.frequency.setValueAtTime(988, t); // B5
            o2.frequency.setValueAtTime(1319, t + 0.07); // E6
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            o1.connect(g).connect(sfxGain);
            o2.connect(g);
            o1.start(t);
            o1.stop(t + 0.07);
            o2.start(t + 0.07);
            o2.stop(t + 0.2);
            break;
        }
        case 'stomp': {
            // Thud + pop
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'triangle';
            o.frequency.setValueAtTime(400, t);
            o.frequency.exponentialRampToValueAtTime(100, t + 0.1);
            g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.15);
            break;
        }
        case 'kick': {
            // Shell kick whoosh
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(200, t);
            o.frequency.exponentialRampToValueAtTime(800, t + 0.08);
            o.frequency.exponentialRampToValueAtTime(300, t + 0.15);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.18);
            break;
        }
        case 'powerup': {
            // Rising arpeggio
            const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(freq, t + i * 0.08);
                g.gain.setValueAtTime(0.18, t + i * 0.08);
                g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.08 + 0.12);
                o.connect(g).connect(sfxGain);
                o.start(t + i * 0.08);
                o.stop(t + i * 0.08 + 0.12);
            });
            break;
        }
        case 'blockhit': {
            // Short bump sound
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(300, t);
            o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.1);
            break;
        }
        case 'damage': {
            // Descending buzz
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sawtooth';
            o.frequency.setValueAtTime(500, t);
            o.frequency.exponentialRampToValueAtTime(100, t + 0.3);
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.35);
            break;
        }
        case 'gameover': {
            // Sad descending tones
            const notes = [392, 349, 330, 262]; // G4 F4 E4 C4
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(freq, t + i * 0.2);
                g.gain.setValueAtTime(0.25, t + i * 0.2);
                g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.2 + 0.25);
                o.connect(g).connect(sfxGain);
                o.start(t + i * 0.2);
                o.stop(t + i * 0.2 + 0.25);
            });
            break;
        }
        case 'levelcomplete': {
            // Triumphant fanfare
            const notes = [523, 659, 784, 1047, 784, 1047]; // C E G C G C
            const durations = [0.1, 0.1, 0.1, 0.15, 0.1, 0.3];
            let offset = 0;
            notes.forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.type = 'square';
                o.frequency.setValueAtTime(freq, t + offset);
                g.gain.setValueAtTime(0.2, t + offset);
                g.gain.exponentialRampToValueAtTime(0.01, t + offset + durations[i] + 0.05);
                o.connect(g).connect(sfxGain);
                o.start(t + offset);
                o.stop(t + offset + durations[i] + 0.05);
                offset += durations[i];
            });
            break;
        }
        case 'checkpoint': {
            // Positive two-note chime
            const o1 = audioCtx.createOscillator();
            const o2 = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o1.type = 'triangle';
            o2.type = 'triangle';
            o1.frequency.setValueAtTime(660, t);
            o2.frequency.setValueAtTime(880, t + 0.1);
            g.gain.setValueAtTime(0.2, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            o1.connect(g).connect(sfxGain);
            o2.connect(g);
            o1.start(t);
            o1.stop(t + 0.1);
            o2.start(t + 0.1);
            o2.stop(t + 0.3);
            break;
        }
        case 'swim': {
            // Bubbly upward swim sound
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(300, t);
            o.frequency.exponentialRampToValueAtTime(500, t + 0.08);
            o.frequency.exponentialRampToValueAtTime(350, t + 0.15);
            g.gain.setValueAtTime(0.12, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.18);
            // Bubble overtone
            const o2 = audioCtx.createOscillator();
            const g2 = audioCtx.createGain();
            o2.type = 'sine';
            o2.frequency.setValueAtTime(800, t);
            o2.frequency.exponentialRampToValueAtTime(1200, t + 0.1);
            g2.gain.setValueAtTime(0.06, t);
            g2.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            o2.connect(g2).connect(sfxGain);
            o2.start(t);
            o2.stop(t + 0.12);
            break;
        }
        case 'splash': {
            // Water splash sound - noise burst (cached buffer)
            if (!splashBuffer) {
                const bufferSize = audioCtx.sampleRate * 0.3;
                splashBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
                const data = splashBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
                }
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = splashBuffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, t);
            filter.frequency.exponentialRampToValueAtTime(400, t + 0.25);
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.25, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            noise.connect(filter).connect(g).connect(sfxGain);
            noise.start(t);
            noise.stop(t + 0.3);
            break;
        }
        case 'bubble': {
            // Gentle bubble pop
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(600 + Math.random() * 400, t);
            o.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 500, t + 0.06);
            g.gain.setValueAtTime(0.08, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.08);
            break;
        }
        case 'pipe': {
            // Pipe warp sound - descending slide
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(800, t);
            o.frequency.exponentialRampToValueAtTime(200, t + 0.35);
            g.gain.setValueAtTime(0.18, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
            o.connect(g).connect(sfxGain);
            o.start(t);
            o.stop(t + 0.4);
            break;
        }
    }
}

// Background music - simple looping chiptune melody
function startMusic() {
    if (!audioCtx) initAudio();
    if (musicPlaying) return;
    musicPlaying = true;

    // Select melody and sound based on level style
    let melody;
    let oscType = 'square';
    let volume = 0.12;

    if (levelStyle === 'water') {
        // Underwater waltz melody - dreamy and floaty
        oscType = 'sine';
        volume = 0.10;
        melody = [
            [523, 300], [0, 50], [659, 150], [784, 150], [880, 300], [0, 50],
            [784, 150], [659, 150], [523, 300], [0, 50], [440, 150], [523, 150],
            [659, 450], [0, 100], [587, 300], [0, 50], [659, 150], [784, 150],
            [880, 300], [0, 50], [1047, 150], [880, 150], [784, 450], [0, 100],
            [659, 300], [0, 50], [523, 150], [440, 150], [523, 300], [0, 50],
            [587, 150], [523, 150], [440, 450], [0, 100],
            [392, 300], [0, 50], [440, 150], [523, 150], [587, 300], [0, 50],
            [659, 150], [784, 150], [523, 450], [0, 200],
        ];
    } else {
        // Simple Mario-inspired melody loop
        melody = [
            // note freq, duration in ms
            [659, 140], [659, 140], [0, 140], [659, 140], [0, 140], [523, 140], [659, 140],
            [784, 280], [0, 280], [392, 280], [0, 280],
            [523, 210], [0, 70], [392, 210], [0, 70], [330, 210], [0, 70],
            [440, 140], [494, 140], [0, 70], [466, 140], [440, 140],
            [392, 170], [659, 170], [784, 170], [880, 140], [0, 70],
            [698, 140], [784, 140], [0, 70], [659, 140], [523, 140], [587, 140], [494, 140],
            [0, 280]
        ];
    }

    let noteIndex = 0;
    function playNextNote() {
        if (!musicPlaying || !audioCtx) return;
        const [freq, dur] = melody[noteIndex % melody.length];

        if (freq > 0) {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = oscType;
            o.frequency.setValueAtTime(freq, audioCtx.currentTime);
            g.gain.setValueAtTime(volume, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur / 1000 - 0.01);
            o.connect(g).connect(musicGain);
            o.start();
            o.stop(audioCtx.currentTime + dur / 1000);
        }

        noteIndex++;
        bgMusicInterval = setTimeout(playNextNote, dur);
    }
    playNextNote();
}

function stopMusic() {
    musicPlaying = false;
    if (bgMusicInterval) {
        clearTimeout(bgMusicInterval);
        bgMusicInterval = null;
    }
}
// ==================== END SOUND SYSTEM ====================

// Cache DOM elements for performance
const uiElements = {
    scoreValue: document.getElementById('score-value'),
    coinsValue: document.getElementById('coins-value'),
    livesValue: document.getElementById('lives-value'),
    levelValue: document.getElementById('level-value'),
    bestValue: document.getElementById('best-value'),
    startScreen: document.getElementById('start-screen'),
    gameOverScreen: document.getElementById('game-over-screen'),
    winScreen: document.getElementById('win-screen'),
    finalScore: document.getElementById('final-score'),
    winScore: document.getElementById('win-score'),
    highScoreList: document.getElementById('high-score-list'),
    gameOverHighScore: document.getElementById('game-over-high-score'),
    winHighScore: document.getElementById('win-high-score')
};

// ==================== HIGH SCORE SYSTEM ====================
const HIGH_SCORE_KEY = 'ceilingGameHighScores';
const MAX_HIGH_SCORES = 5;

function loadHighScores() {
    try {
        const data = localStorage.getItem(HIGH_SCORE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.warn('[STORAGE] Failed to load high scores:', e.message);
        return [];
    }
}

function saveHighScores(scores) {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
    } catch (e) {
        console.warn('[STORAGE] Failed to save high scores:', e.message);
    }
}

function addHighScore(newScore, level, playerName) {
    const scores = loadHighScores();
    const name = (playerName || 'Player').substring(0, 12);
    const entry = { score: newScore, level: level, date: Date.now(), name: name };
    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);
    const trimmed = scores.slice(0, MAX_HIGH_SCORES);
    saveHighScores(trimmed);
    // Return the rank (1-based) if it made the list, otherwise 0
    const rank = trimmed.findIndex(e => e.date === entry.date && e.score === entry.score);
    return rank !== -1 ? rank + 1 : 0;
}

function getTopScore() {
    const scores = loadHighScores();
    return scores.length > 0 ? scores[0].score : 0;
}

function renderHighScoreList() {
    const scores = loadHighScores();
    const list = uiElements.highScoreList;
    list.innerHTML = '';
    if (scores.length === 0) {
        list.innerHTML = '<li style="justify-content:center;color:#888;">No scores yet!</li>';
        return;
    }
    const rankClasses = ['', 'rank-1', 'rank-2', 'rank-3'];
    scores.forEach((entry, i) => {
        const li = document.createElement('li');
        const rankClass = i < 3 ? rankClasses[i + 1] : 'rank-other';
        const name = entry.name || 'Player';
        li.innerHTML = `<span class="rank ${rankClass}">#${i + 1}</span><span class="hs-name">${name}</span><span class="hs-score">${entry.score.toLocaleString()}</span><span class="hs-level">Lv${entry.level}</span>`;
        list.appendChild(li);
    });
}

function showHighScoreMessage(element, rank) {
    if (rank === 1) {
        element.textContent = 'NEW #1 HIGH SCORE!';
    } else if (rank > 0) {
        element.textContent = `NEW #${rank} HIGH SCORE!`;
    } else {
        element.classList.add('hidden');
        return;
    }
    element.classList.remove('hidden');
}
// ==================== END HIGH SCORE SYSTEM ====================

// ==================== COIN SHOP SYSTEM ====================
const SHOP_KEY = 'ceilingGameShop';
const WALLET_KEY = 'ceilingGameWallet';

// Shop items definition
const SHOP_SKINS = [
    { id: 'default',  name: 'Classic Red',   price: 0,   bodyColor: '#e74c3c', hatColor: '#e74c3c',  hatBrim: '#c0392b', preview: '#e74c3c' },
    { id: 'blue',     name: 'Cool Blue',     price: 20,  bodyColor: '#3498db', hatColor: '#3498db',  hatBrim: '#2471a3', preview: '#3498db' },
    { id: 'green',    name: 'Luigi Green',   price: 20,  bodyColor: '#27ae60', hatColor: '#27ae60',  hatBrim: '#1e8449', preview: '#27ae60' },
    { id: 'purple',   name: 'Royal Purple',  price: 30,  bodyColor: '#8e44ad', hatColor: '#8e44ad',  hatBrim: '#6c3483', preview: '#8e44ad' },
    { id: 'gold',     name: 'Golden Hero',   price: 50,  bodyColor: '#f1c40f', hatColor: '#f1c40f',  hatBrim: '#d4ac0d', preview: '#f1c40f' },
    { id: 'shadow',   name: 'Shadow Ninja',  price: 60,  bodyColor: '#2c3e50', hatColor: '#2c3e50',  hatBrim: '#1a252f', preview: '#2c3e50' },
    { id: 'pink',     name: 'Bubblegum',     price: 25,  bodyColor: '#e91e90', hatColor: '#e91e90',  hatBrim: '#c2185b', preview: '#e91e90' },
    { id: 'orange',   name: 'Sunset',        price: 30,  bodyColor: '#e67e22', hatColor: '#e67e22',  hatBrim: '#ca6f1e', preview: '#e67e22' },
    { id: 'ice',      name: 'Ice King',      price: 75,  bodyColor: '#85c1e9', hatColor: '#aed6f1',  hatBrim: '#5dade2', preview: '#85c1e9' },
];

const SHOP_ABILITIES = [
    { id: 'extra_life',   name: 'Extra Life',      price: 15, description: '+1 life at start',       icon: '❤️', repeatable: true },
    { id: 'head_mushroom', name: 'Mushroom Start',  price: 25, description: 'Start big (powered)',    icon: '🍄', repeatable: true },
    { id: 'head_fire',    name: 'Fire Start',       price: 40, description: 'Start with Fire Flower', icon: '🔥', repeatable: true },
    { id: 'head_speed',   name: 'Speed Start',      price: 20, description: 'Speed boost at start',   icon: '⚡', repeatable: true },
    { id: 'coin_magnet',  name: 'Coin Magnet',      price: 50, description: 'Wider coin pickup range', icon: '🧲', repeatable: false },
    { id: 'double_coins', name: 'Double Coins',     price: 80, description: 'Earn 2x coins per pickup', icon: '💰', repeatable: false },
];

function loadWallet() {
    try {
        return parseInt(localStorage.getItem(WALLET_KEY)) || 0;
    } catch (e) { console.warn('[STORAGE] Failed to load wallet:', e.message); return 0; }
}

function saveWallet(amount) {
    try { localStorage.setItem(WALLET_KEY, amount.toString()); }
    catch (e) { console.warn('[STORAGE] Failed to save wallet:', e.message); }
}

function addToWallet(amount) {
    const current = loadWallet();
    saveWallet(current + amount);
    if (amount > 0) {
        console.log(`[WALLET] Deposited ${amount} coins. Balance: ${current + amount}`);
    }
}

function loadShopData() {
    try {
        const data = localStorage.getItem(SHOP_KEY);
        return data ? JSON.parse(data) : { owned: ['default'], equipped: 'default', abilities: [] };
    } catch (e) {
        console.warn('[STORAGE] Failed to load shop data:', e.message);
        return { owned: ['default'], equipped: 'default', abilities: [] };
    }
}

function saveShopData(data) {
    try { localStorage.setItem(SHOP_KEY, JSON.stringify(data)); }
    catch (e) { console.warn('[STORAGE] Failed to save shop data:', e.message); }
}

function getEquippedSkin() {
    const shop = loadShopData();
    return SHOP_SKINS.find(s => s.id === shop.equipped) || SHOP_SKINS[0];
}

function getActiveAbilities() {
    const shop = loadShopData();
    return shop.abilities || [];
}

function consumeOneTimeAbilities() {
    // Remove repeatable (consumable) abilities after use; keep permanent ones
    const shop = loadShopData();
    const repeatableIds = SHOP_ABILITIES.filter(a => a.repeatable).map(a => a.id);
    shop.abilities = shop.abilities.filter(id => !repeatableIds.includes(id));
    saveShopData(shop);
}

function renderShop() {
    const shop = loadShopData();
    const wallet = loadWallet();
    document.getElementById('shop-wallet-value').textContent = wallet;

    // Skins tab
    const skinsContainer = document.getElementById('shop-items-skins');
    skinsContainer.innerHTML = '';
    for (const skin of SHOP_SKINS) {
        const owned = shop.owned.includes(skin.id);
        const equipped = shop.equipped === skin.id;
        const canAfford = wallet >= skin.price;

        const div = document.createElement('div');
        div.className = 'shop-item' + (equipped ? ' equipped' : owned ? ' owned' : '');

        let statusHtml, statusClass;
        if (equipped) { statusHtml = 'EQUIPPED'; statusClass = 'equipped'; }
        else if (owned) { statusHtml = 'EQUIP'; statusClass = 'owned'; }
        else if (canAfford) { statusHtml = 'BUY'; statusClass = 'buy'; }
        else { statusHtml = 'LOCKED'; statusClass = 'locked'; }

        div.innerHTML = `
            <div class="shop-item-preview" style="background:${skin.preview};"></div>
            <span class="shop-item-name">${skin.name}</span>
            <span class="shop-item-price">${skin.price === 0 ? 'Free' : skin.price + ' coins'}</span>
            <span class="shop-item-status ${statusClass}">${statusHtml}</span>
        `;

        div.addEventListener('click', () => {
            if (equipped) return;
            if (owned) {
                shop.equipped = skin.id;
                saveShopData(shop);
                console.log(`[SHOP] Equipped skin: ${skin.name}`);
                renderShop();
                playSound('coin');
            } else if (canAfford) {
                saveWallet(loadWallet() - skin.price);
                shop.owned.push(skin.id);
                shop.equipped = skin.id;
                saveShopData(shop);
                console.log(`[SHOP] Purchased & equipped skin: ${skin.name} for ${skin.price} coins. Wallet: ${loadWallet()}`);
                renderShop();
                playSound('powerup');
            }
        });
        skinsContainer.appendChild(div);
    }

    // Abilities tab
    const abilitiesContainer = document.getElementById('shop-items-abilities');
    abilitiesContainer.innerHTML = '';
    for (const ability of SHOP_ABILITIES) {
        const owned = shop.abilities.includes(ability.id);
        const canAfford = wallet >= ability.price;

        const div = document.createElement('div');
        div.className = 'shop-item' + (owned ? ' owned' : '');

        let statusHtml, statusClass;
        if (owned && !ability.repeatable) { statusHtml = 'ACTIVE'; statusClass = 'equipped'; }
        else if (owned && ability.repeatable) { statusHtml = 'READY'; statusClass = 'equipped'; }
        else if (canAfford) { statusHtml = 'BUY'; statusClass = 'buy'; }
        else { statusHtml = 'LOCKED'; statusClass = 'locked'; }

        div.innerHTML = `
            <div class="shop-item-preview" style="background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:22px;">${ability.icon}</div>
            <span class="shop-item-name">${ability.name}</span>
            <span class="shop-item-price">${ability.price} coins</span>
            <span class="shop-item-name" style="font-weight:normal;font-size:10px;color:#aaa;">${ability.description}</span>
            <span class="shop-item-status ${statusClass}">${statusHtml}</span>
        `;

        div.addEventListener('click', () => {
            if (owned && !ability.repeatable) return; // Permanent ability already owned
            if (owned && ability.repeatable) return;  // Already queued for next game
            if (canAfford) {
                saveWallet(loadWallet() - ability.price);
                shop.abilities.push(ability.id);
                saveShopData(shop);
                console.log(`[SHOP] Purchased ability: ${ability.name} for ${ability.price} coins. Wallet: ${loadWallet()}`);
                renderShop();
                playSound('powerup');
            }
        });
        abilitiesContainer.appendChild(div);
    }
}

// Shop tab switching
function initShopTabs() {
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById('shop-items-skins').classList.toggle('hidden', target !== 'skins');
            document.getElementById('shop-items-abilities').classList.toggle('hidden', target !== 'abilities');
        });
    });
}

// Shop open/close
function openShop() {
    initAudio();
    uiElements.startScreen.classList.add('hidden');
    document.getElementById('shop-screen').classList.remove('hidden');
    renderShop();
}

function closeShop() {
    document.getElementById('shop-screen').classList.add('hidden');
    uiElements.startScreen.classList.remove('hidden');
}

initShopTabs();
document.getElementById('shop-btn').addEventListener('click', openShop);
document.getElementById('shop-back-btn').addEventListener('click', closeShop);
// ==================== END COIN SHOP SYSTEM ====================

// Game state
let godMode = false;
let gameRunning = false;
let score = 0;
let coins = 0;
let lives = 3;
let cameraX = 0;
let currentLevel = 1;
let levelStyle = 'overground'; // 'overground' or 'underground'
const LEVEL_WIDTH = 4000;
let frameTime = 0; // Cached Date.now() for the current frame
let bgGradients = {}; // Cached background gradients (rebuilt on level load)
let _perfFrameCount = 0; // Performance: frame counter for FPS logging
let _perfLastTime = 0; // Performance: last FPS log timestamp
let _posLogCounter = 0; // Counter for periodic position debug logging

// Player
const player = {
    x: 100,
    y: 300,
    width: 32,
    height: 48,
    velX: 0,
    velY: 0,
    speed: 5,
    jumpPower: -14,
    gravity: 0.6,
    grounded: false,
    facing: 1,
    frameX: 0,
    frameTimer: 0,
    isJumping: false,
    invincible: false,
    invincibleTimer: 0,
    powered: false, // Has mushroom power-up
    // Star power (invincibility)
    starPower: false,
    starTimer: 0,
    // Fire flower
    hasFireFlower: false,
    fireTimer: 0, // Cooldown between shots
    // Speed boost
    speedBoost: false,
    speedBoostTimer: 0,
    baseSpeed: 5,
    // Wall jump
    jumpKeyHeld: false,
    onWall: false,
    wallDirection: 0, // -1 for left wall, 1 for right wall
    wallSlideSpeed: 2,
    wallJumpPower: -12,
    wallJumpHorizontalPower: 8,
    // Shell pickup
    heldShell: null
};

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
    }
    // Dev mode: press R to return to main menu
    if (godMode && gameRunning && e.code === 'KeyR') {
        console.log('[DEV MODE] Returning to main menu via R key');
        gameRunning = false;
        stopMusic();
        uiElements.startScreen.classList.remove('hidden');
        resetGame();
        // Re-show dev open button
        const devOpenBtn = document.getElementById('dev-open-btn');
        if (devOpenBtn) devOpenBtn.classList.remove('hidden');
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// Platform class
class Platform {
    constructor(x, y, width, height, type = 'ground') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type;
        this.hit = false; // For question blocks
    }

    draw() {
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;

        if (this.type === 'ground') {
            // Grass top
            ctx.fillStyle = '#2d8a2d';
            ctx.fillRect(screenX, this.y, this.width, 10);
            // Dirt
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX, this.y + 10, this.width, this.height - 10);
            // Grass detail
            ctx.fillStyle = '#3da83d';
            for (let i = 0; i < this.width; i += 20) {
                ctx.fillRect(screenX + i, this.y, 10, 5);
            }
        } else if (this.type === 'brick') {
            drawBlockStyle(screenX, this.y, this.width, this.height, 'brick');
        } else if (this.type === 'question') {
            if (this.hit) {
                // Used question block - brown/empty
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(screenX, this.y, this.width, this.height);
                ctx.strokeStyle = '#6B5344';
                ctx.lineWidth = 3;
                ctx.strokeRect(screenX, this.y, this.width, this.height);
            } else {
                // Active question block
                ctx.fillStyle = '#f1c40f';
                ctx.fillRect(screenX, this.y, this.width, this.height);
                ctx.strokeStyle = '#d4a017';
                ctx.lineWidth = 3;
                ctx.strokeRect(screenX, this.y, this.width, this.height);
                // Question mark
                ctx.fillStyle = '#fff';
                ctx.font = FONT_QUESTION;
                ctx.textAlign = 'center';
                ctx.fillText('?', screenX + this.width/2, this.y + this.height/2 + 8);
            }
        } else if (this.type === 'stone') {
            drawBlockStyle(screenX, this.y, this.width, this.height, 'stone');
        } else if (this.type === 'pipe') {
            // Green pipe
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(screenX, this.y, this.width, this.height);
            // Pipe rim
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(screenX - 4, this.y, this.width + 8, 16);
            // Pipe highlight
            ctx.fillStyle = '#58d68d';
            ctx.fillRect(screenX + 4, this.y + 16, 8, this.height - 16);
            // Pipe shadow
            ctx.fillStyle = '#1e8449';
            ctx.fillRect(screenX + this.width - 12, this.y + 16, 8, this.height - 16);
        } else if (this.type === 'sand') {
            // Sandy ocean floor
            ctx.fillStyle = '#c2a64e';
            ctx.fillRect(screenX, this.y, this.width, this.height);
            // Sand surface
            ctx.fillStyle = '#d4b85a';
            ctx.fillRect(screenX, this.y, this.width, 8);
            // Sand ripple detail
            ctx.fillStyle = '#b89a40';
            for (let i = 0; i < this.width; i += 25) {
                ctx.beginPath();
                ctx.arc(screenX + i + 12, this.y + 4, 8, Math.PI, 0);
                ctx.fill();
            }
            // Shell/pebble accents
            ctx.fillStyle = '#e8d8a0';
            for (let i = 0; i < this.width; i += 40) {
                ctx.beginPath();
                ctx.arc(screenX + i + 20, this.y + 18 + (i % 2) * 8, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'coral') {
            drawBlockStyle(screenX, this.y, this.width, this.height, 'coral');
        }
    }
}

// Coin class
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.collected = false;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update() {
        // Only animate if on screen (optimization)
        const screenX = this.x - cameraX;
        if (screenX > -50 && screenX < canvas.width + 50) {
            this.bobOffset += 0.1;
        }
    }

    draw() {
        if (this.collected) return;
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;

        const bobY = this.y + Math.sin(this.bobOffset) * 3;
        
        // Coin body
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.ellipse(screenX + this.width/2, bobY + this.height/2, this.width/2, this.height/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Coin shine
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.ellipse(screenX + this.width/2 - 4, bobY + this.height/2 - 4, 4, 4, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Shared goomba body drawing (used by goomba and flying goomba)
function drawGoombaBody(screenX, y, width, height, bodyColor, headColor, frameX, animatedFeet = true) {
    // Body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(screenX + width/2, y + height - 10, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Head
    ctx.fillStyle = headColor;
    ctx.beginPath();
    ctx.ellipse(screenX + width/2, y + 12, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(screenX + width/2 - 5, y + 10, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(screenX + width/2 + 5, y + 10, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Pupils
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(screenX + width/2 - 5, y + 11, 2, 0, Math.PI * 2);
    ctx.arc(screenX + width/2 + 5, y + 11, 2, 0, Math.PI * 2);
    ctx.fill();
    // Feet
    ctx.fillStyle = '#654321';
    if (animatedFeet) {
        const footOffset = frameX === 0 ? 0 : 3;
        ctx.fillRect(screenX + 4 - footOffset, y + height - 8, 10, 8);
        ctx.fillRect(screenX + width - 14 + footOffset, y + height - 8, 10, 8);
    } else {
        ctx.fillRect(screenX + 6, y + height - 6, 8, 6);
        ctx.fillRect(screenX + width - 14, y + height - 6, 8, 6);
    }
}

// Enemy class
class Enemy {
    constructor(x, y, type = 'goomba') {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.velX = -1.5;
        this.velY = 0;
        this.type = type;
        this.alive = true;
        this.squishTimer = 0;
        this.frameX = 0;
        this.frameTimer = 0;
        
        // Koopa-specific properties
        this.isShell = false;
        this.shellMoving = false;
        this.shellSpeed = 8;
        
        // Flying enemy properties
        this.baseY = y;
        this.flyOffset = Math.random() * Math.PI * 2;
        this.flyAmplitude = 40;
        
        // Adjust size for different enemy types
        if (type === 'koopa') {
            this.height = 40;
            this.velX = -1.2;
        } else if (type === 'flying') {
            this.height = 32;
            this.velX = -1.0;
        } else if (type === 'cheep_cheep') {
            this.width = 30;
            this.height = 24;
            this.velX = -2.0;
            this.flyAmplitude = 50;
            this.swimTimer = Math.random() * Math.PI * 2;
        } else if (type === 'blooper') {
            this.width = 28;
            this.height = 36;
            this.velX = 0;
            this.blooperState = 'drift'; // 'drift' or 'thrust'
            this.blooperTimer = 60 + Math.random() * 60;
        } else if (type === 'eel') {
            this.width = 64;
            this.height = 20;
            this.velX = -0.8;
            this.eelTimer = 0;
            this.eelWave = Math.random() * Math.PI * 2;
        }
    }

    update(platforms) {
        if (!this.alive) {
            this.squishTimer++;
            return this.squishTimer < 30;
        }

        // Skip update if far off-screen (optimization)
        const screenX = this.x - cameraX;
        if (screenX < -200 || screenX > canvas.width + 200) {
            return true; // Keep enemy but don't update
        }
        
        // Flying enemy movement (sine wave)
        if (this.type === 'flying' && !this.isShell) {
            this.flyOffset += 0.05;
            this.y = this.baseY + Math.sin(this.flyOffset) * this.flyAmplitude;
            this.x += this.velX;
            
            // Animation
            this.frameTimer++;
            if (this.frameTimer > 10) {
                this.frameX = (this.frameX + 1) % 2;
                this.frameTimer = 0;
            }
            return true;
        }

        // Water enemy movement - Cheep Cheep (sine wave swim)
        if (this.type === 'cheep_cheep') {
            this.swimTimer += 0.04;
            this.y = this.baseY + Math.sin(this.swimTimer) * this.flyAmplitude;
            this.x += this.velX;
            if (this.x < 0 || this.x > 4000 - this.width) this.velX *= -1;
            this.frameTimer++;
            if (this.frameTimer > 12) {
                this.frameX = (this.frameX + 1) % 2;
                this.frameTimer = 0;
            }
            return true;
        }

        // Water enemy movement - Blooper (thrust/drift squid)
        if (this.type === 'blooper') {
            this.blooperTimer--;
            if (this.blooperTimer <= 0) {
                if (this.blooperState === 'drift') {
                    this.blooperState = 'thrust';
                    this.velY = -4;
                    this.velX = (Math.random() - 0.5) * 3;
                    this.blooperTimer = 20;
                } else {
                    this.blooperState = 'drift';
                    this.velY = 0.5;
                    this.velX = 0;
                    this.blooperTimer = 40 + Math.random() * 40;
                }
            }
            this.x += this.velX;
            this.y += this.velY;
            if (this.y < 50) { this.y = 50; this.velY = 0.5; }
            if (this.y > 400) { this.y = 400; this.velY = -2; this.blooperState = 'thrust'; this.blooperTimer = 20; }
            this.frameTimer++;
            if (this.frameTimer > 10) {
                this.frameX = (this.frameX + 1) % 2;
                this.frameTimer = 0;
            }
            return true;
        }

        // Water enemy movement - Eel (undulating patrol)
        if (this.type === 'eel') {
            this.eelTimer++;
            this.eelWave += 0.06;
            this.x += this.velX;
            this.y = this.baseY + Math.sin(this.eelWave) * 8;
            if (this.x < 0 || this.x > 4000 - this.width) this.velX *= -1;
            this.frameTimer++;
            if (this.frameTimer > 15) {
                this.frameX = (this.frameX + 1) % 2;
                this.frameTimer = 0;
            }
            return true;
        }
        
        // Koopa shell movement
        if (this.isShell && this.shellMoving) {
            this.x += this.velX;
            
            // Shell kills other enemies
            for (const enemy of enemies) {
                if (enemy !== this && enemy.alive && !enemy.isShell) {
                    if (this.x < enemy.x + enemy.width &&
                        this.x + this.width > enemy.x &&
                        this.y < enemy.y + enemy.height &&
                        this.y + this.height > enemy.y) {
                        enemy.alive = false;
                        score += 200;
                        for (let i = 0; i < 6; i++) {
                            particles.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#8B4513'));
                        }
                    }
                }
            }
        }

        // Apply gravity
        this.velY += 0.5;
        this.y += this.velY;
        if (!this.isShell || !this.shellMoving) {
            this.x += this.velX;
        }

        // Platform collision
        let onPlatform = false;
        let currentPlatform = null;
        
        for (const platform of platforms) {
            // Broad-phase check (optimization)
            if (platform.x > this.x + this.width + 50 || 
                platform.x + platform.width < this.x - 50) {
                continue;
            }
            
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.height &&
                this.y + this.height > platform.y) {
                
                // Landing on top
                if (this.velY > 0 && this.y + this.height - this.velY <= platform.y) {
                    this.y = platform.y - this.height;
                    this.velY = 0;
                    onPlatform = true;
                    currentPlatform = platform;
                }
                // Hitting side - shells always bounce off sides (ricochet in pits)
                else if (this.isShell && this.shellMoving) {
                    // Shell bounces off walls
                    this.velX *= -1;
                    if (this.velX > 0) {
                        this.x = platform.x + platform.width + 1;
                    } else {
                        this.x = platform.x - this.width - 1;
                    }
                }
                // Normal enemies turn around
                else if (this.velY <= 0.5) {
                    this.velX *= -1;
                    this.x += this.velX * 2;
                }
            }
        }

        // Edge detection - turn around if about to walk off platform
        // EXCEPT for moving shells - they should fall off edges
        if (onPlatform && currentPlatform && !(this.isShell && this.shellMoving)) {
            const lookAhead = this.velX > 0 ? this.x + this.width + 5 : this.x - 5;
            if (lookAhead < currentPlatform.x || lookAhead > currentPlatform.x + currentPlatform.width) {
                // Check if there's another platform below
                let groundAhead = false;
                for (const platform of platforms) {
                    // Quick skip for far platforms (optimization)
                    if (Math.abs(platform.x - lookAhead) > platform.width + 50) continue;
                    
                    if (lookAhead >= platform.x && lookAhead <= platform.x + platform.width &&
                        platform.y >= this.y + this.height && platform.y <= this.y + this.height + 50) {
                        groundAhead = true;
                        break;
                    }
                }
                if (!groundAhead) {
                    this.velX *= -1;
                }
            }
        }

        // Animation
        this.frameTimer++;
        if (this.frameTimer > 15) {
            this.frameX = (this.frameX + 1) % 2;
            this.frameTimer = 0;
        }

        // Shells can fall into the void
        if (this.isShell && this.y > canvas.height + 100) {
            return false; // Remove shell from game
        }

        return true;
    }

    draw() {
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;

        if (!this.alive) {
            // Squished enemy
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(screenX, this.y + this.height - 10, this.width, 10);
            return;
        }

        if (this.type === 'goomba') {
            drawGoombaBody(screenX, this.y, this.width, this.height, '#8B4513', '#A0522D', this.frameX);
        } else if (this.type === 'koopa') {
            if (this.isShell) {
                // Green shell
                ctx.fillStyle = '#27ae60';
                ctx.beginPath();
                ctx.ellipse(screenX + this.width/2, this.y + 20, 16, 14, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Shell pattern
                ctx.strokeStyle = '#1e8449';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screenX + this.width/2, this.y + 6);
                ctx.lineTo(screenX + this.width/2, this.y + 34);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(screenX + 6, this.y + 20);
                ctx.lineTo(screenX + this.width - 6, this.y + 20);
                ctx.stroke();
            } else {
                // Shell body
                ctx.fillStyle = '#27ae60';
                ctx.beginPath();
                ctx.ellipse(screenX + this.width/2, this.y + this.height - 14, 14, 12, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Head
                ctx.fillStyle = '#f1c40f';
                ctx.beginPath();
                ctx.ellipse(screenX + this.width/2 + (this.velX > 0 ? 4 : -4), this.y + 10, 10, 10, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Eyes
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(screenX + this.width/2 + (this.velX > 0 ? 6 : -2), this.y + 8, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(screenX + this.width/2 + (this.velX > 0 ? 7 : -1), this.y + 8, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // Feet
                ctx.fillStyle = '#f39c12';
                const koopaFootOffset = this.frameX === 0 ? 0 : 3;
                ctx.fillRect(screenX + 6 - koopaFootOffset, this.y + this.height - 8, 8, 8);
                ctx.fillRect(screenX + this.width - 14 + koopaFootOffset, this.y + this.height - 8, 8, 8);
            }
        } else if (this.type === 'flying') {
            // Flying Goomba (Paragoomba)
            // Wings
            ctx.fillStyle = '#ecf0f1';
            const wingFlap = Math.sin(this.flyOffset * 3) * 8;
            // Left wing
            ctx.beginPath();
            ctx.ellipse(screenX + 2, this.y + 10 - wingFlap, 10, 6, -0.3, 0, Math.PI * 2);
            ctx.fill();
            // Right wing
            ctx.beginPath();
            ctx.ellipse(screenX + this.width - 2, this.y + 10 - wingFlap, 10, 6, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            drawGoombaBody(screenX, this.y, this.width, this.height, '#a0522d', '#cd853f', 0, false);
        } else if (this.type === 'cheep_cheep') {
            // Cheep Cheep - red fish
            const dir = this.velX > 0 ? 1 : -1;
            // Body
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2, this.y + this.height/2, 14, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            // Lighter belly
            ctx.fillStyle = '#f5a0a0';
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2, this.y + this.height/2 + 3, 10, 5, 0, 0, Math.PI);
            ctx.fill();
            // Tail fin
            ctx.fillStyle = '#c0392b';
            ctx.beginPath();
            const tailX = screenX + this.width/2 - dir * 14;
            ctx.moveTo(tailX, this.y + this.height/2);
            ctx.lineTo(tailX - dir * 10, this.y + this.height/2 - 8);
            ctx.lineTo(tailX - dir * 10, this.y + this.height/2 + 8);
            ctx.closePath();
            ctx.fill();
            // Top fin
            ctx.beginPath();
            ctx.moveTo(screenX + this.width/2 - 3, this.y + this.height/2 - 9);
            ctx.lineTo(screenX + this.width/2 + 3, this.y + this.height/2 - 14);
            ctx.lineTo(screenX + this.width/2 + 8, this.y + this.height/2 - 8);
            ctx.closePath();
            ctx.fill();
            // Eye
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(screenX + this.width/2 + dir * 6, this.y + this.height/2 - 2, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(screenX + this.width/2 + dir * 7, this.y + this.height/2 - 2, 2, 0, Math.PI * 2);
            ctx.fill();
            // Lips
            ctx.fillStyle = '#ff8080';
            ctx.beginPath();
            ctx.arc(screenX + this.width/2 + dir * 12, this.y + this.height/2 + 1, 3, 0, Math.PI);
            ctx.fill();
        } else if (this.type === 'blooper') {
            // Blooper - white squid
            const squeezed = this.blooperState === 'thrust';
            // Tentacles
            ctx.fillStyle = '#ddd';
            const tentLen = squeezed ? 8 : 14;
            for (let t = 0; t < 4; t++) {
                const tx = screenX + 4 + t * 6;
                const sway = Math.sin(frameTime * 0.005 + t) * 3;
                ctx.fillRect(tx + sway, this.y + this.height - tentLen, 3, tentLen);
            }
            // Body (mantle)
            ctx.fillStyle = '#f0f0f0';
            const bodyH = squeezed ? 16 : 22;
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2, this.y + bodyH/2 + 2, 12, bodyH/2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2 - 5, this.y + 12, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(screenX + this.width/2 + 5, this.y + 12, 3, 4, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'eel') {
            // Eel - green moray
            const dir = this.velX > 0 ? 1 : -1;
            // Body segments (wavy)
            ctx.fillStyle = '#2d6b30';
            for (let seg = 0; seg < 6; seg++) {
                const segX = screenX + this.width/2 - dir * (seg * 10 - 25);
                const segY = this.y + this.height/2 + Math.sin(this.eelWave + seg * 0.8) * 4;
                ctx.beginPath();
                ctx.ellipse(segX, segY, 7, 6, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Lighter belly stripe
            ctx.fillStyle = '#90c890';
            for (let seg = 0; seg < 6; seg++) {
                const segX = screenX + this.width/2 - dir * (seg * 10 - 25);
                const segY = this.y + this.height/2 + Math.sin(this.eelWave + seg * 0.8) * 4 + 3;
                ctx.beginPath();
                ctx.ellipse(segX, segY, 5, 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // Head
            const headX = screenX + this.width/2 + dir * 25;
            const headY = this.y + this.height/2 + Math.sin(this.eelWave) * 4;
            ctx.fillStyle = '#2d6b30';
            ctx.beginPath();
            ctx.ellipse(headX, headY, 9, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eye
            ctx.fillStyle = '#ff4444';
            ctx.beginPath();
            ctx.arc(headX + dir * 4, headY - 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(headX + dir * 4.5, headY - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();
            // Mouth
            ctx.strokeStyle = '#1a4a1a';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(headX + dir * 7, headY + 1, 3, dir > 0 ? -0.5 : 2.64, dir > 0 ? 0.5 : 3.64);
            ctx.stroke();
        }
    }
}

// Flag class
class Flag {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 200;
        this.reached = false;
    }

    draw() {
        const screenX = this.x - cameraX;
        if (screenX + this.width < -50 || screenX > canvas.width + 50) return;

        // Pole
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(screenX + 6, this.y, 4, this.height);
        
        // Ball on top
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(screenX + 8, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Flag
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.moveTo(screenX + 10, this.y + 10);
        ctx.lineTo(screenX + 60, this.y + 30);
        ctx.lineTo(screenX + 10, this.y + 50);
        ctx.closePath();
        ctx.fill();
    }
}

// Particle class for effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.velX = (Math.random() - 0.5) * 6;
        this.velY = (Math.random() - 0.5) * 6 - 2;
        this.size = Math.random() * 6 + 2;
        this.color = color;
        this.life = 30;
    }

    update() {
        this.x += this.velX;
        this.y += this.velY;
        this.velY += 0.2;
        this.life--;
        return this.life > 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.life / 30;
        ctx.fillRect(this.x - cameraX, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// Level data
let platforms = [];
let movingPlatforms = [];
let coinsList = [];
let enemies = [];
let particles = [];
let mushrooms = [];
let powerUps = []; // Stars, Fire Flowers, Speed Boosts
let fireballs = [];
let checkpoints = [];
let flag = null;
let lastCheckpointX = 100;
let lastCheckpointY = 300;

// Secret area system
let secretPipes = [];       // Pipes that lead to secret rooms (references to pipe platforms)
let inSecretRoom = false;   // Currently inside a secret room
let secretRoomReturnX = 0;  // X position to return to after secret room
let secretRoomReturnY = 0;  // Y position to return to after secret room
let secretRoomReturnCameraX = 0;
let savedLevelState = null;  // Saved main level state while in secret room
let secretRoomExitPipe = null; // The exit pipe platform in the secret room
let secretEntryTimer = 0;    // Cooldown to prevent re-entering immediately
let secretPipePromptAlpha = 0; // Fade alpha for the "Press S" prompt
let secretRoomCollectedCoins = {}; // Track collected coins per secret pipe to prevent respawn
let secretRoomBounds = null; // {left, top, width, height} of the current secret room for back wall drawing

// Moving Platform class
class MovingPlatform {
    constructor(x, y, width, height, type, moveAxis, moveDistance, moveSpeed) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // visual style: 'brick', 'stone', etc.
        this.hit = false;
        
        // Movement
        this.startX = x;
        this.startY = y;
        this.moveAxis = moveAxis; // 'horizontal' or 'vertical'
        this.moveDistance = moveDistance; // total distance to travel
        this.moveSpeed = moveSpeed; // pixels per frame
        this.moveOffset = 0;
        this.moveDirection = 1;
        
        // Track delta for carrying player
        this.deltaX = 0;
        this.deltaY = 0;
    }
    
    update() {
        const prevX = this.x;
        const prevY = this.y;
        
        this.moveOffset += this.moveSpeed * this.moveDirection;
        if (this.moveOffset >= this.moveDistance) {
            this.moveOffset = this.moveDistance;
            this.moveDirection = -1;
        } else if (this.moveOffset <= 0) {
            this.moveOffset = 0;
            this.moveDirection = 1;
        }
        
        if (this.moveAxis === 'horizontal') {
            this.x = this.startX + this.moveOffset;
        } else {
            this.y = this.startY + this.moveOffset;
        }
        
        this.deltaX = this.x - prevX;
        this.deltaY = this.y - prevY;
    }
    
    draw() {
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;
        
        // Draw platform base
        drawBlockStyle(screenX, this.y, this.width, this.height, this.type);
        
        // Arrow indicator showing movement direction
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = FONT_ARROW;
        ctx.textAlign = 'center';
        if (this.moveAxis === 'horizontal') {
            ctx.fillText('\u2194', screenX + this.width / 2, this.y + this.height / 2 + 5);
        } else {
            ctx.fillText('\u2195', screenX + this.width / 2, this.y + this.height / 2 + 5);
        }
    }
}

// Checkpoint class
class Checkpoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 80;
        this.activated = false;
        this.animTimer = 0;
    }

    draw() {
        const screenX = this.x - cameraX;
        if (screenX + this.width < -50 || screenX > canvas.width + 50) return;

        // Pole
        ctx.fillStyle = this.activated ? '#f1c40f' : '#888';
        ctx.fillRect(screenX + 6, this.y, 4, this.height);

        // Base
        ctx.fillStyle = this.activated ? '#d4a017' : '#666';
        ctx.fillRect(screenX - 4, this.y + this.height - 8, 24, 8);

        // Flag on pole
        if (this.activated) {
            this.animTimer += 0.05;
            const wave = Math.sin(this.animTimer) * 3;
            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.moveTo(screenX + 10, this.y + 5);
            ctx.lineTo(screenX + 45 + wave, this.y + 18);
            ctx.lineTo(screenX + 10, this.y + 32);
            ctx.closePath();
            ctx.fill();
            // Checkmark on flag
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX + 20, this.y + 20);
            ctx.lineTo(screenX + 26, this.y + 26);
            ctx.lineTo(screenX + 36, this.y + 14);
            ctx.stroke();
        } else {
            // Inactive flag (grey, drooping)
            ctx.fillStyle = '#aaa';
            ctx.beginPath();
            ctx.moveTo(screenX + 10, this.y + 5);
            ctx.lineTo(screenX + 38, this.y + 22);
            ctx.lineTo(screenX + 10, this.y + 32);
            ctx.closePath();
            ctx.fill();
        }

        // Ball on top of pole
        ctx.fillStyle = this.activated ? '#f1c40f' : '#999';
        ctx.beginPath();
        ctx.arc(screenX + 8, this.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Shared physics for power-up items (gravity + platform collision)
function powerUpPhysics(entity, hasHorizontalMove, bounceForce) {
    entity.velY += 0.4;
    entity.y += entity.velY;
    if (hasHorizontalMove) entity.x += entity.velX;

    for (const platform of platforms) {
        if (entity.x < platform.x + platform.width &&
            entity.x + entity.width > platform.x &&
            entity.y < platform.y + platform.height &&
            entity.y + entity.height > platform.y) {
            if (entity.velY > 0 && entity.y + entity.height - entity.velY <= platform.y) {
                entity.y = platform.y - entity.height;
                entity.velY = bounceForce; // 0 = stop, negative = bounce
            } else if (hasHorizontalMove) {
                entity.velX *= -1;
                entity.x += entity.velX * 2;
            }
        }
    }
    return entity.y <= canvas.height + 50;
}

// Star power-up class
class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 26;
        this.height = 26;
        this.velX = 3;
        this.velY = -8;
        this.collected = false;
        this.bounceForce = -8;
        this.animTimer = 0;
    }

    update() {
        if (this.collected) return false;
        this.animTimer += 0.15;
        return powerUpPhysics(this, true, this.bounceForce);
    }

    draw() {
        if (this.collected) return;
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;
        const cx = screenX + this.width / 2;
        const cy = this.y + this.height / 2;
        const rainbow = ['#f1c40f', '#e67e22', '#e74c3c', '#f1c40f'];
        const colorIdx = Math.floor(this.animTimer) % rainbow.length;
        // Star shape
        ctx.fillStyle = rainbow[colorIdx];
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const r = i === 0 ? 13 : 13;
            const px = cx + Math.cos(angle) * 13;
            const py = cy + Math.sin(angle) * 13;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
            const innerAngle = angle + 2 * Math.PI / 5;
            ctx.lineTo(cx + Math.cos(innerAngle) * 6, cy + Math.sin(innerAngle) * 6);
        }
        ctx.closePath();
        ctx.fill();
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 2, 2, 0, Math.PI * 2);
        ctx.arc(cx + 3, cy - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Fire Flower power-up class
class FireFlower {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 26;
        this.height = 28;
        this.velY = -3;
        this.collected = false;
        this.animTimer = 0;
    }

    update() {
        if (this.collected) return false;
        this.animTimer += 0.1;
        return powerUpPhysics(this, false, 0);
    }

    draw() {
        if (this.collected) return;
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;
        const cx = screenX + this.width / 2;
        // Stem
        ctx.fillStyle = '#27ae60';
        ctx.fillRect(cx - 3, this.y + 14, 6, 14);
        // Leaves
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.ellipse(cx - 7, this.y + 18, 6, 3, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 7, this.y + 16, 6, 3, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // Flower petals
        const petalColors = ['#e74c3c', '#f39c12', '#e74c3c', '#f39c12'];
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) + this.animTimer;
            ctx.fillStyle = petalColors[i];
            ctx.beginPath();
            ctx.ellipse(cx + Math.cos(angle) * 6, this.y + 7 + Math.sin(angle) * 6, 5, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        // Center
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(cx, this.y + 7, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Speed Boost power-up class
class SpeedBoost {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 26;
        this.height = 26;
        this.velY = -3;
        this.collected = false;
        this.animTimer = 0;
    }

    update() {
        if (this.collected) return false;
        this.animTimer += 0.1;
        return powerUpPhysics(this, false, 0);
    }

    draw() {
        if (this.collected) return;
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;
        const cx = screenX + this.width / 2;
        const cy = this.y + this.height / 2;
        const pulse = Math.sin(this.animTimer * 3) * 2;
        // Lightning bolt shape
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(cx, cy, 12 + pulse, 0, Math.PI * 2);
        ctx.fill();
        // Bolt
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 10);
        ctx.lineTo(cx - 4, cy + 1);
        ctx.lineTo(cx + 1, cy + 1);
        ctx.lineTo(cx - 3, cy + 10);
        ctx.lineTo(cx + 5, cy - 1);
        ctx.lineTo(cx, cy - 1);
        ctx.closePath();
        ctx.fill();
    }
}

// Fireball class (shot by player with fire flower)
class Fireball {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 12;
        this.velX = 7 * direction;
        this.velY = 0;
        this.bounceForce = -6;
        this.life = 120; // Frames before despawn
        this.animTimer = 0;
    }

    update() {
        this.life--;
        if (this.life <= 0) return false;
        this.animTimer += 0.3;
        this.velY += 0.5;
        this.x += this.velX;
        this.y += this.velY;

        // Platform collision
        for (const platform of platforms) {
            if (this.x < platform.x + platform.width &&
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.height &&
                this.y + this.height > platform.y) {
                if (this.velY > 0 && this.y + this.height - this.velY <= platform.y) {
                    this.y = platform.y - this.height;
                    this.velY = this.bounceForce; // Bounce off ground
                } else {
                    // Hit wall - destroy fireball
                    for (let i = 0; i < 4; i++) {
                        particles.push(new Particle(this.x + 6, this.y + 6, '#f39c12'));
                    }
                    return false;
                }
            }
        }

        // Enemy collision
        for (const enemy of enemies) {
            if (!enemy.alive) continue;
            if (this.x < enemy.x + enemy.width &&
                this.x + this.width > enemy.x &&
                this.y < enemy.y + enemy.height &&
                this.y + this.height > enemy.y) {
                enemy.alive = false;
                score += 200;
                console.log(`[FIREBALL KILL] Fireball destroyed ${enemy.type} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)}). +200 pts, Score: ${score}`);
                for (let i = 0; i < 6; i++) {
                    particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#f39c12'));
                }
                updateUI();
                return false;
            }
        }

        if (this.y > canvas.height + 50) return false;
        return true;
    }

    draw() {
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;
        const cx = screenX + this.width / 2;
        const cy = this.y + this.height / 2;
        // Fireball glow
        ctx.fillStyle = 'rgba(255, 150, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fill();
        // Fireball body
        const colors = ['#e74c3c', '#f39c12', '#f1c40f'];
        ctx.fillStyle = colors[Math.floor(this.animTimer) % colors.length];
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
        // Inner core
        ctx.fillStyle = '#fff9c4';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Mushroom class (power-up)
class Mushroom {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 28;
        this.velX = 2;
        this.velY = -4; // Pop up animation
        this.collected = false;
    }
    
    update() {
        if (this.collected) return false;
        return powerUpPhysics(this, true, 0);
    }
    
    draw() {
        if (this.collected) return;
        const screenX = this.x - cameraX;
        if (screenX + this.width < 0 || screenX > canvas.width) return;
        
        // Mushroom cap (red with white spots)
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.ellipse(screenX + this.width/2, this.y + 10, 14, 12, 0, Math.PI, 0);
        ctx.fill();
        
        // White spots
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(screenX + this.width/2 - 6, this.y + 6, 4, 0, Math.PI * 2);
        ctx.arc(screenX + this.width/2 + 6, this.y + 4, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Stem
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(screenX + this.width/2 - 6, this.y + 10, 12, 14);
        
        // Eyes
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(screenX + this.width/2 - 3, this.y + 16, 2, 0, Math.PI * 2);
        ctx.arc(screenX + this.width/2 + 3, this.y + 16, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

function loadLevel(levelNum) {
    console.log(`[LEVEL LOAD] Loading level ${levelNum}...`);
    platforms = [];
    movingPlatforms = [];
    mushrooms = [];
    powerUps = [];
    fireballs = [];
    coinsList = [];
    enemies = [];
    particles = [];
    checkpoints = [];
    secretPipes = [];
    inSecretRoom = false;
    savedLevelState = null;
    secretRoomExitPipe = null;
    secretEntryTimer = 0;
    secretPipePromptAlpha = 0;
    secretRoomCollectedCoins = {};
    secretRoomBounds = null;
    lastCheckpointX = 100;
    lastCheckpointY = 300;
    
    if (levelNum === 1) {
        levelStyle = 'overground';
        createLevel1();
    } else if (levelNum === 2) {
        levelStyle = 'overground';
        createLevel2();
    } else if (levelNum === 3) {
        levelStyle = 'underground';
        createLevel3();
    } else {
        // Procedurally generated levels from level 4 onwards
        generateProceduralLevel(levelNum);
    }
    buildBackgroundGradients();
    console.log(`[LEVEL LOAD] Level ${levelNum} loaded — Style: ${levelStyle}, Platforms: ${platforms.length}, Enemies: ${enemies.length}, Coins: ${coinsList.length}, Moving Platforms: ${movingPlatforms.length}, Checkpoints: ${checkpoints.length}, Secret Pipes: ${secretPipes.length}`);
}

function generateProceduralLevel(levelNum) {
    // Random style selection (1 = overground, 2 = overground variant, 3 = underground, 4 = water)
    const styleChoice = Math.floor(Math.random() * 4) + 1;
    if (styleChoice === 4) {
        levelStyle = 'water';
    } else if (styleChoice === 3) {
        levelStyle = 'underground';
    } else {
        levelStyle = 'overground';
    }
    console.log(`[PROCEDURAL] Generating level ${levelNum} — Style: ${levelStyle}, Difficulty multiplier: ${(1 + (levelNum - 3) * 0.1).toFixed(1)}`);
    
    // Determine platform types based on style
    let groundType, blockType;
    if (levelStyle === 'water') {
        groundType = 'sand';
        blockType = 'coral';
    } else if (levelStyle === 'underground') {
        groundType = 'stone';
        blockType = 'stone';
    } else {
        groundType = 'ground';
        blockType = 'brick';
    }
    
    // Difficulty scaling
    const difficultyMultiplier = 1 + (levelNum - 3) * 0.1;
    const maxGapWidth = Math.min(150 + (levelNum - 3) * 10, 250); // Gap increases with level
    const minPlatformWidth = Math.max(300 - (levelNum - 3) * 10, 150); // Platforms shrink slightly
    
    // Generate ground platforms with gaps
    let x = 0;
    while (x < LEVEL_WIDTH - 600) {
        const platformWidth = minPlatformWidth + Math.random() * 200;
        platforms.push(new Platform(x, 450, platformWidth, canvas.height - 450, groundType));
        
        x += platformWidth;
        // Add gap (ensure it's jumpable)
        const gapWidth = 80 + Math.random() * Math.min(maxGapWidth - 80, 120);
        x += gapWidth;
    }
    // Final platform to flag - ensure it's within level bounds
    const finalPlatformX = Math.min(x, LEVEL_WIDTH - 500);
    platforms.push(new Platform(finalPlatformX, 450, 400, canvas.height - 450, groundType));
    
    // Underground ceiling
    if (levelStyle === 'underground') {
        let ceilingX = 0;
        while (ceilingX < LEVEL_WIDTH) {
            const ceilingWidth = 400 + Math.random() * 400;
            platforms.push(new Platform(ceilingX, 0, ceilingWidth, 40, 'stone'));
            ceilingX += ceilingWidth + 100 + Math.random() * 200;
        }
    }
    
    // Helper: check if a rectangle overlaps any existing platform
    function rectOverlapsPlatform(rx, ry, rw, rh) {
        for (const p of platforms) {
            if (p.y >= 400) continue; // skip ground platforms
            if (rx + rw > p.x && rx < p.x + p.width &&
                ry + rh > p.y && ry < p.y + p.height) {
                return true;
            }
        }
        return false;
    }
    
    // Generate floating platforms
    const numFloatingPlatforms = 15 + Math.floor(levelNum / 2);
    for (let i = 0; i < numFloatingPlatforms; i++) {
        const platX = 150 + (i * (LEVEL_WIDTH - 400) / numFloatingPlatforms) + (Math.random() - 0.5) * 100;
        const platY = 180 + Math.random() * 200; // Between y=180 and y=380
        const platWidth = 32 + Math.random() * 96;
        
        // Randomly choose between block types
        const rand = Math.random();
        let type;
        if (rand < 0.15) {
            type = 'question';
            // Skip if overlaps an existing floating platform
            if (rectOverlapsPlatform(platX, platY, platWidth, 32)) continue;
        } else if (levelStyle === 'underground' && rand < 0.3) {
            type = 'pipe';
            const pipeTopY = 350 + Math.random() * 80; // Top of pipe between 350-430
            // Check if pipe is FULLY on solid ground (entire width within a ground platform)
            const groundPlat = platforms.find(p =>
                p.y >= 400 && platX >= p.x + 10 && platX + 64 <= p.x + p.width - 10
            );
            // If on ground, sit on it; if over a gap, skip (don't hover)
            if (!groundPlat) continue;
            const pipeBottomY = 450;
            const pipeHeight = pipeBottomY - pipeTopY;
            if (pipeHeight < 20) continue; // Skip if too short
            const pipePlat = new Platform(platX, pipeTopY, 64, pipeHeight, type);
            platforms.push(pipePlat);
            // 7% chance a pipe is a secret pipe
            if (Math.random() < 0.07) {
                secretPipes.push(pipePlat);
            }
            continue;
        } else if (levelStyle === 'water' && rand < 0.3) {
            // Tall coral columns in water levels
            const coralTopY = 280 + Math.random() * 120;
            const coralHeight = 450 - coralTopY;
            if (coralHeight < 30) continue;
            platforms.push(new Platform(platX, coralTopY, 48, coralHeight, 'coral'));
            continue;
        } else {
            type = blockType;
            // Skip if overlaps an existing floating platform
            if (rectOverlapsPlatform(platX, platY, platWidth, 32)) continue;
        }
        
        platforms.push(new Platform(platX, platY, platWidth, 32, type));
    }
    
    // Add pipes to overground levels (underground already gets pipes above)
    if (levelStyle === 'overground') {
        const numPipes = 2 + Math.floor(Math.random() * 3); // 2-4 pipes
        for (let i = 0; i < numPipes; i++) {
            const pipeX = 300 + (i * (LEVEL_WIDTH - 600) / numPipes) + (Math.random() - 0.5) * 100;
            const pipeTopY = 350 + Math.random() * 80;
            // Ensure pipe is FULLY on a ground platform (not hanging over the edge)
            const onGround = platforms.some(p =>
                p.y >= 400 && pipeX >= p.x + 10 && pipeX + 64 <= p.x + p.width - 10
            );
            if (!onGround) continue;
            const pipeHeight = 450 - pipeTopY;
            if (pipeHeight < 20) continue;
            const pipePlat = new Platform(pipeX, pipeTopY, 64, pipeHeight, 'pipe');
            platforms.push(pipePlat);
            // 7% chance to be secret
            if (Math.random() < 0.07) {
                secretPipes.push(pipePlat);
            }
        }
    }
    
    // Generate coins in patterns: singular, straight line, or 2x2 square
    // Coins must not overlap with any platforms
    
    function coinOverlaps(x, y) {
        for (const coin of coinsList) {
            const dx = coin.x - x;
            const dy = coin.y - y;
            if (Math.sqrt(dx * dx + dy * dy) < 28) return true;
        }
        return false;
    }
    
    function coinInsidePlatform(x, y) {
        for (const p of platforms) {
            if (x + 24 > p.x && x < p.x + p.width &&
                y + 24 > p.y && y < p.y + p.height) {
                return true;
            }
        }
        return false;
    }
    
    // Check if a coin position is above some solid surface (ground or floating platform)
    function coinOverSolid(x, y) {
        // Above a ground platform?
        for (const p of platforms) {
            if (p.y >= 400 && x + 24 > p.x && x < p.x + p.width) return true;
        }
        // Above a floating platform (within reasonable distance)?
        for (const p of platforms) {
            if (p.y < 400 && p.height <= 50 && p.type !== 'pipe' &&
                x + 24 > p.x && x < p.x + p.width &&
                y < p.y && y > p.y - 120) return true;
        }
        return false;
    }
    
    function tryPlaceCoin(x, y) {
        if (coinInsidePlatform(x, y) || coinOverlaps(x, y)) return false;
        if (!coinOverSolid(x, y)) return false; // Don't place coins floating above gaps
        coinsList.push(new Coin(x, y));
        return true;
    }
    
    // Find ground platforms for positioning coins above them
    const groundPlatforms = platforms.filter(p => 
        p.type !== 'pipe' && p.y >= 400 && p.width >= 80
    );
    const floatingPlatforms = platforms.filter(p => 
        p.type !== 'pipe' && p.y > 100 && p.y < 400 && p.height <= 50
    );
    
    const numPatterns = 8 + Math.floor(levelNum / 2);
    for (let i = 0; i < numPatterns; i++) {
        const patternType = Math.random();
        const baseX = 200 + (i * (LEVEL_WIDTH - 600) / numPatterns) + (Math.random() - 0.5) * 80;
        let baseY;
        
        // Pick a Y position: above a platform or floating in air above ground
        if (Math.random() < 0.5 && floatingPlatforms.length > 0) {
            const plat = floatingPlatforms[Math.floor(Math.random() * floatingPlatforms.length)];
            baseY = plat.y - 34;
        } else if (groundPlatforms.length > 0) {
            baseY = 380 + Math.random() * 40; // Slightly above ground
        } else {
            baseY = 400;
        }
        
        if (patternType < 0.3) {
            // Single coin
            tryPlaceCoin(baseX, baseY);
        } else if (patternType < 0.7) {
            // Horizontal line of 3-5 coins
            const count = 3 + Math.floor(Math.random() * 3);
            for (let j = 0; j < count; j++) {
                tryPlaceCoin(baseX + j * 30, baseY);
            }
        } else {
            // 2x2 square
            tryPlaceCoin(baseX, baseY);
            tryPlaceCoin(baseX + 28, baseY);
            tryPlaceCoin(baseX, baseY - 28);
            tryPlaceCoin(baseX + 28, baseY - 28);
        }
    }
    
    // Helper: check if a point is over solid ground
    function isOverGround(ex, ew) {
        return platforms.some(p =>
            p.y >= 400 && ex + ew > p.x + 10 && ex < p.x + p.width - 10
        );
    }
    
    // Helper: check if an enemy rect overlaps any non-ground platform (pipes, blocks, etc.)
    function enemyOverlapsObstacle(ex, ey, ew, eh) {
        for (const p of platforms) {
            if (p.y >= 400) continue; // ground is fine to stand on
            if (ex + ew > p.x && ex < p.x + p.width &&
                ey + eh > p.y && ey < p.y + p.height) {
                return true;
            }
        }
        return false;
    }
    
    // Generate enemies (mix of all types)
    const numEnemies = Math.floor(8 + levelNum * difficultyMultiplier * 0.5);
    const enemyTypes = levelStyle === 'water'
        ? ['cheep_cheep', 'cheep_cheep', 'blooper', 'eel']
        : ['goomba', 'goomba', 'koopa', 'flying']; // Weighted towards goomba
    for (let i = 0; i < numEnemies; i++) {
        const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const isFlying = type === 'flying';
        const isWater = levelStyle === 'water';
        const ew = type === 'eel' ? 64 : (type === 'cheep_cheep' ? 30 : (type === 'blooper' ? 28 : 32));
        const eh = type === 'koopa' ? 40 : (type === 'blooper' ? 36 : (type === 'cheep_cheep' ? 24 : (type === 'eel' ? 20 : 32)));
        
        let placed = false;
        for (let attempt = 0; attempt < 20; attempt++) {
            const enemyX = 300 + (i * (LEVEL_WIDTH - 600) / numEnemies) + (Math.random() - 0.5) * 150;
            const enemyY = isWater ? 150 + Math.random() * 250 : 400;
            
            // Water & flying enemies: just place them
            if (isWater || isFlying) {
                enemies.push(new Enemy(enemyX, enemyY, type));
                placed = true;
                break;
            }
            
            // Ground enemies: must be over ground and not inside any obstacle
            if (!isOverGround(enemyX, ew)) continue;
            if (enemyOverlapsObstacle(enemyX, enemyY, ew, eh)) continue;
            
            enemies.push(new Enemy(enemyX, enemyY, type));
            placed = true;
            break;
        }
    }
    
    // Flag at end - placed on the final ground platform
    flag = new Flag(finalPlatformX + 200, 250);
    
    // Helper: check if a checkpoint at (cx, cy) with size (16, 80) overlaps any platform or moving platform sweep
    function checkpointOverlapsBlock(cx, cy) {
        const cpW = 16;
        const cpH = 80;
        // Check static platforms (skip ground platforms the checkpoint sits on)
        for (const p of platforms) {
            // Skip if this is the ground platform the checkpoint rests on
            if (p.y >= 400 && cy + cpH <= p.y + 2) continue;
            if (cx + cpW > p.x && cx < p.x + p.width &&
                cy + cpH > p.y && cy < p.y + p.height) {
                return true;
            }
        }
        // Check moving platform sweep areas
        for (const mp of movingPlatforms) {
            let sweepX, sweepY, sweepW, sweepH;
            if (mp.moveAxis === 'horizontal') {
                sweepX = mp.startX;
                sweepY = mp.startY;
                sweepW = mp.width + mp.moveDistance;
                sweepH = mp.height;
            } else {
                sweepX = mp.startX;
                sweepY = mp.startY;
                sweepW = mp.width;
                sweepH = mp.height + mp.moveDistance;
            }
            if (cx + cpW > sweepX && cx < sweepX + sweepW &&
                cy + cpH > sweepY && cy < sweepY + sweepH) {
                return true;
            }
        }
        return false;
    }

    // Generate checkpoints (one per ~1/3 of level)
    const cpSpacing = LEVEL_WIDTH / 4;
    for (let i = 1; i <= 2; i++) {
        const cpX = cpSpacing * i;
        // Find nearest ground platform to place on
        let bestPlat = null;
        let bestDist = Infinity;
        for (const p of platforms) {
            if (p.y >= 400 && p.width >= 80) {
                const platCenter = p.x + p.width / 2;
                const dist = Math.abs(platCenter - cpX);
                if (dist < bestDist && cpX >= p.x + 20 && cpX <= p.x + p.width - 20) {
                    bestDist = dist;
                    bestPlat = p;
                }
            }
        }
        if (bestPlat) {
            const cpY = bestPlat.y - 80;
            // Try ideal position first, then nudge left/right to avoid overlaps
            let placed = false;
            for (let offset = 0; offset <= 200; offset += 20) {
                for (const sign of [0, 1, -1]) {
                    const tryX = cpX + sign * offset;
                    // Must be well within the ground platform (not hanging over edges)
                    if (tryX < bestPlat.x + 40 || tryX + 16 > bestPlat.x + bestPlat.width - 40) continue;
                    if (!checkpointOverlapsBlock(tryX, cpY)) {
                        checkpoints.push(new Checkpoint(tryX, cpY));
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }
        }
    }
    
    // Helper: check if a moving platform's full sweep overlaps any static platform
    function movingPlatformOverlaps(mx, my, mw, mh, axis, dist) {
        // Compute the full bounding box the moving platform sweeps through
        let sweepX, sweepY, sweepW, sweepH;
        if (axis === 'horizontal') {
            sweepX = mx;
            sweepY = my;
            sweepW = mw + dist;
            sweepH = mh;
        } else {
            sweepX = mx;
            sweepY = my;
            sweepW = mw;
            sweepH = mh + dist;
        }

        // Also check against other already-placed moving platforms' sweep areas
        for (const p of platforms) {
            if (sweepX + sweepW > p.x && sweepX < p.x + p.width &&
                sweepY + sweepH > p.y && sweepY < p.y + p.height) {
                return true;
            }
        }
        for (const mp of movingPlatforms) {
            let otherSweepX, otherSweepY, otherSweepW, otherSweepH;
            if (mp.moveAxis === 'horizontal') {
                otherSweepX = mp.startX;
                otherSweepY = mp.startY;
                otherSweepW = mp.width + mp.moveDistance;
                otherSweepH = mp.height;
            } else {
                otherSweepX = mp.startX;
                otherSweepY = mp.startY;
                otherSweepW = mp.width;
                otherSweepH = mp.height + mp.moveDistance;
            }
            if (sweepX + sweepW > otherSweepX && sweepX < otherSweepX + otherSweepW &&
                sweepY + sweepH > otherSweepY && sweepY < otherSweepY + otherSweepH) {
                return true;
            }
        }
        return false;
    }

    // Generate moving platforms
    const numMoving = 3 + Math.floor(levelNum / 2);
    const mpHeight = 24;
    const mpWidth = 96;
    for (let i = 0; i < numMoving; i++) {
        let placed = false;
        // Try several random positions to find one that doesn't overlap
        for (let attempt = 0; attempt < 15; attempt++) {
            const mx = 400 + (i * (LEVEL_WIDTH - 800) / numMoving) + (Math.random() - 0.5) * 100;
            const my = 250 + Math.random() * 120; // y between 250-370
            const axis = Math.random() < 0.5 ? 'horizontal' : 'vertical';
            let dist = 80 + Math.random() * 100;
            // Clamp vertical movement so platform bottom never reaches ground level
            if (axis === 'vertical') {
                const maxBottomY = 450 - mpHeight; // ground top minus platform height
                if (my + dist > maxBottomY) {
                    dist = Math.max(20, maxBottomY - my);
                }
            }
            if (!movingPlatformOverlaps(mx, my, mpWidth, mpHeight, axis, dist)) {
                const spd = 0.8 + Math.random() * 1.0;
                const mType = levelStyle === 'water' ? 'coral' : (levelStyle === 'underground' ? 'stone' : 'brick');
                movingPlatforms.push(new MovingPlatform(mx, my, mpWidth, mpHeight, mType, axis, dist, spd));
                placed = true;
                break;
            }
        }
        // If no valid position found after 15 attempts, skip this moving platform
    }
}

function createLevel1() {
    // Ground platforms
    platforms.push(new Platform(0, 450, 500, canvas.height - 450, 'ground'));
    platforms.push(new Platform(600, 450, 400, canvas.height - 450, 'ground'));
    platforms.push(new Platform(1100, 450, 600, canvas.height - 450, 'ground'));
    platforms.push(new Platform(1800, 450, 300, canvas.height - 450, 'ground'));
    platforms.push(new Platform(2200, 450, 800, canvas.height - 450, 'ground'));
    platforms.push(new Platform(3100, 450, 900, canvas.height - 450, 'ground'));
    
    // Floating platforms
    platforms.push(new Platform(200, 350, 96, 32, 'brick'));
    platforms.push(new Platform(350, 280, 32, 32, 'question'));
    platforms.push(new Platform(450, 280, 128, 32, 'brick'));
    
    platforms.push(new Platform(700, 320, 128, 32, 'brick'));
    platforms.push(new Platform(900, 250, 32, 32, 'question'));
    platforms.push(new Platform(950, 250, 32, 32, 'question'));
    
    platforms.push(new Platform(1200, 350, 96, 32, 'brick'));
    platforms.push(new Platform(1350, 280, 160, 32, 'brick'));
    platforms.push(new Platform(1550, 200, 32, 32, 'question'));
    
    // Staircase section
    platforms.push(new Platform(2300, 400, 64, 50, 'brick'));
    platforms.push(new Platform(2364, 350, 64, 100, 'brick'));
    platforms.push(new Platform(2428, 300, 64, 150, 'brick'));
    platforms.push(new Platform(2492, 250, 64, 200, 'brick'));
    
    // More platforms
    platforms.push(new Platform(2700, 350, 128, 32, 'brick'));
    platforms.push(new Platform(2900, 280, 32, 32, 'question'));
    platforms.push(new Platform(3000, 350, 96, 32, 'brick'));
    
    // End section platforms
    platforms.push(new Platform(3200, 350, 64, 32, 'brick'));
    platforms.push(new Platform(3400, 300, 128, 32, 'brick'));
    platforms.push(new Platform(3600, 250, 64, 32, 'question'));
    
    // Pipes (one is secret!) — fully on ground platforms
    const pipe1_1 = new Platform(1620, 370, 64, 80, 'pipe'); // ground [1100,1700]
    platforms.push(pipe1_1);
    secretPipes.push(pipe1_1);
    
    platforms.push(new Platform(2850, 380, 64, 70, 'pipe')); // ground [2200,3000]
    
    // Coins
    coinsList.push(new Coin(220, 310));
    coinsList.push(new Coin(250, 310));
    coinsList.push(new Coin(280, 310));
    
    coinsList.push(new Coin(720, 280));
    coinsList.push(new Coin(760, 280));
    coinsList.push(new Coin(800, 280));
    
    coinsList.push(new Coin(1380, 240));
    coinsList.push(new Coin(1420, 240));
    coinsList.push(new Coin(1460, 240));
    
    coinsList.push(new Coin(2730, 310));
    coinsList.push(new Coin(2780, 310));
    
    coinsList.push(new Coin(3420, 260));
    coinsList.push(new Coin(3480, 260));
    
    // Enemies
    enemies.push(new Enemy(400, 400, 'goomba'));
    enemies.push(new Enemy(750, 400, 'koopa'));
    enemies.push(new Enemy(1300, 400, 'goomba'));
    enemies.push(new Enemy(1500, 400, 'flying'));
    enemies.push(new Enemy(2000, 400, 'koopa'));
    enemies.push(new Enemy(2600, 400, 'goomba'));
    enemies.push(new Enemy(3300, 400, 'flying'));
    enemies.push(new Enemy(3500, 400, 'koopa'));
    
    // Flag at end
    flag = new Flag(3800, 250);
    
    // Checkpoints (on ground, clear of blocks)
    checkpoints.push(new Checkpoint(1500, 370));
    checkpoints.push(new Checkpoint(2600, 370));
    
    // Moving platforms for level 1
    movingPlatforms.push(new MovingPlatform(1050, 300, 96, 24, 'brick', 'horizontal', 120, 1.0));
    movingPlatforms.push(new MovingPlatform(1900, 300, 96, 24, 'brick', 'vertical', 100, 0.8));
    movingPlatforms.push(new MovingPlatform(2600, 280, 96, 24, 'brick', 'horizontal', 100, 1.2));
}

function createLevel2() {
    // Ground platforms - more gaps and variety
    platforms.push(new Platform(0, 450, 350, canvas.height - 450, 'ground'));
    platforms.push(new Platform(450, 450, 250, canvas.height - 450, 'ground'));
    platforms.push(new Platform(800, 450, 200, canvas.height - 450, 'ground'));
    platforms.push(new Platform(1100, 450, 400, canvas.height - 450, 'ground'));
    platforms.push(new Platform(1600, 450, 300, canvas.height - 450, 'ground'));
    platforms.push(new Platform(2000, 450, 500, canvas.height - 450, 'ground'));
    platforms.push(new Platform(2600, 450, 250, canvas.height - 450, 'ground'));
    platforms.push(new Platform(2950, 450, 200, canvas.height - 450, 'ground'));
    platforms.push(new Platform(3250, 450, 750, canvas.height - 450, 'ground'));
    
    // Floating platforms - different layout
    platforms.push(new Platform(150, 380, 64, 32, 'brick'));
    platforms.push(new Platform(280, 320, 32, 32, 'question'));
    platforms.push(new Platform(380, 380, 96, 32, 'brick'));
    
    platforms.push(new Platform(550, 350, 32, 32, 'question'));
    platforms.push(new Platform(620, 280, 96, 32, 'brick'));
    platforms.push(new Platform(780, 220, 32, 32, 'question'));
    
    // High platform section
    platforms.push(new Platform(950, 350, 64, 32, 'brick'));
    platforms.push(new Platform(1050, 280, 64, 32, 'brick'));
    platforms.push(new Platform(1150, 210, 96, 32, 'brick'));
    platforms.push(new Platform(1300, 280, 32, 32, 'question'));
    platforms.push(new Platform(1380, 350, 64, 32, 'brick'));
    
    // Pyramid section
    platforms.push(new Platform(1700, 400, 96, 50, 'brick'));
    platforms.push(new Platform(1732, 350, 64, 50, 'brick'));
    platforms.push(new Platform(1764, 300, 32, 50, 'brick'));
    
    // Descending staircase
    platforms.push(new Platform(2100, 300, 64, 150, 'brick'));
    platforms.push(new Platform(2164, 350, 64, 100, 'brick'));
    platforms.push(new Platform(2228, 400, 64, 50, 'brick'));
    
    // Challenging gap section
    platforms.push(new Platform(2650, 350, 32, 32, 'question'));
    platforms.push(new Platform(2750, 300, 64, 32, 'brick'));
    platforms.push(new Platform(2850, 250, 32, 32, 'question'));
    
    // Final section
    platforms.push(new Platform(3050, 350, 96, 32, 'brick'));
    platforms.push(new Platform(3200, 280, 128, 32, 'brick'));
    platforms.push(new Platform(3400, 350, 64, 32, 'brick'));
    platforms.push(new Platform(3550, 280, 32, 32, 'question'));
    platforms.push(new Platform(3650, 220, 96, 32, 'brick'));
    
    // Pipes (one is secret!) — fully on ground platforms
    const pipe2_1 = new Platform(1420, 370, 64, 80, 'pipe'); // ground [1100,1500]
    platforms.push(pipe2_1);
    secretPipes.push(pipe2_1);
    
    platforms.push(new Platform(2420, 380, 64, 70, 'pipe')); // ground [2000,2500]
    platforms.push(new Platform(3300, 360, 64, 90, 'pipe')); // ground [3250,4000]
    
    // Coins - different arrangement
    coinsList.push(new Coin(160, 340));
    coinsList.push(new Coin(200, 340));
    
    coinsList.push(new Coin(640, 240));
    coinsList.push(new Coin(680, 240));
    coinsList.push(new Coin(720, 240));
    
    coinsList.push(new Coin(1160, 170));
    coinsList.push(new Coin(1200, 170));
    coinsList.push(new Coin(1240, 170));
    
    coinsList.push(new Coin(1750, 260));
    coinsList.push(new Coin(1780, 260));
    
    coinsList.push(new Coin(2760, 260));
    coinsList.push(new Coin(2800, 260));
    
    coinsList.push(new Coin(3220, 240));
    coinsList.push(new Coin(3260, 240));
    coinsList.push(new Coin(3300, 240));
    
    coinsList.push(new Coin(3670, 180));
    coinsList.push(new Coin(3710, 180));
    
    // Enemies - more challenging placement (moved away from pipes/blocks)
    enemies.push(new Enemy(250, 400, 'goomba'));
    enemies.push(new Enemy(500, 400, 'koopa'));
    enemies.push(new Enemy(850, 400, 'flying'));
    enemies.push(new Enemy(1200, 400, 'goomba'));
    enemies.push(new Enemy(1350, 400, 'koopa'));  // moved from 1400 to avoid pipe at 1420
    enemies.push(new Enemy(1620, 400, 'flying'));
    enemies.push(new Enemy(2050, 400, 'goomba'));
    enemies.push(new Enemy(2350, 400, 'koopa'));
    enemies.push(new Enemy(3350, 400, 'flying'));
    enemies.push(new Enemy(3550, 400, 'koopa'));
    enemies.push(new Enemy(3750, 400, 'goomba'));
    
    // Flag at end
    flag = new Flag(3850, 250);
    
    // Checkpoints (on ground, clear of blocks)
    checkpoints.push(new Checkpoint(1150, 370));  // moved from 1100 to be safely inside platform
    checkpoints.push(new Checkpoint(2300, 370));
    
    // Moving platforms for level 2
    movingPlatforms.push(new MovingPlatform(750, 330, 96, 24, 'brick', 'vertical', 96, 0.9));
    movingPlatforms.push(new MovingPlatform(1500, 280, 96, 24, 'brick', 'horizontal', 140, 1.1));
    movingPlatforms.push(new MovingPlatform(2400, 300, 96, 24, 'brick', 'vertical', 100, 1.0));
    movingPlatforms.push(new MovingPlatform(3100, 320, 96, 24, 'brick', 'horizontal', 130, 1.3));
}

function createLevel3() {
    // Underground level - stone floor platforms
    platforms.push(new Platform(0, 450, 400, canvas.height - 450, 'stone'));
    platforms.push(new Platform(500, 450, 300, canvas.height - 450, 'stone'));
    platforms.push(new Platform(900, 450, 250, canvas.height - 450, 'stone'));
    platforms.push(new Platform(1250, 450, 400, canvas.height - 450, 'stone'));
    platforms.push(new Platform(1750, 450, 200, canvas.height - 450, 'stone'));
    platforms.push(new Platform(2050, 450, 350, canvas.height - 450, 'stone'));
    platforms.push(new Platform(2500, 450, 300, canvas.height - 450, 'stone'));
    platforms.push(new Platform(2900, 450, 250, canvas.height - 450, 'stone'));
    platforms.push(new Platform(3250, 450, 750, canvas.height - 450, 'stone'));
    
    // Ceiling - underground feel
    platforms.push(new Platform(0, 0, 800, 40, 'stone'));
    platforms.push(new Platform(900, 0, 600, 40, 'stone'));
    platforms.push(new Platform(1600, 0, 500, 40, 'stone'));
    platforms.push(new Platform(2200, 0, 700, 40, 'stone'));
    platforms.push(new Platform(3000, 0, 1000, 40, 'stone'));
    
    // Floating platforms - cave style
    platforms.push(new Platform(150, 350, 80, 32, 'stone'));
    platforms.push(new Platform(300, 280, 32, 32, 'question'));
    platforms.push(new Platform(400, 350, 64, 32, 'stone'));
    
    platforms.push(new Platform(550, 300, 96, 32, 'stone'));
    platforms.push(new Platform(720, 220, 32, 32, 'question'));
    platforms.push(new Platform(820, 300, 64, 32, 'stone'));
    
    // Pipe-like structures (one is secret!)
    const pipe3_1 = new Platform(1000, 380, 64, 70, 'pipe');
    platforms.push(pipe3_1);
    secretPipes.push(pipe3_1);
    
    platforms.push(new Platform(1270, 350, 64, 100, 'pipe'));
    
    // Suspended platforms section
    platforms.push(new Platform(1350, 350, 64, 32, 'stone'));
    platforms.push(new Platform(1450, 280, 64, 32, 'stone'));
    platforms.push(new Platform(1550, 210, 64, 32, 'stone'));
    platforms.push(new Platform(1650, 280, 32, 32, 'question'));
    
    // Lower cave section
    platforms.push(new Platform(1800, 380, 128, 32, 'stone'));
    platforms.push(new Platform(2000, 320, 32, 32, 'question'));
    
    // Pipe maze
    platforms.push(new Platform(2150, 350, 64, 100, 'pipe'));
    platforms.push(new Platform(2300, 380, 64, 70, 'pipe'));
    platforms.push(new Platform(2520, 320, 64, 130, 'pipe'));
    
    // Final approach
    platforms.push(new Platform(2600, 350, 96, 32, 'stone'));
    platforms.push(new Platform(2750, 280, 64, 32, 'stone'));
    platforms.push(new Platform(2900, 350, 32, 32, 'question'));
    platforms.push(new Platform(3000, 320, 128, 32, 'stone'));
    platforms.push(new Platform(3200, 280, 64, 32, 'stone'));
    platforms.push(new Platform(3350, 220, 32, 32, 'question'));
    platforms.push(new Platform(3500, 280, 96, 32, 'stone'));
    platforms.push(new Platform(3700, 350, 64, 32, 'stone'));
    
    // Coins - underground treasures
    coinsList.push(new Coin(170, 310));
    coinsList.push(new Coin(210, 310));
    
    coinsList.push(new Coin(570, 260));
    coinsList.push(new Coin(610, 260));
    coinsList.push(new Coin(650, 260));
    
    coinsList.push(new Coin(1370, 310));
    coinsList.push(new Coin(1470, 240));
    coinsList.push(new Coin(1570, 170));
    
    coinsList.push(new Coin(1820, 340));
    coinsList.push(new Coin(1880, 340));
    
    coinsList.push(new Coin(2620, 310));
    coinsList.push(new Coin(2680, 310));
    
    coinsList.push(new Coin(3020, 280));
    coinsList.push(new Coin(3080, 280));
    
    coinsList.push(new Coin(3520, 240));
    coinsList.push(new Coin(3580, 240));
    
    // Enemies - more challenging underground (moved away from pipes/blocks)
    enemies.push(new Enemy(300, 400, 'goomba'));
    enemies.push(new Enemy(600, 400, 'koopa'));
    enemies.push(new Enemy(950, 400, 'flying'));
    enemies.push(new Enemy(1400, 400, 'goomba'));   // moved from 1300 to avoid pipe at [1270,1334]
    enemies.push(new Enemy(1500, 400, 'koopa'));
    enemies.push(new Enemy(1950, 400, 'goomba'));   // moved from 1850 to avoid stone at [1800,1928]
    enemies.push(new Enemy(2100, 400, 'flying'));
    enemies.push(new Enemy(2430, 400, 'koopa'));    // moved from 2550 to avoid pipe at [2520,2584]
    enemies.push(new Enemy(2950, 400, 'goomba'));
    enemies.push(new Enemy(3400, 400, 'flying'));
    enemies.push(new Enemy(3600, 400, 'koopa'));
    enemies.push(new Enemy(3800, 400, 'goomba'));
    
    // Flag at end
    flag = new Flag(3900, 250);
    
    // Checkpoints (on ground, clear of blocks)
    checkpoints.push(new Checkpoint(1420, 370));
    checkpoints.push(new Checkpoint(2750, 370));
    
    // Moving platforms for level 3 (underground)
    movingPlatforms.push(new MovingPlatform(480, 350, 96, 24, 'stone', 'horizontal', 60, 0.8));
    movingPlatforms.push(new MovingPlatform(1100, 200, 96, 24, 'stone', 'vertical', 120, 1.0));
    movingPlatforms.push(new MovingPlatform(1700, 320, 96, 24, 'stone', 'horizontal', 150, 1.2));
    movingPlatforms.push(new MovingPlatform(2400, 200, 96, 24, 'stone', 'vertical', 90, 0.9));
    movingPlatforms.push(new MovingPlatform(3100, 250, 96, 24, 'stone', 'horizontal', 120, 1.1));
}

// Build and cache background gradients (called on level load)
function buildBackgroundGradients() {
    const waterGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    waterGrad.addColorStop(0, '#0a3d6b');
    waterGrad.addColorStop(0.3, '#072e52');
    waterGrad.addColorStop(0.6, '#05203a');
    waterGrad.addColorStop(1, '#031525');

    const undergroundGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    undergroundGrad.addColorStop(0, '#060e1a');
    undergroundGrad.addColorStop(0.5, '#0e1a30');
    undergroundGrad.addColorStop(1, '#142240');

    const groundRatio = 450 / canvas.height;
    const overgroundGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    overgroundGrad.addColorStop(0, '#4a90d9');
    overgroundGrad.addColorStop(groundRatio * 0.5, '#87CEEB');
    overgroundGrad.addColorStop(groundRatio * 0.95, '#b8e6f0');
    overgroundGrad.addColorStop(groundRatio, '#98D8C8');
    overgroundGrad.addColorStop(groundRatio + 0.01, '#5a3a1a');
    overgroundGrad.addColorStop(1, '#3a2510');

    const shimmerGrad = ctx.createLinearGradient(0, 0, 0, 60);
    shimmerGrad.addColorStop(0, 'rgba(100, 180, 255, 0.15)');
    shimmerGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');

    bgGradients = { water: waterGrad, underground: undergroundGrad, overground: overgroundGrad, shimmer: shimmerGrad };
}

// Shared drawing for brick, stone, and coral block types
function drawBlockStyle(screenX, y, width, height, type) {
    if (type === 'brick') {
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(screenX, y, width, height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, y, width, height);
        ctx.clip();
        ctx.strokeStyle = '#8B0000';
        ctx.lineWidth = 2;
        for (let row = 0; row < height; row += 16) {
            for (let col = -16; col < width + 16; col += 32) {
                const offset = (row / 16) % 2 === 0 ? 0 : 16;
                ctx.strokeRect(screenX + col + offset, y + row, 32, 16);
            }
        }
        ctx.restore();
    } else if (type === 'stone') {
        ctx.fillStyle = '#3a4a6a';
        ctx.fillRect(screenX, y, width, height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, y, width, height);
        ctx.clip();
        ctx.strokeStyle = '#2a3a5a';
        ctx.lineWidth = 2;
        for (let row = 0; row < height; row += 20) {
            for (let col = -10; col < width + 10; col += 40) {
                const offset = (row / 20) % 2 === 0 ? 0 : 20;
                ctx.strokeRect(screenX + col + offset, y + row, 40, 20);
            }
        }
        ctx.restore();
        ctx.fillStyle = '#4a5a7a';
        ctx.fillRect(screenX, y, width, 3);
    } else if (type === 'coral') {
        ctx.fillStyle = '#d94560';
        ctx.fillRect(screenX, y, width, height);
        ctx.save();
        ctx.beginPath();
        ctx.rect(screenX, y, width, height);
        ctx.clip();
        ctx.fillStyle = '#e86080';
        for (let row = 0; row < height; row += 12) {
            for (let col = 0; col < width; col += 14) {
                const offset = (Math.floor(row / 12)) % 2 === 0 ? 0 : 7;
                ctx.beginPath();
                ctx.arc(screenX + col + offset + 7, y + row + 6, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.restore();
        ctx.fillStyle = '#f08090';
        ctx.fillRect(screenX, y, width, 3);
    }
}

function drawBackground() {
    if (levelStyle === 'water') {
        // ── WATER LEVEL PARALLAX ──
        // Layer 0: Deep ocean gradient (cached)
        ctx.fillStyle = bgGradients.water;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Layer 1 (0.05x): Distant reef silhouettes
        ctx.fillStyle = '#0a2840';
        forEachParallaxTile(0.05, 2000, (bx) => {
            for (let i = 0; i < 8; i++) {
                const rx = bx + i * 250;
                if (rx < -150 || rx > canvas.width + 150) continue;
                const rh = 60 + (i % 4) * 30;
                ctx.beginPath();
                ctx.moveTo(rx, canvas.height);
                ctx.quadraticCurveTo(rx + 40, canvas.height - rh - 20, rx + 80, canvas.height - rh);
                ctx.quadraticCurveTo(rx + 120, canvas.height - rh + 10, rx + 160, canvas.height);
                ctx.closePath();
                ctx.fill();
            }
        });

        // Layer 2 (0.1x): Mid-distance kelp/seaweed
        forEachParallaxTile(0.1, 1500, (bx) => {
            for (let i = 0; i < 10; i++) {
                const kx = bx + i * 150;
                if (kx < -30 || kx > canvas.width + 30) continue;
                const kh = 80 + (i % 3) * 40;
                const sway = Math.sin(frameTime * 0.001 + i * 0.7) * 8;
                ctx.fillStyle = '#0d4a2a';
                ctx.beginPath();
                ctx.moveTo(kx, canvas.height);
                ctx.quadraticCurveTo(kx + sway, canvas.height - kh / 2, kx + sway * 1.5, canvas.height - kh);
                ctx.quadraticCurveTo(kx + sway + 3, canvas.height - kh / 2, kx + 6, canvas.height);
                ctx.closePath();
                ctx.fill();
            }
        });

        // Layer 3 (0.15x): Coral formations
        const coralColors = ['#5a2030', '#6a2840', '#7a3050', '#4a1828'];
        forEachParallaxTile(0.15, 1200, (bx) => {
            for (let i = 0; i < 8; i++) {
                const cx = bx + i * 150;
                if (cx < -50 || cx > canvas.width + 50) continue;
                ctx.fillStyle = coralColors[i % coralColors.length];
                const ch = 30 + (i % 3) * 15;
                ctx.beginPath();
                ctx.moveTo(cx, canvas.height);
                ctx.lineTo(cx + 5, canvas.height - ch);
                ctx.lineTo(cx + 12, canvas.height - ch - 8);
                ctx.lineTo(cx + 14, canvas.height - ch);
                ctx.lineTo(cx + 20, canvas.height - ch + 5);
                ctx.lineTo(cx + 24, canvas.height - ch - 12);
                ctx.lineTo(cx + 28, canvas.height - ch);
                ctx.lineTo(cx + 30, canvas.height);
                ctx.closePath();
                ctx.fill();
            }
        });

        // Layer 4 (0.2x): Floating plankton/particles
        ctx.fillStyle = 'rgba(150, 200, 255, 0.15)';
        forEachParallaxTile(0.2, 1000, (bx) => {
            for (let i = 0; i < 20; i++) {
                const dx = bx + (i * 50);
                if (dx < -5 || dx > canvas.width + 5) continue;
                const dy = 50 + (i * 73) % 400;
                const ds = 1 + (i % 3);
                ctx.beginPath();
                ctx.arc(dx, dy, ds, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Layer 5 (0.25x): Animated rising bubbles
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.2)';
        ctx.lineWidth = 1;
        const bubTime = frameTime * 0.001;
        forEachParallaxTile(0.25, 800, (bx) => {
            for (let i = 0; i < 8; i++) {
                const bxx = bx + i * 100;
                if (bxx < -10 || bxx > canvas.width + 10) continue;
                const wobble = Math.sin(bubTime * 2 + i * 1.3) * 6;
                const by = ((canvas.height + 50) - ((bubTime * 30 + i * 67) % (canvas.height + 100)));
                const bs = 3 + (i % 3) * 2;
                ctx.beginPath();
                ctx.arc(bxx + wobble, by, bs, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        // Layer 6: Surface light shimmer at top
        ctx.fillStyle = bgGradients.shimmer;
        ctx.fillRect(0, 0, canvas.width, 60);
    } else if (levelStyle === 'underground') {
        // ── UNDERGROUND PARALLAX ──
        // Layer 0: Deep cave gradient (cached)
        ctx.fillStyle = bgGradients.underground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Secret room: draw a distinct back wall behind the room
        if (inSecretRoom && secretRoomBounds) {
            const rb = secretRoomBounds;
            const wallInset = 30; // same as wall thickness
            // Dark stone back wall – noticeably different from the cave background
            ctx.fillStyle = '#1c2b4a';
            ctx.fillRect(rb.left + wallInset, rb.top + wallInset, rb.width - wallInset * 2, rb.height - wallInset * 2);
            // Subtle brick-style pattern on back wall
            ctx.strokeStyle = 'rgba(100, 140, 200, 0.12)';
            ctx.lineWidth = 1;
            for (let row = rb.top + wallInset; row < rb.top + rb.height - wallInset; row += 20) {
                for (let col = rb.left + wallInset; col < rb.left + rb.width - wallInset; col += 40) {
                    const offset = (Math.floor((row - rb.top) / 20) % 2) * 20;
                    ctx.strokeRect(col + offset, row, 40, 20);
                }
            }
            // Glowing border highlight around inner room edge
            ctx.strokeStyle = 'rgba(100, 180, 255, 0.18)';
            ctx.lineWidth = 2;
            ctx.strokeRect(rb.left + wallInset + 1, rb.top + wallInset + 1, rb.width - wallInset * 2 - 2, rb.height - wallInset * 2 - 2);
        }

        // Skip parallax decoration when inside a secret room (just show flat back wall)
        if (!inSecretRoom) {

        // Layer 1 (0.05x): Faint distant cave wall texture
        ctx.fillStyle = '#0f1a2e';
        forEachParallaxTile(0.05, 2400, (bx) => {
            for (let i = 0; i < 12; i++) {
                const x = bx + (i * 200);
                if (x < -200 || x > canvas.width + 200) continue;
                drawCaveRock(x, canvas.height, 160 + (i % 3) * 40, 100 + (i % 4) * 30);
            }
        });

        // Layer 2 (0.1x): Stalactites
        ctx.fillStyle = '#1a2a4a';
        forEachParallaxTile(0.1, 1800, (bx) => {
            for (let i = 0; i < 15; i++) {
                const x = bx + (i * 120);
                if (x < -50 || x > canvas.width + 50) continue;
                const h = 25 + (i % 4) * 12;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 6, h);
                ctx.lineTo(x + 14, h * 0.6);
                ctx.lineTo(x + 22, 0);
                ctx.fill();
            }
        });

        // Layer 3 (0.15x): Mid-ground rock pillars
        ctx.fillStyle = '#1e2e4e';
        forEachParallaxTile(0.15, 1600, (bx) => {
            for (let i = 0; i < 8; i++) {
                const x = bx + (i * 200);
                if (x < -150 || x > canvas.width + 150) continue;
                drawCaveRock(x, 460, 80 + (i % 3) * 30, 50 + (i % 2) * 25);
            }
        });

        // Layer 4 (0.2x): Glowing crystals
        forEachParallaxTile(0.2, 1500, (bx) => {
            for (let i = 0; i < 6; i++) {
                const x = bx + (i * 250);
                if (x < -50 || x > canvas.width + 50) continue;
                const y = 380 + (i % 3) * 20;
                ctx.fillStyle = 'rgba(100, 180, 255, 0.08)';
                ctx.beginPath();
                ctx.arc(x + 8, y - 12, 28, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(100, 180, 255, 0.35)';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 5, y - 22);
                ctx.lineTo(x + 10, y - 28);
                ctx.lineTo(x + 16, y);
                ctx.fill();
            }
        });

        // Layer 5 (0.25x): Foreground stalactites (nearer, darker)
        ctx.fillStyle = '#253a5e';
        forEachParallaxTile(0.25, 1200, (bx) => {
            for (let i = 0; i < 8; i++) {
                const x = bx + (i * 150);
                if (x < -40 || x > canvas.width + 40) continue;
                const h = 15 + (i % 3) * 10;
                ctx.beginPath();
                ctx.moveTo(x, canvas.height);
                ctx.lineTo(x + 10, canvas.height - h);
                ctx.lineTo(x + 20, canvas.height);
                ctx.fill();
            }
        });

        } // end if (!inSecretRoom)
    } else {
        // ── OVERGROUND PARALLAX ──
        // Layer 0: Sky gradient (cached)
        ctx.fillStyle = bgGradients.overground;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Layer 1 (0.05x): Distant mountains
        forEachParallaxTile(0.05, 1600, (bx) => {
            ctx.fillStyle = '#8a9cc2';
            drawMountain(bx + 0, 360, 300, 160);
            drawMountain(bx + 250, 360, 350, 200);
            drawMountain(bx + 550, 360, 280, 150);
            drawMountain(bx + 800, 360, 320, 180);
            drawMountain(bx + 1100, 360, 260, 140);
            drawMountain(bx + 1350, 360, 340, 190);
        });

        // Layer 2 (0.1x): Closer mountain range
        forEachParallaxTile(0.1, 1400, (bx) => {
            ctx.fillStyle = '#6d9b6d';
            drawMountain(bx + 100, 390, 260, 120);
            drawMountain(bx + 380, 390, 300, 140);
            drawMountain(bx + 700, 390, 240, 110);
            drawMountain(bx + 1000, 390, 280, 130);
        });

        // Layer 3 (0.15x): Clouds (slowest moving)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        forEachParallaxTile(0.15, 1200, (bx) => {
            drawCloud(bx + 80, 55, 1.0);
            drawCloud(bx + 350, 95, 0.7);
            drawCloud(bx + 550, 40, 1.2);
            drawCloud(bx + 820, 75, 0.8);
            drawCloud(bx + 1050, 55, 0.9);
        });

        // Layer 4 (0.25x): Far trees / forest line
        forEachParallaxTile(0.25, 1000, (bx) => {
            ctx.fillStyle = '#4a8c3f';
            for (let i = 0; i < 14; i++) {
                const tx = bx + i * 72;
                if (tx < -60 || tx > canvas.width + 60) continue;
                const th = 40 + (i % 3) * 15;
                drawTree(tx, 420, th);
            }
        });

        // Layer 5 (0.35x): Near hills with grass detail
        forEachParallaxTile(0.35, 800, (bx) => {
            ctx.fillStyle = '#5a9e42';
            drawHill(bx + 60, 455, 180, 70);
            drawHill(bx + 320, 455, 220, 90);
            drawHill(bx + 600, 455, 160, 60);
            ctx.fillStyle = '#6ab850';
            drawHill(bx + 150, 460, 140, 50);
            drawHill(bx + 480, 460, 170, 55);
            drawHill(bx + 730, 460, 130, 45);
        });

        // Layer 6 (0.4x): Foreground bushes
        forEachParallaxTile(0.4, 700, (bx) => {
            for (let i = 0; i < 6; i++) {
                const bxPos = bx + i * 120;
                if (bxPos < -50 || bxPos > canvas.width + 50) continue;
                drawBush(bxPos, 465 + (i % 2) * 5);
            }
        });
    }
}

// ── PARALLAX HELPER DRAW FUNCTIONS ──

// Iterate over tiled parallax positions, calling fn(baseX) for each tile
function forEachParallaxTile(speed, pattern, fn) {
    const off = ((cameraX * speed) % pattern + pattern) % pattern;
    for (let tileX = -pattern; tileX <= canvas.width + pattern; tileX += pattern) {
        fn(tileX - off);
    }
}

function drawMountain(x, baseY, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width * 0.5, baseY - height);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.fill();
    // Snow cap for tall mountains
    if (height > 140) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        const peakX = x + width * 0.5;
        const peakY = baseY - height;
        ctx.moveTo(peakX, peakY);
        ctx.lineTo(peakX - width * 0.08, peakY + height * 0.18);
        ctx.lineTo(peakX + width * 0.08, peakY + height * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawTree(x, baseY, height) {
    // Trunk
    ctx.save();
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + 8, baseY - height * 0.3, 6, height * 0.3);
    ctx.restore();
    // Canopy (two overlapping circles)
    ctx.beginPath();
    ctx.arc(x + 11, baseY - height * 0.5, height * 0.35, 0, Math.PI * 2);
    ctx.arc(x + 11, baseY - height * 0.72, height * 0.28, 0, Math.PI * 2);
    ctx.fill();
}

function drawBush(x, y) {
    ctx.save();
    ctx.fillStyle = '#3d8a30';
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.arc(x + 18, y - 4, 16, 0, Math.PI * 2);
    ctx.arc(x + 36, y, 13, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#4da840';
    ctx.beginPath();
    ctx.arc(x + 18, y - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCaveRock(x, baseY, width, height) {
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + width * 0.2, baseY - height * 0.6);
    ctx.lineTo(x + width * 0.5, baseY - height);
    ctx.lineTo(x + width * 0.8, baseY - height * 0.5);
    ctx.lineTo(x + width, baseY);
    ctx.closePath();
    ctx.fill();
}

function drawCloud(x, y, scale) {
    ctx.beginPath();
    ctx.arc(x, y, 30 * scale, 0, Math.PI * 2);
    ctx.arc(x + 30 * scale, y - 10 * scale, 35 * scale, 0, Math.PI * 2);
    ctx.arc(x + 60 * scale, y, 30 * scale, 0, Math.PI * 2);
    ctx.arc(x + 30 * scale, y + 10 * scale, 25 * scale, 0, Math.PI * 2);
    ctx.fill();
}

function drawHill(x, baseY, width, height) {
    ctx.beginPath();
    ctx.moveTo(x - width * 0.3, canvas.height);
    ctx.quadraticCurveTo(x, baseY, x + width/2, baseY - height);
    ctx.quadraticCurveTo(x + width, baseY, x + width * 1.3, canvas.height);
    ctx.closePath();
    ctx.fill();
}

function drawPlayer() {
    const screenX = player.x - cameraX;
    
    // Invincibility flash (damage invincibility only, not star)
    if (player.invincible && !player.starPower && !godMode && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
        return;
    }
    
    const scale = player.powered ? 1.5 : 1.0;
    const drawY = player.y + player.height; // Bottom of player (feet)
    
    ctx.save();
    
    // God mode golden glow
    if (godMode) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
    }
    // Star power rainbow effect
    else if (player.starPower) {
        const rainbow = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
        const colorIdx = Math.floor(frameTime / 80) % rainbow.length;
        ctx.shadowColor = rainbow[colorIdx];
        ctx.shadowBlur = 15;
    }
    
    // Speed boost trail effect
    if (player.speedBoost && Math.abs(player.velX) > 1) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#3498db';
        ctx.fillRect(screenX - player.facing * 10, player.y + 10, player.width, player.height - 20);
        ctx.fillRect(screenX - player.facing * 20, player.y + 15, player.width, player.height - 30);
        ctx.globalAlpha = 1;
    }
    
    // Scale from the bottom-center of the player
    ctx.translate(screenX + player.width / 2, drawY);
    ctx.scale(player.facing, scale);
    ctx.translate(-(player.width / 2), -48); // 48 = base height
    
    // Body color: use equipped skin, white if fire flower; star overrides with rainbow
    const equippedSkin = getEquippedSkin();
    let bodyColor = equippedSkin.bodyColor;
    let hatColor = equippedSkin.hatColor;
    let hatBrimColor = equippedSkin.hatBrim;
    if (player.hasFireFlower) {
        bodyColor = '#ecf0f1';
        hatColor = '#ecf0f1';
        hatBrimColor = '#bdc3c7';
    }
    if (player.starPower) {
        const rainbow = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
        const ci = Math.floor(frameTime / 80) % rainbow.length;
        bodyColor = rainbow[ci];
        hatColor = rainbow[(ci + 2) % rainbow.length];
        hatBrimColor = rainbow[(ci + 4) % rainbow.length];
    }
    
    // Body
    ctx.fillStyle = bodyColor;
    ctx.fillRect(6, 16, 20, 20);
    
    // Head
    ctx.fillStyle = '#ffcc99';
    ctx.beginPath();
    ctx.arc(player.width/2, 12, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat
    ctx.fillStyle = hatColor;
    ctx.fillRect(4, 2, 24, 8);
    ctx.fillRect(8, -2, 16, 6);
    
    // Hat brim
    ctx.fillStyle = hatBrimColor;
    ctx.fillRect(2, 8, 28, 3);
    
    // Eyes
    ctx.fillStyle = 'white';
    ctx.fillRect(12, 8, 4, 5);
    ctx.fillRect(18, 8, 4, 5);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(14, 10, 2, 3);
    ctx.fillRect(20, 10, 2, 3);
    
    // Mustache
    ctx.fillStyle = '#4a2c00';
    ctx.fillRect(10, 16, 12, 3);
    
    // Swimming arms (water level only)
    if (levelStyle === 'water') {
        const swimTime = frameTime * 0.006;
        const armSwing = Math.sin(swimTime) * 20;
        ctx.fillStyle = '#ffcc99'; // Skin color for arms
        // Left arm
        ctx.save();
        ctx.translate(6, 22);
        ctx.rotate((-45 + armSwing) * Math.PI / 180);
        ctx.fillRect(-12, -3, 12, 5);
        ctx.restore();
        // Right arm
        ctx.save();
        ctx.translate(26, 22);
        ctx.rotate((45 - armSwing) * Math.PI / 180);
        ctx.fillRect(0, -3, 12, 5);
        ctx.restore();
    }
    
    // Legs
    ctx.fillStyle = '#2980b9';
    if (levelStyle === 'water') {
        // Flutter kick for swimming
        const kickTime = frameTime * 0.008;
        const kick = Math.sin(kickTime) * 5;
        ctx.fillRect(8, 36 + kick, 8, 12);
        ctx.fillRect(16, 36 - kick, 8, 12);
    } else if (player.isJumping) {
        ctx.fillRect(8, 36, 8, 12);
        ctx.fillRect(18, 32, 8, 12);
    } else if (Math.abs(player.velX) > 0.5) {
        const legOffset = Math.sin(player.frameX * 0.5) * 4;
        ctx.fillRect(8 + legOffset, 36, 8, 12);
        ctx.fillRect(16 - legOffset, 36, 8, 12);
    } else {
        ctx.fillRect(8, 36, 8, 12);
        ctx.fillRect(16, 36, 8, 12);
    }
    
    // Shoes
    ctx.fillStyle = '#8B4513';
    if (levelStyle === 'water') {
        // Flippers for swimming
        const kickTime = frameTime * 0.008;
        const kick = Math.sin(kickTime) * 5;
        ctx.fillStyle = '#1a6fa0'; // Blue flippers
        ctx.fillRect(4, 44 + kick, 14, 6);
        ctx.fillRect(14, 44 - kick, 14, 6);
    } else if (player.isJumping) {
        ctx.fillRect(6, 44, 12, 6);
        ctx.fillRect(16, 40, 12, 6);
    } else {
        ctx.fillRect(6, 44, 12, 6);
        ctx.fillRect(14, 44, 12, 6);
    }
    
    ctx.restore();
}

// ==================== SECRET ROOM SYSTEM ====================

// Check if player is standing on top of a secret pipe
function getSecretPipeUnderPlayer() {
    if (inSecretRoom || !player.grounded || secretEntryTimer > 0) return null;
    for (const pipe of secretPipes) {
        // Player must be standing on the pipe's top surface
        const onTop = player.y + player.height >= pipe.y - 2 &&
                      player.y + player.height <= pipe.y + 8;
        const horizontalOverlap = player.x + player.width > pipe.x + 8 &&
                                  player.x < pipe.x + pipe.width - 8;
        if (onTop && horizontalOverlap) {
            return pipe;
        }
    }
    return null;
}

// Generate the secret bonus room contents
function generateSecretRoom(pipeKey) {
    // Small underground room: 500px wide, 300px tall — centred on canvas
    const roomW = 500;
    const roomH = 300;
    const roomLeft = Math.floor((canvas.width - roomW) / 2);   // centred horizontally
    const roomTop = Math.floor((canvas.height - roomH) / 2);   // centred vertically
    const floorY = roomTop + roomH - 40;
    const wallThick = 30;
    const innerLeft = roomLeft + wallThick;      // left inner edge
    const innerRight = roomLeft + roomW - wallThick; // right inner edge
    
    // Store bounds for back-wall drawing
    secretRoomBounds = { left: roomLeft, top: roomTop, width: roomW, height: roomH };
    
    const roomPlatforms = [];
    const roomCoins = [];
    
    // Floor
    roomPlatforms.push(new Platform(roomLeft, floorY, roomW, 40, 'stone'));
    // Ceiling
    roomPlatforms.push(new Platform(roomLeft, roomTop, roomW, wallThick, 'stone'));
    // Left wall
    roomPlatforms.push(new Platform(roomLeft, roomTop, wallThick, roomH, 'stone'));
    // Right wall
    roomPlatforms.push(new Platform(innerRight, roomTop, wallThick, roomH, 'stone'));
    
    // Exit pipe (in the right side of the room, fully inside walls)
    const pipeW = 64;
    const pipeH = 70;
    const exitPipeX = innerRight - pipeW - 10; // 10px gap from right wall
    const exitPipe = new Platform(exitPipeX, floorY - pipeH, pipeW, pipeH, 'pipe');
    roomPlatforms.push(exitPipe);
    
    // Small floating platforms inside (flush with left wall so no misleading gaps)
    roomPlatforms.push(new Platform(innerLeft, floorY - 80, 80, 24, 'stone'));
    roomPlatforms.push(new Platform(innerLeft + 140, floorY - 120, 80, 24, 'stone'));
    roomPlatforms.push(new Platform(innerLeft + 270, floorY - 80, 60, 24, 'stone'));
    
    // Helper: check a coin doesn't overlap any platform
    function coinInsideAnyPlatform(cx, cy) {
        for (const p of roomPlatforms) {
            if (cx + 24 > p.x && cx < p.x + p.width &&
                cy + 24 > p.y && cy < p.y + p.height) {
                return true;
            }
        }
        return false;
    }
    
    function tryAddCoin(cx, cy) {
        if (!coinInsideAnyPlatform(cx, cy)) {
            roomCoins.push(new Coin(cx, cy));
        }
    }
    
    // Ground level coins — stop before the exit pipe
    const coinStartX = innerLeft + 20;
    const coinEndX = exitPipeX - 10;
    for (let cx = coinStartX; cx < coinEndX; cx += 34) {
        tryAddCoin(cx, floorY - 30);
    }
    // Elevated coins on platforms
    tryAddCoin(innerLeft + 40, floorY - 110);
    tryAddCoin(innerLeft + 70, floorY - 110);
    tryAddCoin(innerLeft + 170, floorY - 150);
    tryAddCoin(innerLeft + 200, floorY - 150);
    tryAddCoin(innerLeft + 230, floorY - 150);
    tryAddCoin(innerLeft + 285, floorY - 110);
    tryAddCoin(innerLeft + 315, floorY - 110);
    
    // Top row of coins (requires jumping between platforms)
    tryAddCoin(innerLeft + 120, floorY - 170);
    tryAddCoin(innerLeft + 150, floorY - 170);
    tryAddCoin(innerLeft + 260, floorY - 170);
    
    // Filter out already-collected coins if player revisits this pipe
    const collected = secretRoomCollectedCoins[pipeKey] || [];
    const filteredCoins = roomCoins.filter((c, i) => !collected.includes(i));
    
    return { roomPlatforms, roomCoins: filteredCoins, exitPipe, allCoinPositions: roomCoins };
}

// Enter a secret pipe
function enterSecretPipe(pipe) {
    playSound('pipe');
    const pipeKey = `${Math.round(pipe.x)}_${Math.round(pipe.y)}_L${currentLevel}`;
    console.log(`[SECRET] Entering secret pipe at (${pipe.x}, ${pipe.y})! Key: ${pipeKey}`);
    
    // Save current level state
    savedLevelState = {
        platforms: platforms,
        movingPlatforms: movingPlatforms,
        coinsList: coinsList,
        enemies: enemies,
        mushrooms: mushrooms,
        powerUps: powerUps,
        fireballs: fireballs,
        checkpoints: checkpoints,
        flag: flag,
        secretPipes: secretPipes,
        cameraX: cameraX,
        levelStyleSaved: levelStyle,
        pipeKey: pipeKey
    };
    
    // Save return position (on top of the pipe)
    secretRoomReturnX = player.x;
    secretRoomReturnY = pipe.y - player.height - 2;
    secretRoomReturnCameraX = cameraX;
    
    // Generate secret room (passing pipeKey so collected coins can be filtered)
    const room = generateSecretRoom(pipeKey);
    
    // Replace level with secret room contents
    platforms = room.roomPlatforms;
    movingPlatforms = [];
    coinsList = room.roomCoins;
    enemies = [];
    mushrooms = [];
    powerUps = [];
    fireballs = [];
    checkpoints = [];
    flag = null;
    secretPipes = [];
    secretRoomExitPipe = room.exitPipe;
    
    // Teleport player into the centred room (left side, near floor)
    const rb = secretRoomBounds;
    player.x = rb.left + 50; // inside the left wall
    player.y = rb.top + rb.height - 40 - player.height - 4; // just above the floor
    player.velX = 0;
    player.velY = 0;
    player.grounded = false;
    
    // Set camera for the centred room
    cameraX = 0;
    
    // Mark as in secret room
    inSecretRoom = true;
    secretEntryTimer = 30; // Cooldown before can exit
    
    // Switch to underground style for the room
    levelStyle = 'underground';
    buildBackgroundGradients();
    console.log(`[SECRET] Secret room entered! ${coinsList.length} coins to collect.`);
    
    // Particles for entering
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#2ecc71'));
    }
}

// Exit the secret room back to the main level
function exitSecretRoom() {
    if (!savedLevelState) return;
    
    playSound('pipe');
    
    // Record which coins were collected in this secret room visit
    const pipeKey = savedLevelState.pipeKey;
    if (pipeKey) {
        if (!secretRoomCollectedCoins[pipeKey]) secretRoomCollectedCoins[pipeKey] = [];
        // Mark every coin index in the room that was collected
        coinsList.forEach((c, i) => {
            if (c.collected && !secretRoomCollectedCoins[pipeKey].includes(i)) {
                secretRoomCollectedCoins[pipeKey].push(i);
            }
        });
    }
    
    console.log(`[SECRET] Exiting secret room. Returning to main level at (${secretRoomReturnX}, ${secretRoomReturnY})`);
    
    // Restore the main level
    platforms = savedLevelState.platforms;
    movingPlatforms = savedLevelState.movingPlatforms;
    coinsList = savedLevelState.coinsList;
    enemies = savedLevelState.enemies;
    mushrooms = savedLevelState.mushrooms;
    powerUps = savedLevelState.powerUps;
    fireballs = savedLevelState.fireballs;
    checkpoints = savedLevelState.checkpoints;
    flag = savedLevelState.flag;
    secretPipes = savedLevelState.secretPipes;
    cameraX = savedLevelState.cameraX;
    levelStyle = savedLevelState.levelStyleSaved;
    
    // Restore player to the pipe they entered from
    player.x = secretRoomReturnX;
    player.y = secretRoomReturnY;
    player.velX = 0;
    player.velY = 0;
    player.grounded = false;
    cameraX = secretRoomReturnCameraX;
    
    // Clean up
    savedLevelState = null;
    secretRoomExitPipe = null;
    secretRoomBounds = null;
    inSecretRoom = false;
    secretEntryTimer = 30; // Cooldown before can enter again
    
    // Rebuild background for original level style
    buildBackgroundGradients();
    
    // Particles for exiting
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#2ecc71'));
    }
}

// Check for secret pipe entry/exit (called each frame from updatePlayer)
function checkSecretPipeInteraction() {
    if (secretEntryTimer > 0) {
        secretEntryTimer--;
        return;
    }
    
    const pressDown = keys['KeyS'] || keys['ArrowDown'];
    
    if (inSecretRoom) {
        // Check if player is on the exit pipe and pressing S/down
        if (pressDown && secretRoomExitPipe && player.grounded) {
            const pipe = secretRoomExitPipe;
            const onTop = player.y + player.height >= pipe.y - 2 &&
                          player.y + player.height <= pipe.y + 8;
            const horizontalOverlap = player.x + player.width > pipe.x + 8 &&
                                      player.x < pipe.x + pipe.width - 8;
            if (onTop && horizontalOverlap) {
                exitSecretRoom();
            }
        }
    } else {
        // Check if player is on a secret pipe and pressing S/down
        if (pressDown) {
            const pipe = getSecretPipeUnderPlayer();
            if (pipe) {
                enterSecretPipe(pipe);
            }
        }
    }
}
// ==================== END SECRET ROOM SYSTEM ====================

function updatePlayer() {
    // === GOD MODE: free-fly with WASD, ignore gravity & collision ===
    if (godMode) {
        const flySpeed = 6;
        player.velX = 0;
        player.velY = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) { player.x -= flySpeed; player.facing = -1; }
        if (keys['ArrowRight'] || keys['KeyD']) { player.x += flySpeed; player.facing = 1; }
        if (keys['ArrowUp'] || keys['KeyW'] || keys['Space']) { player.y -= flySpeed; }
        if (keys['ArrowDown'] || keys['KeyS']) { player.y += flySpeed; }
        // Keep in level bounds (but allow vertical freedom)
        if (player.x < 0) player.x = 0;
        if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;
        // Update camera
        const targetCameraX = player.x - canvas.width / 3;
        cameraX += (targetCameraX - cameraX) * 0.1;
        if (cameraX < 0) cameraX = 0;
        if (cameraX > LEVEL_WIDTH - canvas.width) cameraX = LEVEL_WIDTH - canvas.width;
        // Animation
        if (Math.abs(keys['ArrowLeft'] || keys['KeyA'] || keys['ArrowRight'] || keys['KeyD'])) {
            player.frameTimer++;
            if (player.frameTimer > 5) { player.frameX++; player.frameTimer = 0; }
        }
        return; // Skip all normal physics
    }

    // Check secret pipe interaction (enter/exit secret rooms)
    checkSecretPipeInteraction();

    // Reset wall state
    player.onWall = false;
    player.wallDirection = 0;
    
    // Update star power timer
    if (player.starPower) {
        player.starTimer--;
        if (player.starTimer <= 0) {
            player.starPower = false;
            player.invincible = false;
            console.log('[POWER-UP EXPIRED] Star power ended');
            // Spawn trail particles on expire
            for (let i = 0; i < 8; i++) {
                particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#f1c40f'));
            }
        }
    }
    
    // Update speed boost timer
    if (player.speedBoost) {
        player.speedBoostTimer--;
        if (player.speedBoostTimer <= 0) {
            player.speedBoost = false;
            player.speed = player.baseSpeed;
            console.log('[POWER-UP EXPIRED] Speed boost ended');
            for (let i = 0; i < 6; i++) {
                particles.push(new Particle(player.x + player.width / 2, player.y + player.height / 2, '#3498db'));
            }
        }
    }
    
    // Fire flower shooting - press F or E to shoot
    if (player.hasFireFlower && player.fireTimer <= 0 && (keys['KeyF'] || keys['KeyE'])) {
        const fbX = player.facing > 0 ? player.x + player.width : player.x - 12;
        const fbY = player.y + player.height / 2 - 6;
        fireballs.push(new Fireball(fbX, fbY, player.facing));
        player.fireTimer = 20; // Cooldown
        console.log(`[FIREBALL] Shot ${player.facing > 0 ? 'right' : 'left'} from (${Math.round(fbX)}, ${Math.round(fbY)}). Active fireballs: ${fireballs.length + 1}`);
    }
    if (player.fireTimer > 0) player.fireTimer--;
    
    // Horizontal movement
    const isWater = levelStyle === 'water';
    const moveSpeed = isWater ? player.speed * 0.6 : player.speed;
    
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.velX = -moveSpeed;
        player.facing = -1;
    } else if (keys['ArrowRight'] || keys['KeyD']) {
        player.velX = moveSpeed;
        player.facing = 1;
    } else {
        player.velX *= isWater ? 0.92 : 0.8;
        if (Math.abs(player.velX) < 0.1) player.velX = 0;
    }
    
    // Check for wall contact (for wall jump)
    for (const platform of platforms) {
        if (platform.x > player.x + player.width + 10 || 
            platform.x + platform.width < player.x - 10) {
            continue;
        }
        
        // Check if player is beside a wall (not on top)
        if (player.y + player.height > platform.y + 5 &&
            player.y < platform.y + platform.height - 5) {
            // Left side of platform
            if (player.x + player.width >= platform.x - 2 && 
                player.x + player.width <= platform.x + 5 &&
                (keys['ArrowRight'] || keys['KeyD'])) {
                player.onWall = true;
                player.wallDirection = -1; // Wall is to the right, jump left
            }
            // Right side of platform
            if (player.x <= platform.x + platform.width + 2 && 
                player.x >= platform.x + platform.width - 5 &&
                (keys['ArrowLeft'] || keys['KeyA'])) {
                player.onWall = true;
                player.wallDirection = 1; // Wall is to the left, jump right
            }
        }
    }
    
    // Wall slide (slower falling when on wall)
    if (player.onWall && !player.grounded && player.velY > 0) {
        player.velY = Math.min(player.velY, player.wallSlideSpeed);
    }
    
    // Shell pickup mechanic - hold S near a stationary shell to pick it up
    const holdingS = keys['KeyS'] || keys['ArrowDown'];
    
    if (player.heldShell) {
        // Shell follows player while held
        player.heldShell.x = player.x + (player.facing > 0 ? player.width : -player.heldShell.width);
        player.heldShell.y = player.y + player.height - player.heldShell.height - 5;
        
        // Release S to kick the shell
        if (!holdingS) {
            player.heldShell.shellMoving = true;
            player.heldShell.velX = player.facing > 0 ? player.heldShell.shellSpeed : -player.heldShell.shellSpeed;
            console.log(`[SHELL THROW] Threw held shell ${player.facing > 0 ? 'right' : 'left'}`);
            player.heldShell = null;
            player.invincible = true;
            player.invincibleTimer = 30; // Brief invincibility after kicking
        }
    } else if (holdingS) {
        // Try to pick up nearby stationary shell
        for (const enemy of enemies) {
            if (enemy.isShell && !enemy.shellMoving && enemy.alive) {
                const dist = Math.abs(enemy.x + enemy.width/2 - (player.x + player.width/2));
                if (dist < 40 && 
                    player.y + player.height > enemy.y && 
                    player.y < enemy.y + enemy.height) {
                    player.heldShell = enemy;
                    console.log(`[SHELL PICKUP] Picked up koopa shell at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
                    break;
                }
            }
        }
    }
    
    // Jumping - ground jump or wall jump
    const jumpPressed = keys['Space'] || keys['ArrowUp'] || keys['KeyW'];
    const jumpJustPressed = jumpPressed && !player.jumpKeyHeld;
    player.jumpKeyHeld = jumpPressed;
    
    if (jumpJustPressed) {
        if (isWater) {
            // Water swim kick - can swim anytime
            player.velY = -3.5;
            player.isJumping = true;
            playSound('swim');
            // Bubble trail from swimming
            for (let i = 0; i < 3; i++) {
                particles.push(new Particle(
                    player.x + player.width / 2 + (Math.random() - 0.5) * 10,
                    player.y + player.height,
                    'rgba(200,230,255,0.5)'
                ));
            }
        } else if (player.grounded) {
            // Normal ground jump
            player.velY = player.jumpPower;
            player.grounded = false;
            player.isJumping = true;
            playSound('jump');
        } else if (player.onWall) {
            // Wall jump
            player.velY = player.wallJumpPower;
            player.velX = player.wallJumpHorizontalPower * player.wallDirection;
            player.facing = player.wallDirection;
            player.isJumping = true;
            player.onWall = false;
            console.log(`[WALL JUMP] Direction: ${player.wallDirection === 1 ? 'right' : 'left'}, Position: (${Math.round(player.x)}, ${Math.round(player.y)})`);
            playSound('jump');
        }
    }
    
    // Apply gravity
    if (isWater) {
        player.velY += 0.15; // Gentle sinking in water
        if (player.velY > 2.5) player.velY = 2.5; // Slow max sink speed
        if (player.velY < -4) player.velY = -4; // Limit swim-up speed
    } else {
        player.velY += player.gravity;
        if (player.velY > 15) player.velY = 15;
    }
    
    // Update position
    player.x += player.velX;
    player.y += player.velY;
    
    // Animation
    if (Math.abs(player.velX) > 0.5) {
        player.frameTimer++;
        if (player.frameTimer > 5) {
            player.frameX++;
            player.frameTimer = 0;
        }
    }
    
    // Keep in bounds
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_WIDTH - player.width) player.x = LEVEL_WIDTH - player.width;
    
    // Platform collision
    player.grounded = false;
    for (const platform of platforms) {
        // Broad-phase check - skip platforms far from player (optimization)
        if (platform.x > player.x + player.width + 50 || 
            platform.x + platform.width < player.x - 50) {
            continue;
        }
        
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            // Landing on top
            if (player.velY > 0 && player.y + player.height - player.velY <= platform.y + 5) {
                player.y = platform.y - player.height;
                player.velY = 0;
                player.grounded = true;
                player.isJumping = false;
            }
            // Hitting bottom
            else if (player.velY < 0 && player.y - player.velY >= platform.y + platform.height - 5) {
                player.y = platform.y + platform.height;
                player.velY = 0;
                
                // Check for question block hit
                if (platform.type === 'question' && !platform.hit) {
                    platform.hit = true;
                    playSound('blockhit');
                    
                    // Power-up spawn: 10% star, 10% fire flower, 10% speed boost, 15% mushroom, 55% coin
                    const roll = Math.random();
                    const spawnX = platform.x + platform.width / 2 - 13;
                    const spawnY = platform.y - 30;
                    if (roll < 0.10) {
                        powerUps.push(new Star(spawnX, spawnY));
                        console.log(`[BLOCK HIT] Question block at (${platform.x}, ${platform.y}) spawned a Star!`);
                    } else if (roll < 0.20) {
                        powerUps.push(new FireFlower(spawnX, spawnY));
                        console.log(`[BLOCK HIT] Question block at (${platform.x}, ${platform.y}) spawned a Fire Flower!`);
                    } else if (roll < 0.30) {
                        powerUps.push(new SpeedBoost(spawnX, spawnY));
                        console.log(`[BLOCK HIT] Question block at (${platform.x}, ${platform.y}) spawned a Speed Boost!`);
                    } else if (roll < 0.45) {
                        mushrooms.push(new Mushroom(platform.x + platform.width/2 - 14, spawnY));
                        console.log(`[BLOCK HIT] Question block at (${platform.x}, ${platform.y}) spawned a Mushroom!`);
                    } else {
                        // Spawn coin above block
                        const _cm = getActiveAbilities().includes('double_coins') ? 2 : 1;
                        score += 100 * _cm;
                        coins += 1 * _cm;
                        playSound('coin');
                        updateUI();
                        // Coin pop effect
                        for (let i = 0; i < 6; i++) {
                            particles.push(new Particle(platform.x + platform.width/2, platform.y - 10, '#f1c40f'));
                        }
                        console.log(`[BLOCK HIT] Question block at (${platform.x}, ${platform.y}) gave a coin. Total coins: ${coins}`);
                    }
                }
            }
            // Hitting side
            else {
                if (player.velX > 0) {
                    player.x = platform.x - player.width;
                } else if (player.velX < 0) {
                    player.x = platform.x + platform.width;
                }
                player.velX = 0;
            }
        }
    }
    
    // Moving platform collision
    for (const mp of movingPlatforms) {
        if (mp.x > player.x + player.width + 50 || 
            mp.x + mp.width < player.x - 50) {
            continue;
        }
        
        if (player.x < mp.x + mp.width &&
            player.x + player.width > mp.x &&
            player.y < mp.y + mp.height &&
            player.y + player.height > mp.y) {
            
            // Landing on top
            if (player.velY > 0 && player.y + player.height - player.velY <= mp.y + 5) {
                player.y = mp.y - player.height;
                player.velY = 0;
                player.grounded = true;
                player.isJumping = false;
                // Carry player with the platform
                player.x += mp.deltaX;
                player.y += mp.deltaY;
            }
            // Hitting bottom
            else if (player.velY < 0 && player.y - player.velY >= mp.y + mp.height - 5) {
                player.y = mp.y + mp.height;
                player.velY = 0;
            }
            // Hitting side
            else {
                if (player.velX > 0) {
                    player.x = mp.x - player.width;
                } else if (player.velX < 0) {
                    player.x = mp.x + mp.width;
                }
                player.velX = 0;
            }
        }
    }
    
    // Fall death
    if (!godMode && player.y > canvas.height + 50) {
        if (inSecretRoom) {
            console.log('[FALL] Player fell off map in secret room — exiting back to main level');
            // Don't lose a life in the secret room, just exit
            exitSecretRoom();
            return;
        }
        console.log(`[FALL DEATH] Player fell off the map at x=${Math.round(player.x)}`);
        loseLife();
    }
    
    // Invincibility timer
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) {
            player.invincible = false;
        }
    }
    
    // Update camera
    const targetCameraX = player.x - canvas.width / 3;
    cameraX += (targetCameraX - cameraX) * 0.1;
    if (cameraX < 0) cameraX = 0;
    if (inSecretRoom) {
        // Clamp camera for small secret room
        if (cameraX > 300) cameraX = 300;
    } else {
        if (cameraX > LEVEL_WIDTH - canvas.width) cameraX = LEVEL_WIDTH - canvas.width;
    }
    
    // Periodic player position debug logging (~every 5 seconds)
    _posLogCounter++;
    if (_posLogCounter % 300 === 0) {
        console.debug(`[PLAYER] Pos: (${Math.round(player.x)}, ${Math.round(player.y)}), Vel: (${player.velX.toFixed(1)}, ${player.velY.toFixed(1)}), Grounded: ${player.grounded}, Powered: ${player.powered}, Star: ${player.starPower}, Fire: ${player.hasFireFlower}, Speed: ${player.speedBoost}`);
    }
}

// Generic AABB overlap test between player and an item
function playerOverlaps(item) {
    return player.x < item.x + item.width &&
        player.x + player.width > item.x &&
        player.y < item.y + item.height &&
        player.y + player.height > item.y;
}

function checkCoinCollision() {
    const magnetRange = getActiveAbilities().includes('coin_magnet') ? 200 : 100;
    const coinMultiplier = getActiveAbilities().includes('double_coins') ? 2 : 1;
    for (const coin of coinsList) {
        if (coin.collected || Math.abs(coin.x - player.x) > magnetRange) continue;
        if (playerOverlaps(coin)) {
            
            coin.collected = true;
            coins += 1 * coinMultiplier;
            score += 100 * coinMultiplier;
            console.log(`[COIN] Collected at (${Math.round(coin.x)}, ${Math.round(coin.y)}). Total coins: ${coins}, Score: ${score}${coinMultiplier > 1 ? ' (2x multiplier!)' : ''}`);
            playSound('coin');
            
            // Sparkle effect
            for (let i = 0; i < 8; i++) {
                particles.push(new Particle(coin.x + coin.width/2, coin.y + coin.height/2, '#f1c40f'));
            }
            
            updateUI();
        }
    }
}

function checkMushroomCollision() {
    for (const mushroom of mushrooms) {
        if (mushroom.collected || Math.abs(mushroom.x - player.x) > 100) continue;
        if (playerOverlaps(mushroom)) {
            
            mushroom.collected = true;
            playSound('powerup');
            console.log(`[POWER-UP] Mushroom collected at (${Math.round(mushroom.x)}, ${Math.round(mushroom.y)}). Player ${player.powered ? 'already powered' : 'now powered up!'}`);
            if (!player.powered) {
                player.powered = true;
                // Grow to 1.5x height, keep feet at same position
                const oldHeight = player.height;
                player.height = 72; // 48 * 1.5
                player.y -= (player.height - oldHeight);
            }
            score += 500;
            
            // Power-up particles
            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(mushroom.x + mushroom.width/2, mushroom.y + mushroom.height/2, '#e74c3c'));
            }
            
            updateUI();
        }
    }
}

function checkPowerUpCollision() {
    for (const pu of powerUps) {
        if (pu.collected || Math.abs(pu.x - player.x) > 100) continue;
        if (playerOverlaps(pu)) {

            pu.collected = true;
            playSound('powerup');

            if (pu instanceof Star) {
                player.starPower = true;
                player.starTimer = 480; // ~8 seconds at 60fps
                player.invincible = true;
                player.invincibleTimer = 480;
                score += 500;
                console.log(`[POWER-UP] Star collected! Invincible for ~8 seconds. Score: ${score}`);
                for (let i = 0; i < 15; i++) {
                    const rainbow = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
                    particles.push(new Particle(pu.x + pu.width / 2, pu.y + pu.height / 2, rainbow[i % rainbow.length]));
                }
            } else if (pu instanceof FireFlower) {
                player.hasFireFlower = true;
                if (!player.powered) {
                    player.powered = true;
                    const oldHeight = player.height;
                    player.height = 72;
                    player.y -= (player.height - oldHeight);
                }
                score += 500;
                console.log(`[POWER-UP] Fire Flower collected! Can now shoot fireballs (F/E). Score: ${score}`);
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(pu.x + pu.width / 2, pu.y + pu.height / 2, i % 2 === 0 ? '#e74c3c' : '#f39c12'));
                }
            } else if (pu instanceof SpeedBoost) {
                player.speedBoost = true;
                player.speedBoostTimer = 360; // ~6 seconds
                player.speed = player.baseSpeed * 1.8;
                score += 300;
                console.log(`[POWER-UP] Speed Boost collected! Speed x1.8 for ~6 seconds. Score: ${score}`);
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(pu.x + pu.width / 2, pu.y + pu.height / 2, '#3498db'));
                }
            }
            updateUI();
        }
    }
}

function checkEnemyCollision() {
    if (godMode) return; // God mode: ignore all enemies
    for (const enemy of enemies) {
        if (!enemy.alive) continue;
        // Star power: kill enemies on contact
        if (player.starPower) {
            if (Math.abs(enemy.x - player.x) > 100) continue;
            if (player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y) {
                enemy.alive = false;
                score += 200;
                playSound('stomp');
                console.log(`[STAR KILL] Destroyed ${enemy.type} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)}) with star power. +200 pts, Score: ${score}`);
                for (let i = 0; i < 8; i++) {
                    const rainbow = ['#f1c40f', '#e74c3c', '#2ecc71', '#3498db'];
                    particles.push(new Particle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, rainbow[i % rainbow.length]));
                }
                updateUI();
            }
            continue;
        }
        if (player.invincible) continue;
        // Skip the shell the player is holding
        if (enemy === player.heldShell) continue;
        // Skip far enemies (optimization)
        if (Math.abs(enemy.x - player.x) > 100) continue;
        
        // Skip stationary shells (they're safe to touch from side) - but don't auto-kick if we're trying to pick up
        if (enemy.isShell && !enemy.shellMoving) {
            // Don't auto-kick if player is holding S (trying to pick up)
            if (keys['KeyS'] || keys['ArrowDown']) continue;
            
            if (player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y) {
                // Kick the shell!
                enemy.shellMoving = true;
                enemy.velX = player.x < enemy.x ? enemy.shellSpeed : -enemy.shellSpeed;
                score += 100;
                console.log(`[SHELL KICK] Kicked shell ${player.x < enemy.x ? 'right' : 'left'} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)}). +100 pts`);
                playSound('kick');
                updateUI();
            }
            continue;
        }
        
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            // Check if jumping on enemy
            if (player.velY > 0 && player.y + player.height - player.velY <= enemy.y + 10) {
                player.velY = levelStyle === 'water' ? -3 : -8;
                score += 200;
                playSound('stomp');
                console.log(`[STOMP] Stomped ${enemy.type} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)}). +200 pts, Score: ${score}`);
                
                if (enemy.type === 'koopa') {
                    if (!enemy.isShell) {
                        // Turn koopa into shell
                        enemy.isShell = true;
                        enemy.velX = 0;
                        enemy.height = 28;
                        console.log(`[STOMP] Koopa turned into shell at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
                    } else if (enemy.shellMoving) {
                        // Stop moving shell
                        enemy.shellMoving = false;
                        enemy.velX = 0;
                        console.log(`[STOMP] Stopped moving shell at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
                    } else {
                        // Kick stationary shell
                        enemy.shellMoving = true;
                        enemy.velX = player.facing > 0 ? enemy.shellSpeed : -enemy.shellSpeed;
                        console.log(`[STOMP] Kicked shell ${player.facing > 0 ? 'right' : 'left'} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
                    }
                } else if (enemy.type === 'flying') {
                    // Flying enemy becomes regular goomba when stomped
                    enemy.type = 'goomba';
                    enemy.y = enemy.baseY;
                    enemy.velX = -1.5;
                    console.log(`[STOMP] Flying enemy grounded → now a goomba at (${Math.round(enemy.x)}, ${Math.round(enemy.y)})`);
                    // Wing particles
                    for (let i = 0; i < 8; i++) {
                        particles.push(new Particle(enemy.x + enemy.width/2, enemy.y, '#ecf0f1'));
                    }
                } else {
                    // Regular goomba - squish
                    enemy.alive = false;
                    // Squish particles
                    for (let i = 0; i < 6; i++) {
                        particles.push(new Particle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#8B4513'));
                    }
                }
                
                updateUI();
            } else {
                // Player hit by enemy
                console.log(`[ENEMY DAMAGE] Hit by ${enemy.type} at (${Math.round(enemy.x)}, ${Math.round(enemy.y)}). Player position: (${Math.round(player.x)}, ${Math.round(player.y)})`);
                playSound('damage');
                loseLife();
            }
        }
    }
}

function checkCheckpointCollision() {
    for (const cp of checkpoints) {
        if (cp.activated) continue;
        if (Math.abs(cp.x - player.x) > 60) continue;
        
        if (player.x < cp.x + cp.width + 20 &&
            player.x + player.width > cp.x - 10 &&
            player.y < cp.y + cp.height &&
            player.y + player.height > cp.y) {
            
            cp.activated = true;
            playSound('checkpoint');
            lastCheckpointX = cp.x;
            lastCheckpointY = cp.y + cp.height - player.height - 2;
            console.log(`[CHECKPOINT] Activated at (${cp.x}, ${cp.y}). Respawn set to (${lastCheckpointX}, ${lastCheckpointY})`);
            
            // Activation particles
            for (let i = 0; i < 12; i++) {
                particles.push(new Particle(cp.x + 8, cp.y + 20, '#2ecc71'));
            }
            for (let i = 0; i < 6; i++) {
                particles.push(new Particle(cp.x + 8, cp.y, '#f1c40f'));
            }
        }
    }
}

function checkFlagCollision() {
    if (flag && !flag.reached &&
        player.x < flag.x + flag.width + 30 &&
        player.x + player.width > flag.x &&
        player.y < flag.y + flag.height &&
        player.y + player.height > flag.y) {
        
        flag.reached = true;
        score += 1000;
        playSound('levelcomplete');
        console.log(`[LEVEL COMPLETE] Level ${currentLevel} completed! Score: ${score}, Coins: ${coins}`);
        updateUI();
        
        // Always advance to next level (infinite)
        const prevStyle = levelStyle;
        currentLevel++;
        console.log(`[LEVEL ADVANCE] Advancing to level ${currentLevel}`);
        cameraX = 0;
        player.x = 100;
        player.y = 300;
        player.velX = 0;
        player.velY = 0;
        loadLevel(currentLevel);
        updateUI();
        // Restart music if level style changed (e.g., entering/leaving water)
        if (levelStyle !== prevStyle) {
            stopMusic();
            startMusic();
        }
        if (levelStyle === 'water') {
            playSound('splash');
        }
    }
}

function loseLife() {
    // Star power prevents damage
    if (player.starPower) return;
    
    // If powered, lose power instead of life
    if (player.powered) {
        console.log(`[DAMAGE] Player powered down! Lost mushroom/fire power at position (${Math.round(player.x)}, ${Math.round(player.y)})`);
        player.powered = false;
        player.hasFireFlower = false;
        // Shrink back to normal height, keep feet at same position
        const oldHeight = player.height;
        player.height = 48;
        player.y += (oldHeight - player.height);
        player.invincible = true;
        player.invincibleTimer = 120;
        
        // Flash particles
        for (let i = 0; i < 8; i++) {
            particles.push(new Particle(player.x + player.width/2, player.y + player.height/2, '#e74c3c'));
        }
        return;
    }
    
    lives--;
    console.log(`[LIFE LOST] Lives remaining: ${lives}, Position: (${Math.round(player.x)}, ${Math.round(player.y)}), Level: ${currentLevel}`);
    updateUI();
    
    // If in a secret room, exit back to main level
    if (inSecretRoom) {
        exitSecretRoom();
        player.invincible = true;
        player.invincibleTimer = 120;
        if (lives <= 0) {
            gameOver();
        }
        return;
    }
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset player to last checkpoint
        console.log(`[RESPAWN] Respawning at checkpoint (${lastCheckpointX}, ${lastCheckpointY})`);
        player.x = lastCheckpointX;
        player.y = lastCheckpointY;
        player.velX = 0;
        player.velY = 0;
        player.invincible = true;
        player.invincibleTimer = 120;
        player.heldShell = null;
        // Set camera to show the checkpoint area
        cameraX = Math.max(0, lastCheckpointX - canvas.width / 3);
        if (cameraX > LEVEL_WIDTH - canvas.width) cameraX = LEVEL_WIDTH - canvas.width;
    }
}

function updateUI() {
    uiElements.scoreValue.textContent = score;
    uiElements.coinsValue.textContent = coins;
    uiElements.livesValue.textContent = lives;
    uiElements.levelValue.textContent = currentLevel;
    uiElements.bestValue.textContent = getTopScore();
}

function gameOver() {
    gameRunning = false;
    stopMusic();
    playSound('gameover');
    // Deposit earned coins into wallet
    addToWallet(coins);
    console.log(`[GAME OVER] Final Score: ${score}, Coins Earned: ${coins}, Level Reached: ${currentLevel}, Lives: ${lives}`);
    console.log(`[GAME OVER] Coins deposited to wallet. New wallet balance: ${loadWallet()}`);
    uiElements.finalScore.textContent = score;
    // Check if this score would make the high score list
    const scores = loadHighScores();
    const wouldRank = scores.length < MAX_HIGH_SCORES || score > scores[scores.length - 1].score;
    if (wouldRank && score > 0) {
        const name = prompt('New High Score! Enter your name:', 'Player') || 'Player';
        const rank = addHighScore(score, currentLevel, name);
        if (rank > 0) console.log(`[HIGH SCORE] New #${rank} high score: ${score}`);
        showHighScoreMessage(uiElements.gameOverHighScore, rank);
    } else {
        uiElements.gameOverHighScore.classList.add('hidden');
    }
    uiElements.gameOverScreen.classList.remove('hidden');
}

function winGame() {
    gameRunning = false;
    stopMusic();
    playSound('levelcomplete');
    // Deposit earned coins into wallet
    addToWallet(coins);
    console.log(`[WIN] Final Score: ${score}, Coins Earned: ${coins}, Level Reached: ${currentLevel}`);
    console.log(`[WIN] Coins deposited to wallet. New wallet balance: ${loadWallet()}`);
    uiElements.winScore.textContent = score;
    // Check if this score would make the high score list
    const scores = loadHighScores();
    const wouldRank = scores.length < MAX_HIGH_SCORES || score > scores[scores.length - 1].score;
    if (wouldRank && score > 0) {
        const name = prompt('New High Score! Enter your name:', 'Player') || 'Player';
        const rank = addHighScore(score, currentLevel, name);
        if (rank > 0) console.log(`[HIGH SCORE] New #${rank} high score: ${score}`);
        showHighScoreMessage(uiElements.winHighScore, rank);
    } else {
        uiElements.winHighScore.classList.add('hidden');
    }
    uiElements.winScreen.classList.remove('hidden');
}

function resetGame(startingLevel = 1) {
    console.log(`[RESET] Resetting game. Starting level: ${startingLevel}`);
    score = 0;
    coins = 0;
    lives = 3;
    cameraX = 0;
    currentLevel = startingLevel;
    
    // Reset secret room state
    inSecretRoom = false;
    savedLevelState = null;
    secretRoomExitPipe = null;
    secretEntryTimer = 0;
    secretPipePromptAlpha = 0;
    secretRoomCollectedCoins = {};
    secretRoomBounds = null;
    
    player.x = 100;
    player.y = 300;
    player.velX = 0;
    player.velY = 0;
    player.grounded = false;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.powered = false;
    player.starPower = false;
    player.starTimer = 0;
    player.hasFireFlower = false;
    player.fireTimer = 0;
    player.speedBoost = false;
    player.speedBoostTimer = 0;
    player.speed = player.baseSpeed;
    player.height = 48;
    player.jumpKeyHeld = false;
    player.onWall = false;
    player.heldShell = null;
    
    // Apply shop abilities
    const abilities = getActiveAbilities();
    if (abilities.includes('extra_life')) {
        lives += 1;
    }
    if (abilities.includes('head_mushroom')) {
        player.powered = true;
        player.height = 64;
    }
    if (abilities.includes('head_fire')) {
        player.hasFireFlower = true;
        if (!player.powered) {
            player.powered = true;
            player.height = 64;
        }
    }
    if (abilities.includes('head_speed')) {
        player.speedBoost = true;
        player.speedBoostTimer = 600; // 10 seconds at 60fps
        player.speed = player.baseSpeed * 1.5;
    }
    // Consume one-time (repeatable/consumable) abilities after applying
    if (abilities.length > 0) {
        console.log(`[RESET] Applied abilities: ${abilities.join(', ')}. Lives: ${lives}, Powered: ${player.powered}, Fire: ${player.hasFireFlower}, Speed Boost: ${player.speedBoost}`);
    }
    consumeOneTimeAbilities();
    
    loadLevel(currentLevel);
    updateUI();
}

function gameLoop() {
    if (!gameRunning) return;
    
    // Cache current time for this frame
    frameTime = Date.now();
    
    // Performance logging: log FPS every 120 frames (~2 seconds)
    _perfFrameCount++;
    if (_perfFrameCount % 120 === 0) {
        const now = performance.now();
        if (_perfLastTime > 0) {
            const elapsed = now - _perfLastTime;
            const fps = Math.round(120 / (elapsed / 1000));
            const entityCount = enemies.length + coinsList.filter(c => !c.collected).length + particles.length + fireballs.length + mushrooms.length + powerUps.length;
            console.debug(`[PERF] FPS: ${fps}, Entities: ${entityCount} (enemies: ${enemies.length}, particles: ${particles.length}, fireballs: ${fireballs.length})`);
        }
        _perfLastTime = now;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    drawBackground();
    
    // Draw platforms
    for (const platform of platforms) {
        platform.draw();
    }
    
    // Update and draw moving platforms
    for (const mp of movingPlatforms) {
        mp.update();
        mp.draw();
    }
    
    // Update and draw coins
    for (const coin of coinsList) {
        coin.update();
        coin.draw();
    }
    
    // Update and draw mushrooms
    mushrooms = mushrooms.filter(mushroom => mushroom.update());
    for (const mushroom of mushrooms) {
        mushroom.draw();
    }
    
    // Update and draw power-ups (star, fire flower, speed boost)
    powerUps = powerUps.filter(pu => pu.update());
    for (const pu of powerUps) {
        pu.draw();
    }
    
    // Update and draw fireballs
    fireballs = fireballs.filter(fb => fb.update());
    for (const fb of fireballs) {
        fb.draw();
    }
    
    // Update and draw enemies
    enemies = enemies.filter(enemy => enemy.update(platforms));
    for (const enemy of enemies) {
        enemy.draw();
    }
    
    // Update and draw particles
    particles = particles.filter(particle => particle.update());
    for (const particle of particles) {
        particle.draw();
    }
    
    // Draw checkpoints
    for (const cp of checkpoints) {
        cp.draw();
    }
    
    // Draw flag
    if (flag) flag.draw();
    
    // Update and draw player
    updatePlayer();
    checkCoinCollision();
    checkMushroomCollision();
    checkPowerUpCollision();
    checkEnemyCollision();
    checkCheckpointCollision();
    checkFlagCollision();
    drawPlayer();
    
    // Secret room UI elements
    if (inSecretRoom) {
        // "SECRET AREA!" banner at top
        ctx.save();
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f1c40f';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.fillText('SECRET AREA!', canvas.width / 2, 60);
        // "Press S on pipe to exit" hint
        ctx.font = '14px Arial';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Stand on the pipe and press S to exit', canvas.width / 2, 82);
        ctx.restore();
    }
    
    // Water level post-processing overlay
    if (levelStyle === 'water') {
        // Blue tint overlay
        ctx.fillStyle = 'rgba(0, 40, 120, 0.12)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Caustic light rays from surface
        const wTime = frameTime * 0.0005;
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const rayX = ((i * 180 + Math.sin(wTime * 0.7 + i * 1.5) * 40) % 1080 + 1080) % 1080 - 90;
            ctx.fillStyle = 'rgba(180, 220, 255, 0.04)';
            ctx.beginPath();
            ctx.moveTo(rayX - 15, 0);
            ctx.lineTo(rayX + 15, 0);
            ctx.lineTo(rayX + 50 + Math.sin(wTime + i) * 10, canvas.height);
            ctx.lineTo(rayX - 50 + Math.sin(wTime + i) * 10, canvas.height);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
        
        // Ambient rising bubbles (drawn directly each frame)
        ctx.strokeStyle = 'rgba(200, 230, 255, 0.25)';
        ctx.lineWidth = 1;
        const bubOverlayTime = frameTime * 0.001;
        for (let i = 0; i < 12; i++) {
            const seed = i * 137.5;
            const bx = ((seed * 7.3 + cameraX * 0.03) % canvas.width + canvas.width) % canvas.width;
            const by = ((canvas.height + 30) - ((bubOverlayTime * (15 + (i % 4) * 5) + seed) % (canvas.height + 60)));
            const bs = 2 + (i % 4) * 1.5;
            const wobble = Math.sin(bubOverlayTime * 2 + i * 0.9) * 4;
            ctx.beginPath();
            ctx.arc(bx + wobble, by, bs, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Event listeners
function startGame(level) {
    initAudio();
    // God mode is now controlled by the dev menu toggle (no longer reads password input)
    uiElements.startScreen.classList.add('hidden');
    // Hide dev open button during gameplay
    const devOpenBtn = document.getElementById('dev-open-btn');
    if (devOpenBtn) devOpenBtn.classList.add('hidden');
    devMenu.classList.add('hidden');
    resetGame(level);
    gameRunning = true;
    startMusic();
    const skin = getEquippedSkin();
    const abilities = getActiveAbilities();
    console.log(`[GAME START] Level: ${level}, Skin: ${skin.name}, God Mode: ${godMode}`);
    if (abilities.length > 0) {
        console.log(`[GAME START] Active abilities: ${abilities.join(', ')}`);
    }
    gameLoop();
}

function restartGame(screen) {
    screen.classList.add('hidden');
    resetGame();
    gameRunning = true;
    startMusic();
    gameLoop();
}

function returnToMenu(screen) {
    screen.classList.add('hidden');
    uiElements.startScreen.classList.remove('hidden');
    renderHighScoreList();
    stopMusic();
    resetGame();
    // Re-show dev open button if unlocked
    if (devUnlocked) {
        const devOpenBtn = document.getElementById('dev-open-btn');
        if (devOpenBtn) devOpenBtn.classList.remove('hidden');
    }
}

// Render high scores on initial page load
renderHighScoreList();

// ==================== DEV MODE SYSTEM ====================
const devModeInput = document.getElementById('dev-mode-input');
const devModeStatus = document.getElementById('dev-mode-status');
const devModeArea = document.getElementById('dev-mode-area');
const devMenu = document.getElementById('dev-menu');
let devUnlocked = false;

// Dev mode password input live feedback
devModeInput.addEventListener('input', () => {
    if (devModeInput.value === '7329') {
        devModeInput.classList.add('unlocked');
        devModeStatus.classList.add('unlocked');
        devModeStatus.textContent = '🔓 Dev Mode Unlocked!';
        console.log('[DEV MODE] Dev mode code entered!');
        devUnlocked = true;
        showDevOpenButton();
    } else {
        devModeInput.classList.remove('unlocked');
        devModeStatus.classList.remove('unlocked');
        devModeStatus.textContent = '🔒 Dev Mode Locked';
        devUnlocked = false;
        // Hide dev menu and open button if relocked
        devMenu.classList.add('hidden');
        const devOpenBtn = document.getElementById('dev-open-btn');
        if (devOpenBtn) devOpenBtn.classList.add('hidden');
    }
});

function showDevOpenButton() {
    // Add a button to open the dev menu if it doesn't exist yet
    if (!document.getElementById('dev-open-btn')) {
        const btn = document.createElement('button');
        btn.id = 'dev-open-btn';
        btn.textContent = '🛠️ Dev Menu';
        btn.addEventListener('click', () => {
            devMenu.classList.toggle('hidden');
        });
        document.getElementById('start-screen').appendChild(btn);
    } else {
        document.getElementById('dev-open-btn').classList.remove('hidden');
    }
}

// Close dev menu
document.getElementById('dev-menu-close').addEventListener('click', () => {
    devMenu.classList.add('hidden');
});

// Dev menu: Play button
document.getElementById('dev-play-btn').addEventListener('click', () => {
    devMenu.classList.add('hidden');
    startGame(1); // Default to Level 1, or customize as needed
});

// Dev menu: God mode toggle
const devGodToggle = document.getElementById('dev-god-toggle');
const godToggleLabel = document.getElementById('god-toggle-label');
devGodToggle.addEventListener('change', () => {
    godMode = devGodToggle.checked;
    godToggleLabel.textContent = godMode ? 'On' : 'Off';
    console.log(`[DEV MODE] God mode ${godMode ? 'enabled' : 'disabled'}`);
});

// Dev menu: Reset high scores
document.getElementById('dev-reset-scores').addEventListener('click', () => {
    if (confirm('Reset ALL high scores? This cannot be undone.')) {
        localStorage.removeItem(HIGH_SCORE_KEY);
        renderHighScoreList();
        uiElements.bestValue.textContent = '0';
        console.log('[DEV MODE] High scores reset.');
    }
});

// Dev menu: Reset shop
document.getElementById('dev-reset-shop').addEventListener('click', () => {
    if (confirm('Reset shop data? All skins, abilities and wallet will be lost.')) {
        localStorage.removeItem(SHOP_KEY);
        localStorage.removeItem(WALLET_KEY);
        console.log('[DEV MODE] Shop and wallet reset.');
    }
});

// Dev menu: Full game reset
document.getElementById('dev-reset-all').addEventListener('click', () => {
    if (confirm('FULL RESET: Delete ALL game data (scores, shop, wallet)? This cannot be undone!')) {
        localStorage.removeItem(HIGH_SCORE_KEY);
        localStorage.removeItem(SHOP_KEY);
        localStorage.removeItem(WALLET_KEY);
        renderHighScoreList();
        uiElements.bestValue.textContent = '0';
        console.log('[DEV MODE] Full game reset complete.');
        alert('All game data has been reset.');
    }
});
// ==================== END DEV MODE SYSTEM ====================

document.getElementById('start-btn').addEventListener('click', () => startGame(1));
document.getElementById('start-level2-btn').addEventListener('click', () => startGame(2));
document.getElementById('start-level3-btn').addEventListener('click', () => startGame(3));
document.getElementById('start-endless-btn').addEventListener('click', () => startGame(4));
document.getElementById('restart-btn').addEventListener('click', () => restartGame(uiElements.gameOverScreen));
document.getElementById('menu-btn').addEventListener('click', () => returnToMenu(uiElements.gameOverScreen));
document.getElementById('win-restart-btn').addEventListener('click', () => restartGame(uiElements.winScreen));
document.getElementById('win-menu-btn').addEventListener('click', () => returnToMenu(uiElements.winScreen));