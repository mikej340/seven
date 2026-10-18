export const INVITE_TITLE = "Seven Word Puzzle";
export const INVITE_TEXT = "Fancy a daily word puzzle? Play Seven.";
export const INVITE_URL = "https://playseven.uk/";

export type InviteShareResult = "shared" | "copied" | "cancelled" | "failed";

type InviteNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
};

type ClipboardWriter = {
  writeText: (text: string) => Promise<void>;
};

type CopyDocument = {
  execCommand: (command: string) => boolean;
};

export const copySelectedInvite = async (
  url: string,
  clipboard: ClipboardWriter | undefined =
    typeof navigator === "undefined" ? undefined : navigator.clipboard,
  copyDocument: CopyDocument | undefined =
    typeof document === "undefined" ? undefined : document,
): Promise<boolean> => {
  try {
    if (copyDocument?.execCommand("copy") === true) return true;
  } catch {
    // The modern clipboard API can still work when legacy copying is unavailable.
  }

  if (clipboard === undefined) return false;

  try {
    await clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
};

export const deliverFriendInvite = async (
  url: string,
  target: InviteNavigator | undefined =
    typeof navigator === "undefined" ? undefined : navigator,
): Promise<InviteShareResult> => {
  if (target === undefined) return "failed";

  if (target.share !== undefined) {
    try {
      await target.share({
        title: INVITE_TITLE,
        text: INVITE_TEXT,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (target.clipboard?.writeText === undefined) return "failed";

  try {
    await target.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
};
