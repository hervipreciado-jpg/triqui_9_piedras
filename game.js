// ==================== Triqui de 9 Piedras - game.js ====================

let placeSound, captureSound, winSound;
let audioInitialized = false;

// Inicialización segura de audio mediante interacción del usuario
function initSounds() {
    if (audioInitialized) return;
    placeSound = new Audio('sounds/place.mp3');
    captureSound = new Audio('sounds/capture.mp3');
    winSound = new Audio('sounds/win.mp3');
    audioInitialized = true;
    console.log("🔊 Sistema de audio inicializado.");
}

function playAudio(audioElement) {
    if (!audioElement) return;
    audioElement.currentTime = 0;
    audioElement.play().catch(error => {
        console.warn("La reproducción de audio fue bloqueada por el navegador:", error);
    });
}

const BOARD_NODES = [
    { id: 0,  x: 40,  y: 40,   neighbors: [1, 9, 3] },
    { id: 1,  x: 300, y: 40,   neighbors: [0, 2, 4] },
    { id: 2,  x: 560, y: 40,   neighbors: [1, 14, 5] },
    { id: 3,  x: 130, y: 130,  neighbors: [0, 4, 10, 6] },
    { id: 4,  x: 300, y: 130,  neighbors: [1, 3, 5, 7] },
    { id: 5,  x: 470, y: 130,  neighbors: [2, 4, 13, 8] },
    { id: 6,  x: 220, y: 220,  neighbors: [3, 7, 11] },
    { id: 7,  x: 300, y: 220,  neighbors: [4, 6, 8] },
    { id: 8,  x: 380, y: 220,  neighbors: [5, 7, 12] },
    { id: 9,  x: 40,  y: 300,  neighbors: [0, 10, 21] },
    { id: 10, x: 130, y: 300,  neighbors: [9, 11, 3, 18] },
    { id: 11, x: 220, y: 300,  neighbors: [10, 6, 15] },
    { id: 12, x: 380, y: 300,  neighbors: [13, 8, 17] },
    { id: 13, x: 470, y: 300,  neighbors: [12, 14, 5, 20] },
    { id: 14, x: 560, y: 300,  neighbors: [13, 2, 23] },
    { id: 15, x: 220, y: 380,  neighbors: [11, 16, 18] },
    { id: 16, x: 300, y: 380,  neighbors: [15, 17, 19] },
    { id: 17, x: 380, y: 380,  neighbors: [16, 12, 20] },
    { id: 18, x: 130, y: 470,  neighbors: [10, 19, 15, 21] },
    { id: 19, x: 300, y: 470,  neighbors: [18, 20, 16, 22] },
    { id: 20, x: 470, y: 470,  neighbors: [19, 13, 17, 23] },
    { id: 21, x: 40,  y: 560,  neighbors: [9, 22, 18] },
    { id: 22, x: 300, y: 560,  neighbors: [21, 23, 19] },
    { id: 23, x: 560, y: 560,  neighbors: [14, 22, 20] }
];

const TRIQUI_LINES = [
    [0,1,2], [3,4,5], [6,7,8], [9,10,11], [12,13,14], [15,16,17], [18,19,20], [21,22,23],
    [0,9,21], [3,10,18], [6,11,15], [1,4,7], [16,19,22], [8,12,17], [5,13,20], [2,14,23],
    [0,3,6], [2,5,8], [15,18,21], [17,20,23]
];

let gameState = 'PLACING';
let playerTurn = 1;
let stonesToPlace = {1: 9, 2: 9};
let stonesOnBoard = {1: 0, 2: 0};
let activeStonesCount = {1: 9, 2: 9};
let boardState = Array(24).fill(null);
let selectedNodeId = null;
let capturedStones = {1: 0, 2: 0};

const boardNodesContainer = document.getElementById('board-nodes');
const statusMessage = document.getElementById('status-message');
const p1ToPlaceEl = document.getElementById('p1-to-place');
const p1OnBoardEl = document.getElementById('p1-on-board');
const p2ToPlaceEl = document.getElementById('p2-to-place');
const p2OnBoardEl = document.getElementById('p2-on-board');
const player1Panel = document.getElementById('player1-panel');
const player2Panel = document.getElementById('player2-panel');
const gameOverModal = document.getElementById('game-over-modal');
const winnerTitle = document.getElementById('winner-title');
const winnerMessage = document.getElementById('winner-message');

