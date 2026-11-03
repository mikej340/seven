import { formatPuzzleDate, PUZZLE_BASE_PATH } from "@/lib/puzzles";

type PuzzleDateProps = {
  date: string;
  isToday?: boolean;
  isPastPuzzle: boolean;
  as?: "p" | "legend";
};

export function PuzzleDate({ date, isToday = false, isPastPuzzle, as: Tag = "p" }: PuzzleDateProps) {
  const className = `${Tag === "legend" ? "scorecard-date" : "puzzle-date"}${isPastPuzzle ? " historic-puzzle-date" : ""}`;
  return (
    <Tag className={className}>
      {Tag === "p" && isToday && !isPastPuzzle ? "Today" : (
        <time dateTime={date}>{formatPuzzleDate(date, false)}</time>
      )}
      {isPastPuzzle ? (
        <>
          <span aria-hidden="true">·</span>
          <a href={`${PUZZLE_BASE_PATH}/`}>Play today’s puzzle →</a>
        </>
      ) : null}
    </Tag>
  );
}
