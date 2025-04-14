import type { Board, BoardCell, Piece, PieceSize, Player } from "../types/game";

// --- Type for AI Move ---
type PlaceMove = {
    type: "place";
    piece: Piece;
    row: number;
    col: number;
    moveReason?: string;
};
type MoveMove = {
    type: "move";
    piece: Piece;
    fromRow: number;
    fromCol: number;
    toRow: number;
    toCol: number;
    moveReason?: string;
};
export type AIMove = PlaceMove | MoveMove;

// Types of move reasons
export type MoveReason =
    | "winMove"
    | "blockWin"
    | "createFork"
    | "blockFork"
    | "centerControl"
    | "cornerControl"
    | "connectingPieces"
    | "blockingLine"
    | "gobblePiece"
    | "recoveryMove"
    | "smallestPiece"
    | "largestForBlock"
    | "diagonalThreat"
    | "openingMove"
    | "strategicAdvantage";

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

            // Make sure the destination coordinates are valid
            if (
                move.toRow < 0 || move.toRow >= 3 ||
                move.toCol < 0 || move.toCol >= 3 ||
                !newBoard[move.toRow] || !newBoard[move.toRow][move.toCol]
            ) {
                console.error(
                    "Invalid destination coordinates in simulateMove",
                    move,
                );
                return board; // Return original board on error
            }

            // Add to destination
            newBoard[move.toRow][move.toCol].push({
                ...move.piece,
                isOffBoard: false,
            });
        } else if (move.type === "place") {
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
            newBoard[move.row][move.col].push({
                ...move.piece,
                isOffBoard: false,
            });
        }

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
    const allPieces: Piece[] = [];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const cell = board[r][c];
            if (cell !== null && cell !== undefined) {
                cell.forEach((piece) => {
                    if (piece.player === player) {
                        allPieces.push(piece);
                    }
                });
            }
        }
    }

    // Count large and medium pieces that are still off board
    let count = 0;
    // Count 'L' pieces off board (max 2)
    const largePieces = allPieces.filter(
        (p) => p.size === "L" && p.isOffBoard,
    );
    // Count 'M' pieces off board (max 2)
    const mediumPieces = allPieces.filter(
        (p) => p.size === "M" && p.isOffBoard,
    );

    count = largePieces.length * 2 + mediumPieces.length; // Large pieces worth more
    return count;
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

