export type Player = "Red" | "Blue";

export type PieceSize = "S" | "M" | "L";

export interface Piece {
    id: string; // e.g., "Red-S-1", "Blue-M-2"
    player: Player;
    size: PieceSize;
    isOffBoard: boolean;
}

// A cell can hold a stack of pieces
export type BoardCell = Piece[] | null;

// The board is a 3x3 grid of cells
export type Board = BoardCell[][];

export type GameStatus = "in-progress" | "win" | "draw";

export type GameMode = "local" | "ai";
