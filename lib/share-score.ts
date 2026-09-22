export type ScoreCardData = {
  date: string;
  rank: string;
  score: number;
  progress: number;
  nextRankText: string;
  foundWords: number;
};

export type ShareScoreResult = "shared" | "copied" | "cancelled" | "failed";

type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: {
    write: (items: ClipboardItem[]) => Promise<void>;
  };
};

type ClipboardItemConstructor = new (items: Record<string, Blob>) => ClipboardItem;

const CARD_WIDTH = 1170;
const CARD_HEIGHT = 380;

export const scoreCardFileName = (puzzleDate: string) => {
  const date = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${puzzleDate}T12:00:00.000Z`));
  return `Seven Scorecard · ${date}.png`;
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const drawAmbientLeaf = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
) => {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.beginPath();
  context.moveTo(-width / 2, 0);
  context.bezierCurveTo(-width / 5, -height, width / 3, -height, width / 2, 0);
  context.bezierCurveTo(width / 3, height, -width / 5, height, -width / 2, 0);
  context.closePath();
  context.fill();
  context.restore();
};

const dataUrlToBlob = (dataUrl: string) => {
  const [header, encoded] = dataUrl.split(",");
  if (header === undefined || encoded === undefined) {
    throw new Error("Could not encode score card");
  }

  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "image/png";
  const bytes = atob(encoded);
  const output = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) {
    output[index] = bytes.charCodeAt(index);
  }
  return new Blob([output], { type: mimeType });
};

export const createScoreCardPng = (data: ScoreCardData) => {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("Canvas is unavailable");

  const sans = '"Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif';
  const background = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  background.addColorStop(0, "#faf6ed");
  background.addColorStop(1, "#f2ebdd");
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const glow = context.createRadialGradient(585, 155, 20, 585, 155, 500);
  glow.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  glow.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.fillStyle = "rgba(100, 112, 76, 0.12)";
  drawAmbientLeaf(context, 26, 80, 245, 86, -0.28);
  drawAmbientLeaf(context, 12, 248, 220, 72, 0.53);
  context.fillStyle = "rgba(117, 128, 83, 0.10)";
  drawAmbientLeaf(context, 1152, 322, 180, 66, -0.38);

  // Like the in-app fieldset, the date sits in a gap in the top border.
  const cardX = 20;
  const cardY = 34;
  const cardRight = CARD_WIDTH - cardX;
  const cardBottom = CARD_HEIGHT - 20;
  const cornerRadius = 36;
  context.font = `650 34px ${sans}`;
  const dateGap = context.measureText(data.date).width / 2 + 27;
  context.beginPath();
  context.moveTo(CARD_WIDTH / 2 + dateGap, cardY);
  context.lineTo(cardRight - cornerRadius, cardY);
  context.quadraticCurveTo(cardRight, cardY, cardRight, cardY + cornerRadius);
  context.lineTo(cardRight, cardBottom - cornerRadius);
  context.quadraticCurveTo(cardRight, cardBottom, cardRight - cornerRadius, cardBottom);
  context.lineTo(cardX + cornerRadius, cardBottom);
  context.quadraticCurveTo(cardX, cardBottom, cardX, cardBottom - cornerRadius);
  context.lineTo(cardX, cardY + cornerRadius);
  context.quadraticCurveTo(cardX, cardY, cardX + cornerRadius, cardY);
  context.lineTo(CARD_WIDTH / 2 - dateGap, cardY);
  context.lineWidth = 3;
  context.strokeStyle = "rgba(91, 101, 75, 0.30)";
  context.stroke();

  context.textBaseline = "middle";
  context.fillStyle = "#6e7663";
  context.textAlign = "center";
  context.fillText(data.date, CARD_WIDTH / 2, cardY);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.fillStyle = "#283520";
  context.font = `750 47px ${sans}`;
  context.fillText(data.rank, 54, 109);

  const pointsLabel = "POINTS";
  context.font = `700 27px ${sans}`;
  const labelWidth = context.measureText(pointsLabel).width;
  context.fillStyle = "#6e7663";
  context.fillText(pointsLabel, CARD_WIDTH - 54 - labelWidth, 109);

  const labelStart = CARD_WIDTH - 54 - labelWidth;
  context.font = `750 49px ${sans}`;
  const scoreText = String(data.score);
  const scoreWidth = context.measureText(scoreText).width;
  context.fillStyle = "#67283d";
  context.fillText(scoreText, labelStart - scoreWidth - 17, 109);

  const trackX = 54;
  const trackY = 143;
  const trackWidth = CARD_WIDTH - 108;
  const trackHeight = 24;
  roundedRect(context, trackX, trackY, trackWidth, trackHeight, trackHeight / 2);
  context.fillStyle = "#dddcca";
  context.fill();

  const progress = Math.max(0, Math.min(1, data.progress));
  const fillWidth = Math.max(3, trackWidth * progress);
  const fillGradient = context.createLinearGradient(trackX, 0, trackX + fillWidth, 0);
  fillGradient.addColorStop(0, "#5f7544");
  fillGradient.addColorStop(1, "#97a85b");
  roundedRect(context, trackX, trackY, fillWidth, trackHeight, trackHeight / 2);
  context.fillStyle = fillGradient;
  context.fill();

  const markerX = trackX + trackWidth * progress;
  context.save();
  context.translate(markerX, trackY + trackHeight / 2);
  context.rotate(-0.12);
  context.beginPath();
  context.ellipse(0, 0, 27, 18, 0, 0, Math.PI * 2);
  context.fillStyle = "#6f8647";
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = "#fffaf1";
  context.stroke();
  context.restore();

  context.fillStyle = "#6e7663";
  context.font = `400 34px ${sans}`;
  context.textAlign = "right";
  context.fillText(data.nextRankText, CARD_WIDTH - 54, 216);
  context.textAlign = "left";

  context.beginPath();
  context.moveTo(54, 242);
  context.lineTo(CARD_WIDTH - 54, 242);
  context.lineWidth = 3;
  context.strokeStyle = "rgba(91, 101, 75, 0.20)";
  context.stroke();

  // The export has no actions: centre the words-found summary in the footer.
  context.fillStyle = "#283520";
  context.font = `650 36px ${sans}`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    `${data.foundWords} ${data.foundWords === 1 ? "word" : "words"} found`,
    CARD_WIDTH / 2,
    301,
  );

  return dataUrlToBlob(canvas.toDataURL("image/png"));
};

const copyScoreImage = async (
  image: Blob,
  target: ShareNavigator,
  ClipboardItemClass: ClipboardItemConstructor | undefined,
) => {
  if (target.clipboard?.write === undefined || ClipboardItemClass === undefined) return false;
  try {
    await target.clipboard.write([
      new ClipboardItemClass({ "image/png": image }),
    ]);
    return true;
  } catch {
    return false;
  }
};

export const deliverScoreImage = async (
  image: Blob,
  fileName: string,
  target: ShareNavigator | undefined =
    typeof navigator === "undefined" ? undefined : navigator,
  ClipboardItemClass: ClipboardItemConstructor | undefined =
    typeof ClipboardItem === "undefined" ? undefined : ClipboardItem,
): Promise<ShareScoreResult> => {
  if (target === undefined) return "failed";

  const file = new File([image], fileName, { type: "image/png" });
  const shareData: ShareData = { files: [file] };
  let canShareFile = false;
  try {
    canShareFile = target.share !== undefined && target.canShare?.(shareData) === true;
  } catch {
    canShareFile = false;
  }

  if (canShareFile && target.share !== undefined) {
    try {
      await target.share(shareData);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }

  return await copyScoreImage(image, target, ClipboardItemClass) ? "copied" : "failed";
};
