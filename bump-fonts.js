const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    let filepath = path.join(dir, file);
    let stat = fs.statSync(filepath);
    if (stat.isDirectory()) walk(filepath, callback);
    else callback(filepath);
  });
}

walk('src', (filepath) => {
  if (filepath.endsWith('.css') || filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
    let content = fs.readFileSync(filepath, 'utf8');
    let original = content;

    // Bump font-size: 14px;
    content = content.replace(/font-size:\s*(\d+(\.\d+)?)px/g, (match, p1) => {
      return `font-size: ${Math.round(parseFloat(p1) * 1.15)}px`;
    });

    // Bump fontSize: 14
    content = content.replace(/fontSize:\s*(\d+(\.\d+)?)/g, (match, p1) => {
      return `fontSize: ${Math.round(parseFloat(p1) * 1.15)}`;
    });

    if (original !== content) {
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`Bumped fonts in ${filepath}`);
    }
  }
});
