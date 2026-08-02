/** Board colors matching the Chernev cover cream / violet language. */
export const BOARD_THEME = {
  lightSquareStyle: { backgroundColor: "var(--board-light)" },
  darkSquareStyle: {
    background: `repeating-linear-gradient(
      45deg,
      #b5a3cc 0,
      #b5a3cc 1.5px,
      var(--board-dark) 1.5px,
      var(--board-dark) 5px
    )`,
  },
  boardStyle: {
    borderRadius: 0,
    boxShadow: "none",
  },
} as const;
