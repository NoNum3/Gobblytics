import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { SavedGameState, useGameStore } from "../../contexts/gameStore";
import { GameMode } from "../../types/game";

interface GameControlsProps {
    gameMode?: GameMode;
    analysisMode?: boolean;
    aiThinking?: boolean;
    moveCount?: number;
    onAnalysisModeToggle?: () => void;
    onTriggerAIMove?: () => void;
    onModeChange?: (mode: GameMode) => void;
}

const GameControls: React.FC<GameControlsProps> = (props) => {
    const {
        gameMode = "local",
        analysisMode = false,
        aiThinking = false,
        moveCount = 0,
        onAnalysisModeToggle = () => {},
        onTriggerAIMove = () => {},
        onModeChange = () => {},
    } = props;

    const { t } = useTranslation();
    const saveGame = useGameStore((state) => state.saveGame);
    const loadGame = useGameStore((state) => state.loadGame);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveGame = () => {
        const gameState = saveGame();
        const jsonString = JSON.stringify(gameState, null, 2);

        // Create a blob and download it
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `goblet-gobblers-save-${
            new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonData = e.target?.result as string;
                const gameState = JSON.parse(jsonData) as SavedGameState;
                loadGame(gameState);
            } catch (error) {
                console.error("Error loading game state:", error);
                alert(t("errorLoadingGame"));
            }
        };
        reader.readAsText(file);

        // Reset the file input
        if (event.target) {
            event.target.value = "";
        }
    };

    const canToggleAnalysisMode = gameMode === "ai";
    const showAnalysisControls = canToggleAnalysisMode && analysisMode;

    return (
        <div className="flex flex-col gap-4">
            {/* Game Mode Selection */}
            <div className="flex justify-center gap-4 mb-2">
                <button
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        gameMode === "local"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                    onClick={() => onModeChange("local")}
                    disabled={gameMode === "local"}
                >
                    {t("localMultiplayer")}
                </button>
                <button
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                        gameMode === "ai"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                    }`}
                    onClick={() => onModeChange("ai")}
                    disabled={gameMode === "ai"}
                >
                    {t("playerVsAI")}
                </button>
            </div>

            {/* Analysis Controls (AI Mode Only) */}
            {canToggleAnalysisMode && (
                <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-center">
                        <label className="flex items-center cursor-pointer">
                            <div className="mr-2 text-sm font-medium">
                                {t("analysisMode")}
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={analysisMode}
                                    onChange={onAnalysisModeToggle}
                                />
                                <div
                                    className={`block w-10 h-6 rounded-full ${
                                        analysisMode
                                            ? "bg-blue-600"
                                            : "bg-gray-300"
                                    }`}
                                >
                                </div>
                                <div
                                    className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${
                                        analysisMode
                                            ? "transform translate-x-4"
                                            : ""
                                    }`}
                                >
                                </div>
                            </div>
                        </label>
                    </div>

                    {moveCount > 0 && (
                        <div className="text-xs text-center text-gray-600">
                            {t("moveCount", { count: moveCount })}
                        </div>
                    )}
                </div>
            )}

            {/* Trigger AI Move Button */}
            {showAnalysisControls && (
                <button
                    className={`px-3 py-2 rounded text-sm font-medium mx-auto w-40 ${
                        aiThinking
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                    onClick={onTriggerAIMove}
                    disabled={aiThinking}
                >
                    {aiThinking ? t("thinking") : t("makeAIMove")}
                </button>
            )}

            {/* Save/Load Controls */}
            <div className="flex justify-center gap-3 mt-2">
                <button
                    onClick={handleSaveGame}
                    className="px-4 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
                >
                    {t("saveGame")}
                </button>

                <button
                    onClick={handleLoadClick}
                    className="px-4 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
                >
                    {t("loadGame")}
                </button>

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".json"
                    className="hidden"
                />
            </div>
        </div>
    );
};

export default GameControls;
