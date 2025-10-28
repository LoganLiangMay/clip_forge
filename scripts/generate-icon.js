const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a 512x512 canvas for the icon
function generateIcon() {
  const size = 512;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background with rounded corners
  ctx.fillStyle = '#1a1a2e';
  roundRect(ctx, 0, 0, size, size, 64);
  ctx.fill();

  // Film strip frame
  ctx.fillStyle = '#0f3460';
  roundRect(ctx, 48, 128, 416, 256, 8);
  ctx.fill();

  // Film perforations
  ctx.fillStyle = '#16213e';
  for (let i = 0; i < 7; i++) {
    const x = 72 + i * 56;
    // Top perforations
    roundRect(ctx, x, 148, 32, 24, 4);
    ctx.fill();
    // Bottom perforations
    roundRect(ctx, x, 340, 32, 24, 4);
    ctx.fill();
  }

  // Center logo - "CF" text
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CF', size / 2, size / 2);

  // Accent lines
  ctx.fillStyle = 'rgba(233, 69, 96, 0.6)';
  ctx.fillRect(48, 188, 416, 2);
  ctx.fillRect(48, 322, 416, 2);

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
  fs.writeFileSync(iconPath, buffer);
  console.log('Icon generated at:', iconPath);
}

function roundRect(ctx, x, y, width, height, radius) {
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

generateIcon();