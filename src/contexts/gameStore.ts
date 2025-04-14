import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
    Board,
    BoardCell,
    GameMode,
    GameStatus,
    Piece,
    PieceSize,
    Player,
} from "../types/game";

// Define MoveHistoryEntry to track moves
export interface MoveHistoryEntry {
    player: Player;
    moveType: "place" | "move";
    piece: {
        id: string;
        size: PieceSize;
    };
    from?: {
        row: number;
        col: number;
    };
    to: {
        row: number;
        col: number;
    };
    explanation?: string | null;
    timestamp: number;
}

interface GameState {
    board: Board;
    pieces: {
        Red: Piece[];
        Blue: Piece[];
    };
    currentTurn: Player;
    selectedPieceId: string | null;
    gameMode: GameMode;
    gameStatus: GameStatus;
    winner: Player | null;
    moveHistory: MoveHistoryEntry[];
    lastMoveExplanation: string | null;
    // --- Actions ---
    initGame: (mode: GameMode) => void;
    setGameMode: (mode: GameMode) => void;
    selectPiece: (pieceId: string | null) => void;
    placePiece: (row: number, col: number) => void;
    movePiece: (
        fromRow: number,
        fromCol: number,
        toRow: number,
        toCol: number,
    ) => void;
    checkWin: () => void;
    switchTurn: () => void;
    saveGame: () => SavedGameState;
    loadGame: (gameState: SavedGameState) => void;
    setMoveExplanation: (explanation: string | null) => void;
}

export interface SavedGameState {
    board: Board;
    pieces: {
        Red: Piece[];
        Blue: Piece[];
    };
    currentTurn: Player;
    gameMode: GameMode;
    gameStatus: GameStatus;
    winner: Player | null;
    moveHistory: MoveHistoryEntry[];
}

const initialBoard: Board = Array(3).fill(null).map(() =>
    Array(3).fill(null).map(() => [])
);

const createInitialPieces = (player: Player): Piece[] => {
    const pieces: Piece[] = [];
    const sizes: PieceSize[] = ["S", "M", "L"];
    let count = 1;
    sizes.forEach((size) => {
        for (let i = 0; i < 2; i++) { // 2 of each size
            pieces.push({
                id: `${player}-${size}-${count++}`,
                player,
                size,
                isOffBoard: true,
            });
        }
    });
    return pieces;
};

// Helper function to get the top piece of a cell
const getTopPiece = (cell: BoardCell): Piece | null => {
    return cell && cell.length > 0 ? cell[cell.length - 1] : null;
};

// Helper function to check for a winning line
const checkLine = (line: (Piece | null)[]): Player | null => {
    if (line.some((piece) => !piece)) return null; // Line not full
    const firstPlayer = line[0]!.player;
    if (line.every((piece) => piece && piece.player === firstPlayer)) {
        return firstPlayer;
    }
    return null;
};

