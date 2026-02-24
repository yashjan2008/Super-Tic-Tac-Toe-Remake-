// Game State
const gameState = {
    board: Array(9).fill(null).map(() => Array(9).fill(null)),
    currentPlayer: 'X',
    activeBoard: null,
    gameOver: false,
    winner: null,
    gameMode: null,
    difficulty: 'medium',
    moveCount: 0,
    moveHistory: [],
    boardWinners: Array(9).fill(null),
    stats: {
        totalGames: 0,
        playerXWins: 0,
        playerOWins: 0,
        draws: 0,
        bestXMoves: Infinity,
        bestOMoves: Infinity,
        recentWins: [],
        winStreak: 0,
    }
};

// DOM Elements
const modeSelection = document.getElementById('modeSelection');
const gameContainer = document.getElementById('gameContainer');
const playerVsAI = document.getElementById('playerVsAI');
const playerVsPlayer = document.getElementById('playerVsPlayer');
const board = document.getElementById('board');
const currentPlayerDisplay = document.getElementById('currentPlayer');
const moveCountDisplay = document.getElementById('moveCount');
const gameStatusDisplay = document.getElementById('gameStatus');
const newGameBtn = document.getElementById('newGameBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const changeModeBtn = document.getElementById('changeMode');
const undoBtn = document.getElementById('undoBtn');
const difficultySelector = document.getElementById('difficultySelector');

// Load stats from localStorage
function loadStats() {
    const saved = localStorage.getItem('tictacToeStats');
    if (saved) {
        gameState.stats = JSON.parse(saved);
    }
    updateLeaderboard();
}

// Save stats to localStorage
function saveStats() {
    localStorage.setItem('tictacToeStats', JSON.stringify(gameState.stats));
    updateLeaderboard();
}

// Event Listeners for Mode Selection
playerVsAI.addEventListener('click', () => {
    gameState.gameMode = 'AI';
    difficultySelector.style.display = 'flex';
    startGame();
});

playerVsPlayer.addEventListener('click', () => {
    gameState.gameMode = 'PLAYER';
    difficultySelector.style.display = 'none';
    startGame();
});

// Start Game
function startGame() {
    modeSelection.style.display = 'none';
    gameContainer.style.display = 'block';
    resetGameState();
    renderBoard();
    updateLeaderboard();
}

// Reset Game State
function resetGameState() {
    gameState.board = Array(9).fill(null).map(() => Array(9).fill(null));
    gameState.currentPlayer = 'X';
    gameState.activeBoard = null;
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.moveCount = 0;
    gameState.moveHistory = [];
    gameState.boardWinners = Array(9).fill(null);
    updateDisplay();
}

// Update Display
function updateDisplay() {
    currentPlayerDisplay.textContent = gameState.gameOver 
        ? (gameState.winner ? `${gameState.winner} Won!` : "It's a Draw!")
        : `Player ${gameState.currentPlayer}'s Turn`;
    
    moveCountDisplay.textContent = `Moves: ${gameState.moveCount}`;
    undoBtn.disabled = gameState.moveHistory.length === 0 || gameState.gameMode === 'AI';
}

// Render Board
function renderBoard() {
    board.innerHTML = '';
    
    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
        const miniBoard = document.createElement('div');
        miniBoard.className = 'mini-board';
        
        if (gameState.boardWinners[boardIndex]) {
            miniBoard.classList.add('completed');
            miniBoard.setAttribute('data-winner', gameState.boardWinners[boardIndex]);
            miniBoard.innerHTML = `<div class="mini-board-winner" data-winner="${gameState.boardWinners[boardIndex]}"></div>`;
        } else {
            if (gameState.activeBoard === null || gameState.activeBoard === boardIndex) {
                miniBoard.classList.add('active');
            }
            
            for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                const value = gameState.board[boardIndex][cellIndex];
                
                if (value) {
                    cell.textContent = value;
                    cell.classList.add('taken', value.toLowerCase());
                }
                
                if (!gameState.gameOver && !gameState.boardWinners[boardIndex]) {
                    cell.addEventListener('click', () => makeMove(boardIndex, cellIndex));
                }
                
                miniBoard.appendChild(cell);
            }
        }
        
        board.appendChild(miniBoard);
    }
    
    updateDisplay();
}

