// ==================== Triqui de 9 Piedras - game.js ====================

// --- SISTEMA DE AUDIO (Archivos MP3 + Sintetizador Web Audio API Fallback) ---
let audioCtx = null;
let isMuted = false;
let audioFiles = {
    place: new Audio('sounds/place.mp3'),
    capture: new Audio('sounds/capture.mp3'),
    win: new Audio('sounds/win.mp3')
};

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (isMuted) return;

    // Intentar reproducir archivo MP3
    const soundFile = audioFiles[type];
    let filePlayed = false;

    if (soundFile) {
        soundFile.currentTime = 0;
        soundFile.play().then(() => {
            filePlayed = true;
        }).catch(() => {
            // Si el navegador bloquea el archivo de audio, usar sintetizador Web Audio API
            playSynthSound(type);
        });
    } else {
        playSynthSound(type);
    }
}

// Sintetizador de respaldo para garantizar sonido siempre
function playSynthSound(type) {
    if (isMuted) return;
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'place') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            gain.gain.setValueAtTime(0.35, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'select') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(650, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'capture') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(120, now + 0.25);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'error') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(160, now);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'win') {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // Acorde C Mayor
            notes.forEach((freq, idx) => {
                const noteOsc = ctx.createOscillator();
                const noteGain = ctx.createGain();
                noteOsc.connect(noteGain);
                noteGain.connect(ctx.destination);
                noteOsc.type = 'triangle';
                noteOsc.frequency.setValueAtTime(freq, now + idx * 0.12);
                noteGain.gain.setValueAtTime(0.3, now + idx * 0.12);
                noteGain.gain.linearRampToValueAtTime(0.01, now + idx * 0.12 + 0.35);
                noteOsc.start(now + idx * 0.12);
                noteOsc.stop(now + idx * 0.12 + 0.35);
            });
        }
    } catch (e) {
        console.warn("Audio synth warning:", e);
    }
}

// ==================== ESTRUCTURA DEL TABLERO Y CONEXIONES ====================
const BOARD_NODES = [
    { id: 0,  x: 40,  y: 40,   neighbors: [1, 3, 9] },
    { id: 1,  x: 300, y: 40,   neighbors: [0, 2, 4] },
    { id: 2,  x: 560, y: 40,   neighbors: [1, 5, 14] },
    { id: 3,  x: 130, y: 130,  neighbors: [0, 4, 6, 10] },
    { id: 4,  x: 300, y: 130,  neighbors: [1, 3, 5, 7] },
    { id: 5,  x: 470, y: 130,  neighbors: [2, 4, 8, 13] },
    { id: 6,  x: 220, y: 220,  neighbors: [3, 7, 11] },
    { id: 7,  x: 300, y: 220,  neighbors: [4, 6, 8] },
    { id: 8,  x: 380, y: 220,  neighbors: [5, 7, 12] },
    { id: 9,  x: 40,  y: 300,  neighbors: [0, 10, 21] },
    { id: 10, x: 130, y: 300,  neighbors: [3, 9, 11, 18] },
    { id: 11, x: 220, y: 300,  neighbors: [6, 10, 15] },
    { id: 12, x: 380, y: 300,  neighbors: [8, 13, 17] },
    { id: 13, x: 470, y: 300,  neighbors: [5, 12, 14, 20] },
    { id: 14, x: 560, y: 300,  neighbors: [2, 13, 23] },
    { id: 15, x: 220, y: 380,  neighbors: [11, 16, 18] },
    { id: 16, x: 300, y: 380,  neighbors: [15, 17, 19] },
    { id: 17, x: 380, y: 380,  neighbors: [12, 16, 20] },
    { id: 18, x: 130, y: 470,  neighbors: [10, 15, 19, 21] },
    { id: 19, x: 300, y: 470,  neighbors: [16, 18, 20, 22] },
    { id: 20, x: 470, y: 470,  neighbors: [13, 17, 19, 23] },
    { id: 21, x: 40,  y: 560,  neighbors: [9, 18, 22] },
    { id: 22, x: 300, y: 560,  neighbors: [19, 21, 23] },
    { id: 23, x: 560, y: 560,  neighbors: [14, 20, 22] }
];

