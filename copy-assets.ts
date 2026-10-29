import fs from 'fs';
import path from 'path';

function copyRecursiveSync(src: string, dest: string) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const assetsSrc = path.join(process.cwd(), 'assets');
const assetsDest = path.join(process.cwd(), 'dist', 'assets');

if (fs.existsSync(assetsSrc)) {
  console.log('Copying assets to dist/assets...');
  copyRecursiveSync(assetsSrc, assetsDest);
  console.log('Assets copied successfully.');
}