document.addEventListener('DOMContentLoaded', () => {
    buildBoard();
    updateUI();

    // Desbloquear audio con la primera interacción del usuario
    window.addEventListener('click', initSounds, { once: true });
    window.addEventListener('touchstart', initSounds, { once: true });

    document.getElementById('btn-reset').addEventListener('click', resetGame);
    document.getElementById('btn-modal-restart').addEventListener('click', resetGame);
});

function buildBoard() {
    boardNodesContainer.innerHTML = '';
    BOARD_NODES.forEach(node => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.classList.add('node-group');
        group.dataset.id = node.id;

        const base = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        base.classList.add('node-base');
        base.setAttribute('cx', node.x);
        base.setAttribute('cy', node.y);
        base.setAttribute('r', '13');

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

function updateUI() {
    player1Panel.classList.toggle('active', playerTurn === 1 && gameState !== 'GAMEOVER');
    player2Panel.classList.toggle('active', playerTurn === 2 && gameState !== 'GAMEOVER');

    p1ToPlaceEl.textContent = stonesToPlace[1];
    p1OnBoardEl.textContent = stonesOnBoard[1];
    p2ToPlaceEl.textContent = stonesToPlace[2];
    p2OnBoardEl.textContent = stonesOnBoard[2];

    const validMovesForSelected = selectedNodeId !== null ? getValidMoves(selectedNodeId) : [];
    const opponent = playerTurn === 1 ? 2 : 1;

    document.querySelectorAll('.node-group').forEach(group => {
        const id = parseInt(group.dataset.id);
        const occupant = boardState[id];
        const stone = group.querySelector('.stone');

        // SOLUCIÓN AL ERROR DE COLOR: Limpieza absoluta de clases antiguas
        group.classList.remove('p1-occupied', 'p2-occupied', 'selected', 'valid-move', 'capturable');

        if (occupant === 1) {
            group.classList.add('p1-occupied');
            stone.setAttribute('r', '14');
        } else if (occupant === 2) {
            group.classList.add('p2-occupied');
            stone.setAttribute('r', '14');
        } else {
            stone.setAttribute('r', '0');
        }

        if (id === selectedNodeId) {
            group.classList.add('selected');
        }

        if (gameState === 'MOVING' && validMovesForSelected.includes(id)) {
            group.classList.add('valid-move');
        }

        if (gameState === 'CAPTURING' && occupant === opponent) {
            if (!isPartOfMill(id, opponent) || allStonesInMills(opponent)) {
                group.classList.add('capturable');
            }
        }
    });

    updateStatusBanner();
    updateCapturedStones();
}

function updateStatusBanner() {
    statusMessage.className = 'status-banner';
    if (playerTurn === 1) statusMessage.classList.add('p1-turn');
    else statusMessage.classList.add('p2-turn');

    if (gameState === 'PLACING') {
        statusMessage.textContent = `Fase de Colocación - Jugador ${playerTurn}`;
    } else if (gameState === 'MOVING') {
        statusMessage.textContent = selectedNodeId !== null ? 
            `Jugador ${playerTurn}: Elige destino` : 
            `Fase de Movimiento - Jugador ${playerTurn}`;
    } else if (gameState === 'CAPTURING') {
        statusMessage.classList.add('capture-turn');
        statusMessage.textContent = `¡Triqui! Jugador ${playerTurn} captura una ficha`;
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

function handleNodeClick(nodeId) {
    initSounds(); // Forzar inicialización por si acaso
    if (gameState === 'PLACING') handlePlacing(nodeId);
    else if (gameState === 'MOVING') handleMoving(nodeId);
    else if (gameState === 'CAPTURING') handleCapturing(nodeId);
}

function handlePlacing(nodeId) {
    if (boardState[nodeId] !== null) return showTemporaryMessage("Posición ocupada");

    boardState[nodeId] = playerTurn;
    stonesToPlace[playerTurn]--;
    stonesOnBoard[playerTurn]++;

    playAudio(placeSound);

    if (checkForMill(nodeId, playerTurn)) {
        gameState = 'CAPTURING';
    } else {
        advanceTurn();
    }
    updateUI();
}

function handleMoving(nodeId) {
    if (selectedNodeId === null) {
        if (boardState[nodeId] !== playerTurn) return showTemporaryMessage("Esa no es tu ficha");
        if (getValidMoves(nodeId).length === 0) return showTemporaryMessage("Ficha bloqueada");

        selectedNodeId = nodeId;
        updateUI();
    } else {
        if (nodeId === selectedNodeId) {
            selectedNodeId = null;
            updateUI();
            return;
        }

        const validMoves = getValidMoves(selectedNodeId);
        if (validMoves.includes(nodeId)) {
            boardState[nodeId] = playerTurn;
            boardState[selectedNodeId] = null;

            // Aseguramos que el audio suene ANTES de procesar el cambio de estado completo
            playAudio(placeSound);

            if (checkForMill(nodeId, playerTurn)) gameState = 'CAPTURING';
            else advanceTurn();

            selectedNodeId = null;
        } else {
            showTemporaryMessage("Movimiento inválido");
        }
        updateUI();
    }
}

function handleCapturing(nodeId) {
    const opponent = playerTurn === 1 ? 2 : 1;
    if (boardState[nodeId] !== opponent) return showTemporaryMessage("Elige una ficha del rival");

    if (isPartOfMill(nodeId, opponent) && !allStonesInMills(opponent)) {
        return showTemporaryMessage("No puedes capturar una ficha en Triqui");
    }

    boardState[nodeId] = null;
    stonesOnBoard[opponent]--;
    activeStonesCount[opponent]--;
    capturedStones[playerTurn]++;
    
    playAudio(captureSound);

    if (activeStonesCount[opponent] < 3) {
        endGame(playerTurn, `Jugador ${opponent} se quedó con menos de 3 fichas`);
        return;
    }

    gameState = (stonesToPlace[1] > 0 || stonesToPlace[2] > 0) ? 'PLACING' : 'MOVING';
    advanceTurn();
}

function checkForMill(nodeId, player) {
    return TRIQUI_LINES.some(line => 
        line.includes(nodeId) && 
        boardState[line[0]] === player && 
        boardState[line[1]] === player && 
        boardState[line[2]] === player
    );
}

function isPartOfMill(nodeId, player) {
    return checkForMill(nodeId, player);
}

function allStonesInMills(player) {
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === player && !isPartOfMill(i, player)) return false;
    }
    return true;
}

function getValidMoves(nodeId) {
    const node = BOARD_NODES.find(n => n.id === nodeId);
    return node ? node.neighbors.filter(n => boardState[n] === null) : [];
}

function advanceTurn() {
    playerTurn = playerTurn === 1 ? 2 : 1;

    if (gameState === 'PLACING' && stonesToPlace[1] === 0 && stonesToPlace[2] === 0) {
        gameState = 'MOVING';
    }

    if (gameState === 'MOVING' && !hasAnyValidMove(playerTurn)) {
        endGame(playerTurn === 1 ? 2 : 1, `Jugador ${playerTurn} está bloqueado`);
        return;
    }

    updateUI();
}

function hasAnyValidMove(player) {
    for (let i = 0; i < 24; i++) {
        if (boardState[i] === player && getValidMoves(i).length > 0) return true;
    }
    return false;
}

function endGame(winner, reason) {
    gameState = 'GAMEOVER';
    updateUI();
    winnerTitle.textContent = `¡Victoria para el Jugador ${winner}!`;
    winnerMessage.textContent = reason;
    
    playAudio(winSound);
    
    gameOverModal.classList.add('active');
}

function resetGame() {
    gameState = 'PLACING';
    playerTurn = 1;
    stonesToPlace = {1: 9, 2: 9};
    stonesOnBoard = {1: 0, 2: 0};
    activeStonesCount = {1: 9, 2: 9};
    boardState = Array(24).fill(null);
    selectedNodeId = null;
    capturedStones = {1: 0, 2: 0};

    gameOverModal.classList.remove('active');
    buildBoard();
    updateUI();
}

function showTemporaryMessage(text) {
    const original = statusMessage.textContent;
    statusMessage.textContent = text;
    statusMessage.style.borderLeftColor = '#ff3b30';

    setTimeout(() => {
        statusMessage.textContent = original;
        statusMessage.style.borderLeftColor = '';
    }, 2500);
}