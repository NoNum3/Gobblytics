# 快到碗裡來 (Gobblet Gobblers): 技術架構概述

## 3分鐘簡報

---

## 投影片 1: 應用概述

- **遊戲介紹**: 快到碗裡來 (Gobblet Gobblers) - 一種具有可堆疊棋子的井字棋變體
- **技術架構**: React、TypeScript、Zustand (狀態管理)
- **功能特點**: 本地多人模式、AI 對手、多語言支持

_來源: 實現於 src/components/ 目錄下的 React 元件_

---

## 投影片 2: 核心數據結構

- **3D 棋盤陣列** (Board Array): `Board = BoardCell[][]` 其中
  `BoardCell = Piece[] | null`
  - 高效表示棋子堆疊機制
  - O(1) 時間複雜度訪問任意位置

```typescript
// src/types/game.ts
// 一個格子可以容納多個堆疊的棋子
export type BoardCell = Piece[] | null;
// 棋盤是一個 3x3 的格子陣列
export type Board = BoardCell[][];

// 棋盤初始化 (src/contexts/gameStore.ts)
const initialBoard: Board = Array(3).fill(null).map(() =>
    Array(3).fill(null).map(() => [])
);
```

- **棋子結構** (Piece Structure):
  ```typescript
  // 棋子定義 (簡化版)
  interface Piece {
      id: string;
      player: "Red" | "Blue"; // 玩家: 紅色或藍色
      size: "S" | "M" | "L"; // 尺寸: 小、中、大
      isOffBoard: boolean; // 是否在棋盤外
  }
  ```

_來源: src/types/game.ts:10-16, src/contexts/gameStore.ts:106-108_

---

## 投影片 3: 理解時間複雜度 (Big O)

- **O(1) - 常數時間** (Constant Time): 操作時間與輸入大小無關
  - _範例_: 檢查棋盤格子是否為空所需時間與棋盤狀態無關
  ```typescript
  // 直接陣列訪問是 O(1) 操作
  const cell = board[row][col];
  const isEmpty = cell.length === 0;
  ```

- **O(n) - 線性時間** (Linear Time): 時間隨輸入大小線性增加
  - _範例_: 搜尋特定 ID 的棋子
  ```typescript
  // 陣列查找操作是 O(n)
  const piece = pieces.find((p) => p.id === pieceId);
  ```

- **O(n²) - 平方時間** (Quadratic Time): 時間隨輸入大小的平方增加
  - _範例_: 檢查每個位置的每個棋子 (3x3 棋盤實際上是 O(1))
  ```typescript
  // 嵌套循環檢查棋盤位置
  for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
          // 檢查每個棋子的有效移動
      }
  }
  ```

---

## 投影片 4: 核心演算法

- **勝利檢測** (Win Detection): O(1) - 檢查 8 種可能的獲勝配置
  ```typescript
  // 勝利檢測演算法 (簡化版)
  const calculateWinner = (board: Board): Player | null => {
      const topPiecesBoard = board.map((row) =>
          row.map((cell) => cell.length > 0 ? cell[cell.length - 1] : null)
      );

      // 檢查行、列和對角線
      for (let i = 0; i < 3; i++) {
          // 檢查第 i 行
          if (checkLine(topPiecesBoard[i])) return topPiecesBoard[i][0].player;
          // 檢查第 i 列
          const column = [
              topPiecesBoard[0][i],
              topPiecesBoard[1][i],
              topPiecesBoard[2][i],
          ];
          if (checkLine(column)) return column[0].player;
      }

      // 檢查對角線
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

      return null; // 沒有贏家
  };
  ```

- **AI 決策系統** (AI Decision Making): 基於規則的優先級系統
  ```typescript
  // AI 決策邏輯 (簡化版)
  export const getAIMove = (board, aiPieces, aiPlayer) => {
      const possibleMoves = getAllPossibleMoves(board, aiPieces, aiPlayer);

      // 1. 一步獲勝
      const winningMove = findWinningMove(board, possibleMoves, aiPlayer);
      if (winningMove) return winningMove;

      // 2. 阻止對手獲勝
      const blockingMove = findBlockingMove(board, possibleMoves, aiPlayer);
      if (blockingMove) return blockingMove;

      // 3. 創建分叉威脅 (多個獲勝威脅)
      const forkMove = findForkCreationMove(board, possibleMoves, aiPlayer);
      if (forkMove) return forkMove;

      // 4. 阻止對手分叉
      // 5. 控制中心
      // 6. 控制角落
      // 更多策略...
  };
  ```

  _來源_: `getAIMove()` (src/utils/aiLogic.ts:508-647)

