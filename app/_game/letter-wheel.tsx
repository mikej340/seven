import type { CSSProperties } from "react";

const outerSlots = [
  { position: "top", tone: "sage", rotation: "4deg" },
  { position: "upper-left", tone: "olive", rotation: "-42deg" },
  { position: "upper-right", tone: "lime", rotation: "44deg" },
  { position: "lower-left", tone: "soft", rotation: "-126deg" },
  { position: "lower-right", tone: "forest", rotation: "128deg" },
  { position: "bottom", tone: "fresh", rotation: "176deg" },
] as const;

type LetterWheelProps = {
  outerLetters: readonly string[];
  centreLetter: string;
  onAddLetter: (letter: string) => void;
};

export function LetterWheel({ outerLetters, centreLetter, onAddLetter }: LetterWheelProps) {
  return (
    <div className="letter-wheel-stage">
      <div className="letter-wheel" aria-label="Letter wheel">
        <div className="letter-wheel-halo" aria-hidden="true" />

        {outerSlots.map(({ position, tone, rotation }, index) => {
          const letter = outerLetters[index];
          return (
            <button
              className={`letter-button ${position}`}
              style={{ "--leaf-rotation": rotation } as CSSProperties}
              type="button"
              aria-label={`Add ${letter}`}
              onClick={() => onAddLetter(letter ?? "")}
              key={position}
            >
              <span className={`leaf-surface ${tone}`} aria-hidden="true">
                <span className="leaf-vein" />
              </span>
              <span className="letter" aria-hidden="true">{letter}</span>
            </button>
          );
        })}

        <button
          className="letter-button centre required"
          style={{ "--leaf-rotation": "0deg" } as CSSProperties}
          type="button"
          aria-label={`Add ${centreLetter}, required letter`}
          onClick={() => onAddLetter(centreLetter)}
        >
          <span className="leaf-surface seed" aria-hidden="true" />
          <span className="letter" aria-hidden="true">{centreLetter}</span>
        </button>
      </div>
    </div>
  );
}
