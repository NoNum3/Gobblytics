# Gobblet Gobblers: Technical Architecture Report

## Application Architecture Overview

Gobblet Gobblers is a React-based implementation of the classic board game,
featuring two game modes: local multiplayer and player vs. AI. The application
employs a modern state management approach with Zustand, component-based UI, and
a rule-based AI algorithm.

### Core Components

1. **State Management**: Zustand store (`src/contexts/gameStore.ts`)
2. **Game Logic**: Core rules and AI implementation (`src/utils/aiLogic.ts`)
3. **UI Components**: React components for board, pieces, controls, analysis
4. **I18n Support**: Multi-language support via i18n

## Data Structures

### 1. Board Representation

The game uses a 3D array structure to represent the board:

```typescript
// src/types/game.ts:16
export type Board = BoardCell[][];

// src/types/game.ts:10-13
// A cell can hold a stack of pieces
export type BoardCell = Piece[] | null;
```

This allows for efficient representation of the game's unique stacking mechanic:

- **Time Complexity**: O(1) for access to any specific position
- **Space Complexity**: O(n) where n is the number of pieces on the board
  (maximum 12)

The board initialization uses a nested array structure:

```typescript
// src/contexts/gameStore.ts:106-108
const initialBoard: Board = Array(3).fill(null).map(() =>
    Array(3).fill(null).map(() => [])
);
```

### 2. Piece Management

Pieces are tracked using a structured object model:

```typescript
// Extract from src/contexts/gameStore.ts:50-53
interface CoreGameStateSnapshot {
    board: Board;
    pieces: { Red: Piece[]; Blue: Piece[] };
    // ...other properties
}
```

Each piece contains metadata about its:

- Player ownership
- Size (Small, Medium, Large)
- Board position (on or off board)
- Unique identifier

### 3. Move History Stack

The application implements an undo/redo system using a snapshot-based approach:

```typescript
// src/contexts/gameStore.ts:46-56
interface CoreGameStateSnapshot {
    board: Board;
    pieces: { Red: Piece[]; Blue: Piece[] };
    currentTurn: Player;
    selectedPieceId: string | null;
    gameMode: GameMode;
    gameStatus: GameStatus;
    winner: Player | null;
    moveHistory: MoveHistoryEntry[];
}
```

This creates two primary data structures:

- **pastStates**: Stack of previous game states (for undo)
- **futureStates**: Stack of states that were undone (for redo)

**Time Complexity Analysis**:

- Undo/Redo: O(1) - Constant time to swap between states
- Memory Usage: O(m) where m is the number of moves in the game

## Algorithms

### 1. Win Detection Algorithm

The game employs a straightforward win detection algorithm that checks for three
pieces of the same player in a row, column, or diagonal:

```typescript
// src/contexts/gameStore.ts:127-179
const calculateWinner = (board: Board): Player | null => {
    const topPiecesBoard: (Piece | null)[][] = board.map((row) =>
        row.map(getTopPiece)
    );

    // Check rows, columns, and diagonals
    // ...implementation details

    return null; // No winner
};
```

**Time Complexity**: O(1) - Constant time as the board is always 3x3 **Space
Complexity**: O(1) - Creates a fixed-size array of top pieces

### 2. AI Decision Making Algorithm

The AI uses a rule-based priority system to make decisions
(`src/utils/aiLogic.ts:508-647`):

```typescript
export const getAIMove = (
    board: Board,
    aiPieces: Piece[],
    aiPlayer: Player,
): AIMove | null => {
    // 1. Core Decision Priority Hierarchy
    // 1.1 Win in one move
    const winningMove = findWinningMove(board, possibleMoves, aiPlayer);
    if (winningMove) {
        winningMove.moveReason = "winMove";
        return winningMove;
    }

    // 1.2 Block opponent's win
    // ...additional prioritized rules
};
```

The priority hierarchy follows:

1. Win in one move if possible
2. Block opponent from winning
3. Create a fork (multiple winning threats)
4. Block opponent's fork
5. Follow strategic position preference (center > corners > edges)
6. Use smallest viable piece when multiple options exist

**Time Complexity Analysis**:

- Move Generation: O(n²) where n is board size (always 3×3)
- Move Evaluation: O(m) where m is number of possible moves (max ~24 moves)
- Overall: O(n² + m) which simplifies to O(1) for a 3×3 board

### 3. Position Evaluation Algorithm

The AI uses a weighted scoring system to evaluate board positions:

