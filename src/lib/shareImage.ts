export interface ShareStats {
  totalLabel: string;
  weekLabel: string;
  topActivityName: string | null;
  longestSessionLabel: string;
  bestWeekLabel: string;
  bestStreakLabel: string;
}

export async function downloadStatsImage(stats: ShareStats): Promise<void> {
  const width = 1200;
  const height = 675;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#6366f1");
  gradient.addColorStop(1, "#1c1c3a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "600 28px -apple-system, Helvetica, Arial, sans-serif";
  ctx.fillText("⏱ TempoTask — Récap", 60, 80);

  ctx.font = "400 16px -apple-system, Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(
    new Date().toLocaleDateString("fr-FR", { dateStyle: "long" }),
    60,
    110,
  );

  ctx.font = "700 88px -apple-system, Helvetica, Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(stats.totalLabel, 60, 230);
  ctx.font = "400 18px -apple-system, Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText("Temps total suivi", 60, 260);

  const tiles: Array<{ label: string; value: string }> = [
    { label: "Cette semaine", value: stats.weekLabel },
    { label: "Activité préférée", value: stats.topActivityName ?? "—" },
    { label: "Session la plus longue", value: stats.longestSessionLabel },
    { label: "Meilleure semaine", value: stats.bestWeekLabel },
    { label: "Meilleure série", value: stats.bestStreakLabel },
  ];

  const tileWidth = (width - 120 - 4 * 20) / 5;
  const tileY = 340;
  const tileHeight = 180;

  tiles.forEach((tile, i) => {
    const x = 60 + i * (tileWidth + 20);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, x, tileY, tileWidth, tileHeight, 14);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px -apple-system, Helvetica, Arial, sans-serif";
    wrapText(ctx, tile.value, x + 16, tileY + 60, tileWidth - 32, 26);

    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "400 13px -apple-system, Helvetica, Arial, sans-serif";
    wrapText(
      ctx,
      tile.label,
      x + 16,
      tileY + tileHeight - 20,
      tileWidth - 32,
      16,
    );
  });

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "400 13px -apple-system, Helvetica, Arial, sans-serif";
  ctx.fillText("Généré avec TempoTask", 60, height - 40);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tempotask-recap-${new Date().toISOString().slice(0, 10)}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, lineY);
}
