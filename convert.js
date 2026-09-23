const sharp = require("sharp");

async function convert() {
  const input = "logo.jpg";
  const output = "app/icon.png";

  // Đọc ảnh thành RGBA
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Ngưỡng để nhận diện nền trắng
  const THRESHOLD = 240;

  // Kiểm tra pixel có phải màu trắng/gần trắng không
  function isBackground(x, y) {
    const i = (y * width + x) * channels;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    return r >= THRESHOLD &&
           g >= THRESHOLD &&
           b >= THRESHOLD;
  }

  // Flood fill từ các cạnh ảnh
  const visited = new Uint8Array(width * height);
  const queue = [];

  function addPixel(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;

    const index = y * width + x;

    if (visited[index]) return;
    if (!isBackground(x, y)) return;

    visited[index] = 1;
    queue.push([x, y]);
  }

  // Bắt đầu từ 4 cạnh
  for (let x = 0; x < width; x++) {
    addPixel(x, 0);
    addPixel(x, height - 1);
  }

  for (let y = 0; y < height; y++) {
    addPixel(0, y);
    addPixel(width - 1, y);
  }

  // Lan ra vùng nền
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];

    addPixel(x + 1, y);
    addPixel(x - 1, y);
    addPixel(x, y + 1);
    addPixel(x, y - 1);
  }

  // Làm vùng nền transparent
  for (let i = 0; i < visited.length; i++) {
    if (visited[i]) {
      data[i * channels + 3] = 0;
    }
  }

  // Resize thành 512x512 và xuất PNG
  await sharp(data, {
    raw: {
      width,
      height,
      channels,
    },
  })
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(output);

  console.log(`Đã tạo: ${output}`);
}

convert().catch(console.error);