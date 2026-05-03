// scripts/generate-icons.js
// 一次性工具：壓縮 og-image.jpg + 產 192/512 maskable app icon
// 跑法：node scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const SRC_OG = path.join(PUBLIC, 'og-image.jpg');
const OUT_OG = path.join(PUBLIC, 'og-image.jpg');
const OUT_192 = path.join(PUBLIC, 'icon-192.png');
const OUT_512 = path.join(PUBLIC, 'icon-512.png');
const OUT_MASKABLE_192 = path.join(PUBLIC, 'icon-maskable-192.png');
const OUT_MASKABLE_512 = path.join(PUBLIC, 'icon-maskable-512.png');

// brand
const BG = '#0b1120';        // dark navy
const FG = '#38bdf8';        // cyan accent
const FG_DEEP = '#0ea5e9';   // deeper cyan ring

// SVG icon (square 512). 設計：dark bg + 同心圓拓撲節點 + 中央 "MBTI" 字。
// maskable 版內容收在中央 80% 安全區，外圍 10% 為純 bg padding。
function buildSvg({ size, maskable }) {
    const cx = size / 2, cy = size / 2;
    // safe zone：maskable 留約 20% padding（內容收在中央 80%），non-maskable 用 92%
    const safe = maskable ? 0.36 : 0.44;
    const ringR = size * safe;
    const innerR = ringR * 0.6;
    const dotR = size * 0.045;            // 外節點半徑（醒目）
    const innerDotR = size * 0.022;       // 內 4 軸節點
    const stroke = size * 0.008;
    // 8 個節點均勻分佈在外環（榮格八維 Te/Ti/Fe/Fi/Ne/Ni/Se/Si 暗示）
    const outer = [];
    for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 - Math.PI / 2;
        outer.push({ x: cx + Math.cos(a) * ringR, y: cy + Math.sin(a) * ringR });
    }
    // 4 個內環節點（4 軸 EI/NS/TF/JP 暗示）
    const inner = [];
    for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 - Math.PI / 2 + Math.PI/4;
        inner.push({ x: cx + Math.cos(a) * innerR, y: cy + Math.sin(a) * innerR });
    }
    const outerLines = outer.map(n => `<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" stroke="${FG_DEEP}" stroke-width="${stroke*0.7}" opacity="0.5"/>`).join('');
    const innerLines = inner.map(n => `<line x1="${cx}" y1="${cy}" x2="${n.x}" y2="${n.y}" stroke="${FG}" stroke-width="${stroke*0.7}" opacity="0.8"/>`).join('');
    const outerDots = outer.map(n => `<circle cx="${n.x}" cy="${n.y}" r="${dotR}" fill="${FG}"/>`).join('');
    const innerDots = inner.map(n => `<circle cx="${n.x}" cy="${n.y}" r="${innerDotR}" fill="${FG_DEEP}"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${FG_DEEP}" stroke-width="${stroke}" opacity="0.4"/>
  <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="${FG}" stroke-width="${stroke*0.8}" opacity="0.7"/>
  ${outerLines}
  ${innerLines}
  ${outerDots}
  ${innerDots}
  <circle cx="${cx}" cy="${cy}" r="${size*0.06}" fill="${FG}" opacity="0.98"/>
  <circle cx="${cx}" cy="${cy}" r="${size*0.025}" fill="${BG}"/>
</svg>`;
}

async function rasterize(svg, size, outPath) {
    await sharp(Buffer.from(svg))
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toFile(outPath);
    const stat = fs.statSync(outPath);
    console.log(`  ${path.basename(outPath)}: ${(stat.size / 1024).toFixed(1)} KB`);
}

async function compressOg() {
    const before = fs.statSync(SRC_OG).size;
    // 先讀進 buffer 再 sharp 處理，避免 windows 上 sharp 持有檔案 lock 寫不回去
    const inBuf = fs.readFileSync(SRC_OG);
    const outBuf = await sharp(inBuf)
        .jpeg({ quality: 80, progressive: true, mozjpeg: true })
        .toBuffer();
    fs.writeFileSync(OUT_OG, outBuf);
    const after = fs.statSync(OUT_OG).size;
    console.log(`og-image.jpg: ${(before/1024).toFixed(1)} KB → ${(after/1024).toFixed(1)} KB (${((1 - after/before)*100).toFixed(1)}% saved)`);
}

(async () => {
    console.log('=== compress og-image ===');
    await compressOg();

    console.log('\n=== generate app icons ===');
    await rasterize(buildSvg({ size: 192, maskable: false }), 192, OUT_192);
    await rasterize(buildSvg({ size: 512, maskable: false }), 512, OUT_512);
    await rasterize(buildSvg({ size: 192, maskable: true }), 192, OUT_MASKABLE_192);
    await rasterize(buildSvg({ size: 512, maskable: true }), 512, OUT_MASKABLE_512);

    console.log('\nDone.');
})().catch(e => { console.error(e); process.exit(1); });