// Make Move
function makeMove(boardIndex, cellIndex) {
    // Check if move is valid
    if (gameState.gameOver) return;
    if (gameState.boardWinners[boardIndex]) return;
    if (gameState.activeBoard !== null && gameState.activeBoard !== boardIndex) return;
    if (gameState.board[boardIndex][cellIndex] !== null) return;
    
    // Make the move
    gameState.board[boardIndex][cellIndex] = gameState.currentPlayer;
    gameState.moveHistory.push({ boardIndex, cellIndex, player: gameState.currentPlayer });
    gameState.moveCount++;
    
    // Check for board winner
    const boardWinner = checkBoardWinner(boardIndex);
    if (boardWinner) {
        gameState.boardWinners[boardIndex] = boardWinner;
    }
    
    // Check for game winner
    const winner = checkGameWinner();
    if (winner) {
        gameState.gameOver = true;
        gameState.winner = winner;
        onGameEnd(winner);
    }
    
    // Check for draw
    if (!winner && checkDraw()) {
        gameState.gameOver = true;
        onGameEnd('draw');
    }
    
    // Set active board for next move
    if (!gameState.gameOver && !gameState.boardWinners[cellIndex]) {
        gameState.activeBoard = cellIndex;
    } else if (!gameState.gameOver) {
        gameState.activeBoard = null;
    }
    
    // Switch player
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    
    renderBoard();
    
    // AI move
    if (!gameState.gameOver && gameState.gameMode === 'AI' && gameState.currentPlayer === 'O') {
        setTimeout(() => makeAIMove(), 500);
    }
}

// Make AI Move
function makeAIMove() {
    const move = getBestMove();
    if (move) {
        makeMove(move.boardIndex, move.cellIndex);
    }
}