// 8 Horizontales + 8 Verticales + 4 Diagonales
const TRIQUI_LINES = [
    // Horizontales
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [9, 10, 11], [12, 13, 14],
    [15, 16, 17], [18, 19, 20], [21, 22, 23],
    // Verticales
    [0, 9, 21], [3, 10, 18], [6, 11, 15],
    [1, 4, 7], [16, 19, 22], [8, 12, 17],
    [5, 13, 20], [2, 14, 23],
    // Diagonales
    [0, 3, 6], [2, 5, 8],
    [21, 18, 15], [23, 20, 17]
];

// ==================== VARIABLES DE ESTADO DEL JUEGO ====================
let gameMode = '2p'; // '2p' (2 Jugadores local) o '1p' (vs CPU)
let gameState = 'PLACING'; // 'PLACING', 'MOVING', 'CAPTURING', 'GAMEOVER'
let playerTurn = 1; // 1 (Azul) o 2 (Rojo/CPU)
let stonesToPlace = { 1: 9, 2: 9 };
let stonesOnBoard = { 1: 0, 2: 0 };
let activeStonesCount = { 1: 9, 2: 9 };
let boardState = Array(24).fill(null);
let selectedNodeId = null;
let capturedStones = { 1: 0, 2: 0 };
let lastFormedMillNodes = [];
let isCpuThinking = false;

// Elementos DOM
const boardNodesContainer = document.getElementById('board-nodes');
const statusMessage = document.getElementById('status-message');
const p1ToPlaceEl = document.getElementById('p1-to-place');
const p1OnBoardEl = document.getElementById('p1-on-board');
const p2ToPlaceEl = document.getElementById('p2-to-place');
const p2OnBoardEl = document.getElementById('p2-on-board');
const player1Panel = document.getElementById('player1-panel');
const player2Panel = document.getElementById('player2-panel');
const p2Name = document.getElementById('p2-name');
const p2Icon = document.getElementById('p2-icon');
const gameOverModal = document.getElementById('game-over-modal');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');
const rulesModal = document.getElementById('rules-modal');
const soundIcon = document.getElementById('sound-icon');

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    buildBoard();
    updateUI();
    setupEventListeners();
});

function setupEventListeners() {
    // Desbloquear audio con primera interacción
    window.addEventListener('click', () => getAudioContext(), { once: true });
    window.addEventListener('touchstart', () => getAudioContext(), { once: true });

    // Modos de Juego
    document.getElementById('btn-mode-2p').addEventListener('click', () => setGameMode('2p'));
    document.getElementById('btn-mode-1p').addEventListener('click', () => setGameMode('1p'));

    // Sonido
    document.getElementById('btn-sound-toggle').addEventListener('click', toggleSound);

    // Reglas
    document.getElementById('btn-open-rules').addEventListener('click', () => rulesModal.classList.add('active'));
    document.getElementById('btn-close-rules').addEventListener('click', () => rulesModal.classList.remove('active'));
    document.getElementById('btn-close-rules-x').addEventListener('click', () => rulesModal.classList.remove('active'));
    rulesModal.addEventListener('click', (e) => {
        if (e.target === rulesModal) rulesModal.classList.remove('active');
    });

    // Reinicios
    document.getElementById('btn-reset').addEventListener('click', resetGame);
    document.getElementById('btn-modal-restart').addEventListener('click', resetGame);
}

function setGameMode(mode) {
    if (gameMode === mode) return;
    gameMode = mode;

    document.getElementById('btn-mode-2p').classList.toggle('active', mode === '2p');
    document.getElementById('btn-mode-1p').classList.toggle('active', mode === '1p');

    if (mode === '1p') {
        p2Name.textContent = 'CPU (Robot)';
        p2Icon.className = 'fas fa-robot';
    } else {
        p2Name.textContent = 'Jugador 2';
        p2Icon.className = 'fas fa-user';
    }

    resetGame();
}

function toggleSound() {
    isMuted = !isMuted;
    if (isMuted) {
        soundIcon.className = 'fas fa-volume-mute';
    } else {
        soundIcon.className = 'fas fa-volume-up';
        playSound('select');
    }
}

// ==================== DIBUJAR TABLERO ====================
function buildBoard() {
    boardNodesContainer.innerHTML = '';
    BOARD_NODES.forEach(node => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('node-group');
        group.dataset.id = node.id;

        // Base del punto
        const base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.classList.add('node-base');
        base.setAttribute('cx', node.x);
        base.setAttribute('cy', node.y);
        base.setAttribute('r', '14');

        // Ficha (inicialmente tamaño 0)
        const stone = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        stone.classList.add('stone');
        stone.setAttribute('cx', node.x);
        stone.setAttribute('cy', node.y);
        stone.setAttribute('r', '0');

        group.appendChild(base);
        group.appendChild(stone);

        group.addEventListener('click', () => handleNodeClick(node.id));

        boardNodesContainer.appendChild(group);
    });
}

