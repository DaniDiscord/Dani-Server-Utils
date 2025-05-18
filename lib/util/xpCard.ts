import { CanvasRenderingContext2D, createCanvas, loadImage } from "canvas";

export interface IGenerateXpCardProps {
  username: string;
  avatarURL: string;
  level: number;
  xp: number;
  xpNeeded: number;
  rank: number;
}

const levelGradients: { minLevel: number; left: string; right: string }[] = [
  { minLevel: 50, left: "#7c9df8", right: "#1858fe" },
  { minLevel: 45, left: "#85f4fe", right: "#0feafe" },
  { minLevel: 40, left: "#0bfea5", right: "#4fdaa4" },
  { minLevel: 35, left: "#91f071", right: "#55e421" },
  { minLevel: 30, left: "#d3fd3f", right: "#bdfe3d" },
  { minLevel: 25, left: "#f0e87d", right: "#f4ea2b" },
  { minLevel: 20, left: "#f7c126", right: "#fbb81a" },
  { minLevel: 15, left: "#f08b5b", right: "#ff7f19" },
  { minLevel: 10, left: "#fa5a75", right: "#f73f76" },
  { minLevel: 5, left: "#cb6eee", right: "#843efe" },
];

function getGradientForLevel(level: number) {
  for (const { minLevel, left, right } of levelGradients) {
    if (level >= minLevel) {
      return { left, right };
    }
  }
  return { left: "#8f8f8f", right: "#636363" };
}

export async function generateXpCard({
  username,
  avatarURL,
  level,
  xp,
  xpNeeded,
  rank,
}: IGenerateXpCardProps) {
  const padding = 20;
  const width = 1200 + padding * 2;
  const height = 300 + padding * 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const cornerRadius = 30;

  ctx.fillStyle = "rgba(0, 0, 0, 0)";
  ctx.fillRect(0, 0, width, height);

  ctx.translate(padding, padding);

  ctx.fillStyle = "#121317";
  drawRoundedRect(ctx, 0, 0, 1200, 300, cornerRadius);
  ctx.fill();

  ctx.lineWidth = 6;
  const { left, right } = getGradientForLevel(level);
  const borderGradient = ctx.createLinearGradient(0, 0, 1200, 300);
  borderGradient.addColorStop(0, left);
  borderGradient.addColorStop(1, right);

  ctx.strokeStyle = borderGradient;
  drawRoundedRect(
    ctx,
    ctx.lineWidth / 2,
    ctx.lineWidth / 2,
    1200 - ctx.lineWidth,
    300 - ctx.lineWidth,
    cornerRadius,
  );
  ctx.stroke();

  const avatar = await loadImage(avatarURL);
  const avatarX = 40;
  const avatarY = 25;
  const avatarSize = 250;

  ctx.save();
  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2,
    0,
    Math.PI * 2,
    true,
  );
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  ctx.restore();

  ctx.beginPath();
  ctx.arc(
    avatarX + avatarSize / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 3,
    0,
    Math.PI * 2,
    true,
  );
  ctx.strokeStyle = "#2d2e2e";
  ctx.lineWidth = 10;
  ctx.stroke();

  // Username
  const usernameX = 325;
  const nameY = 100;

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px Arial";
  ctx.fillText(username.charAt(0).toUpperCase() + username.slice(1), usernameX, nameY);

  // Role Icon
  const nearestRole = Math.floor(level / 5) * 5;
  if (nearestRole >= 5 && nearestRole <= 50) {
    try {
      const roleIcon = await loadImage(`img/role_${nearestRole}.png`);
      const iconSize = 80;
      const iconMargin = 25;

      ctx.drawImage(
        roleIcon,
        ctx.measureText(username).width + iconMargin + usernameX,
        50,
        iconSize,
        iconSize,
      );
    } catch (_) {
      console.warn(`Role icon for level ${nearestRole} not found.`);
    }
  }

  // Level
  ctx.font = "bold 44px Arial";
  ctx.fillStyle = right;
  ctx.fillText(`Level: ${level}`, usernameX + 2, nameY + 55);

  // Rank
  ctx.font = "bold 52px Arial";
  ctx.fillStyle = "#c3d4d0";
  const rankText = `Rank #${rank}`;
  const textMetrics = ctx.measureText(rankText);
  ctx.fillText(rankText, width - textMetrics.width - 80, 80);

  // XP bar
  const barX = 325;
  const barY = 180;
  const barWidth = 600;
  const barHeight = 45;
  const progress = Math.max(0.02, Math.min(xp / xpNeeded, 1));
  ctx.fillStyle = "#23272A";
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 20);
  ctx.fill();

  const progressWidth = Math.max(40, barWidth * progress);

  ctx.save();

  drawRoundedRect(ctx, barX, barY, progressWidth, barHeight, 20);
  ctx.clip();

  const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
  gradient.addColorStop(0, left);
  gradient.addColorStop(1, right);
  ctx.fillStyle = gradient;

  ctx.fillRect(barX, barY, progressWidth, barHeight);

  ctx.restore();

  ctx.strokeStyle = "#ffffff20";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, barX, barY, barWidth, barHeight, 20);
  ctx.stroke();

  ctx.fillStyle = progress > 0.3 ? "#000000" : "#ffffff";
  ctx.font = "bold 24px Arial";
  const xpText = `${xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`;
  const metric = ctx.measureText(xpText);
  const textX = progress > 0.4 ? barX + 15 : barX + barWidth - metric.width - 15;
  const textY = barY + barHeight / 2 + 8;

  ctx.fillText(xpText, textX, textY);

  return canvas.toBuffer("image/png");
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
