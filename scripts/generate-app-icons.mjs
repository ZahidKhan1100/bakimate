/**
 * Generates Expo-ready PNG icons from assets/images/icon.jpg.
 * Android adaptive icons need a 1024×1024 foreground with ~66% safe zone padding.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "assets/images/icon.jpg");
const outDir = path.join(root, "assets/images");

/** Matches the navy in the marketing icon. */
const NAVY = { r: 15, g: 23, b: 42, alpha: 1 };

const SIZE = 1024;
/** Logo fits inside ~62% of canvas so circle/squircle masks do not clip the B. */
const LOGO_BOX = Math.round(SIZE * 0.62);

async function main() {
  const base = sharp(src).ensureAlpha();

  const icon = await base
    .clone()
    .resize(LOGO_BOX, LOGO_BOX, { fit: "contain", background: NAVY })
    .extend({
      top: Math.floor((SIZE - LOGO_BOX) / 2),
      bottom: Math.ceil((SIZE - LOGO_BOX) / 2),
      left: Math.floor((SIZE - LOGO_BOX) / 2),
      right: Math.ceil((SIZE - LOGO_BOX) / 2),
      background: NAVY,
    })
    .png()
    .toBuffer();

  await sharp(icon).toFile(path.join(outDir, "icon.png"));

  /** Foreground: same logo on transparent canvas (background color is set in app.json). */
  const foreground = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await base
          .clone()
          .resize(LOGO_BOX, LOGO_BOX, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .toBuffer(),
        left: Math.floor((SIZE - LOGO_BOX) / 2),
        top: Math.floor((SIZE - LOGO_BOX) / 2),
      },
    ])
    .png()
    .toBuffer();

  await sharp(foreground).toFile(path.join(outDir, "android-icon-foreground.png"));

  console.log("Wrote assets/images/icon.png and android-icon-foreground.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