// Simplified minimax function (not fully implemented)
const minimax = (
    board: Board,
    depth: number,
    aiPlayer: Player,
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
    try {
        const possibleMoves = getAllPossibleMoves(board, aiPieces, aiPlayer);
        if (possibleMoves.length === 0) return null; // No moves possible

        const opponent: Player = aiPlayer === "Red" ? "Blue" : "Red";
        const topPiecesBoard = board.map((row) => row.map(getTopPiece));
        const totalMoves = countPiecesOnBoard(board);
        const isOpeningPhase = totalMoves < 3;

        // 1. Core Decision Priority Hierarchy
        // 1.1 Win in one move
        const winningMove = findWinningMove(board, possibleMoves, aiPlayer);
        if (winningMove) {
            winningMove.moveReason = "winMove";
            return winningMove;
        }

        // 1.2 Block opponent's win
        const blockingMove = findBlockingMove(board, possibleMoves, aiPlayer);
        if (blockingMove) {
            blockingMove.moveReason = "blockWin";
            return blockingMove;
        }

        // 1.3 Create a fork (multiple winning threats)
        const forkMove = findForkCreationMove(board, possibleMoves, aiPlayer);
        if (forkMove) {
            forkMove.moveReason = "createFork";
            return forkMove;
        }

        // 1.4 Block opponent's fork
        const blockForkMove = findBlockForkMove(board, possibleMoves, aiPlayer);
        if (blockForkMove) {
            blockForkMove.moveReason = "blockFork";
            return blockForkMove;
        }

        // 2. Opening Phase Rules (if it's early in the game)
        if (isOpeningPhase) {
            // 2.1 First move - center if empty
            if (totalMoves === 0 && !topPiecesBoard[1][1]) {
                const centerMoves = possibleMoves.filter((move) =>
                    move.type === "place" && move.row === 1 && move.col === 1
                );

                if (centerMoves.length > 0) {
                    // Use smallest piece for center in opening
                    const smallestPieceMove = findSmallestPieceMove(
                        centerMoves,
                    );
                    smallestPieceMove.moveReason = "openingMove";
                    return smallestPieceMove;
                }
            }

            // 2.2 If opponent took center, take a corner
            if (
                topPiecesBoard[1][1] &&
                topPiecesBoard[1][1]?.player !== aiPlayer
            ) {
                const cornerMoves = possibleMoves.filter((move) => {
                    if (move.type !== "place") return false;
                    return (
                        (move.row === 0 && move.col === 0) ||
                        (move.row === 0 && move.col === 2) ||
                        (move.row === 2 && move.col === 0) ||
                        (move.row === 2 && move.col === 2)
                    );
                });

                if (cornerMoves.length > 0) {
                    const smallestPieceMove = findSmallestPieceMove(
                        cornerMoves,
                    );
                    smallestPieceMove.moveReason = "cornerControl";
                    return smallestPieceMove;
                }
            }
        }

        // If we've gotten here, do a fallback to a simpler strategy

        // Try to place in center if available
        if (!topPiecesBoard[1][1]) {
            const centerMoves = possibleMoves.filter((move) => {
                if (move.type === "place") {
                    return move.row === 1 && move.col === 1;
                } else {
                    return move.toRow === 1 && move.toCol === 1;
                }
            });

            if (centerMoves.length > 0) {
                centerMoves[0].moveReason = "centerControl";
                return centerMoves[0];
            }
        }

        // Try any corner
        const cornerMoves = possibleMoves.filter((move) => {
            if (move.type === "place") {
                return (
                    (move.row === 0 && move.col === 0) ||
                    (move.row === 0 && move.col === 2) ||
                    (move.row === 2 && move.col === 0) ||
                    (move.row === 2 && move.col === 2)
                );
            } else {
                return (
                    (move.toRow === 0 && move.toCol === 0) ||
                    (move.toRow === 0 && move.toCol === 2) ||
                    (move.toRow === 2 && move.toCol === 0) ||
                    (move.toRow === 2 && move.toCol === 2)
                );
            }
        });

        if (cornerMoves.length > 0) {
            cornerMoves[0].moveReason = "cornerControl";
            return cornerMoves[0];
        }

        // Last resort - just pick the first move
        if (possibleMoves.length > 0) {
            possibleMoves[0].moveReason = "strategicAdvantage";
            return possibleMoves[0];
        }

        // No valid moves found
        return null;
    } catch (error) {
        console.error("Error in AI decision making:", error);

        // Return a safe fallback - first valid placement move
        try {
            const aiOffBoardPieces = aiPieces.filter((p) => p.isOffBoard);
            if (aiOffBoardPieces.length === 0) return null;

            // Try to find any valid spot on the board
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    const topPiece = getTopPiece(board[r][c]);

                    // If empty or can gobble with largest piece
                    if (!topPiece || (topPiece.player !== aiPlayer)) {
                        const largePieces = aiOffBoardPieces.filter((p) =>
                            p.size === "L"
                        );
                        const mediumPieces = aiOffBoardPieces.filter((p) =>
                            p.size === "M"
                        );
                        const smallPieces = aiOffBoardPieces.filter((p) =>
                            p.size === "S"
                        );

                        // Try large piece first, then medium, then small
                        let pieceToUse = null;
                        if (largePieces.length > 0) {
                            pieceToUse = largePieces[0];
                        } else if (mediumPieces.length > 0) {
                            pieceToUse = mediumPieces[0];
                        } else if (smallPieces.length > 0) {
                            pieceToUse = smallPieces[0];
                        }

                        if (
                            pieceToUse &&
                            (!topPiece ||
                                comparePieceSizes(
                                        pieceToUse.size,
                                        topPiece.size,
                                    ) > 0)
                        ) {
                            return {
                                type: "place",
                                piece: pieceToUse,
                                row: r,
                                col: c,
                                moveReason: "fallbackMove",
                            };
                        }
                    }
                }
            }
        } catch (fallbackError) {
            console.error("Error in AI fallback logic:", fallbackError);
        }

        return null;
    }
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

// --- AI Strategy Helper Functions ---

// Count total pieces on the board
const countPiecesOnBoard = (board: Board): number => {
    let count = 0;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[r][c]) {
                count += board[r][c]!.length;
            }
        }
    }
    return count;
};

// Find a move that will win the game
const findWinningMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    for (const move of possibleMoves) {
        const nextBoard = simulateMove(board, move);
        if (calculateWinner(nextBoard) === player) {
            return move;
        }
    }
    return null;
};