// ==================== ACTUALIZAR INTERFAZ (UI) ====================
function updateUI() {
    player1Panel.classList.toggle('active', playerTurn === 1 && gameState !== 'GAMEOVER');
    player2Panel.classList.toggle('active', playerTurn === 2 && gameState !== 'GAMEOVER');

    p1ToPlaceEl.textContent = stonesToPlace[1];
    p1OnBoardEl.textContent = stonesOnBoard[1];
    p2ToPlaceEl.textContent = stonesToPlace[2];
    p2OnBoardEl.textContent = stonesOnBoard[2];

    const validMovesForSelected = (selectedNodeId !== null && gameState === 'MOVING') 
        ? getValidMoves(selectedNodeId, playerTurn) 
        : [];
    const opponent = playerTurn === 1 ? 2 : 1;

    document.querySelectorAll('.node-group').forEach(group => {
        const id = parseInt(group.dataset.id);
        const occupant = boardState[id];
        const stone = group.querySelector('.stone');

        // Limpiar todas las clases de estado previas
        group.classList.remove('p1-occupied', 'p2-occupied', 'selected', 'valid-move', 'capturable', 'in-mill-node');

        if (occupant === 1) {
            group.classList.add('p1-occupied');
            stone.setAttribute('r', '15');
        } else if (occupant === 2) {
            group.classList.add('p2-occupied');
            stone.setAttribute('r', '15');
        } else {
            stone.setAttribute('r', '0');
        }

        // Ficha seleccionada
        if (id === selectedNodeId) {
            group.classList.add('selected');
        }

        // Movimientos válidos
        if (gameState === 'MOVING' && validMovesForSelected.includes(id)) {
            group.classList.add('valid-move');
        }

        // Fichas capturables del rival
        if (gameState === 'CAPTURING' && occupant === opponent) {
            if (!isPartOfMill(id, opponent) || allStonesInMills(opponent)) {
                group.classList.add('capturable');
            }
        }

        // Resaltar Triquis formados
        if (lastFormedMillNodes.includes(id)) {
            group.classList.add('in-mill-node');
        }
    });

    updateStatusBanner();
    updateCapturedStones();
}

