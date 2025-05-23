import React from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../../contexts/gameStore";
import type { Player } from "../../types/game";
import PieceComponent from "../Piece/Piece";
import styles from "./PlayerHand.module.css";

interface PlayerHandProps {
    player: Player;
}

const PlayerHand: React.FC<PlayerHandProps> = ({ player }) => {
    const { t } = useTranslation();
    const pieces = useGameStore((state) => state.pieces[player]);
    const selectPiece = useGameStore((state) => state.selectPiece);
    const selectedPieceId = useGameStore((state) => state.selectedPieceId);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const gameMode = useGameStore((state) => state.gameMode);
    const analysisMode = useGameStore((state) => state.analysisMode);

    const offBoardPieces = pieces.filter((p) => p.isOffBoard);

    const isSelectable = currentTurn === player ||
        (gameMode === "ai" && analysisMode);

    const handlePieceClick = (pieceId: string) => {
        if (isSelectable) {
            if (selectedPieceId === pieceId) {
                selectPiece(null);
            } else {
                selectPiece(pieceId);
            }
        } else {
            console.log(
                "Cannot select piece: Not your turn or not in AI Analysis Mode.",
            );
        }
    };

    const isPlayerTurn = currentTurn === player;
    const isDisabled = !isSelectable;

    return (
        <div
            className={styles.playerHand}
            style={{ opacity: isDisabled ? 0.6 : 1 }}
        >
            <h3>
                {t("playerHand", { player })}
                {isPlayerTurn && !isDisabled && (
                    <span
                        className={`${styles.turnIndicator} ${styles[player]}`}
                    >
                        {t("yourTurn")}
                    </span>
                )}
            </h3>
            <div className={styles.piecesContainer}>
                {offBoardPieces.length > 0
                    ? (
                        offBoardPieces.map((piece) => (
                            <PieceComponent
                                key={piece.id}
                                piece={piece}
                                onClick={isSelectable
                                    ? handlePieceClick
                                    : undefined}
                                isSelected={selectedPieceId === piece.id}
                            />
                        ))
                    )
                    : <p>{t("noPiecesLeft")}</p>}
            </div>
        </div>
    );
};

export default PlayerHand;
