// scripts/bump-cache.js — 把所有 HTML 內 ?v=N 的 query 升版
// 用法: node scripts/bump-cache.js i18n=2 script=10 quiz-ux=3 ...
const fs = require('fs');
const glob = require('fs').readdirSync;

const args = process.argv.slice(2);
const map = {};
for (const a of args) {
    const [k, v] = a.split('=');
    if (k && v) map[k] = v;
}

const files = glob('public').filter(f => f.endsWith('.html')).map(f => 'public/' + f);
for (const fp of files) {
    let s = fs.readFileSync(fp, 'utf8');
    const orig = s;
    for (const [name, ver] of Object.entries(map)) {
        // pattern: name.{js,css}?v=ANY -> name.{...}?v=ver
        const pattern = new RegExp(`(${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\.(js|css))\\?v=\\d+`, 'g');
        s = s.replace(pattern, `$1?v=${ver}`);
    }
    if (s !== orig) {
        fs.writeFileSync(fp, s, 'utf8');
        console.log('patched: ' + fp);
    }
}
