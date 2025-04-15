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
    const undo = useGameStore((state) => state.undo);
    const redo = useGameStore((state) => state.redo);
    const canUndo = useGameStore((state) => state.canUndo);
    const canRedo = useGameStore((state) => state.canRedo);
    const toggleAnalysisMode = useGameStore((state) =>
        state.toggleAnalysisMode
    );
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

    const canToggleAnalysis = gameMode === "ai";
    const showAnalysisUITools = canToggleAnalysis && analysisMode;

    return (
        <div className="flex flex-col gap-4">
            {/* Game Mode Selection - Improved UI */}
            <div className="p-4 bg-white rounded-lg shadow-md">
                <h2 className="text-lg font-bold text-center mb-3 text-gray-800">
                    {t("selectGameMode")}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        className={`relative p-4 rounded-lg transition-all duration-200 border-2 ${
                            gameMode === "local"
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-200 hover:border-blue-300 bg-white"
                        }`}
                        onClick={() => onModeChange("local")}
                    >
                        <div className="flex flex-col items-center">
                            {/* Icon for multiplayer */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-8 w-8 mb-2 ${
                                    gameMode === "local"
                                        ? "text-blue-600"
                                        : "text-gray-600"
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                            <span
                                className={`font-medium text-center ${
                                    gameMode === "local"
                                        ? "text-blue-700"
                                        : "text-gray-700"
                                }`}
                            >
                                {t("localMultiplayer")}
                            </span>
                        </div>
                        {gameMode === "local" && (
                            <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        )}
                    </button>

                    <button
                        className={`relative p-4 rounded-lg transition-all duration-200 border-2 ${
                            gameMode === "ai"
                                ? "border-blue-600 bg-blue-50"
                                : "border-gray-200 hover:border-blue-300 bg-white"
                        }`}
                        onClick={() => onModeChange("ai")}
                    >
                        <div className="flex flex-col items-center">
                            {/* Icon for AI */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-8 w-8 mb-2 ${
                                    gameMode === "ai"
                                        ? "text-blue-600"
                                        : "text-gray-600"
                                }`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            <span
                                className={`font-medium text-center ${
                                    gameMode === "ai"
                                        ? "text-blue-700"
                                        : "text-gray-700"
                                }`}
                            >
                                {t("playerVsAI")}
                            </span>
                        </div>
                        {gameMode === "ai" && (
                            <div className="absolute -top-2 -right-2 bg-blue-600 text-white rounded-full p-1">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            {/* Analysis Controls (AI Mode Only) */}
            {canToggleAnalysis && (
                <div className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                        <label className="flex items-center cursor-pointer">
                            <div className="mr-3 text-sm font-medium text-gray-700">
                                {t("analysisMode")}
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={analysisMode}
                                    onChange={toggleAnalysisMode}
                                />
                                <div
                                    className={`block w-10 h-6 rounded-full transition ${
                                        analysisMode
                                            ? "bg-blue-600"
                                            : "bg-gray-300"
                                    }`}
                                >
                                </div>
                                <div
                                    className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${
                                        analysisMode ? "translate-x-4" : ""
                                    }`}
                                >
                                </div>
                            </div>
                        </label>

                        {moveCount > 0 && (
                            <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                {t("moveCount", { count: moveCount })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Trigger AI Move Button */}
            {showAnalysisUITools && (
                <button
                    className={`px-4 py-3 rounded-lg text-white font-medium mx-auto shadow-sm transition-colors ${
                        aiThinking
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                    }`}
                    onClick={onTriggerAIMove}
                    disabled={aiThinking}
                >
                    <div className="flex items-center justify-center">
                        {aiThinking
                            ? (
                                <>
                                    <svg
                                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        >
                                        </circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        >
                                        </path>
                                    </svg>
                                    {t("thinking")}
                                </>
                            )
                            : (
                                <>
                                    <svg
                                        className="mr-2 h-4 w-4"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    {t("makeAIMove")}
                                </>
                            )}
                    </div>
                </button>
            )}

            {/* Save/Load/Undo/Redo Controls */}
            <div className="flex justify-center gap-3 mt-2">
                {/* Undo Button */}
                <button
                    onClick={undo}
                    disabled={!canUndo()}
                    className={`px-4 py-2 rounded-lg text-white shadow-sm transition-colors ${
                        canUndo()
                            ? "bg-yellow-600 hover:bg-yellow-700"
                            : "bg-gray-400 cursor-not-allowed"
                    }`}
                >
                    <div className="flex items-center">
                        <svg
                            className="mr-1 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        {t("undo")}
                    </div>
                </button>

                {/* Redo Button */}
                <button
                    onClick={redo}
                    disabled={!canRedo()}
                    className={`px-4 py-2 rounded-lg text-white shadow-sm transition-colors ${
                        canRedo()
                            ? "bg-yellow-600 hover:bg-yellow-700"
                            : "bg-gray-400 cursor-not-allowed"
                    }`}
                >
                    <div className="flex items-center">
                        {t("redo")}
                        <svg
                            className="ml-1 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                            />
                        </svg>
                    </div>
                </button>

                {/* Save Button */}
                <button
                    onClick={handleSaveGame}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow-sm"
                >
                    <div className="flex items-center">
                        <svg
                            className="mr-1 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                            />
                        </svg>
                        {t("saveGame")}
                    </div>
                </button>

                {/* Load Button */}
                <button
                    onClick={handleLoadClick}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <div className="flex items-center">
                        <svg
                            className="mr-1 h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                        </svg>
                        {t("loadGame")}
                    </div>
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
