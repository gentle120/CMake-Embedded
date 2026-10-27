const fs = require('node:fs');
const path = require('node:path');

const source = path.join(__dirname, '..', 'src', 'sidebar', 'webview');
const destination = path.join(__dirname, '..', 'out', 'sidebar', 'webview');

fs.mkdirSync(destination, { recursive: true });
for (const filename of ['main.css', 'main.js']) {
  fs.copyFileSync(
    path.join(source, filename),
    path.join(destination, filename)
  );
}
