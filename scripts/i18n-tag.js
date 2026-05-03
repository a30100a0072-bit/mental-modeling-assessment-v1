// scripts/i18n-tag.js
// 一次性批次：把共用 chrome (header / quick-nav / sidebar) 改加 data-i18n 屬性
// 用法: node scripts/i18n-tag.js public/assessment.html public/dashboard.html ...
const fs = require('fs');

const RULES = [
    // quick-nav
    ['<a href="assessment.html?v=A&new=1" class="qnav-item">▶ 模組 A (日常舒適圈)</a>',
     '<a href="assessment.html?v=A&new=1" class="qnav-item" data-i18n="quickNav.A">▶ 模組 A (日常舒適圈)</a>'],
    ['<a href="assessment.html?v=B&new=1" class="qnav-item">▶ 模組 B (高壓防禦)</a>',
     '<a href="assessment.html?v=B&new=1" class="qnav-item" data-i18n="quickNav.B">▶ 模組 B (高壓防禦)</a>'],
    ['<a href="assessment.html?v=C&new=1" class="qnav-item">▶ 模組 C (覺醒願景)</a>',
     '<a href="assessment.html?v=C&new=1" class="qnav-item" data-i18n="quickNav.C">▶ 模組 C (覺醒願景)</a>'],
    ['<a href="assessment.html?v=D&new=1" class="qnav-item qnav-item--new">▶ 模組 D (日常行為)</a>',
     '<a href="assessment.html?v=D&new=1" class="qnav-item qnav-item--new" data-i18n="quickNav.D">▶ 模組 D (日常行為)</a>'],
    ['<a href="assessment.html?v=E&new=1" class="qnav-item qnav-item--new">▶ 模組 E (決策情境)</a>',
     '<a href="assessment.html?v=E&new=1" class="qnav-item qnav-item--new" data-i18n="quickNav.E">▶ 模組 E (決策情境)</a>'],
    ['<a href="assessment.html?v=F&new=1" class="qnav-item qnav-item--new">▶ 模組 F (認知偏好)</a>',
     '<a href="assessment.html?v=F&new=1" class="qnav-item qnav-item--new" data-i18n="quickNav.F">▶ 模組 F (認知偏好)</a>'],

    // header
    ['id="dash-nav-btn" style="display: none;" onclick="window.location.href=\'dashboard.html\'">進入儀表板</button>',
     'id="dash-nav-btn" style="display: none;" onclick="window.location.href=\'dashboard.html\'" data-i18n="nav.dashboard">進入儀表板</button>'],
    ['class="btn-outline" id="auth-nav-btn" onclick="window.location.href=\'login.html\'">登入 / 註冊</button>',
     'class="btn-outline" id="auth-nav-btn" onclick="window.location.href=\'login.html\'" data-i18n="nav.login">登入 / 註冊</button>'],
    ['aria-label="開啟導覽選單" onclick="toggleSidebar()"',
     'aria-label="開啟導覽選單" data-i18n="nav.openMenu" data-i18n-attr="aria-label" onclick="toggleSidebar()"'],

    // sidebar
    ['<span>導覽選單</span>', '<span data-i18n="sidebar.title">導覽選單</span>'],
    ['aria-label="關閉導覽選單" onclick="toggleSidebar()">✕</button>',
     'aria-label="關閉導覽選單" data-i18n="nav.closeMenu" data-i18n-attr="aria-label" onclick="toggleSidebar()">✕</button>'],

    // sidebar links
    ['<a href="index.html">首頁 (Home)</a>',                           '<a href="index.html" data-i18n="sidebar.home">首頁 (Home)</a>'],
    ['<a href="index.html" class="active">首頁 (Home)</a>',           '<a href="index.html" class="active" data-i18n="sidebar.home">首頁 (Home)</a>'],
    ['<a href="assessment.html?v=A&new=1">模組 A：日常舒適圈 (已開放)</a>',
     '<a href="assessment.html?v=A&new=1" data-i18n="sidebar.moduleA">模組 A：日常舒適圈 (已開放)</a>'],
    ['<a href="assessment.html?v=A&new=1">模組 A：日常舒適圈</a>',
     '<a href="assessment.html?v=A&new=1" data-i18n="sidebar.moduleA">模組 A：日常舒適圈</a>'],
    ['<a href="assessment.html?v=B&new=1">模組 B：高壓防禦 (已開放)</a>',
     '<a href="assessment.html?v=B&new=1" data-i18n="sidebar.moduleB">模組 B：高壓防禦 (已開放)</a>'],
    ['<a href="assessment.html?v=B&new=1">模組 B：高壓防禦</a>',
     '<a href="assessment.html?v=B&new=1" data-i18n="sidebar.moduleB">模組 B：高壓防禦</a>'],
    ['<a href="assessment.html?v=C&new=1">模組 C：覺醒願景 (已開放)</a>',
     '<a href="assessment.html?v=C&new=1" data-i18n="sidebar.moduleC">模組 C：覺醒願景 (已開放)</a>'],
    ['<a href="assessment.html?v=C&new=1">模組 C：覺醒願景</a>',
     '<a href="assessment.html?v=C&new=1" data-i18n="sidebar.moduleC">模組 C：覺醒願景</a>'],
    ['<a href="assessment.html?v=D&new=1" class="is-new">模組 D：日常行為量表 (全新開放)</a>',
     '<a href="assessment.html?v=D&new=1" class="is-new" data-i18n="sidebar.moduleD">模組 D：日常行為量表 (全新開放)</a>'],
    ['<a href="assessment.html?v=E&new=1" class="is-new">模組 E：決策情境量表 (全新開放)</a>',
     '<a href="assessment.html?v=E&new=1" class="is-new" data-i18n="sidebar.moduleE">模組 E：決策情境量表 (全新開放)</a>'],
    ['<a href="assessment.html?v=F&new=1" class="is-new">模組 F：認知偏好量表 (全新開放)</a>',
     '<a href="assessment.html?v=F&new=1" class="is-new" data-i18n="sidebar.moduleF">模組 F：認知偏好量表 (全新開放)</a>'],
    ['<a href="jung-theory.html">📖 榮格八維科普 (Jungian Theory)</a>',
     '<a href="jung-theory.html" data-i18n="sidebar.jung">📖 榮格八維科普 (Jungian Theory)</a>'],
    ['<a href="beebe-model.html">📖 畢比模型科普 (Beebe Model)</a>',
     '<a href="beebe-model.html" data-i18n="sidebar.beebe">📖 畢比模型科普 (Beebe Model)</a>'],
    ['<a href="beebe-model.html" class="active">📖 畢比模型科普 (Beebe Model)</a>',
     '<a href="beebe-model.html" class="active" data-i18n="sidebar.beebe">📖 畢比模型科普 (Beebe Model)</a>'],
    ['<a href="mbti-types.html">👥 MBTI 16人格特質</a>',
     '<a href="mbti-types.html" data-i18n="sidebar.types">👥 MBTI 16人格特質</a>'],
    ['<a href="mbti-types.html" class="active">👥 MBTI 16人格特質</a>',
     '<a href="mbti-types.html" class="active" data-i18n="sidebar.types">👥 MBTI 16人格特質</a>'],
    ['<a href="mbti-stats.html">📊 MBTI 有趣數據</a>',
     '<a href="mbti-stats.html" data-i18n="sidebar.stats">📊 MBTI 有趣數據</a>'],
    ['<a href="dashboard.html">會員儀表板 (Dashboard)</a>',
     '<a href="dashboard.html" data-i18n="sidebar.dashboard">會員儀表板 (Dashboard)</a>'],
    ['<a href="dashboard.html" class="active">會員儀表板 (Dashboard)</a>',
     '<a href="dashboard.html" class="active" data-i18n="sidebar.dashboard">會員儀表板 (Dashboard)</a>']
];

const files = process.argv.slice(2);
for (const fp of files) {
    let s = fs.readFileSync(fp, 'utf8');
    const orig = s;
    for (const [oldText, newText] of RULES) {
        s = s.split(oldText).join(newText);
    }
    if (s !== orig) {
        fs.writeFileSync(fp, s, 'utf8');
        console.log(`patched: ${fp}`);
    } else {
        console.log(`  no-op: ${fp}`);
    }
}