// Find a move to block opponent's winning move
const findBlockingMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    const opponent = player === "Red" ? "Blue" : "Red";
    const opponentWinningPos = findOpponentWinningMove(board, player);

    if (opponentWinningPos) {
        const [blockRow, blockCol] = opponentWinningPos;

        // Find moves that block this position
        const blockingMoves = possibleMoves.filter((move) => {
            if (move.type === "place") {
                return move.row === blockRow && move.col === blockCol;
            } else {
                return move.toRow === blockRow && move.toCol === blockCol;
            }
        });

        if (blockingMoves.length > 0) {
            // Sort by size preference - prefer to use LARGER pieces for blocking
            blockingMoves.sort((a, b) => {
                const sizeValues: Record<PieceSize, number> = {
                    S: 1,
                    M: 2,
                    L: 3,
                };
                return sizeValues[b.piece.size] - sizeValues[a.piece.size]; // Larger pieces first
            });

            return blockingMoves[0];
        }
    }

    return null;
};

// Find a move that creates multiple winning threats (a fork)
const findForkCreationMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    for (const move of possibleMoves) {
        const nextBoard = simulateMove(board, move);
        const threats = countThreats(
            nextBoard.map((row) => row.map(getTopPiece)),
            player,
        );

        // If a move creates two or more threats, it's a fork
        if (threats >= 2) {
            return move;
        }
    }
    return null;
};

// Find a move that blocks opponent from creating a fork
const findBlockForkMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    const opponent = player === "Red" ? "Blue" : "Red";

    // For each opponent's possible move, check if it creates a fork
    for (const move of possibleMoves) {
        // If this move prevents opponent from creating any forks next turn
        let preventsAllForks = true;

        // Simulate our move
        const afterMoveBoard = simulateMove(board, move);

        // Check if opponent can create a fork after our move
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                // Try opponent placing in each empty cell
                if (
                    !getTopPiece(afterMoveBoard[r][c]) ||
                    getTopPiece(afterMoveBoard[r][c])?.player !== opponent
                ) {
                    // Simulate opponent move
                    const opponentMoveBoard = JSON.parse(
                        JSON.stringify(afterMoveBoard),
                    );
                    if (!opponentMoveBoard[r][c]) {
                        opponentMoveBoard[r][c] = [];
                    }

                    // Assume opponent uses a large piece
                    opponentMoveBoard[r][c].push({
                        id: "opponent-sim-piece",
                        player: opponent,
                        size: "L",
                        isOffBoard: false,
                    });

                    // Count threats after opponent move
                    const threats = countThreats(
                        opponentMoveBoard.map((row: BoardCell[]) =>
                            row.map(getTopPiece)
                        ),
                        opponent,
                    );
                    if (threats >= 2) {
                        preventsAllForks = false;
                        break;
                    }
                }
            }
            if (!preventsAllForks) break;
        }

        if (preventsAllForks) {
            return move;
        }
    }

    return null;
};

