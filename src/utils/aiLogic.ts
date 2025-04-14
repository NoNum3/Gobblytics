import type { Board, BoardCell, Piece, PieceSize, Player } from "../types/game";

// --- Type for AI Move ---
type PlaceMove = { type: "place"; piece: Piece; row: number; col: number };
type MoveMove = {
    type: "move";
    piece: Piece;
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
};
export type AIMove = PlaceMove | MoveMove;

// --- Helper Functions (some might be duplicates from gameStore, consider refactoring later) ---
const getTopPiece = (cell: BoardCell): Piece | null => {
    return cell && cell.length > 0 ? cell[cell.length - 1] : null;
};

const checkLine = (line: (Piece | null)[]): Player | null => {
    if (line.length !== 3 || line.some((piece) => !piece)) return null;
    const firstPlayer = line[0]!.player;
    if (line.every((piece) => piece && piece.player === firstPlayer)) {
        return firstPlayer;
    }
    return null;
};

const calculateWinner = (board: Board): Player | null => {
    const topPiecesBoard: (Piece | null)[][] = board.map((row) =>
        row.map(getTopPiece)
    );
    for (let i = 0; i < 3; i++) {
        const rowWinner = checkLine(topPiecesBoard[i]);
        if (rowWinner) return rowWinner;
        const colWinner = checkLine([
            topPiecesBoard[0][i],
            topPiecesBoard[1][i],
            topPiecesBoard[2][i],
        ]);
        if (colWinner) return colWinner;
    }
    const diag1Winner = checkLine([
        topPiecesBoard[0][0],
        topPiecesBoard[1][1],
        topPiecesBoard[2][2],
    ]);
    if (diag1Winner) return diag1Winner;
    const diag2Winner = checkLine([
        topPiecesBoard[0][2],
        topPiecesBoard[1][1],
        topPiecesBoard[2][0],
    ]);
    if (diag2Winner) return diag2Winner;
    return null;
};

// Check if a move is valid (placement or move)
const isMoveValid = (board: Board, move: AIMove, player: Player): boolean => {
    if (move.type === "place") {
        const targetCell = board[move.row]?.[move.col];
        const topDestPiece = getTopPiece(targetCell);

        // Basic validation: can't place on own piece, must gobble larger over smaller
        if (
            topDestPiece &&
            (move.piece.size <= topDestPiece.size ||
                topDestPiece.player === player)
        ) {
            return false;
        }
    } else if (move.type === "move") {
        const sourceCell = board[move.fromRow]?.[move.fromCol];
        const targetCell = board[move.toRow]?.[move.toCol];
        const topSourcePiece = getTopPiece(sourceCell);
        const topDestPiece = getTopPiece(targetCell);

        // Can only move the top piece, and it must match the piece in the move object
        if (!topSourcePiece || topSourcePiece.id !== move.piece.id) {
            return false;
        }

        // Basic validation: can't place on own piece, must gobble larger over smaller
        if (
            topDestPiece &&
            (move.piece.size <= topDestPiece.size ||
                topDestPiece.player === player)
        ) {
            return false;
        }
    }

    return true; // Seems valid based on basic rules
};

// --- Core AI Logic ---

// Get all possible valid moves for the AI player
const getAllPossibleMoves = (
    board: Board,
    aiPieces: Piece[],
    player: Player,
): AIMove[] => {
    const moves: AIMove[] = [];
    const offBoardPieces = aiPieces.filter((p) => p.isOffBoard);
    const onBoardPieces = aiPieces.filter((p) => !p.isOffBoard);

    // 1. Placement moves (from hand)
    for (const piece of offBoardPieces) {
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const move: PlaceMove = {
                    type: "place",
                    piece,
                    row: r,
                    col: c,
                };
                if (isMoveValid(board, move, player)) {
                    moves.push(move);
                }
            }
        }
    }

    // 2. Movement moves (from board)
    // Find current positions of on-board pieces
    const piecePositions: { [id: string]: { row: number; col: number } } = {};
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const topPiece = getTopPiece(board[r][c]);
            if (
                topPiece && !topPiece.isOffBoard && topPiece.player === player
            ) {
                // Check if this piece ID belongs to the AI's on-board pieces
                if (onBoardPieces.some((p) => p.id === topPiece.id)) {
                    piecePositions[topPiece.id] = { row: r, col: c };
                }
            }
        }
    }

    for (const piece of onBoardPieces) {
        const currentPos = piecePositions[piece.id];
        if (!currentPos) continue; // Piece is somehow not found on board (shouldn't happen)

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (r === currentPos.row && c === currentPos.col) continue; // Don't move to same cell
                const move: MoveMove = {
                    type: "move",
                    piece,
                    fromRow: currentPos.row,
                    fromCol: currentPos.col,
                    toRow: r,
                    toCol: c,
                };
                if (isMoveValid(board, move, player)) {
                    moves.push(move);
                }
            }
        }
    }

    return moves;
};