// Get Best Move (AI)
function getBestMove() {
    const validMoves = getValidMoves();
    
    if (validMoves.length === 0) return null;
    
    // Easy: Random move
    if (gameState.difficulty === 'easy') {
        return validMoves[Math.floor(Math.random() * validMoves.length)];
    }
    
    // Medium: Mix of random and strategic
    if (gameState.difficulty === 'medium') {
        if (Math.random() > 0.5) {
            return validMoves[Math.floor(Math.random() * validMoves.length)];
        }
    }
    
    // Hard: Minimax algorithm
    let bestScore = -Infinity;
    let bestMove = validMoves[0];
    
    for (let move of validMoves) {
        gameState.board[move.boardIndex][move.cellIndex] = 'O';
        let score = minimax(0, false, -Infinity, Infinity);
        gameState.board[move.boardIndex][move.cellIndex] = null;
        
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    
    return bestMove;
}

// Minimax Algorithm
function minimax(depth, isMaximizing, alpha, beta) {
    const gameWinner = checkGameWinner();
    
    if (gameWinner === 'O') return 10 - depth;
    if (gameWinner === 'X') return depth - 10;
    if (checkDraw()) return 0;
    
    if (isMaximizing) {
        let maxScore = -Infinity;
        for (let move of getValidMoves()) {
            gameState.board[move.boardIndex][move.cellIndex] = 'O';
            let score = minimax(depth + 1, false, alpha, beta);
            gameState.board[move.boardIndex][move.cellIndex] = null;
            maxScore = Math.max(score, maxScore);
            alpha = Math.max(alpha, score);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (let move of getValidMoves()) {
            gameState.board[move.boardIndex][move.cellIndex] = 'X';
            let score = minimax(depth + 1, true, alpha, beta);
            gameState.board[move.boardIndex][move.cellIndex] = null;
            minScore = Math.min(score, minScore);
            beta = Math.min(beta, score);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

// Get Valid Moves
function getValidMoves() {
    const moves = [];
    
    for (let boardIndex = 0; boardIndex < 9; boardIndex++) {
        if (gameState.boardWinners[boardIndex]) continue;
        if (gameState.activeBoard !== null && gameState.activeBoard !== boardIndex) continue;
        
        for (let cellIndex = 0; cellIndex < 9; cellIndex++) {
            if (gameState.board[boardIndex][cellIndex] === null) {
                moves.push({ boardIndex, cellIndex });
            }
        }
    }
    
    return moves;
}

// Check Board Winner (3x3 tic tac toe)
function checkBoardWinner(boardIndex) {
    const board = gameState.board[boardIndex];
    
    // Check rows
    for (let i = 0; i < 9; i += 3) {
        if (board[i] && board[i] === board[i + 1] && board[i] === board[i + 2]) {
            return board[i];
        }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
        if (board[i] && board[i] === board[i + 3] && board[i] === board[i + 6]) {
            return board[i];
        }
    }
    
    // Check diagonals
    if (board[0] && board[0] === board[4] && board[0] === board[8]) return board[0];
    if (board[2] && board[2] === board[4] && board[2] === board[6]) return board[2];
    
    return null;
}

// Check Game Winner (3x3 meta boards)
function checkGameWinner() {
    const meta = gameState.boardWinners;
    
    // Check rows
    for (let i = 0; i < 9; i += 3) {
        if (meta[i] && meta[i] === meta[i + 1] && meta[i] === meta[i + 2]) {
            return meta[i];
        }
    }
    
    // Check columns
    for (let i = 0; i < 3; i++) {
        if (meta[i] && meta[i] === meta[i + 3] && meta[i] === meta[i + 6]) {
            return meta[i];
        }
    }
    
    // Check diagonals
    if (meta[0] && meta[0] === meta[4] && meta[0] === meta[8]) return meta[0];
    if (meta[2] && meta[2] === meta[4] && meta[2] === meta[6]) return meta[2];
    
    return null;
}

// Check Draw
function checkDraw() {
    for (let board of gameState.board) {
        for (let cell of board) {
            if (cell === null) return false;
        }
    }
    return true;
}

// On Game End
function onGameEnd(result) {
    gameState.stats.totalGames++;
    
    if (result === 'X') {
        gameState.stats.playerXWins++;
        gameState.stats.bestXMoves = Math.min(gameState.stats.bestXMoves, gameState.moveCount);
        gameState.stats.winStreak++;
        addRecentWin(`Player X won in ${gameState.moveCount} moves`);
    } else if (result === 'O') {
        gameState.stats.playerOWins++;
        gameState.stats.bestOMoves = Math.min(gameState.stats.bestOMoves, gameState.moveCount);
        if (gameState.gameMode === 'AI') {
            gameState.stats.winStreak = 0;
            addRecentWin(`CPU won in ${gameState.moveCount} moves`);
        } else {
            gameState.stats.winStreak++;
            addRecentWin(`Player O won in ${gameState.moveCount} moves`);
        }
    } else {
        gameState.stats.draws++;
        gameState.stats.winStreak = 0;
        addRecentWin(`Draw after ${gameState.moveCount} moves`);
    }
    
    saveStats();
}

// Add Recent Win
function addRecentWin(text) {
    gameState.stats.recentWins.unshift(text);
    if (gameState.stats.recentWins.length > 5) {
        gameState.stats.recentWins.pop();
    }
}

// Update Leaderboard
function updateLeaderboard() {
    document.getElementById('playerXWins').textContent = gameState.stats.playerXWins;
    document.getElementById('playerOWins').textContent = gameState.stats.playerOWins;
    document.getElementById('drawCount').textContent = gameState.stats.draws;
    
    document.getElementById('bestXMoves').textContent = 
        gameState.stats.bestXMoves === Infinity ? '-' : gameState.stats.bestXMoves;
    document.getElementById('bestOMoves').textContent = 
        gameState.stats.bestOMoves === Infinity ? '-' : gameState.stats.bestOMoves;
    
    document.getElementById('totalGames').textContent = gameState.stats.totalGames;
    
    const avgMoves = gameState.stats.totalGames > 0 
        ? (Math.round((gameState.moveCount * gameState.stats.totalGames / gameState.stats.totalGames))) 
        : 0;
    document.getElementById('avgMoves').textContent = avgMoves;
    
    const totalPlayerWins = gameState.stats.playerXWins + gameState.stats.playerOWins;
    const winRate = gameState.stats.totalGames > 0 
        ? Math.round((totalPlayerWins / gameState.stats.totalGames) * 100)
        : 0;
    document.getElementById('winRate').textContent = winRate + '%';
    
    document.getElementById('winStreak').textContent = gameState.stats.winStreak;
    
    // Update recent wins list
    const recentWinsList = document.getElementById('recentWinsList');
    recentWinsList.innerHTML = '';
    gameState.stats.recentWins.forEach(win => {
        const li = document.createElement('li');
        li.textContent = win;
        recentWinsList.appendChild(li);
    });
}

// Undo Move
function undoLastMove() {
    if (gameState.moveHistory.length === 0 || gameState.gameMode === 'AI') return;
    
    const lastMove = gameState.moveHistory.pop();
    gameState.board[lastMove.boardIndex][lastMove.cellIndex] = null;
    gameState.moveCount--;
    gameState.currentPlayer = lastMove.player;
    
    // Recalculate board winners
    gameState.boardWinners[lastMove.boardIndex] = checkBoardWinner(lastMove.boardIndex);
    
    gameState.gameOver = false;
    gameState.winner = null;
    gameState.activeBoard = lastMove.boardIndex;
    
    renderBoard();
}

// Control Button Listeners
newGameBtn.addEventListener('click', () => {
    resetGameState();
    renderBoard();
});

resetScoreBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all scores?')) {
        gameState.stats = {
            totalGames: 0,
            playerXWins: 0,
            playerOWins: 0,
            draws: 0,
            bestXMoves: Infinity,
            bestOMoves: Infinity,
            recentWins: [],
            winStreak: 0,
        };
        saveStats();
    }
});

changeModeBtn.addEventListener('click', () => {
    modeSelection.style.display = 'flex';
    gameContainer.style.display = 'none';
    resetGameState();
});

undoBtn.addEventListener('click', undoLastMove);

// Difficulty Level Selection
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        gameState.difficulty = this.getAttribute('data-level');
    });
});

// Initialize
window.addEventListener('load', () => {
    loadStats();
});