// Find a move that blocks a gap in an opponent's two non-adjacent pieces
const findGapBlockingMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    const opponent = player === "Red" ? "Blue" : "Red";
    const topPiecesBoard = board.map((row) => row.map(getTopPiece));

    // Check rows
    for (let r = 0; r < 3; r++) {
        if (
            !topPiecesBoard[r][0] &&
            topPiecesBoard[r][1]?.player === opponent &&
            topPiecesBoard[r][2]?.player === opponent
        ) {
            // Gap at [r][0]
            const blockingMoves = findMovesToPosition(possibleMoves, r, 0);
            if (blockingMoves.length > 0) return blockingMoves[0];
        }
        if (
            topPiecesBoard[r][0]?.player === opponent &&
            !topPiecesBoard[r][1] && topPiecesBoard[r][2]?.player === opponent
        ) {
            // Gap at [r][1]
            const blockingMoves = findMovesToPosition(possibleMoves, r, 1);
            if (blockingMoves.length > 0) return blockingMoves[0];
        }
        if (
            topPiecesBoard[r][0]?.player === opponent &&
            topPiecesBoard[r][1]?.player === opponent && !topPiecesBoard[r][2]
        ) {
            // Gap at [r][2]
            const blockingMoves = findMovesToPosition(possibleMoves, r, 2);
            if (blockingMoves.length > 0) return blockingMoves[0];
        }
    }

    // Check columns
    for (let c = 0; c < 3; c++) {
        if (
            !topPiecesBoard[0][c] &&
            topPiecesBoard[1][c]?.player === opponent &&
            topPiecesBoard[2][c]?.player === opponent
        ) {
            // Gap at [0][c]
            const blockingMoves = findMovesToPosition(possibleMoves, 0, c);
            if (blockingMoves.length > 0) return blockingMoves[0];
        }
        if (
            topPiecesBoard[0][c]?.player === opponent &&
            !topPiecesBoard[1][c] && topPiecesBoard[2][c]?.player === opponent
        ) {
            // Gap at [1][c]
            const blockingMoves = findMovesToPosition(possibleMoves, 1, c);
            if (blockingMoves.length > 0) return blockingMoves[0];
        }
        if (
            topPiecesBoard[0][c]?.player === opponent &&
            topPiecesBoard[1][c]?.player === opponent && !topPiecesBoard[2][c]
        ) {
            // Gap at [2][c]
            const blockingMoves = findMovesToPosition(possibleMoves, 2, c);
            if (blockingMoves.length > 0) return blockingMoves[0];
        }
    }

    // Check diagonals
    if (
        !topPiecesBoard[0][0] && topPiecesBoard[1][1]?.player === opponent &&
        topPiecesBoard[2][2]?.player === opponent
    ) {
        // Gap at [0][0]
        const blockingMoves = findMovesToPosition(possibleMoves, 0, 0);
        if (blockingMoves.length > 0) return blockingMoves[0];
    }
    if (
        topPiecesBoard[0][0]?.player === opponent && !topPiecesBoard[1][1] &&
        topPiecesBoard[2][2]?.player === opponent
    ) {
        // Gap at [1][1]
        const blockingMoves = findMovesToPosition(possibleMoves, 1, 1);
        if (blockingMoves.length > 0) return blockingMoves[0];
    }
    if (
        topPiecesBoard[0][0]?.player === opponent &&
        topPiecesBoard[1][1]?.player === opponent && !topPiecesBoard[2][2]
    ) {
        // Gap at [2][2]
        const blockingMoves = findMovesToPosition(possibleMoves, 2, 2);
        if (blockingMoves.length > 0) return blockingMoves[0];
    }

    if (
        !topPiecesBoard[0][2] && topPiecesBoard[1][1]?.player === opponent &&
        topPiecesBoard[2][0]?.player === opponent
    ) {
        // Gap at [0][2]
        const blockingMoves = findMovesToPosition(possibleMoves, 0, 2);
        if (blockingMoves.length > 0) return blockingMoves[0];
    }
    if (
        topPiecesBoard[0][2]?.player === opponent && !topPiecesBoard[1][1] &&
        topPiecesBoard[2][0]?.player === opponent
    ) {
        // Gap at [1][1]
        const blockingMoves = findMovesToPosition(possibleMoves, 1, 1);
        if (blockingMoves.length > 0) return blockingMoves[0];
    }
    if (
        topPiecesBoard[0][2]?.player === opponent &&
        topPiecesBoard[1][1]?.player === opponent && !topPiecesBoard[2][0]
    ) {
        // Gap at [2][0]
        const blockingMoves = findMovesToPosition(possibleMoves, 2, 0);
        if (blockingMoves.length > 0) return blockingMoves[0];
    }

    return null;
};

// Find all moves that target a specific position
const findMovesToPosition = (
    moves: AIMove[],
    row: number,
    col: number,
): AIMove[] => {
    return moves.filter((move) => {
        if (move.type === "place") {
            return move.row === row && move.col === col;
        } else {
            return move.toRow === row && move.toCol === col;
        }
    });
};

// Find a move that creates a diagonal threat
const findDiagonalThreatMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    const topPiecesBoard = board.map((row) => row.map(getTopPiece));

    for (const move of possibleMoves) {
        const targetRow = move.type === "place" ? move.row : move.toRow;
        const targetCol = move.type === "place" ? move.col : move.toCol;

        // Check if the move is on a diagonal
        const isOnMainDiagonal = targetRow === targetCol;
        const isOnAntiDiagonal = targetRow + targetCol === 2;

        if (!isOnMainDiagonal && !isOnAntiDiagonal) continue;

        // Simulate the move
        const nextBoard = simulateMove(board, move);
        const nextTopPiecesBoard = nextBoard.map((row) => row.map(getTopPiece));

        // Check for diagonal threats
        if (isOnMainDiagonal) {
            const mainDiag = [
                nextTopPiecesBoard[0][0],
                nextTopPiecesBoard[1][1],
                nextTopPiecesBoard[2][2],
            ];
            if (isLineThreat(mainDiag, player)) {
                return move;
            }
        }

        if (isOnAntiDiagonal) {
            const antiDiag = [
                nextTopPiecesBoard[0][2],
                nextTopPiecesBoard[1][1],
                nextTopPiecesBoard[2][0],
            ];
            if (isLineThreat(antiDiag, player)) {
                return move;
            }
        }
    }

    return null;
};