// Simulate a move and return the resulting board state
const simulateMove = (board: Board, move: AIMove): Board => {
    // Create a deep copy of the board
    const newBoard = board.map((r) => r.map((c) => c ? [...c] : []));

    try {
        if (move.type === "move") {
            // Make sure the source coordinates are valid
            if (
                move.fromRow < 0 || move.fromRow >= 3 ||
                move.fromCol < 0 || move.fromCol >= 3
            ) {
                console.error(
                    "Invalid source coordinates in simulateMove",
                    move,
                );
                return board; // Return original board on error
            }

            // Remove from source
            const sourceStack = newBoard[move.fromRow][move.fromCol];
            if (
                sourceStack && sourceStack.length > 0 &&
                sourceStack[sourceStack.length - 1].id === move.piece.id
            ) {
                sourceStack.pop();
            }
        }

        // Make sure the destination coordinates are valid
        if (
            move.row < 0 || move.row >= 3 ||
            move.col < 0 || move.col >= 3 ||
            !newBoard[move.row] || !newBoard[move.row][move.col]
        ) {
            console.error(
                "Invalid destination coordinates in simulateMove",
                move,
            );
            return board; // Return original board on error
        }

        // Add to destination
        newBoard[move.row][move.col].push({ ...move.piece, isOffBoard: false });

        return newBoard;
    } catch (error) {
        console.error("Error in simulateMove:", error, "Move:", move);
        return board; // Return original board on error
    }
};

// Advanced game state evaluation with assigned scores
export const evaluatePosition = (board: Board, aiPlayer: Player): number => {
    const opponent = aiPlayer === "Red" ? "Blue" : "Red";
    const topPiecesBoard = board.map((row) => row.map(getTopPiece));

    let score = 0;
    const centerPiece = topPiecesBoard[1][1];

    // 1. Check if there's a winner (highest priority)
    const winner = calculateWinner(board);
    if (winner === aiPlayer) return 1000; // AI wins
    if (winner === opponent) return -1000; // Opponent wins

    // 2. Control of center (important strategic position)
    if (centerPiece) {
        score += centerPiece.player === aiPlayer ? 15 : -15;
        // Bonus for larger pieces in center
        const sizeBonus = { L: 8, M: 5, S: 2 };
        score += centerPiece.player === aiPlayer
            ? sizeBonus[centerPiece.size]
            : -sizeBonus[centerPiece.size];
    }

    // 3. Count threats (two in a row with third position empty)
    const aiThreats = countThreats(topPiecesBoard, aiPlayer);
    const opponentThreats = countThreats(topPiecesBoard, opponent);
    score += aiThreats * 25 - opponentThreats * 30;

    // 4. Control of corners
    const corners = [
        topPiecesBoard[0][0],
        topPiecesBoard[0][2],
        topPiecesBoard[2][0],
        topPiecesBoard[2][2],
    ];

    for (const piece of corners) {
        if (piece) {
            // Consider piece size in corner evaluation
            const cornerBonus = piece.size === "L"
                ? 8
                : piece.size === "M"
                ? 6
                : 4;
            score += piece.player === aiPlayer ? cornerBonus : -cornerBonus;
        }
    }

    // 5. Piece mobility and position
    score += countControlledPositions(topPiecesBoard, aiPlayer) * 4;
    score -= countControlledPositions(topPiecesBoard, opponent) * 4;

    // 6. Potential for future gobbling (having larger pieces available)
    const aiLargePieces = countLargePiecesOffBoard(board, aiPlayer);
    const opponentLargePieces = countLargePiecesOffBoard(board, opponent);
    score += (aiLargePieces - opponentLargePieces) * 3;

    // 7. NEW: Value potential gobbling opportunities
    score += evaluateGobblingPotential(board, aiPlayer) * 5;

    // 8. NEW: Consider piece size advantage across the board
    score += evaluatePieceSizeAdvantage(topPiecesBoard, aiPlayer) * 4;

    return score;
};

