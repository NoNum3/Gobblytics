import type { Board, BoardCell, Piece, Player } from "../types/game";
import { AIMove, getAIMove } from "./aiLogic";

// Get the top visible piece from a cell
const getTopPiece = (cell: BoardCell): Piece | null => {
    return cell && cell.length > 0 ? cell[cell.length - 1] : null;
};

// Count pieces by player
const countPiecesByPlayer = (board: Board): { Red: number; Blue: number } => {
    let counts = { Red: 0, Blue: 0 };

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const topPiece = getTopPiece(board[row][col]);
            if (topPiece) {
                counts[topPiece.player]++;
            }
        }
    }

    return counts;
};

// Count potential winning lines for each player
const countPotentialWinningLines = (
    board: Board,
): { Red: number; Blue: number } => {
    const counts = { Red: 0, Blue: 0 };
    const topPiecesBoard = board.map((row) => row.map(getTopPiece));

    // Check rows
    for (let row = 0; row < 3; row++) {
        checkLineForPotential(topPiecesBoard[row], counts);
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
        checkLineForPotential([
            topPiecesBoard[0][col],
            topPiecesBoard[1][col],
            topPiecesBoard[2][col],
        ], counts);
    }

    // Check diagonals
    checkLineForPotential([
        topPiecesBoard[0][0],
        topPiecesBoard[1][1],
        topPiecesBoard[2][2],
    ], counts);

    checkLineForPotential([
        topPiecesBoard[0][2],
        topPiecesBoard[1][1],
        topPiecesBoard[2][0],
    ], counts);

    return counts;
};

// Helper function to check a line for potential wins
const checkLineForPotential = (
    line: (Piece | null)[],
    counts: { Red: number; Blue: number },
) => {
    const redPieces = line.filter((p) => p && p.player === "Red");
    const bluePieces = line.filter((p) => p && p.player === "Blue");

    // If only one player has pieces in this line and there's at least one empty space
    if (
        redPieces.length > 0 && bluePieces.length === 0 && redPieces.length < 3
    ) {
        counts.Red += redPieces.length; // Weight by number of pieces
    }

    if (
        bluePieces.length > 0 && redPieces.length === 0 && bluePieces.length < 3
    ) {
        counts.Blue += bluePieces.length; // Weight by number of pieces
    }
};

// Detect "fork" situations (multiple threats)
const detectForks = (board: Board): { Red: number; Blue: number } => {
    const forks = { Red: 0, Blue: 0 };

    // Check for each empty cell if placing a piece there creates multiple threats
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            if (!getTopPiece(board[row][col])) {
                // Analyze for Red
                const redThreats = countThreatsIfPlaced(board, row, col, "Red");
                if (redThreats >= 2) forks.Red++;

                // Analyze for Blue
                const blueThreats = countThreatsIfPlaced(
                    board,
                    row,
                    col,
                    "Blue",
                );
                if (blueThreats >= 2) forks.Blue++;
            }
        }
    }

    return forks;
};

// Count how many threats would be created if a player placed a piece at a position
const countThreatsIfPlaced = (
    board: Board,
    row: number,
    col: number,
    player: Player,
): number => {
    // Clone the board with a simulated move
    const simulatedBoard = board.map((r) => r.map((c) => c ? [...c] : []));

    // Add a large piece for testing (this is simplified - in reality, we'd need to consider actual available pieces)
    simulatedBoard[row][col] = [{
        id: "temp-sim-piece",
        player: player,
        size: "L", // Assuming largest size for maximum threat
        isOffBoard: false,
    }];

    // Count threats
    let threats = 0;
    const simTopPiecesBoard = simulatedBoard.map((r) => r.map(getTopPiece));

    // Check rows
    if (checkLineForThreat(simTopPiecesBoard[row], player)) threats++;

    // Check columns
    if (
        checkLineForThreat([
            simTopPiecesBoard[0][col],
            simTopPiecesBoard[1][col],
            simTopPiecesBoard[2][col],
        ], player)
    ) threats++;

    // Check diagonals if on a diagonal position
    if (row === col) {
        if (
            checkLineForThreat([
                simTopPiecesBoard[0][0],
                simTopPiecesBoard[1][1],
                simTopPiecesBoard[2][2],
            ], player)
        ) threats++;
    }

    if (row + col === 2) {
        if (
            checkLineForThreat([
                simTopPiecesBoard[0][2],
                simTopPiecesBoard[1][1],
                simTopPiecesBoard[2][0],
            ], player)
        ) threats++;
    }

    return threats;
};