// Helper function to calculate winner
const calculateWinner = (board: Board): Player | null => {
    const topPiecesBoard: (Piece | null)[][] = board.map((row) =>
        row.map(getTopPiece)
    );

    // Check rows
    for (let i = 0; i < 3; i++) {
        const winner = checkLine(topPiecesBoard[i]);
        if (winner) return winner;
    }

    // Check columns
    for (let i = 0; i < 3; i++) {
        const column = [
            topPiecesBoard[0][i],
            topPiecesBoard[1][i],
            topPiecesBoard[2][i],
        ];
        const winner = checkLine(column);
        if (winner) return winner;
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
    const winnerDiag1 = checkLine(diag1);
    if (winnerDiag1) return winnerDiag1;
    const winnerDiag2 = checkLine(diag2);
    if (winnerDiag2) return winnerDiag2;

    return null; // No winner
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

export const useGameStore = create<GameState>()(
    devtools(
        (set, get) => ({
            board: initialBoard,
            pieces: {
                Red: createInitialPieces("Red"),
                Blue: createInitialPieces("Blue"),
            },
            currentTurn: "Red",
            selectedPieceId: null,
            gameMode: "local", // Default mode
            gameStatus: "in-progress",
            winner: null,
            moveHistory: [],
            lastMoveExplanation: null,

            initGame: (mode) =>
                set(
                    {
                        board: Array(3).fill(null).map(() =>
                            Array(3).fill(null).map(() => [])
                        ),
                        pieces: {
                            Red: createInitialPieces("Red"),
                            Blue: createInitialPieces("Blue"),
                        },
                        currentTurn: "Red",
                        selectedPieceId: null,
                        gameMode: mode,
                        gameStatus: "in-progress",
                        winner: null,
                        moveHistory: [],
                        lastMoveExplanation: null,
                    },
                    false,
                    "initGame",
                ),

            setGameMode: (mode) =>
                set(
                    { gameMode: mode },
                    false,
                    "setGameMode",
                ),

            setMoveExplanation: (explanation) =>
                set(
                    { lastMoveExplanation: explanation },
                    false,
                    "setMoveExplanation",
                ),

            selectPiece: (pieceId) => {
                const state = get();
                if (!pieceId) {
                    set(
                        { selectedPieceId: null },
                        false,
                        "selectPiece/deselect",
                    );
                    return;
                }

                const playerPieces = state.pieces[state.currentTurn];
                const piece = playerPieces.find((p) => p.id === pieceId);

                if (piece) {
                    set({ selectedPieceId: pieceId }, false, "selectPiece");
                } else {
                    set(
                        { selectedPieceId: null },
                        false,
                        "selectPiece/invalid",
                    );
                }
            },

            placePiece: (row, col) => {
                const state = get();
                if (state.gameStatus !== "in-progress") return;
                if (!state.selectedPieceId) return;

                const playerPieces = state.pieces[state.currentTurn];
                const pieceIndex = playerPieces.findIndex((p) =>
                    p.id === state.selectedPieceId
                );
                if (pieceIndex === -1) return;
                const pieceToPlace = playerPieces[pieceIndex];

                if (!pieceToPlace.isOffBoard) {
                    console.log(
                        "Invalid Action: Trying to place an on-board piece. Use movePiece.",
                    );
                    return;
                }

                const currentCell = state.board[row][col];
                const topPiece = getTopPiece(currentCell);

                // Fix gobbling rule: larger pieces can cover smaller ones, regardless of owner
                // Only check if piece sizes are compatible (larger can cover smaller)
                if (
                    topPiece &&
                    comparePieceSizes(pieceToPlace.size, topPiece.size) <= 0
                ) {
                    console.log(
                        "Invalid move: Piece must be larger to gobble.",
                    );
                    return;
                }

                const newBoard = state.board.map((r, rIdx) =>
                    r.map((c, cIdx) =>
                        rIdx === row && cIdx === col
                            ? [...(c || []), {
                                ...pieceToPlace,
                                isOffBoard: false,
                            }]
                            : c
                    )
                );

                const newPlayerPieces = playerPieces.map((p, index) =>
                    index === pieceIndex ? { ...p, isOffBoard: false } : p
                );

                // Create move history entry
                const moveEntry: MoveHistoryEntry = {
                    player: state.currentTurn,
                    moveType: "place",
                    piece: {
                        id: pieceToPlace.id,
                        size: pieceToPlace.size,
                    },
                    to: { row, col },
                    explanation: state.lastMoveExplanation,
                    timestamp: Date.now(),
                };

                set(
                    (prevState) => ({
                        board: newBoard,
                        pieces: {
                            ...prevState.pieces,
                            [prevState.currentTurn]: newPlayerPieces,
                        },
                        selectedPieceId: null,
                        moveHistory: [...prevState.moveHistory, moveEntry],
                        lastMoveExplanation: null,
                    }),
                    false,
                    "placePiece",
                );

                const winner = calculateWinner(get().board);
                if (winner) {
                    set(
                        { gameStatus: "win", winner: winner },
                        false,
                        "checkWin/win",
                    );
                } else {
                    get().switchTurn();
                }
            },

            movePiece: (fromRow, fromCol, toRow, toCol) => {
                const state = get();
                if (state.gameStatus !== "in-progress") return;
                if (!state.selectedPieceId) return;

                const pieceToMove = state.pieces[state.currentTurn].find((p) =>
                    p.id === state.selectedPieceId
                );
                if (!pieceToMove || pieceToMove.isOffBoard) {
                    console.error(
                        "Move Error: Selected piece not found or is off-board.",
                    );
                    set({ selectedPieceId: null });
                    return;
                }

                const sourceCell = state.board[fromRow]?.[fromCol];
                const topSourcePiece = getTopPiece(sourceCell);
                if (!topSourcePiece || topSourcePiece.id !== pieceToMove.id) {
                    console.log(
                        "Invalid Move: Can only move the top piece from a cell.",
                    );
                    set({ selectedPieceId: null });
                    return;
                }

                const destCell = state.board[toRow]?.[toCol];
                const topDestPiece = getTopPiece(destCell);

                // Fix gobbling rule: larger pieces can cover smaller ones, regardless of owner
                // Only check if piece sizes are compatible (larger can cover smaller)
                if (
                    topDestPiece &&
                    comparePieceSizes(pieceToMove.size, topDestPiece.size) <= 0
                ) {
                    console.log(
                        "Invalid move: Piece must be larger to gobble.",
                    );
                    return;
                }

                const newBoard = state.board.map((r) =>
                    r.map((c) => c ? [...c] : [])
                );

                newBoard[fromRow][fromCol].pop();
                newBoard[toRow][toCol].push(pieceToMove);

                // Create move history entry
                const moveEntry: MoveHistoryEntry = {
                    player: state.currentTurn,
                    moveType: "move",
                    piece: {
                        id: pieceToMove.id,
                        size: pieceToMove.size,
                    },
                    from: { row: fromRow, col: fromCol },
                    to: { row: toRow, col: toCol },
                    explanation: state.lastMoveExplanation,
                    timestamp: Date.now(),
                };

                set(
                    (prevState) => ({
                        board: newBoard,
                        selectedPieceId: null,
                        moveHistory: [...prevState.moveHistory, moveEntry],
                        lastMoveExplanation: null,
                    }),
                    false,
                    "movePiece",
                );

                const winner = calculateWinner(get().board);
                if (winner) {
                    set(
                        { gameStatus: "win", winner: winner },
                        false,
                        "checkWin/win",
                    );
                } else {
                    get().switchTurn();
                }
            },

            checkWin: () => {
                const state = get();
                if (state.gameStatus !== "in-progress") return;

                const winner = calculateWinner(state.board);
                if (winner) {
                    set(
                        { gameStatus: "win", winner: winner },
                        false,
                        "checkWin/manualWin",
                    );
                } else {
                    console.log("Manual win check: No winner found.");
                    set({}, false, "checkWin/manualNoWin");
                }
            },

            switchTurn: () => {
                set(
                    (state) => ({
                        currentTurn: state.currentTurn === "Red"
                            ? "Blue"
                            : "Red",
                        selectedPieceId: null,
                    }),
                    false,
                    "switchTurn",
                );
            },

            saveGame: () => {
                const state = get();
                return {
                    board: state.board,
                    pieces: {
                        Red: state.pieces.Red,
                        Blue: state.pieces.Blue,
                    },
                    currentTurn: state.currentTurn,
                    gameMode: state.gameMode,
                    gameStatus: state.gameStatus,
                    winner: state.winner,
                    moveHistory: state.moveHistory,
                };
            },

            loadGame: (gameState: SavedGameState) => {
                set(
                    {
                        board: gameState.board,
                        pieces: {
                            Red: gameState.pieces.Red,
                            Blue: gameState.pieces.Blue,
                        },
                        currentTurn: gameState.currentTurn,
                        gameMode: gameState.gameMode,
                        gameStatus: gameState.gameStatus,
                        winner: gameState.winner,
                        moveHistory: gameState.moveHistory || [],
                    },
                    false,
                    "loadGame",
                );
            },
        }),
        { name: "GobbletGameStore" },
    ),
);
