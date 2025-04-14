import React, { useEffect, useState } from "react";
import { useGameStore } from "../../contexts/gameStore";
import styles from "./Board.module.css";
import type { BoardCell, PieceSize } from "../../types/game";
import PieceComponent from "../Piece/Piece";
import { useTranslation } from "react-i18next";

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

const Board: React.FC = () => {
    const { t } = useTranslation();
    const board = useGameStore((state) => state.board);
    const placePiece = useGameStore((state) => state.placePiece);
    const movePiece = useGameStore((state) => state.movePiece);
    const selectedPieceId = useGameStore((state) => state.selectedPieceId);
    const selectPiece = useGameStore((state) => state.selectPiece);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const pieces = useGameStore((state) => state.pieces);
    const gameStatus = useGameStore((state) => state.gameStatus);

    const [sourceCell, setSourceCell] = useState<
        { row: number; col: number } | null
    >(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Clear error message after 3 seconds
    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage]);

    const handleCellClick = (row: number, col: number) => {
        if (gameStatus !== "in-progress") return;

        const cell = board[row][col];
        const topPiece = cell && cell.length > 0 ? cell[cell.length - 1] : null;
        const selectedPieceData = selectedPieceId
            ? [...pieces.Red, ...pieces.Blue].find((p) =>
                p.id === selectedPieceId
            )
            : null;

        // Case 1: A piece is already selected and we're trying to move/gobble
        if (selectedPieceId && selectedPieceData) {
            // Case 1.1: Selected piece is from hand (place)
            if (selectedPieceData.isOffBoard) {
                // If destination has a piece
                if (topPiece) {
                    // Check gobbling rule
                    if (
                        comparePieceSizes(
                            selectedPieceData.size,
                            topPiece.size,
                        ) <= 0
                    ) {
                        setErrorMessage(t("invalidMove.smallerPiece"));
                        return;
                    }
                    // Valid gobble from hand
                }
                placePiece(row, col);
                setSourceCell(null);
            } // Case 1.2: Selected piece is on board (move)
            else {
                if (sourceCell) {
                    // If destination has a piece
                    if (topPiece) {
                        // Check gobbling rule
                        if (
                            comparePieceSizes(
                                selectedPieceData.size,
                                topPiece.size,
                            ) <= 0
                        ) {
                            setErrorMessage(t("invalidMove.smallerPiece"));
                            return;
                        }
                        // Valid gobble from board
                    }
                    movePiece(sourceCell.row, sourceCell.col, row, col);
                    setSourceCell(null);
                } else {
                    setErrorMessage(t("invalidMove.missingSource"));
                    selectPiece(null);
                    setSourceCell(null);
                }
            }
        } // Case 2: No piece selected yet - either select own piece or try direct gobbling
        else {
            // Case 2.1: Cell has a piece
            if (topPiece) {
                // Player's own piece - select it
                if (topPiece.player === currentTurn) {
                    selectPiece(topPiece.id);
                    setSourceCell({ row, col });
                } // Enemy piece - check if player has a larger piece selected that can gobble it
                else {
                    // Find player's pieces that can gobble this enemy piece
                    const playerPieces = pieces[currentTurn];
                    const eligiblePieces = playerPieces.filter((piece) =>
                        comparePieceSizes(piece.size, topPiece.size) > 0 &&
                        (piece.isOffBoard ||
                            (board.some((r, rIdx) =>
                                r.some((c, cIdx) => {
                                    const cellTopPiece = c && c.length > 0
                                        ? c[c.length - 1]
                                        : null;
                                    return cellTopPiece &&
                                        cellTopPiece.id === piece.id &&
                                        (rIdx !== row || cIdx !== col);
                                })
                            )))
                    );

                    if (eligiblePieces.length === 0) {
                        setErrorMessage(t("invalidMove.noEligiblePieces"));
                    } else if (eligiblePieces.length === 1) {
                        // Auto-select the only eligible piece
                        const pieceToUse = eligiblePieces[0];
                        selectPiece(pieceToUse.id);

                        if (!pieceToUse.isOffBoard) {
                            // Find the piece's location on the board
                            let pieceLocation:
                                | { row: number; col: number }
                                | null = null;
                            board.forEach((r, rIdx) => {
                                r.forEach((c, cIdx) => {
                                    const cellTopPiece = c && c.length > 0
                                        ? c[c.length - 1]
                                        : null;
                                    if (
                                        cellTopPiece &&
                                        cellTopPiece.id === pieceToUse.id
                                    ) {
                                        pieceLocation = {
                                            row: rIdx,
                                            col: cIdx,
                                        };
                                    }
                                });
                            });

                            if (pieceLocation) {
                                setSourceCell(pieceLocation);
                                const { row: fromRow, col: fromCol } =
                                    pieceLocation;
                                movePiece(fromRow, fromCol, row, col);
                                selectPiece(null);
                                setSourceCell(null);
                            }
                        } else {
                            // Place from hand
                            placePiece(row, col);
                            selectPiece(null);
                        }
                    } else {
                        // Multiple eligible pieces - prompt user to select one
                        setErrorMessage(t("select.eligiblePiece"));
                    }
                }
            } // Case 2.2: Empty cell - nothing to select or gobble
            else {
                selectPiece(null);
                setSourceCell(null);
            }
        }
    };

    const renderCellContent = (cell: BoardCell) => {
        if (!cell || cell.length === 0) {
            return null;
        }
        return cell.map((piece, index) => (
            <div
                key={piece.id}
                className={styles.pieceWrapper}
                style={{
                    zIndex: index + 1,
                    opacity: index === cell.length - 1 ? 1 : 0, // Only show top piece
                }}
            >
                <PieceComponent
                    piece={piece}
                    isSelected={selectedPieceId === piece.id}
                />
            </div>
        ));
    };

    const colLabels = ["A", "B", "C"];
    const rowLabels = ["1", "2", "3"];

    return (
        <div className={styles.boardContainer}>
            {/* Column Labels */}
            <div className={styles.colLabels}>
                {colLabels.map((label) => (
                    <div key={label} className={styles.label}>{label}</div>
                ))}
            </div>

            {/* Row Labels */}
            <div className={styles.rowLabels}>
                {rowLabels.map((label) => (
                    <div key={label} className={styles.label}>{label}</div>
                ))}
            </div>

            {/* Board Grid */}
            <div className={styles.boardGrid}>
                {board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`${styles.cell} ${
                                sourceCell && sourceCell.row === rowIndex &&
                                    sourceCell.col === colIndex
                                    ? styles.sourceCellHighlight
                                    : ""
                            }`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                            title={`Cell ${colLabels[colIndex]}${
                                rowLabels[rowIndex]
                            }`}
                        >
                            {renderCellContent(cell)}
                        </div>
                    ))
                )}
            </div>

            {/* Error message display */}
            {errorMessage && (
                <div className={styles.errorMessage}>
                    {errorMessage}
                </div>
            )}
        </div>
    );
};

export default Board;
