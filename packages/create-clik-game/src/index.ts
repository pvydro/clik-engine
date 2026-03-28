#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const gameName = process.argv[2];

if (!gameName) {
  console.error('Usage: npx create-clik-game <game-name>');
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), gameName);

if (fs.existsSync(targetDir)) {
  console.error(`Directory '${gameName}' already exists.`);
  process.exit(1);
}

const templateDir = path.resolve(__dirname, '..', 'templates', 'default');

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      let content = fs.readFileSync(srcPath, 'utf-8');
      content = content.replace(/\{\{name\}\}/g, gameName);
      fs.writeFileSync(destPath, content);
    }
  }
}

console.log(`Creating clik-engine game: ${gameName}`);
copyDir(templateDir, targetDir);

console.log(`
  Done! To get started:

    cd ${gameName}
    npm install
    npm run dev

  Then use Claude with /clik-playtest to test your game.
`);
