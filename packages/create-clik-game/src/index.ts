import fs from 'fs';
import path from 'path';

const TEMPLATES = ['default', 'platformer', 'puzzle', 'multiplayer'];

const args = process.argv.slice(2);
let gameName = '';
let template = 'default';

for (const arg of args) {
  if (arg.startsWith('--template=')) {
    template = arg.split('=')[1];
  } else if (!arg.startsWith('-')) {
    gameName = arg;
  }
}

if (!gameName) {
  console.log('Usage: npx create-clik-game <game-name> [--template=default|platformer|puzzle|multiplayer]');
  console.log('');
  console.log('Templates:');
  console.log('  default      — Empty game with a single scene');
  console.log('  platformer   — Side-scrolling platformer with physics and camera');
  console.log('  puzzle       — Grid-based puzzle game with scoring');
  console.log('  multiplayer  — Networked multiplayer with lobby and room system');
  process.exit(1);
}

if (!TEMPLATES.includes(template)) {
  console.error(`Unknown template: ${template}`);
  console.error(`Available: ${TEMPLATES.join(', ')}`);
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), gameName);

if (fs.existsSync(targetDir)) {
  console.error(`Directory '${gameName}' already exists.`);
  process.exit(1);
}

const templateDir = path.resolve(__dirname, '..', 'templates', template);

if (!fs.existsSync(templateDir)) {
  // Fall back to default if template doesn't exist yet
  const fallback = path.resolve(__dirname, '..', 'templates', 'default');
  if (!fs.existsSync(fallback)) {
    console.error('Template directory not found.');
    process.exit(1);
  }
  console.log(`Template '${template}' not found, using default.`);
  copyDir(fallback, targetDir, gameName);
} else {
  copyDir(templateDir, targetDir, gameName);
}

console.log(`
  Created clik-engine game: ${gameName} (template: ${template})

  To get started:

    cd ${gameName}
    npm install
    npm run dev

  Then use Claude with /clik-playtest to test your game.
`);

function copyDir(src: string, dest: string, name: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, name);
    } else {
      let content = fs.readFileSync(srcPath, 'utf-8');
      content = content.replace(/\{\{name\}\}/g, name);
      fs.writeFileSync(destPath, content);
    }
  }
}