```typescript
// src/utils/aiLogic.ts:264-319
export const evaluatePosition = (board: Board, aiPlayer: Player): number => {
    // ...scoring logic
    // 1. Check if there's a winner (highest priority)
    // 2. Control of center (important strategic position)
    // 3. Count threats (two in a row with third position empty)
    // 4. Control of corners
    // 5. Piece mobility and position
    // 6. Potential for future gobbling
};
```

The position evaluation assigns points for:

- Win/loss: ±1000 points
- Center control: 15 points + size bonus
- Threats (two in a row): 25 points per threat
- Corner control: 4-8 points depending on piece size
- Position control: 4 points per controlled position
- Piece availability: 3 points per large piece

**Time Complexity**: O(1) for the 3×3 board

### 4. Move Simulation Algorithm

The AI simulates moves to evaluate their outcomes:

```typescript
// src/utils/aiLogic.ts (simplified)
const simulateMove = (board: Board, move: AIMove): Board => {
    // Create a deep copy of the board
    // Apply the move
    // Return the new board state
};
```

**Time Complexity**: O(n²) where n is board size (3×3) **Space Complexity**:
O(n²) for the board copy

## State Management

The application uses Zustand for state management with a centralized store:

```typescript
// src/contexts/gameStore.ts:192-671
export const useGameStore = create<GameState>()(
    devtools(
        (set, get) => ({
            // State properties
            // Action implementations
        }),
        { name: "GobbletGameStore" },
    ),
);
```

Key advantages of this approach:

1. **Immutable Updates**: Each state change creates a new state object
2. **Time-Travel Debugging**: The devtools middleware enables debugging
3. **Efficient Rendering**: Components only re-render when their specific
   subscriptions change

## Advanced Features

### 1. Undo/Redo System

The game implements an efficient undo/redo system using the Zustand store:

```typescript
// src/contexts/gameStore.ts:581-650
undo: () => {
    const { pastStates, futureStates, analysisMode } = get();
    if (pastStates.length === 0) return; // Nothing to undo

    const currentStateSnapshot = createSnapshot(get());
    const previousState = pastStates[pastStates.length - 1];
    const newPastStates = pastStates.slice(0, -1);

    set(
        {
            ...previousState, // Restore core state from snapshot
            pastStates: newPastStates,
            futureStates: [currentStateSnapshot, ...futureStates],
            lastMoveExplanation: null, // Clear explanation on undo/redo
            analysisMode: analysisMode, // <-- Keep current analysisMode
        },
        false,
        "undo",
    );
},
```

**Time Complexity**: O(1) for undo/redo operations **Space Complexity**: O(m)
where m is the number of moves

### 2. AI Analysis Mode

The game includes an analysis mode that allows players to:

1. Manually move pieces to analyze positions
2. View AI's predicted next moves
3. Understand the AI's decision-making process

```typescript
// src/App.tsx:77-88
useEffect(() => {
    // Only make AI moves when it's AI's turn in AI mode and NOT in analysis mode
    if (
        gameMode === "ai" && currentTurn === AI_PLAYER &&
        gameStatus === "in-progress" && !analysisMode
    ) {
        makeAIMove();
    }
}, [gameMode, currentTurn, gameStatus, analysisMode, makeAIMove]);
```

## Performance Considerations

1. **Memoization**: The application uses React's `useCallback` to memoize
   functions and prevent unnecessary re-renders.

2. **Efficient State Updates**: Only relevant parts of the state are updated in
   each action.

3. **Selective Component Rendering**: Components only re-render when their
   specific pieces of state change.

4. **Fixed-size Data Structures**: The board is a fixed 3×3 grid, enabling
   constant-time algorithms for many operations.

## Time Complexity Summary

| Operation           | Time Complexity | Notes                       |
| ------------------- | --------------- | --------------------------- |
| Game Initialization | O(1)            | Fixed board size            |
| Move Validation     | O(1)            | Constant time for 3×3 board |
| AI Move Selection   | O(1)            | Fixed search space          |
| Win Detection       | O(1)            | Fixed board dimensions      |
| Undo/Redo           | O(1)            | Stack-based operations      |
| Save/Load Game      | O(n)            | Linear in number of pieces  |

## Conclusion

The Gobblet Gobblers implementation demonstrates an effective use of:

1. **Appropriate Data Structures**: 3D arrays for the stacked board, objects for
   game state
2. **Efficient Algorithms**: Rule-based AI with prioritized decision making
3. **Modern State Management**: Zustand for predictable state updates
4. **Optimization Techniques**: Memoization, selective rendering

The game's architecture provides a balance between code readability,
performance, and maintainability.
