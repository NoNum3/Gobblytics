import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Board from "./components/Board/Board";
import PlayerHand from "./components/PlayerHand/PlayerHand";
import GameStatusDisplay from "./components/GameStatusDisplay/GameStatusDisplay";
import GameControls from "./components/GameControls/GameControls";
import MoveAnalysis from "./components/MoveAnalysis/MoveAnalysis";
import LanguageSwitcher from "./components/LanguageSwitcher/LanguageSwitcher";
import { useGameStore } from "./contexts/gameStore";
import { getAIMove } from "./utils/aiLogic";
import type { GameMode, Player } from "./types/game";
import "./App.css"; // Keep existing global styles if any

// Constants
const AI_PLAYER: Player = "Blue";

function App() {
    const { t } = useTranslation();

    // Game state from store
    const gameMode = useGameStore((state) => state.gameMode);
    const initGame = useGameStore((state) => state.initGame);
    const currentTurn = useGameStore((state) => state.currentTurn);
    const gameStatus = useGameStore((state) => state.gameStatus);
    const board = useGameStore((state) => state.board);
    const pieces = useGameStore((state) => state.pieces);
    const movePiece = useGameStore((state) => state.movePiece);
    const selectPiece = useGameStore((state) => state.selectPiece);
    const placePiece = useGameStore((state) => state.placePiece);

    // Local state
    const [aiThinking, setAiThinking] = useState(false);
    const [analysisMode, setAnalysisMode] = useState(false);
    const [moveCount, setMoveCount] = useState(0);

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
        initGame(mode);
        setupGame();
    }, [initGame]);

    // Reset and initialize the game
    const setupGame = useCallback(() => {
        initGame(gameMode);
        setMoveCount(0);
        setAnalysisMode(false);
    }, [initGame, gameMode]);

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
    }, [board, pieces, selectPiece, placePiece, movePiece]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {t("appName")}
                    </h1>
                    <LanguageSwitcher />
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

                {/* AI Analysis (only in AI mode with analysis on) */}
                {gameMode === "ai" && analysisMode && (
                    <MoveAnalysis aiPlayer={AI_PLAYER} />
                )}

                {/* Game Board Area */}
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                    {/* Red Player Hand */}
                    <PlayerHand player="Red" />

                    {/* Board */}
                    <div className="flex-1">
                        <Board />
                    </div>

                    {/* Blue Player Hand */}
                    <PlayerHand player="Blue" />
                </div>

                {/* Game Instructions */}
                <div className="mt-8 text-sm text-gray-600">
                    <h3 className="font-medium mb-2">{t("howToPlay")}:</h3>
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