// Check if a line has a potential threat (2 of 3 with player's pieces)
const checkLineForThreat = (
    line: (Piece | null)[],
    player: Player,
): boolean => {
    const playerPieces = line.filter((p) => p && p.player === player);
    const opponentPieces = line.filter((p) => p && p.player !== player);

    return playerPieces.length === 2 && opponentPieces.length === 0;
};

// Analyze center control
const analyzeCenterControl = (board: Board): Player | null => {
    const centerPiece = getTopPiece(board[1][1]);
    return centerPiece ? centerPiece.player : null;
};

// Evaluate the current game state and provide a human-readable analysis
export const evaluateGameState = (
    board: Board,
    pieces: { Red: Piece[]; Blue: Piece[] },
    currentPlayer: Player,
): string => {
    // Count pieces on the board
    const pieceCounts = countPiecesByPlayer(board);

    // Analyze potential winning lines
    const potentialWins = countPotentialWinningLines(board);

    // Check for forks (multiple threats)
    const forks = detectForks(board);

    // Check center control
    const centerControl = analyzeCenterControl(board);

    // Count available pieces off-board
    const availablePieces = {
        Red: pieces.Red.filter((p) => p.isOffBoard).length,
        Blue: pieces.Blue.filter((p) => p.isOffBoard).length,
    };

    // Build analysis text
    let analysis = "";

    // Comment on board control
    if (pieceCounts.Red > pieceCounts.Blue) {
        analysis += "Red controls more of the board. ";
    } else if (pieceCounts.Blue > pieceCounts.Red) {
        analysis += "Blue controls more of the board. ";
    } else if (pieceCounts.Red > 0) {
        analysis += "Board control is even. ";
    }

    // Comment on center control
    if (centerControl) {
        analysis += `${centerControl} controls the center. `;
    }

    // Comment on threats and potential wins
    const currentPlayerColor = currentPlayer;
    const opponentColor = currentPlayer === "Red" ? "Blue" : "Red";

    if (potentialWins[currentPlayerColor] > potentialWins[opponentColor]) {
        analysis += `${currentPlayerColor} has more potential winning lines (${
            potentialWins[currentPlayerColor]
        }). `;
    } else if (potentialWins[opponentColor] > 0) {
        analysis += `${opponentColor} has ${
            potentialWins[opponentColor]
        } potential winning lines - be careful! `;
    }

    // Comment on forks
    if (forks[currentPlayerColor] > 0) {
        analysis += `${currentPlayerColor} can create a fork with ${
            forks[currentPlayerColor]
        } potential move(s). `;
    }
    if (forks[opponentColor] > 0) {
        analysis += `Watch out! ${opponentColor} can create a fork with ${
            forks[opponentColor]
        } potential move(s). `;
    }

    // Comment on available resources
    if (
        availablePieces[currentPlayerColor] === 0 &&
        pieceCounts[currentPlayerColor] < 3
    ) {
        analysis +=
            `${currentPlayerColor} must move existing pieces (no more in hand). `;
    }

    if (analysis === "") {
        analysis = "The game is in the early stages with no clear advantage.";
    }

    return analysis;
};

// Predict what the AI will do on its next turn with improved reasoning
export const predictNextMove = (
    board: Board,
    aiPieces: Piece[],
    aiPlayer: Player,
): AIMove | null => {
    // This could be a simplified version of the actual AI move logic
    // but with explanations of the reasoning
    return getAIMove(board, aiPieces, aiPlayer);
};
