import React from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../../contexts/gameStore";
import type { Board, Piece, Player } from "../../types/game";

interface MoveHistoryEntry {
    player: Player;
    moveType: "place" | "move";
    piece: {
        id: string;
        size: "S" | "M" | "L";
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

interface BoardAnalysisProps {
    moveHistory?: MoveHistoryEntry[];
    currentBoard?: Board;
    aiPlayer: Player;
}

const BoardAnalysis: React.FC<BoardAnalysisProps> = ({
    moveHistory = [],
    aiPlayer,
}) => {
    const { t } = useTranslation();
    const board = useGameStore((state) => state.board);

    // Helper to get position label (e.g., "A1", "B2", etc.)
    const getPositionLabel = (row: number, col: number): string => {
        const rowLabels = ["A", "B", "C"];
        return `${rowLabels[row]}${col + 1}`;
    };

    // Helper to get a piece size label
    const getSizeLabel = (size: "S" | "M" | "L"): string => {
        switch (size) {
            case "S":
                return t("small");
            case "M":
                return t("medium");
            case "L":
                return t("large");
        }
    };

    const renderBoardState = () => {
        // Count pieces on board by player and size
        const pieceCount = {
            Red: { S: 0, M: 0, L: 0, total: 0 },
            Blue: { S: 0, M: 0, L: 0, total: 0 },
        };

        // Count positions controlled by each player
        let redPositions = 0;
        let bluePositions = 0;

        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                const cell = board[r][c];
                if (cell.length > 0) {
                    const topPiece = cell[cell.length - 1];
                    if (topPiece.player === "Red") {
                        redPositions++;
                    } else {
                        bluePositions++;
                    }

                    // Count all pieces in the stack
                    cell.forEach((piece) => {
                        pieceCount[piece.player][piece.size]++;
                        pieceCount[piece.player].total++;
                    });
                }
            }
        }

        return (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    {t("boardAnalysis")}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between items-center p-1.5 bg-red-50 rounded">
                        <span className="font-medium text-red-700">Red</span>
                        <div className="flex space-x-1.5">
                            <span className="px-1 py-0.5 bg-white rounded text-red-800">
                                S:{pieceCount.Red.S}
                            </span>
                            <span className="px-1 py-0.5 bg-white rounded text-red-800">
                                M:{pieceCount.Red.M}
                            </span>
                            <span className="px-1 py-0.5 bg-white rounded text-red-800">
                                L:{pieceCount.Red.L}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-1.5 bg-blue-50 rounded">
                        <span className="font-medium text-blue-700">Blue</span>
                        <div className="flex space-x-1.5">
                            <span className="px-1 py-0.5 bg-white rounded text-blue-800">
                                S:{pieceCount.Blue.S}
                            </span>
                            <span className="px-1 py-0.5 bg-white rounded text-blue-800">
                                M:{pieceCount.Blue.M}
                            </span>
                            <span className="px-1 py-0.5 bg-white rounded text-blue-800">
                                L:{pieceCount.Blue.L}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                    <div className="flex justify-between">
                        <span>
                            Positions: Red {redPositions}, Blue {bluePositions}
                        </span>
                        <span>
                            Pieces on board:{" "}
                            {pieceCount.Red.total + pieceCount.Blue.total}/12
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    const renderMoveHistory = () => {
        if (moveHistory.length === 0) {
            return (
                <div className="text-sm text-gray-500 italic text-center py-3">
                    {t("noMovesYet")}
                </div>
            );
        }

        // Show most recent moves first (up to 5)
        const recentMoves = [...moveHistory].reverse().slice(0, 5);

        return (
            <div className="space-y-2 mt-2">
                {recentMoves.map((move, index) => {
                    const isAI = move.player === aiPlayer;
                    const bgClass = isAI ? "bg-blue-50" : "bg-red-50";
                    const textClass = isAI ? "text-blue-800" : "text-red-800";
                    const borderClass = isAI
                        ? "border-blue-100"
                        : "border-red-100";

                    return (
                        <div
                            key={index}
                            className={`p-2 rounded ${bgClass} border ${borderClass}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`font-medium ${textClass}`}>
                                    {move.player} ({move.moveType})
                                </span>
                                <span className="text-xs text-gray-500">
                                    {new Date(move.timestamp)
                                        .toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="text-sm mt-1">
                                {move.moveType === "place"
                                    ? (
                                        <span>
                                            Placed{" "}
                                            {getSizeLabel(move.piece.size)}{" "}
                                            piece at{" "}
                                            {getPositionLabel(
                                                move.to.row,
                                                move.to.col,
                                            )}
                                        </span>
                                    )
                                    : (
                                        <span>
                                            Moved{" "}
                                            {getSizeLabel(move.piece.size)}{" "}
                                            piece from{" "}
                                            {getPositionLabel(
                                                move.from!.row,
                                                move.from!.col,
                                            )} to{" "}
                                            {getPositionLabel(
                                                move.to.row,
                                                move.to.col,
                                            )}
                                        </span>
                                    )}
                            </div>

                            {isAI && move.explanation && (
                                <div className="text-xs mt-1 italic text-blue-700">
                                    {t(move.explanation)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-800">
                {t("boardAnalysis")}
            </h2>

            {renderBoardState()}

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold mb-2 text-gray-700">
                    {t("moveHistory")}
                </h3>
                {renderMoveHistory()}
            </div>
        </div>
    );
};

export default BoardAnalysis;