// Count threats (two in a row with the third empty)
const countThreats = (
    topPiecesBoard: (Piece | null)[][],
    player: Player,
): number => {
    let threats = 0;

    // Check rows
    for (let r = 0; r < 3; r++) {
        const row = topPiecesBoard[r];
        if (isLineThreat(row, player)) threats++;
    }

    // Check columns
    for (let c = 0; c < 3; c++) {
        const col = [
            topPiecesBoard[0][c],
            topPiecesBoard[1][c],
            topPiecesBoard[2][c],
        ];
        if (isLineThreat(col, player)) threats++;
    }

    // Check diagonals
    const diag1 = [
        topPiecesBoard[0][0],
        topPiecesBoard[1][1],
        topPiecesBoard[2][2],
    ];
    const diag2 = [
        topPiecesBoard[0][2],
        topPiecesBoard[1][1],
        topPiecesBoard[2][0],
    ];

    if (isLineThreat(diag1, player)) threats++;
    if (isLineThreat(diag2, player)) threats++;

    return threats;
};

// Check if a line is a threat (2 of player's pieces and 1 empty)
const isLineThreat = (line: (Piece | null)[], player: Player): boolean => {
    const playerPieces = line.filter((p) => p && p.player === player);
    const emptySpaces = line.filter((p) => p === null);
    const opponentPieces = line.filter((p) => p && p.player !== player);

    return playerPieces.length === 2 && emptySpaces.length === 1 &&
        opponentPieces.length === 0;
};

// Count controlled positions by a player
const countControlledPositions = (
    topPiecesBoard: (Piece | null)[][],
    player: Player,
): number => {
    let count = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (
                topPiecesBoard[r][c] && topPiecesBoard[r][c]!.player === player
            ) {
                count++;
            }
        }
    }
    return count;
};

// Count larger pieces still off board (bigger pieces are strategic assets)
const countLargePiecesOffBoard = (board: Board, player: Player): number => {
    // Get all pieces for the player
    const allPieces = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[r][c]) {
                board[r][c].forEach((piece) => {
                    if (piece.player === player) {
                        allPieces.push(piece);
                    }
                });
            }
        }
    }

    // Count M and L pieces still in hand
    let count = 0;
    // We typically start with 2 each of S, M, L pieces
    const piecesOnBoard = allPieces.reduce((acc, piece) => {
        if (!piece.isOffBoard && (piece.size === "M" || piece.size === "L")) {
            acc[piece.size] = (acc[piece.size] || 0) + 1;
        }
        return acc;
    }, {} as Record<PieceSize, number>);

    // Assume we start with 2 each, so calculate remaining
    const remainingM = 2 - (piecesOnBoard["M"] || 0);
    const remainingL = 2 - (piecesOnBoard["L"] || 0);

    // Weight larger pieces more
    return remainingM * 2 + remainingL * 3;
};

// Find opponent's winning move to block
const findOpponentWinningMove = (
    board: Board,
    aiPlayer: Player,
): [number, number] | null => {
    const opponent = aiPlayer === "Red" ? "Blue" : "Red";
    const topPiecesBoard = board.map((row) => row.map(getTopPiece));

    // Check rows
    for (let r = 0; r < 3; r++) {
        const result = findWinningPositionInLine(
            [topPiecesBoard[r][0], topPiecesBoard[r][1], topPiecesBoard[r][2]],
            opponent,
        );
        if (result !== null) return [r, result];
    }

    // Check columns
    for (let c = 0; c < 3; c++) {
        const result = findWinningPositionInLine(
            [topPiecesBoard[0][c], topPiecesBoard[1][c], topPiecesBoard[2][c]],
            opponent,
        );
        if (result !== null) return [result, c];
    }

    // Check diagonals
    const diag1Result = findWinningPositionInLine(
        [topPiecesBoard[0][0], topPiecesBoard[1][1], topPiecesBoard[2][2]],
        opponent,
    );
    if (diag1Result !== null) return [diag1Result, diag1Result];

    const diag2Result = findWinningPositionInLine(
        [topPiecesBoard[0][2], topPiecesBoard[1][1], topPiecesBoard[2][0]],
        opponent,
    );
    if (diag2Result !== null) return [diag2Result, 2 - diag2Result];

    return null;
};

// Find position in a line that would allow a player to win
const findWinningPositionInLine = (
    line: (Piece | null)[],
    player: Player,
): number | null => {
    const playerPieces = line.filter((p) => p && p.player === player);
    const emptyIndex = line.findIndex((p) => !p);

    if (playerPieces.length === 2 && emptyIndex !== -1) {
        return emptyIndex;
    }

    return null;
};

