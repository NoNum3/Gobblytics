import React from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../../contexts/gameStore";
import { evaluatePosition } from "../../utils/aiLogic";
import type { Player } from "../../types/game";

interface MoveAnalysisProps {
    aiPlayer: Player;
}

const MoveAnalysis: React.FC<MoveAnalysisProps> = ({ aiPlayer }) => {
    const { t } = useTranslation();
    const board = useGameStore((state) => state.board);
    const pieces = useGameStore((state) => state.pieces);
    const humanPlayer = aiPlayer === "Red" ? "Blue" : "Red";

    // Calculate score for both players
    const aiScore = evaluatePosition(board, aiPlayer);
    const playerScore = evaluatePosition(board, humanPlayer);

    // Determine advantage text
    const getAdvantageText = () => {
        const diff = aiScore - playerScore;
        if (diff > 15) return t("aiStrongAdvantage");
        if (diff > 5) return t("aiAdvantage");
        if (diff < -15) return t("playerStrongAdvantage");
        if (diff < -5) return t("playerAdvantage");
        return t("evenPosition");
    };

    return (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium mb-2">
                {t("positionAnalysis")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
                <div className="text-sm">
                    <span className="font-medium">{t("yourScore")}:</span>{" "}
                    {playerScore}
                </div>
                <div className="text-sm">
                    <span className="font-medium">{t("aiScore")}:</span>{" "}
                    {aiScore}
                </div>
            </div>
            <div className="text-sm mt-2">
                <span className="font-medium">{t("evaluation")}:</span>{" "}
                <span
                    className={`${
                        aiScore > playerScore
                            ? "text-blue-600"
                            : aiScore < playerScore
                            ? "text-red-600"
                            : "text-gray-600"
                    }`}
                >
                    {getAdvantageText()}
                </span>
            </div>
        </div>
    );
};

export default MoveAnalysis;