// Find the move that uses the smallest viable piece from a set of moves
const findSmallestPieceMove = (moves: AIMove[]): AIMove => {
    const sortedMoves = [...moves].sort((a, b) => {
        const sizeValues: Record<PieceSize, number> = { S: 1, M: 2, L: 3 };
        return sizeValues[a.piece.size] - sizeValues[b.piece.size];
    });

    return sortedMoves[0];
};

// Find a viable move that uses the smallest piece strategically
const findSmallestViablePieceMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    // Filter to only placement moves (using a new piece)
    const placementMoves = possibleMoves.filter((move) =>
        move.type === "place"
    );

    if (placementMoves.length === 0) return null;

    // Find the smallest piece that can be used effectively
    return findSmallestPieceMove(placementMoves);
};

// Check if AI should recover a piece from the board
const shouldRecoverPiece = (board: Board, player: Player): boolean => {
    const opponent = player === "Red" ? "Blue" : "Red";

    // Count pieces on board by player
    let playerPieces = 0;
    let opponentPieces = 0;

    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            const topPiece = getTopPiece(board[r][c]);
            if (topPiece) {
                if (topPiece.player === player) {
                    playerPieces++;
                } else {
                    opponentPieces++;
                }
            }
        }
    }

    // If opponent has more pieces on board, consider recovering
    return opponentPieces > playerPieces;
};

// Find a move that creates a trap for the opponent
const findTrapMove = (
    board: Board,
    possibleMoves: AIMove[],
    player: Player,
): AIMove | null => {
    const opponent = player === "Red" ? "Blue" : "Red";

    for (const move of possibleMoves) {
        // Simulate the move
        const nextBoard = simulateMove(board, move);

        // If this move creates a piece that can be covered...
        if (move.type === "place" && move.piece.size !== "L") {
            // Check if covering this piece would lead to a winning position for us
            for (let r = 0; r < 3; r++) {
                for (let c = 0; c < 3; c++) {
                    // Skip the position we just moved to
                    if (
                        move.type === "place" && r === move.row &&
                        c === move.col
                    ) continue;

                    // Check if we can create a winning threat at this position
                    const simulatedCoverBoard = JSON.parse(
                        JSON.stringify(nextBoard),
                    );
                    const topPiece = getTopPiece(
                        simulatedCoverBoard[move.row][move.col],
                    );

                    // Simulate opponent covering our piece
                    if (topPiece && topPiece.player === player) {
                        // Remove our piece (simulating it's covered)
                        simulatedCoverBoard[move.row][move.col].pop();

                        // Add opponent piece
                        simulatedCoverBoard[move.row][move.col].push({
                            id: "opponent-trap-sim",
                            player: opponent,
                            size: "L", // Opponent uses large piece to cover
                            isOffBoard: false,
                        });

                        // Check if we can win somewhere else now
                        for (let tr = 0; tr < 3; tr++) {
                            for (let tc = 0; tc < 3; tc++) {
                                if (tr === move.row && tc === move.col) {
                                    continue;
                                }
                                if (tr === r && tc === c) continue;

                                // Check if placing here would win
                                const finalBoard = JSON.parse(
                                    JSON.stringify(simulatedCoverBoard),
                                );
                                if (!finalBoard[tr][tc]) {
                                    finalBoard[tr][tc] = [];
                                }

                                finalBoard[tr][tc].push({
                                    id: "player-win-sim",
                                    player: player,
                                    size: "L", // Use large piece for simulation
                                    isOffBoard: false,
                                });

                                if (calculateWinner(finalBoard) === player) {
                                    return move; // Found a trap move
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return null;
};

// Generate a human-readable explanation for an AI move
export const getMoveExplanation = (aiMove: AIMove | null): string | null => {
    if (!aiMove || !aiMove.moveReason) return null;

    return "aiReasons." + aiMove.moveReason;
};

// Helper function to properly compare piece sizes
const comparePieceSizes = (size1: PieceSize, size2: PieceSize): number => {
    // Define size values for explicit comparison
    const sizeValues: Record<PieceSize, number> = {
        "S": 1,
        "M": 2,
        "L": 3,
    };
    return sizeValues[size1] - sizeValues[size2]; // Positive means size1 > size2
};
