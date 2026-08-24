"use client";

import { ValidationError, useForm } from "@formspree/react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NO_PUZZLE,
  normalizeSuggestedWord,
  parseFeedbackPrefill,
  validateFeedback,
  type FeedbackDraft,
  type FeedbackErrors,
  type FeedbackKind,
} from "@/lib/feedback";
import {
  formatPuzzleDate,
  loadPuzzleManifest,
  PUZZLE_BASE_PATH,
  utcDateString,
  type PuzzleManifestEntry,
} from "@/lib/puzzles";
import NavigationMenu from "../navigation-menu";
import styles from "./feedback.module.css";

const FORMSPREE_FORM_ID = "maewgwlz";

type SubmissionFields = {
  feedback_type: string;
  puzzle_date: string;
  puzzle_letters: string;
  centre_letter: string;
  suggested_word: string;
  name: string;
  email: string;
  message: string;
  subject: string;
  _gotcha: string;
};

const emptyDraft: FeedbackDraft = {
  kind: "general",
  puzzleDate: "",
  name: "",
  email: "",
  message: "",
  suggestedWord: "",
};

export default function FeedbackPage() {
  const [entries, setEntries] = useState<PuzzleManifestEntry[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<FeedbackErrors>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formState, submitToFormspree, resetSubmission] = useForm<SubmissionFields>(
    FORMSPREE_FORM_ID,
  );
  const puzzleRef = useRef<HTMLSelectElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const wordRef = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const loadForm = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const manifest = await loadPuzzleManifest();
      const released = manifest.entries.filter((entry) => entry.date <= utcDateString());
      const selectable = released.length > 0 ? released : manifest.entries.slice(0, 1);
      const fallback = selectable.at(-1);
      if (!fallback) throw new Error("No puzzles are available for feedback");
      const prefill = parseFeedbackPrefill(window.location.search, selectable, fallback.date);
      setEntries(selectable);
      setDraft((current) => ({ ...current, ...prefill }));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load the feedback form");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadForm());
  }, [loadForm]);

  useEffect(() => {
    if (formState.succeeded) successRef.current?.focus();
  }, [formState.succeeded]);

  const selectedPuzzle = useMemo(
    () => entries.find((entry) => entry.date === draft.puzzleDate),
    [draft.puzzleDate, entries],
  );
  const backHref = selectedPuzzle
    ? selectedPuzzle.date === utcDateString()
      ? `${PUZZLE_BASE_PATH}/`
      : `${PUZZLE_BASE_PATH}/?date=${selectedPuzzle.date}`
    : `${PUZZLE_BASE_PATH}/`;

  const updateField = <Key extends keyof FeedbackDraft>(key: Key, value: FeedbackDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const changeKind = (kind: FeedbackKind) => {
    const fallbackDate = entries.at(-1)?.date ?? "";
    setDraft((current) => ({
      ...current,
      kind,
      puzzleDate: kind === "word" && current.puzzleDate === NO_PUZZLE
        ? fallbackDate
        : current.puzzleDate,
    }));
    setErrors({});
    resetSubmission();
  };

  const focusFirstError = (nextErrors: FeedbackErrors) => {
    if (nextErrors.puzzleDate) puzzleRef.current?.focus();
    else if (nextErrors.suggestedWord) wordRef.current?.focus();
    else if (nextErrors.email) emailRef.current?.focus();
    else if (nextErrors.message) messageRef.current?.focus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateFeedback(draft, entries);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      queueMicrotask(() => focusFirstError(nextErrors));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const puzzle = entries.find((entry) => entry.date === draft.puzzleDate);
    await submitToFormspree({
      feedback_type: draft.kind === "general" ? "General feedback" : "Word suggestion",
      puzzle_date: puzzle?.date ?? "Not puzzle-specific",
      puzzle_letters: puzzle?.letters.toUpperCase() ?? "",
      centre_letter: puzzle?.centre.toUpperCase() ?? "",
      suggested_word: draft.kind === "word"
        ? normalizeSuggestedWord(draft.suggestedWord)
        : "",
      name: draft.name.trim(),
      email: draft.email.trim(),
      message: draft.message.trim(),
      subject: draft.kind === "general"
        ? "Seven feedback: General"
        : "Seven feedback: Word suggestion",
      _gotcha: String(formData.get("_gotcha") ?? ""),
    });
  };

  const sendAnother = () => {
    resetSubmission();
    setDraft((current) => ({ ...current, message: "", suggestedWord: "" }));
    setErrors({});
  };

  const serverFormErrors = formState.errors?.getFormErrors() ?? [];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <NavigationMenu current="feedback" />
          <p>Seven</p>
          <h1>Feedback</h1>
          <span>Help make the game and its word lists better.</span>
        </header>

        {loading ? (
          <p className={styles.state} aria-live="polite">Loading feedback form…</p>
        ) : loadError ? (
          <section className={styles.state} aria-live="polite">
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadForm()}>Try again</button>
          </section>
        ) : formState.succeeded ? (
          <section className={styles.success} aria-live="polite">
            <span aria-hidden="true">✓</span>
            <h2 ref={successRef} tabIndex={-1}>Thank you</h2>
            <p>Your feedback has been sent. Suggested words are reviewed, but may not be added.</p>
            <div className={styles.successActions}>
              <a href={backHref}>Back to puzzle</a>
              <button type="button" onClick={sendAnother}>Send more feedback</button>
            </div>
          </section>
        ) : (
          <form
            className={styles.form}
            action="https://formspree.io/f/maewgwlz"
            method="post"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <fieldset className={styles.kindPicker}>
              <legend>What would you like to share?</legend>
              <div>
                <label className={draft.kind === "general" ? styles.selectedKind : ""}>
                  <input
                    type="radio"
                    name="feedback_kind"
                    value="general"
                    checked={draft.kind === "general"}
                    onChange={() => changeKind("general")}
                  />
                  <span>General feedback</span>
                </label>
                <label className={draft.kind === "word" ? styles.selectedKind : ""}>
                  <input
                    type="radio"
                    name="feedback_kind"
                    value="word"
                    checked={draft.kind === "word"}
                    onChange={() => changeKind("word")}
                  />
                  <span>Suggest a word</span>
                </label>
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="feedback-puzzle">
                Puzzle {draft.kind === "word" ? <strong>Required</strong> : null}
              </label>
              <select
                id="feedback-puzzle"
                value={draft.puzzleDate}
                aria-invalid={Boolean(errors.puzzleDate)}
                aria-describedby={errors.puzzleDate ? "puzzle-error" : undefined}
                onChange={(event) => updateField("puzzleDate", event.target.value)}
                ref={puzzleRef}
              >
                {draft.kind === "general" ? (
                  <option value={NO_PUZZLE}>Not about a specific puzzle</option>
                ) : null}
                {[...entries].reverse().map((entry) => (
                  <option value={entry.date} key={entry.id}>
                    {formatPuzzleDate(entry.date, false)} — {entry.letters.toUpperCase()} ({entry.centre.toUpperCase()} centre)
                  </option>
                ))}
              </select>
              {errors.puzzleDate ? <span className={styles.error} id="puzzle-error">{errors.puzzleDate}</span> : null}
            </div>

            {draft.kind === "word" ? (
              <div className={styles.field}>
                <label htmlFor="suggested-word">Suggested word <strong>Required</strong></label>
                <input
                  id="suggested-word"
                  name="suggested_word_input"
                  type="text"
                  value={draft.suggestedWord}
                  maxLength={18}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.suggestedWord)}
                  aria-describedby={errors.suggestedWord ? "word-error" : "word-help"}
                  onChange={(event) => updateField("suggestedWord", event.target.value.toUpperCase())}
                  ref={wordRef}
                />
                <span className={styles.help} id="word-help">
                  Use 4–18 puzzle letters and include the centre letter.
                </span>
                {errors.suggestedWord ? <span className={styles.error} id="word-error">{errors.suggestedWord}</span> : null}
                <ValidationError field="suggested_word" errors={formState.errors} className={styles.error} />
              </div>
            ) : null}

            <div className={styles.field}>
              <label htmlFor="feedback-message">
                {draft.kind === "general" ? "Feedback" : "Anything else?"}
                {draft.kind === "general" ? <strong>Required</strong> : <span>Optional</span>}
              </label>
              <textarea
                id="feedback-message"
                name="message_input"
                value={draft.message}
                maxLength={3000}
                rows={draft.kind === "general" ? 6 : 4}
                placeholder={draft.kind === "word"
                  ? "Add a definition, source or spelling note"
                  : "Tell us what is working or what could be better"}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "message-error" : undefined}
                onChange={(event) => updateField("message", event.target.value)}
                ref={messageRef}
              />
              {errors.message ? <span className={styles.error} id="message-error">{errors.message}</span> : null}
              <ValidationError field="message" errors={formState.errors} className={styles.error} />
            </div>

            <div className={styles.contactFields}>
              <div className={styles.field}>
                <label htmlFor="feedback-name">Name <span>Optional</span></label>
                <input
                  id="feedback-name"
                  name="name_input"
                  type="text"
                  value={draft.name}
                  maxLength={100}
                  autoComplete="name"
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="feedback-email">Email <span>Optional</span></label>
                <input
                  id="feedback-email"
                  name="email_input"
                  type="email"
                  value={draft.email}
                  maxLength={254}
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                  onChange={(event) => updateField("email", event.target.value)}
                  ref={emailRef}
                />
                <span className={styles.help} id="email-help">Only add this if you are happy for us to reply.</span>
                {errors.email ? <span className={styles.error} id="email-error">{errors.email}</span> : null}
                <ValidationError field="email" errors={formState.errors} className={styles.error} />
              </div>
            </div>

            <div className={styles.honeypot} aria-hidden="true">
              <label htmlFor="feedback-company">Leave this field empty</label>
              <input id="feedback-company" name="_gotcha" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            {serverFormErrors.length > 0 ? (
              <div className={styles.formError} role="alert">
                {serverFormErrors.map((error) => <p key={`${error.code}-${error.message}`}>{error.message}</p>)}
              </div>
            ) : null}

            <footer className={styles.footer}>
              <p>Name and email are optional. Submissions are processed by Formspree; please do not include sensitive information.</p>
              <div>
                <a href={backHref}>Back to puzzle</a>
                <button type="submit" disabled={formState.submitting}>
                  {formState.submitting ? "Sending…" : "Send feedback"}
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
    </main>
  );
}
