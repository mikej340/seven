export const INVITE_TITLE = "Seven Word Puzzle";
export const INVITE_TEXT = "Fancy a daily word puzzle? Play Seven.";

export type InviteShareResult = "shared" | "copied" | "cancelled" | "failed";

type InviteNavigator = {
  share?: (data: ShareData) => Promise<void>;
  clipboard?: {
    writeText: (text: string) => Promise<void>;
  };
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