// Mini-max function for advanced AI decision making (placeholder - not fully implemented)
const minimax = (
    board: Board,
    depth: number,
    isMaximizing: boolean,
    aiPlayer: Player,
    alpha: number = -Infinity,
    beta: number = Infinity,
): number => {
    // This is a simplified version of minimax for demonstration purposes

    // Base case: check if game is over or we've reached max depth
    const winner = calculateWinner(board);
    if (winner === aiPlayer) return 1000;
    if (winner && winner !== aiPlayer) return -1000;
    if (depth === 0) return evaluatePosition(board, aiPlayer);

    // For demonstration only - full minimax implementation would simulate all possible moves
    // This is complex in Gobblet Gobblers due to the large state space

    return evaluatePosition(board, aiPlayer);
};

// --- Main AI Decision Function ---
export const getAIMove = (
    board: Board,
    aiPieces: Piece[],
    aiPlayer: Player,
): AIMove | null => {
    const possibleMoves = getAllPossibleMoves(board, aiPieces, aiPlayer);
    if (possibleMoves.length === 0) return null; // No moves possible

    const opponent: Player = aiPlayer === "Red" ? "Blue" : "Red";

    // 1. Check if AI can win in one move
    for (const move of possibleMoves) {
        const nextBoard = simulateMove(board, move);
        if (calculateWinner(nextBoard) === aiPlayer) {
            console.log(
                `AI Found Winning Move: ${move.type} ${move.piece.id} to [${move.row},${move.col}]`,
            );
            return move;
        }
    }

    // 2. Check if opponent can win in the next move and block
    const opponentWinningPos = findOpponentWinningMove(board, aiPlayer);
    if (opponentWinningPos) {
        const [blockRow, blockCol] = opponentWinningPos;

        // Try to find a piece that can block this position
        const blockingMoves = possibleMoves.filter((move) =>
            move.row === blockRow && move.col === blockCol
        );

        if (blockingMoves.length > 0) {
            // Sort by size preference - prefer to use LARGER pieces for blocking
            // This is more strategic since it prevents the opponent from gobbling the blocker
            blockingMoves.sort((a, b) => {
                const sizeValues: Record<PieceSize, number> = {
                    S: 1,
                    M: 2,
                    L: 3,
                };
                return sizeValues[b.piece.size] - sizeValues[a.piece.size]; // Larger pieces first
            });

            console.log(
                `AI Blocking Opponent Win at [${blockRow},${blockCol}] with ${
                    blockingMoves[0].piece.size
                } piece`,
            );
            return blockingMoves[0];
        }
    }

    // 3. Strategic moves based on position evaluation
    let bestScore = -Infinity;
    let bestMove: AIMove | null = null;

    for (const move of possibleMoves) {
        const nextBoard = simulateMove(board, move);
        const moveScore = evaluatePosition(nextBoard, aiPlayer);

        if (moveScore > bestScore) {
            bestScore = moveScore;
            bestMove = move;
        }
    }

    if (bestMove) {
        console.log(
            `AI Choosing Strategic Move: ${bestMove.type} ${bestMove.piece.id} (score: ${bestScore})`,
        );
        return bestMove;
    }

    // Fallback to random move (shouldn't reach here if evaluation function is robust)
    const randomMove =
        possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    console.log(
        `AI Choosing Random Move: ${randomMove.type} ${randomMove.piece.id}`,
    );
    return randomMove;
};

// Add these new helper functions for enhanced evaluation:

// Evaluate the potential for gobbling opponent pieces
const evaluateGobblingPotential = (board: Board, player: Player): number => {
    const opponent = player === "Red" ? "Blue" : "Red";
    const topPiecesBoard = board.map((row) => row.map(getTopPiece));

    let potential = 0;

    // Look for opponent pieces that can be gobbled
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const piece = topPiecesBoard[r][c];
            if (piece && piece.player === opponent) {
                // Check if we have larger pieces available
                if (piece.size === "S") potential += 2;
                if (piece.size === "M") potential += 1;
                // L pieces can't be gobbled
            }
        }
    }

    return potential;
};

// Evaluate the overall size advantage on the board
const evaluatePieceSizeAdvantage = (
    topPiecesBoard: (Piece | null)[][],
    player: Player,
): number => {
    const opponent = player === "Red" ? "Blue" : "Red";
    const sizeValues: Record<PieceSize, number> = { S: 1, M: 2, L: 3 };

    let playerSizeSum = 0;
    let opponentSizeSum = 0;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const piece = topPiecesBoard[r][c];
            if (piece) {
                if (piece.player === player) {
                    playerSizeSum += sizeValues[piece.size];
                } else {
                    opponentSizeSum += sizeValues[piece.size];
                }
            }
        }
    }

    return playerSizeSum - opponentSizeSum;
};
