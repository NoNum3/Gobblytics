import React from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../../contexts/gameStore";
import styles from "./GameStatusDisplay.module.css";

const GameStatusDisplay: React.FC = () => {
    const { t } = useTranslation();
    const gameStatus = useGameStore((state) => state.gameStatus);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const winner = useGameStore((state) => state.winner);
    const initGame = useGameStore((state) => state.initGame);
    const gameMode = useGameStore((state) => state.gameMode);

    let statusText = "";
    let statusClass = "";

    if (gameStatus === "win" && winner) {
        statusText = t("playerWins", { player: winner });
        statusClass = `${styles.winner} ${
            winner === "Red" ? styles.winnerRed : styles.winnerBlue
        }`;
    } else if (gameStatus === "draw") {
        statusText = t("draw");
        statusClass = `${styles.winner} ${styles.draw}`;
    } else { // in-progress
        statusText = t("playerTurn", { player: currentTurn });
        statusClass = currentTurn === "Red" ? styles.turnRed : styles.turnBlue;
    }

    const handlePlayAgain = () => {
        initGame(gameMode); // Restart game with the current mode
    };

    return (
        <div className={styles.gameStatus}>
            <span className={statusClass}>{statusText}</span>
            {(gameStatus === "win" || gameStatus === "draw") && (
                <button
                    onClick={handlePlayAgain}
                    style={{ marginLeft: "20px" }}
                >
                    {t("playAgain")}
                </button>
            )}
        </div>
    );
};

export default GameStatusDisplay;
