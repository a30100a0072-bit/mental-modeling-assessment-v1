// scripts/add-feature-css.js — 一次性：把缺 feature-enhancements.css 的 HTML 補上
const fs = require('fs');
const TARGET = '<link rel="stylesheet" href="landing.css">';
const INSERT = '\n    <link rel="stylesheet" href="feature-enhancements.css?v=1">';
for (const fp of process.argv.slice(2)) {
    let s = fs.readFileSync(fp, 'utf8');
    if (s.includes('feature-enhancements.css')) { console.log('  no-op (already): ' + fp); continue; }
    if (!s.includes(TARGET)) { console.log('  SKIP no landing.css link: ' + fp); continue; }
    s = s.replace(TARGET, TARGET + INSERT);
    fs.writeFileSync(fp, s, 'utf8');
    console.log('patched: ' + fp);
}
