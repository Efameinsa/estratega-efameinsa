import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT = join(__dirname, '../src/assets/logos/favicon-estratega.png');
const PUBLIC = join(__dirname, '../public');

if (!existsSync(PUBLIC)) mkdirSync(PUBLIC, { recursive: true });

const sizes = [
  { name: 'favicon-16x16.png',    size: 16  },
  { name: 'favicon-32x32.png',    size: 32  },
  { name: 'favicon-48x48.png',    size: 48  },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192x192.png',     size: 192 },
  { name: 'icon-512x512.png',     size: 512 },
];

async function generate() {
  const input = readFileSync(INPUT);

  for (const { name, size } of sizes) {
    await sharp(input)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(join(PUBLIC, name));

    console.log(`✓ ${name} (${size}x${size})`);
  }

  // favicon.ico as 32x32 png (browsers accept png as .ico)
  await sharp(input)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(PUBLIC, 'favicon.ico'));

  console.log('✓ favicon.ico');
  console.log('\nFavicons generados en /public');
}

generate().catch(console.error);
