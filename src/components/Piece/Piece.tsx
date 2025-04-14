import React from "react";
import type { Piece as PieceType } from "../../types/game";
import { useGameStore } from "../../contexts/gameStore";

interface PieceProps {
    piece: PieceType;
    onClick?: (pieceId: string) => void; // Optional click handler, mainly for off-board pieces
    isSelected?: boolean; // Directly pass selection state
}

const Piece: React.FC<PieceProps> = ({ piece, onClick, isSelected }) => {
    const selectPiece = useGameStore((state) => state.selectPiece);
    const currentTurn = useGameStore((state) => state.currentTurn);

    const handleClick = () => {
        if (onClick) {
            onClick(piece.id); // Use provided handler if available (for off-board)
        } else if (!piece.isOffBoard) {
            // Handle selecting an on-board piece (for moving) - basic selection
            if (piece.player === currentTurn) { // Only allow selecting own pieces
                selectPiece(piece.id);
            }
        }
    };

    // Size classes based on piece size
    const sizeClasses = {
        S: "w-8 h-8 text-xs z-30", // Small piece
        M: "w-12 h-12 text-sm z-20", // Medium piece
        L: "w-16 h-16 text-base z-10", // Large piece
    };

    // Player color classes
    const colorClasses = {
        Red: "bg-red-500 border-red-700",
        Blue: "bg-blue-500 border-blue-700",
    };

    // Position classes
    const positionClass = piece.isOffBoard
        ? "relative mx-1"
        : "absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";

    // Selection highlight
    const selectedClass = isSelected
        ? "border-yellow-400 ring-2 ring-yellow-400 ring-opacity-75"
        : "border-2";

    return (
        <div
            className={`
                rounded-full flex justify-center items-center font-bold
                cursor-pointer transition-all duration-200 shadow-md text-white
                ${sizeClasses[piece.size]}
                ${colorClasses[piece.player]}
                ${positionClass}
                ${selectedClass}
            `}
            onClick={handleClick}
            title={`${piece.player} ${piece.size} Piece`}
        >
            {/* Display size indicator inside the piece */}
            {piece.size}
        </div>
    );
};

export default Piece;
