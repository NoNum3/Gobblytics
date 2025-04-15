# Gobblet Gobblers: Technical Overview

## 3-Minute Presentation

---

## Slide 1: Application Overview

- **What**: Gobblet Gobblers - A tic-tac-toe variant with stackable pieces
- **Tech Stack**: React, TypeScript, Zustand for state management
- **Features**: Local multiplayer, AI opponent, multi-language support

_Source: Implementation in React components under src/components/_

---

## Slide 2: Key Data Structures

- **3D Board Array**: `Board = BoardCell[][]` where `BoardCell = Piece[] | null`
  - Efficiently represents stacking pieces
  - O(1) time access to any position

```typescript
// src/types/game.ts
// A cell can hold a stack of pieces
export type BoardCell = Piece[] | null;
// The board is a 3x3 grid of cells
export type Board = BoardCell[][];

// Board initialization (src/contexts/gameStore.ts)
const initialBoard: Board = Array(3).fill(null).map(() =>
    Array(3).fill(null).map(() => [])
);
```

- **Piece Structure**:
  ```typescript
  // Piece definition (simplified)
  interface Piece {
      id: string;
      player: "Red" | "Blue";
      size: "S" | "M" | "L";
      isOffBoard: boolean;
  }
  ```

_Source: src/types/game.ts:10-16, src/contexts/gameStore.ts:106-108_

---

## Slide 3: Understanding Time Complexity (Big O)

- **O(1) - Constant Time**: Operation time is independent of input size
  - _Example_: Checking if a board cell is empty takes the same time regardless
    of board state
  ```typescript
  // Direct array access is O(1)
  const cell = board[row][col];
  const isEmpty = cell.length === 0;
  ```

- **O(n) - Linear Time**: Time increases linearly with input size
  - _Example_: Searching through pieces to find one with a specific ID
  ```typescript
  // Array find operation is O(n)
  const piece = pieces.find((p) => p.id === pieceId);
  ```

- **O(n²) - Quadratic Time**: Time increases with the square of input size
  - _Example_: Checking every position for every piece (3x3 board makes this
    O(1) in practice)
  ```typescript
  // Nested loops checking board positions
  for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
          // Check if valid move for each piece
      }
  }
  ```

---

## Slide 4: Core Algorithms

- **Win Detection**: O(1) - Checks 8 possible winning configurations
  - Rows, columns, and diagonals using visible pieces
  ```typescript
  // Win detection algorithm (simplified)
  const calculateWinner = (board: Board): Player | null => {
      const topPiecesBoard = board.map((row) =>
          row.map((cell) => cell.length > 0 ? cell[cell.length - 1] : null)
      );

      // Check rows, columns, and diagonals
      for (let i = 0; i < 3; i++) {
          // Check row i
          if (checkLine(topPiecesBoard[i])) return topPiecesBoard[i][0].player;
          // Check column i
          const column = [
              topPiecesBoard[0][i],
              topPiecesBoard[1][i],
              topPiecesBoard[2][i],
          ];
          if (checkLine(column)) return column[0].player;
      }

      // Check diagonals
      const diag1 = [
          topPiecesBoard[0][0],
          topPiecesBoard[1][1],
          topPiecesBoard[2][2],
      ];
      const diag2 = [
          topPiecesBoard[0][2],
          topPiecesBoard[1][1],
          topPiecesBoard[2][0],
      ];
      if (checkLine(diag1)) return diag1[0].player;
      if (checkLine(diag2)) return diag2[0].player;

      return null; // No winner
  };
  ```

- **AI Decision Making**: Rule-based priority system
  1. Win in one move
  2. Block opponent's win
  3. Create or block forks
  4. Control strategic positions (center > corners > edges)

  ```typescript
  // AI decision logic (simplified)
  export const getAIMove = (board, aiPieces, aiPlayer) => {
      const possibleMoves = getAllPossibleMoves(board, aiPieces, aiPlayer);

      // 1. Win in one move
      const winningMove = findWinningMove(board, possibleMoves, aiPlayer);
      if (winningMove) return winningMove;

      // 2. Block opponent's win
      const blockingMove = findBlockingMove(board, possibleMoves, aiPlayer);
      if (blockingMove) return blockingMove;

      // 3. Create a fork (multiple winning threats)
      const forkMove = findForkCreationMove(board, possibleMoves, aiPlayer);
      if (forkMove) return forkMove;

      // 4. Block opponent's fork
      // 5. Center control
      // 6. Corner control
      // More strategies...
  };
  ```

  _Source_: `getAIMove()` (src/utils/aiLogic.ts:508-647)

---

## Slide 5: Position Evaluation

- **Weighted Scoring System**:
  - Win/loss: ±1000 points
  - Center control: 15 points + size bonus
  - Threats (two in a row): 25 points per threat
  - Corner control: 4-8 points based on piece size

- **Time Complexity**: O(1) for fixed 3×3 board

```typescript
// Position evaluation algorithm (simplified)
export const evaluatePosition = (board, aiPlayer) => {
    const opponent = aiPlayer === "Red" ? "Blue" : "Red";
    let score = 0;

    // 1. Win/loss check (±1000 points)
    const winner = calculateWinner(board);
    if (winner === aiPlayer) return 1000;
    if (winner === opponent) return -1000;

    // 2. Center control (15 points + size bonus)
    const centerPiece = getTopPiece(board[1][1]);
    if (centerPiece) {
        score += centerPiece.player === aiPlayer ? 15 : -15;
        // Size bonus: L=8, M=5, S=2
        const sizeBonus = { L: 8, M: 5, S: 2 };
        score += centerPiece.player === aiPlayer
            ? sizeBonus[centerPiece.size]
            : -sizeBonus[centerPiece.size];
    }

    // 3. Count threats (two in a row with empty third cell)
    // 4. Corner control (4-8 points based on piece size)
    // 5. Position control (4 points per position)

    return score;
};
```

_Source_: `evaluatePosition()` (src/utils/aiLogic.ts:264-319)

---

## Slide 6: Advanced Features

- **Undo/Redo System**: Stack-based approach
  - Maintains game state history for time travel
  - O(1) operations through state snapshots
  ```typescript
  // Undo implementation (simplified)
  undo: (() => {
      const { pastStates, futureStates, analysisMode } = get();
      if (pastStates.length === 0) return; // Nothing to undo

      const currentStateSnapshot = createSnapshot(get());
      const previousState = pastStates[pastStates.length - 1];
      const newPastStates = pastStates.slice(0, -1);

      set({
          ...previousState, // Restore previous state
          pastStates: newPastStates,
          futureStates: [currentStateSnapshot, ...futureStates],
          lastMoveExplanation: null,
          analysisMode: analysisMode, // Keep current analysisMode
      });
  });
  ```

- **Analysis Mode**:
  - Manual position exploration
  - AI move predictions with explanations
  ```typescript
  // AI analysis effect (simplified)
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

---

## Slide 7: Performance Highlights

| Operation           | Time Complexity | Reasoning            |
| ------------------- | --------------- | -------------------- |
| Game Initialization | O(1)            | Fixed board size     |
| Move Validation     | O(1)            | Constant time checks |
| AI Decision         | O(1)            | Fixed search space   |
| Undo/Redo           | O(1)            | Stack operations     |

**Key Optimizations**:

- Memoized callbacks (`useCallback` hooks in src/App.tsx)
- Selective component rendering (Zustand selectors)
- Efficient state updates (src/contexts/gameStore.ts:190-671)
