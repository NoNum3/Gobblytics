import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Board from "./components/Board/Board";
import PlayerHand from "./components/PlayerHand/PlayerHand";
import GameStatusDisplay from "./components/GameStatusDisplay/GameStatusDisplay";
import GameControls from "./components/GameControls/GameControls";
import MoveAnalysis from "./components/MoveAnalysis/MoveAnalysis";
import AIMoveExplanation from "./components/AIMoveExplanation/AIMoveExplanation";
import BoardAnalysis from "./components/BoardAnalysis/BoardAnalysis";
import LanguageSwitcher from "./components/LanguageSwitcher/LanguageSwitcher";
import { useGameStore } from "./contexts/gameStore";
import { getAIMove, getMoveExplanation } from "./utils/aiLogic";
import type { GameMode, Player } from "./types/game";
import "./App.css"; // Keep existing global styles if any

// Constants
const AI_PLAYER: Player = "Blue";
const HUMAN_PLAYER: Player = "Red";

function App() {
    const { t } = useTranslation();

    // Game state from store
    const gameMode = useGameStore((state) => state.gameMode);
    const setGameMode = useGameStore((state) => state.setGameMode);
    const initGame = useGameStore((state) => state.initGame);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const gameStatus = useGameStore((state) => state.gameStatus);
    const board = useGameStore((state) => state.board);
    const pieces = useGameStore((state) => state.pieces);
    const movePiece = useGameStore((state) => state.movePiece);
    const selectPiece = useGameStore((state) => state.selectPiece);
    const placePiece = useGameStore((state) => state.placePiece);
    const setMoveExplanation = useGameStore((state) =>
        state.setMoveExplanation
    );
    const moveHistory = useGameStore((state) => state.moveHistory);

    // Local state
    const [aiThinking, setAiThinking] = useState(false);
    const [analysisMode, setAnalysisMode] = useState(false);
    const [moveCount, setMoveCount] = useState(0);
    const [moveExplanation, setMoveExplanationLocal] = useState<string | null>(
        null,
    );

    // Setup game when app loads
    useEffect(() => {
        setupGame();
    }, []);

    // Handle AI moves
    useEffect(() => {
        // Only make AI moves when it's AI's turn in AI mode
        if (
            gameMode === "ai" && currentTurn === AI_PLAYER &&
            gameStatus === "in-progress" && !analysisMode
        ) {
            makeAIMove();
        }
    }, [gameMode, currentTurn, gameStatus, analysisMode]);

    // Handle game mode change
    const handleModeChange = useCallback((mode: GameMode) => {
        console.log("Changing game mode to:", mode); // Debug log

        // Make sure mode is explicitly set in the store
        setGameMode(mode);

        // Then initialize with that mode
        initGame(mode);
        setupGame();
    }, [initGame, setGameMode]);

    // Reset and initialize the game
    const setupGame = useCallback(() => {
        // Make sure this references the current game mode
        const currentMode = useGameStore.getState().gameMode;
        console.log("Setting up game with mode:", currentMode);

        initGame(currentMode);
        setMoveCount(0);
        setAnalysisMode(false);
        setMoveExplanationLocal(null);
    }, [initGame]);

    // Toggle analysis mode (AI doesn't auto-move)
    const toggleAnalysisMode = useCallback(() => {
        setAnalysisMode((prev) => !prev);
    }, []);

    // Manually trigger AI move when in analysis mode
    const triggerAIMove = useCallback(() => {
        if (currentTurn === AI_PLAYER && gameStatus === "in-progress") {
            makeAIMove();
        }
    }, [currentTurn, gameStatus]);

    // Make AI move with thinking animation
    const makeAIMove = useCallback(() => {
        setAiThinking(true);

        // Add a delay for visual feedback that AI is "thinking"
        setTimeout(() => {
            const aiMove = getAIMove(board, pieces[AI_PLAYER], AI_PLAYER);

            // Get explanation for the move
            const explanation = aiMove ? getMoveExplanation(aiMove) : null;
            setMoveExplanationLocal(explanation);

            // Store the explanation in the game state so it can be recorded with the move
            if (explanation) {
                setMoveExplanation(explanation);
            }

            if (aiMove) {
                // Execute the AI's move
                if (aiMove.type === "place") {
                    selectPiece(aiMove.piece.id);
                    placePiece(aiMove.row, aiMove.col);
                } else if (aiMove.type === "move") {
                    selectPiece(aiMove.piece.id);
                    movePiece(
                        aiMove.fromRow,
                        aiMove.fromCol,
                        aiMove.toRow,
                        aiMove.toCol,
                    );
                }

                // Track number of AI moves for analysis
                setMoveCount((prev) => prev + 1);
            }

            setAiThinking(false);
        }, 800); // Delay in milliseconds
    }, [board, pieces, selectPiece, placePiece, movePiece, setMoveExplanation]);

    // Determine the human player based on the AI player
    const handleHumanMoveComplete = useCallback(() => {
        // If it's the human player's turn in AI mode and they just made a move,
        // check if we need to trigger an AI move
        if (
            gameMode === "ai" && currentTurn === AI_PLAYER &&
            gameStatus === "in-progress"
        ) {
            makeAIMove();
        }
    }, [gameMode, currentTurn, gameStatus, makeAIMove]);

    // For debugging - show current game mode
    useEffect(() => {
        console.log("Current game mode:", gameMode);
    }, [gameMode]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {t("appName")}
                    </h1>
                    <LanguageSwitcher />
                </div>

                {/* Game Mode Indicator */}
                <div className="mb-4 text-center">
                    <div
                        className={`inline-flex items-center px-3 py-1 rounded-full 
                        ${
                            gameMode === "ai"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                        }`}
                    >
                        <svg
                            className="w-5 h-5 mr-1"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            {gameMode === "ai"
                                ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                )
                                : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                )}
                        </svg>
                        <span className="font-medium">
                            {gameMode === "ai"
                                ? t("playerVsAI")
                                : t("localMultiplayer")}
                        </span>
                    </div>
                </div>

                {/* Game Controls */}
                <div className="mb-6">
                    <GameControls
                        gameMode={gameMode}
                        analysisMode={analysisMode}
                        aiThinking={aiThinking}
                        moveCount={moveCount}
                        onAnalysisModeToggle={toggleAnalysisMode}
                        onTriggerAIMove={triggerAIMove}
                        onModeChange={handleModeChange}
                    />
                </div>

                {/* Game Status Display */}
                <GameStatusDisplay />

                {/* AI Move Explanation (only in AI mode) */}
                {gameMode === "ai" && (
                    <AIMoveExplanation
                        explanation={moveExplanation
                            ? t(moveExplanation)
                            : null}
                        isThinking={aiThinking}
                    />
                )}

                {/* Board Analysis */}
                <BoardAnalysis
                    moveHistory={moveHistory}
                    aiPlayer={AI_PLAYER}
                />

                {/* AI Analysis (only in AI mode with analysis on) */}
                {gameMode === "ai" && analysisMode && (
                    <MoveAnalysis aiPlayer={AI_PLAYER} />
                )}

                {/* Game Board Area */}
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Red Player Hand */}
                    <PlayerHand player={HUMAN_PLAYER} />

                    {/* Board */}
                    <div className="flex-1">
                        <Board />
                    </div>

                    {/* Blue Player Hand */}
                    <PlayerHand player={AI_PLAYER} />
                </div>

                {/* Game Instructions */}
                <div className="mt-12 p-4 bg-white rounded-lg shadow-sm text-sm text-gray-600">
                    <h2 className="font-bold mb-2">{t("howToPlay")}</h2>
                    <p className="mb-2">{t("gameRules")}</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>{t("rule1")}</li>
                        <li>{t("rule2")}</li>
                        <li>{t("rule3")}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default App;