function updateStatusBanner() {
    statusMessage.className = 'status-banner';

    if (isCpuThinking) {
        statusMessage.classList.add('cpu-thinking');
        statusMessage.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 🤖 CPU está pensando su jugada...`;
        return;
    }

    const currentName = (playerTurn === 2 && gameMode === '1p') ? 'CPU' : `Jugador ${playerTurn}`;

    if (playerTurn === 1) statusMessage.classList.add('p1-turn');
    else statusMessage.classList.add('p2-turn');

    if (gameState === 'PLACING') {
        statusMessage.textContent = `Fase de Colocación — Turno de ${currentName} (${stonesToPlace[playerTurn]} fichas restantes)`;
    } else if (gameState === 'MOVING') {
        const isFlying = stonesOnBoard[playerTurn] === 3;
        if (selectedNodeId !== null) {
            statusMessage.textContent = `${currentName}: Elige destino ${isFlying ? '(¡Vuelo libre a cualquier casilla vacía!)' : 'adyacente'}`;
        } else {
            statusMessage.textContent = `Fase de Movimiento — ${currentName}: Selecciona una de tus fichas`;
        }
    } else if (gameState === 'CAPTURING') {
        statusMessage.classList.add('capture-turn');
        statusMessage.textContent = `¡TRIQUI FORMADO! — ${currentName}: Elige una ficha del rival para capturar`;
    }
}

function updateCapturedStones() {
    const p1Cap = document.getElementById('p1-captured-stones');
    const p2Cap = document.getElementById('p2-captured-stones');

    p1Cap.innerHTML = '';
    for (let i = 0; i < capturedStones[1]; i++) {
        const dot = document.createElement('div');
        dot.className = 'captured-stone-dot p2-color';
        p1Cap.appendChild(dot);
    }

    p2Cap.innerHTML = '';
    for (let i = 0; i < capturedStones[2]; i++) {
        const dot = document.createElement('div');
        dot.className = 'captured-stone-dot p1-color';
        p2Cap.appendChild(dot);
    }
}

// ==================== INTERACCIÓN DEL USUARIO ====================
function handleNodeClick(nodeId) {
    if (gameState === 'GAMEOVER' || isCpuThinking) return;

    // Si es modo 1P y es turno de la CPU, ignorar clicks humanos
    if (gameMode === '1p' && playerTurn === 2) return;

    if (gameState === 'PLACING') {
        handlePlacing(nodeId);
    } else if (gameState === 'MOVING') {
        handleMoving(nodeId);
    } else if (gameState === 'CAPTURING') {
        handleCapturing(nodeId);
    }
}

// --- FASE 1: COLOCACIÓN ---
function handlePlacing(nodeId) {
    if (boardState[nodeId] !== null) {
        playSound('error');
        return showTemporaryMessage("⚠️ Esa posición ya está ocupada");
    }

    boardState[nodeId] = playerTurn;
    stonesToPlace[playerTurn]--;
    stonesOnBoard[playerTurn]++;

    playSound('place');

    const formedMill = getFormedMill(nodeId, playerTurn);
    if (formedMill) {
        lastFormedMillNodes = formedMill;
        gameState = 'CAPTURING';
        playSound('capture');
        updateUI();
        checkCpuTurn();
    } else {
        lastFormedMillNodes = [];
        advanceTurn();
    }
}

// --- FASE 2: MOVIMIENTO (CORRECCIÓN COMPLETA DE LÓGICA) ---
function handleMoving(nodeId) {
    // Si aún no se ha seleccionado ninguna ficha
    if (selectedNodeId === null) {
        if (boardState[nodeId] !== playerTurn) {
            playSound('error');
            return showTemporaryMessage("⚠️ Esa no es tu ficha");
        }

        const validMoves = getValidMoves(nodeId, playerTurn);
        if (validMoves.length === 0) {
            playSound('error');
            return showTemporaryMessage("⚠️ Esta ficha no tiene movimientos disponibles (bloqueada)");
        }

        selectedNodeId = nodeId;
        playSound('select');
        updateUI();
    } else {
        // CORRECCIÓN: Si hace clic en la misma ficha, deseleccionar
        if (nodeId === selectedNodeId) {
            selectedNodeId = null;
            playSound('select');
            updateUI();
            return;
        }

        // CORRECCIÓN CLAVE: Si hace clic en OTRA ficha propia, cambiar la selección
        if (boardState[nodeId] === playerTurn) {
            const validMoves = getValidMoves(nodeId, playerTurn);
            if (validMoves.length === 0) {
                playSound('error');
                return showTemporaryMessage("⚠️ Esa otra ficha está bloqueada");
            }
            selectedNodeId = nodeId;
            playSound('select');
            updateUI();
            return;
        }

        // Si hace clic en un destino válido
        const validMoves = getValidMoves(selectedNodeId, playerTurn);
        if (validMoves.includes(nodeId)) {
            boardState[nodeId] = playerTurn;
            boardState[selectedNodeId] = null;
            selectedNodeId = null;

            playSound('place');

            const formedMill = getFormedMill(nodeId, playerTurn);
            if (formedMill) {
                lastFormedMillNodes = formedMill;
                gameState = 'CAPTURING';
                playSound('capture');
                updateUI();
                checkCpuTurn();
            } else {
                lastFormedMillNodes = [];
                advanceTurn();
            }
        } else {
            playSound('error');
            showTemporaryMessage("⚠️ Movimiento inválido. Solo puedes mover a puntos conectados");
        }
    }
}

// --- FASE DE CAPTURA ---
function handleCapturing(nodeId) {
    const opponent = playerTurn === 1 ? 2 : 1;

    if (boardState[nodeId] !== opponent) {
        playSound('error');
        return showTemporaryMessage("⚠️ Debes elegir una ficha del rival");
    }

    // Regla Oficial: No se puede capturar una ficha en Triqui a menos que todas estén en Triqui
    if (isPartOfMill(nodeId, opponent) && !allStonesInMills(opponent)) {
        playSound('error');
        return showTemporaryMessage("⚠️ No puedes capturar una ficha protegida por un Triqui activo");
    }

    // Ejecutar captura
    boardState[nodeId] = null;
    stonesOnBoard[opponent]--;
    activeStonesCount[opponent]--;
    capturedStones[playerTurn]++;

    playSound('capture');
    lastFormedMillNodes = [];

    // Comprobar fin de juego (menos de 3 fichas en el rival)
    if (activeStonesCount[opponent] < 3) {
        const winnerName = (playerTurn === 2 && gameMode === '1p') ? 'CPU' : `Jugador ${playerTurn}`;
        const rivalName = (opponent === 2 && gameMode === '1p') ? 'CPU' : `Jugador ${opponent}`;
        endGame(winnerName, `${rivalName} se quedó con solo 2 fichas.`);
        return;
    }

    // Continuar juego
    gameState = (stonesToPlace[1] > 0 || stonesToPlace[2] > 0) ? 'PLACING' : 'MOVING';
    advanceTurn();
}

// ==================== REGLAS Y VERIFICACIONES DE TRIQUI ====================
function getFormedMill(nodeId, player) {
    for (const line of TRIQUI_LINES) {
        if (line.includes(nodeId)) {
            if (boardState[line[0]] === player && 
                boardState[line[1]] === player && 
                boardState[line[2]] === player) {
                return line;
            }
        }
    }
    return null;
}

function isPartOfMill(nodeId, player) {
    return getFormedMill(nodeId, player) !== null;
}

function allStonesInMills(player) {
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === player && !isPartOfMill(i, player)) {
            return false;
        }
    }
    return true;
}

// Movimientos válidos (con regla de vuelo cuando quedan 3 fichas)
function getValidMoves(nodeId, player) {
    // Si al jugador solo le quedan 3 fichas en tablero durante MOVING, puede volar
    if (gameState === 'MOVING' && stonesOnBoard[player] === 3) {
        const openNodes = [];
        for (let i = 0; i < 24; i++) {
            if (boardState[i] === null) openNodes.push(i);
        }
        return openNodes;
    }

    // Movimiento regular a vecinos conectados
    const node = BOARD_NODES.find(n => n.id === nodeId);
    if (!node) return [];
    return node.neighbors.filter(neighborId => boardState[neighborId] === null);
}

function hasAnyValidMove(player) {
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === player && getValidMoves(i, player).length > 0) {
            return true;
        }
    }
    return false;
}

// ==================== GESTIÓN DE TURNOS ====================
function advanceTurn() {
    playerTurn = playerTurn === 1 ? 2 : 1;

    // Transición de PLACING a MOVING cuando se agotan las fichas por colocar
    if (gameState === 'PLACING' && stonesToPlace[1] === 0 && stonesToPlace[2] === 0) {
        gameState = 'MOVING';
    }

    // Comprobar bloqueo
    if (gameState === 'MOVING' && !hasAnyValidMove(playerTurn)) {
        const winner = playerTurn === 1 ? 2 : 1;
        const winnerName = (winner === 2 && gameMode === '1p') ? 'CPU' : `Jugador ${winner}`;
        const rivalName = (playerTurn === 2 && gameMode === '1p') ? 'CPU' : `Jugador ${playerTurn}`;
        endGame(winnerName, `${rivalName} está completamente bloqueado sin movimientos legales.`);
        return;
    }

    updateUI();
    checkCpuTurn();
}

// ==================== INTELIGENCIA ARTIFICIAL (MODO 1P) ====================
function checkCpuTurn() {
    if (gameMode !== '1p' || playerTurn !== 2 || gameState === 'GAMEOVER') return;

    isCpuThinking = true;
    updateUI();

    setTimeout(() => {
        isCpuThinking = false;
        if (gameState === 'PLACING') {
            cpuMakePlacingMove();
        } else if (gameState === 'MOVING') {
            cpuMakeMovingMove();
        } else if (gameState === 'CAPTURING') {
            cpuMakeCaptureMove();
        }
    }, 700);
}

// 1. CPU: Fase de colocación
function cpuMakePlacingMove() {
    const emptySpots = [];
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === null) emptySpots.push(i);
    }
    if (emptySpots.length === 0) return;

    // A. ¿Puede la CPU hacer un Triqui inmediatamente?
    for (const spot of emptySpots) {
        boardState[spot] = 2;
        const mill = getFormedMill(spot, 2);
        boardState[spot] = null;
        if (mill) {
            handlePlacing(spot);
            return;
        }
    }

    // B. ¿Puede el jugador humano hacer un Triqui en su próximo turno? ¡Bloquearlo!
    for (const spot of emptySpots) {
        boardState[spot] = 1;
        const mill = getFormedMill(spot, 1);
        boardState[spot] = null;
        if (mill) {
            handlePlacing(spot);
            return;
        }
    }

    // C. Puntos con mayor cantidad de conexiones estratégicas (4, 10, 13, 19 tienen 4 vecinos)
    const strategicPriorities = [4, 10, 13, 19, 3, 5, 18, 20, 1, 7, 16, 22, 9, 11, 12, 14, 0, 2, 6, 8, 15, 17, 21, 23];
    for (const spot of strategicPriorities) {
        if (boardState[spot] === null) {
            handlePlacing(spot);
            return;
        }
    }

    // D. Casilla aleatoria
    const randomSpot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    handlePlacing(randomSpot);
}

// 2. CPU: Fase de movimiento
function cpuMakeMovingMove() {
    const myPieces = [];
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === 2) myPieces.push(i);
    }

    const allMoves = [];
    for (const piece of myPieces) {
        const destinations = getValidMoves(piece, 2);
        for (const dest of destinations) {
            allMoves.push({ from: piece, to: dest });
        }
    }

    if (allMoves.length === 0) {
        // Bloqueado
        endGame('Jugador 1', 'CPU está bloqueada sin movimientos válidos.');
        return;
    }

    // A. ¿Hay un movimiento que forme Triqui?
    for (const move of allMoves) {
        boardState[move.from] = null;
        boardState[move.to] = 2;
        const mill = getFormedMill(move.to, 2);
        boardState[move.from] = 2;
        boardState[move.to] = null;

        if (mill) {
            selectedNodeId = move.from;
            handleMoving(move.to);
            return;
        }
    }

    // B. ¿Hay un movimiento que bloquee un Triqui del humano?
    const humanPieces = [];
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === 1) humanPieces.push(i);
    }
    const humanThreatSpots = new Set();
    for (const hp of humanPieces) {
        const moves = getValidMoves(hp, 1);
        for (const dest of moves) {
            boardState[hp] = null;
            boardState[dest] = 1;
            if (getFormedMill(dest, 1)) humanThreatSpots.add(dest);
            boardState[hp] = 1;
            boardState[dest] = null;
        }
    }

    for (const move of allMoves) {
        if (humanThreatSpots.has(move.to)) {
            selectedNodeId = move.from;
            handleMoving(move.to);
            return;
        }
    }

    // C. Movimiento aleatorio o con mayor libertad
    const chosenMove = allMoves[Math.floor(Math.random() * allMoves.length)];
    selectedNodeId = chosenMove.from;
    handleMoving(chosenMove.to);
}

// 3. CPU: Fase de captura
function cpuMakeCaptureMove() {
    const opponent = 1;
    const capturableCandidates = [];

    for (let i = 0; i < 24; i++) {
        if (boardState[i] === opponent) {
            if (!isPartOfMill(i, opponent) || allStonesInMills(opponent)) {
                capturableCandidates.push(i);
            }
        }
    }

    if (capturableCandidates.length === 0) {
        gameState = (stonesToPlace[1] > 0 || stonesToPlace[2] > 0) ? 'PLACING' : 'MOVING';
        advanceTurn();
        return;
    }

    // Priorizar fichas humanas que estén cerca de formar un Triqui
    let chosenCandidate = capturableCandidates[0];
    for (const spot of capturableCandidates) {
        boardState[spot] = null;
        // Evaluar valor
        chosenCandidate = spot;
        boardState[spot] = opponent;
        break;
    }

    handleCapturing(chosenCandidate);
}

// ==================== FIN DE JUEGO Y REINICIO ====================
function endGame(winner, reason) {
    gameState = 'GAMEOVER';
    updateUI();

    playSound('win');

    winnerTitle.textContent = `¡Victoria para ${winner}!`;
    winnerMessage.textContent = reason;
    gameOverModal.classList.add('active');
}

function resetGame() {
    gameState = 'PLACING';
    playerTurn = 1;
    stonesToPlace = { 1: 9, 2: 9 };
    stonesOnBoard = { 1: 0, 2: 0 };
    activeStonesCount = { 1: 9, 2: 9 };
    boardState = Array(24).fill(null);
    selectedNodeId = null;
    capturedStones = { 1: 0, 2: 0 };
    lastFormedMillNodes = [];
    isCpuThinking = false;

    gameOverModal.classList.remove('active');
    buildBoard();
    updateUI();
}

function showTemporaryMessage(text) {
    const original = statusMessage.textContent;
    statusMessage.textContent = text;
    statusMessage.style.borderColor = '#ef4444';

    setTimeout(() => {
        statusMessage.style.borderColor = '';
        updateStatusBanner();
    }, 2500);
}