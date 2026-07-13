/** Board colors matching the B&W hatched diagrams in Chernev's edition. */
export const BOARD_THEME = {
  lightSquareStyle: { backgroundColor: "var(--board-light)" },
  darkSquareStyle: {
    background: `repeating-linear-gradient(
      45deg,
      #8f877c 0,
      #8f877c 1.5px,
      var(--board-dark) 1.5px,
      var(--board-dark) 5px
    )`,
  },
  boardStyle: {
    borderRadius: 0,
    boxShadow: "none",
  },
} as const;