---

## 投影片 5: 位置評估

- **加權評分系統** (Weighted Scoring System):
  ```typescript
  // 位置評估演算法 (簡化版)
  export const evaluatePosition = (board, aiPlayer) => {
      const opponent = aiPlayer === "Red" ? "Blue" : "Red";
      let score = 0;

      // 1. 勝/負檢查 (±1000 分)
      const winner = calculateWinner(board);
      if (winner === aiPlayer) return 1000;
      if (winner === opponent) return -1000;

      // 2. 中心控制 (15 分 + 尺寸獎勵)
      const centerPiece = getTopPiece(board[1][1]);
      if (centerPiece) {
          score += centerPiece.player === aiPlayer ? 15 : -15;
          // 尺寸獎勵: L=8, M=5, S=2
          const sizeBonus = { L: 8, M: 5, S: 2 };
          score += centerPiece.player === aiPlayer
              ? sizeBonus[centerPiece.size]
              : -sizeBonus[centerPiece.size];
      }

      // 3. 計算威脅 (兩個連續棋子，第三個位置為空)
      // 4. 角落控制 (4-8 分，基於棋子尺寸)
      // 5. 位置控制 (每個位置 4 分)

      return score;
  };
  ```

- **時間複雜度** (Time Complexity): 3×3 固定棋盤為 O(1)

_來源_: `evaluatePosition()` (src/utils/aiLogic.ts:264-319)

---

## 投影片 6: 進階功能

- **撤銷/重做系統** (Undo/Redo System): 基於堆疊的方法
  ```typescript
  // 撤銷實現 (簡化版)
  undo: (() => {
      const { pastStates, futureStates, analysisMode } = get();
      if (pastStates.length === 0) return; // 沒有可撤銷的操作

      const currentStateSnapshot = createSnapshot(get());
      const previousState = pastStates[pastStates.length - 1];
      const newPastStates = pastStates.slice(0, -1);

      set({
          ...previousState, // 恢復先前狀態
          pastStates: newPastStates,
          futureStates: [currentStateSnapshot, ...futureStates],
          lastMoveExplanation: null,
          analysisMode: analysisMode, // 保持當前分析模式
      });
  });
  ```

- **分析模式** (Analysis Mode):
  ```typescript
  // AI 分析效果 (簡化版)
  useEffect(() => {
      // 僅在 AI 回合、AI 模式下且不在分析模式時執行 AI 移動
      if (
          gameMode === "ai" && currentTurn === AI_PLAYER &&
          gameStatus === "in-progress" && !analysisMode
      ) {
          makeAIMove();
      }
  }, [gameMode, currentTurn, gameStatus, analysisMode, makeAIMove]);
  ```

---

## 投影片 7: 性能亮點

| 操作                             | 時間複雜度 | 原因         |
| -------------------------------- | ---------- | ------------ |
| 遊戲初始化 (Game Initialization) | O(1)       | 固定棋盤大小 |
| 移動驗證 (Move Validation)       | O(1)       | 常數時間檢查 |
| AI 決策 (AI Decision)            | O(1)       | 固定搜索空間 |
| 撤銷/重做 (Undo/Redo)            | O(1)       | 堆疊操作     |

**關鍵優化** (Key Optimizations):

```typescript
// 1. 記憶化回調函數以提高性能
const makeAIMove = useCallback(() => {
    // 實現
}, [dependencies]);

// 2. 使用 Zustand 進行選擇性元件渲染
const board = useGameStore((state) => state.board);

// 3. 高效狀態更新
set(
    (prevState) => ({
        ...prevState,
        board: newBoard,
        selectedPieceId: null,
        // 僅更新必要的狀態部分
    }),
    false,
    "movePiece",
);
```
