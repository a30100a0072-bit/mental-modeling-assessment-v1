// public/engine.js
// ==========================================
// [模組 1] 認知幾何引擎 (資料與數學演算法)
// ==========================================

const ENGINE = {
    dimKeys: ['Ti', 'Te', 'Fi', 'Fe', 'Ni', 'Ne', 'Si', 'Se'],
    antagonist: { Ti:'Fe', Fe:'Ti', Te:'Fi', Fi:'Te', Ni:'Se', Se:'Ni', Ne:'Si', Si:'Ne' },
    popNorm: { Ti: 48, Te: 52, Fi: 50, Fe: 58, Ni: 38, Ne: 52, Si: 62, Se: 55 },
    tips: { 
        Ti: "底層邏輯：尋求完美自洽的模型", Te: "客觀秩序：推動高壓行政與資源調配", 
        Fi: "內在信仰：絕對不妥協的個人價值", Fe: "群體共振：掌控環境情緒與人際網絡", 
        Ni: "終局收斂：戰略推演與長遠趨勢預判", Ne: "發散擴張：跨界連結與顛覆既有概念", 
        Si: "經驗守護：死守歷史參數與防禦機制", Se: "物理動態：即時適應並掌控物理環境" 
    },
    gripExit: {
        Ni: "停止對感官刺激的報復性攝取。嘗試透過 Te 建立微小且可控的日常代辦清單，重新找回對未來的掌控感。",
        Te: "承認自身的脆弱與極限。暫時遠離高壓決策環境，找一個絕對安全的私密空間釋放被壓抑的情緒。",
        Ti: "停止試圖用邏輯解決人際問題。暫時抽離社交環境，獨自沈浸於沒有目的的深度研究中恢復能量。",
        Ne: "停止病態地糾結過去的錯誤細節。強迫自己接觸一個全新的、毫無壓力的跨界領域來重啟發散思維。",
        Fi: "停止用死板的規則懲罰自己與他人。回歸純粹的藝術或情感創作，重新與內在信仰對齊。",
        Fe: "停止鑽牛角尖尋找絕對客觀的對錯。回歸支持性的社交網絡，透過傾聽他人的肯定來重建自我價值。",
        Si: "停止對未來的災難性妄想。回歸最熟悉的日常 SOP，透過規律的重複性物理勞動找回安全感。",
        Se: "停止陷入宿命論與被害妄想。回到當下，透過高強度的純粹物理運動榨乾體力，重置神經系統。"
    },
    stacks: { 
        "INTJ": ["Ni", "Te", "Fi", "Se"], "ENTJ": ["Te", "Ni", "Se", "Fi"], "INTP": ["Ti", "Ne", "Si", "Fe"], "ENTP": ["Ne", "Ti", "Fe", "Si"], 
        "INFJ": ["Ni", "Fe", "Ti", "Se"], "ENFJ": ["Fe", "Ni", "Se", "Ti"], "INFP": ["Fi", "Ne", "Si", "Te"], "ENFP": ["Ne", "Fi", "Te", "Si"], 
        "ISTJ": ["Si", "Te", "Fi", "Ne"], "ESTJ": ["Te", "Si", "Ne", "Fi"], "ISFJ": ["Si", "Fe", "Ti", "Ne"], "ESFJ": ["Fe", "Si", "Ne", "Ti"], 
        "ISTP": ["Ti", "Se", "Ni", "Fe"], "ESTP": ["Se", "Ti", "Fe", "Ni"], "ISFP": ["Fi", "Se", "Ni", "Te"], "ESFP": ["Se", "Fi", "Te", "Ni"] 
    },
    sides: { 
        "INTJ": ["INTJ","ESFP","ENTP","ISFJ"], "ENTJ": ["ENTJ","ISFP","INTP","ESFJ"], "INTP": ["INTP","ESFJ","ENTJ","ISFP"], "ENTP": ["ENTP","ISFJ","INTJ","ESFP"], 
        "INFJ": ["INFJ","ESTP","ENFP","ISTJ"], "ENFJ": ["ENFJ","ISTP","INFP","ESTJ"], "INFP": ["INFP","ESTJ","ENFJ","ISTP"], "ENFP": ["ENFP","ISTJ","INFJ","ESTP"], 
        "ISTJ": ["ISTJ","ENFP","ESTP","INFJ"], "ESTJ": ["ESTJ","INFP","ISTP","ENFJ"], "ISFJ": ["ISFJ","ENTP","ESFP","INTJ"], "ESFJ": ["ESFJ","INTP","ISFP","ENTJ"], 
        "ISTP": ["ISTP","ENFJ","ESTJ","INFP"], "ESTP": ["ESTP","INFJ","ISTJ","ENFP"], "ISFP": ["ISFP","ENTJ","ESFJ","INTP"], "ESFP": ["ESFP","INTJ","ISFJ","ENTP"] 
    },
    blindspots: { 
        Te: "極度抗拒高壓的行政調度與資源管理。面臨專案沉沒成本時缺乏迅速止損的魄力，常因過度關注個體感受或底層邏輯，而導致整體系統效率崩盤。", 
        Ti: "拒絕推敲嚴密的底層邏輯，常以主觀感受、道德綁架或表面群體和諧來掩蓋系統性的破洞，面對除錯時易產生智力焦慮。", 
        Fe: "缺乏敏銳的社交雷達，易展現無意識的學術傲慢。在需要人情妥協、建立利益網絡或安撫群體情緒時顯得極其生硬。", 
        Fi: "缺乏深層的道德錨點，極易在追求世俗利益、客觀效率的過程中，不自覺地踐踏他人甚至自己的靈魂底線。", 
        Ne: "極度抗拒概念的發散與改變，認為「看不見的創新就是高風險的災難」。面對時代變革時展現出極端僵化。", 
        Ni: "完全忽視隱蔽的長遠戰略意義與事物發展的必然趨勢。常以戰術上的極度勤奮來掩蓋戰略上的極大盲點與懶惰。", 
        Se: "對物理現實、環境動態極度遲鈍。沉溺於形而上的推演，當突發物理意外或需要即時高強度反饋時，容易產生大腦當機。", 
        Si: "嚴重忽視歷史教訓、既有SOP與自身的生理警訊。為了追求極致的目標或體驗，過度透支系統，導致無預警崩潰。" 
    },
    reports: { 
        "INTJ": { b:"孤獨的戰略推演，極度排斥低資訊密度的雜訊干擾。習慣在腦內建立多維度模型，對現實進行冷酷的降維解析。", c:"啟動無情的系統清洗機制。以冷酷的數據與客觀法則進行打擊，用無可反駁的邏輯矩陣將對手逼入死角。", g:"擁抱混亂現實，將深層道德信仰融入冰冷體制。在戰略中注入人文關懷，從系統架構師蛻變為引領靈魂的變革者。", e:"[驅動] 極低的外耗需求，能量高度集中於核心目標的單點突破。當進入防禦狀態時，易陷入無盡內耗，徹底切斷執行力。", p:"強迫自己建立微小且立即見效的實體代辦清單，並每週安排一次純粹的感官放空，以阻斷大腦的無限過載。" }, 
        "ENTJ": { b:"強制承接高壓行政爛攤，強硬建立運行流程。視達標為絕對真理，毫不畏懼推動殘酷但必要的優化決策。", c:"啟動焦土政策，以階級權力與冷酷邏輯輾壓所有障礙。直接剝奪對方資源並進行物理與行政上的雙重抹殺。", g:"承認自身極限，學習無目的傾聽與承接脆弱。理解人不是純粹的績效機器，建立深層的個人價值信仰。", e:"[擴張] 藉由外部系統的征服與資源吞噬來獲取能量。長期高壓下容易用短視的物理破壞與粗暴干預。", p:"在行事曆中強制排入「無目的」的社交或獨處時間。承認情緒是合法的系統變數，而非需要被根除的 Bug。" }, 
        "INTP": { b:"質疑所有既定體系，從底層解構事物的本質。大腦如同精密的手術刀，追求不帶任何感性雜質的終極客觀真理。", c:"進行尖酸的邏輯手術，公開切除對方的謬誤。利用無懈可擊的邏輯悖論，在精神與智力層面將對手徹底摧毀。", g:"跨出理論舒適圈，將半成品強行投入現實檢驗。克服對系統不完美的恐懼，將高深理論翻譯給大眾。", e:"[演化] 能量來自於心智模型的無損運作。若現實過於僵化，會病態地死守舊有邏輯，喪失探索動能。", p:"停止將完美的理論鎖在腦中。將半成品投入現實市場測試，允許出錯，並用外界的反饋來優化你的底層邏輯。" }, 
        "ENTP": { b:"跳脫框架捕捉系統漏洞，極度享受智力交鋒的快感。能在毫不相干的事物間建立奇異連結，但極度抗拒後續維護。", c:"利用詭辯與無限的平行假說，將對手繞暈在認知迷宮中。靈活切換價值觀陣地，用對手自身的邏輯破洞反噬對手。", g:"克服對枯燥的恐懼，為單一選項負起長遠責任。學會收斂光芒，將天賦錨定在堅實的歷史經驗與社會責任上。", e:"[激盪] 透過不斷打破框架與高頻資訊撞擊來充電。面臨枯燥維護時能量會抽乾，甚至為尋求刺激誘發破壞性操弄。", p:"為每一個發散的點子設定物理停損點。訓練自己完成「最後一哩路」的無聊庶務，這是將天賦變現的唯一途徑。" }, 
        "INFJ": { b:"進行高隱蔽性的心理分析，致力維持表面的平衡與深層的預判。默默引導群體走向理想終局。", c:"觸發門縫效應，永久切斷物理與心理連結。化身絕對冷酷的裁決者，將對方從人生宇宙中徹底刪除。", g:"劃定冷酷的邊界，停止試圖拯救所有人的妄想。將抽象的願景轉化為強硬的邏輯與實體行動，在物理世界中著陸。", e:"[共振] 吸收群體的潛意識作為能量庫，但極易被外界毒素污染。過載時用冰冷的邏輯合理化自己對人類的絕望。", p:"嚴格劃定心理邊界。當感受到過度承載時，允許自己展現「自私」的物理隔離，不要試圖拯救每一個溺水的人。" }, 
        "ENFJ": { b:"精準掌控群體情緒波段，主動承擔不屬於自己的責任。擅長將零散的個體意志凝聚成具備高度信仰的狂熱軍團。", c:"利用社會資本進行壓倒性的輿論與情緒圍剿。剝奪對方的社交呼吸權，用高度組織化的人際網絡讓對方邊緣化。", g:"戒斷對群體認同的成癮，在絕對的孤獨中確立自我。學會用冰冷的底層邏輯審視人際關係，確立獨立靈魂。", e:"[輻射] 透過引導群體與價值觀輸出獲得精神滿足。若長期缺乏正向回饋，會用強勢的社群控制來填補空虛。", p:"戒斷對「被需要」的病態成癮。培養一項完全不需要他人認可、純粹為自己建立底層邏輯的孤獨愛好。" }, 
        "INFP": { b:"堅守靈魂底線，極度排斥世俗的功利化與標準化。以極其敏銳且細膩的情感刻度，丈量世界每一寸的真實與虛偽。", c:"化身道德暴君，拋棄客觀理性並選擇玉石俱焚。爆發出極端且不計後果的毀滅性情緒，寧願粉身碎骨也不妥協。", g:"鍛鍊冰冷的行政執行力，將抽象理想強硬化為體制。在殘酷的高壓現實中建立強硬的秩序，用世俗力量保護聖殿。", e:"[淬鍊] 能量源於內在價值觀與外界可能性的深度共鳴。在嚴苛環境中反覆咀嚼過去創傷，喪失對未來的想像。", p:"不要用情緒對抗體制，用實力。學習冰冷的專案管理工具，為你的理想打造一副能在現實中生存的鋼鐵鎧甲。" }, 
        "ENFP": { b:"追求概念的無限擴張，缺乏收斂與執行的紀律。擁有極強的情緒感染力，能在死寂的環境中瞬間點燃創新的星火。", c:"啟動絕對逃避機制，瞬間抽離戰場尋找全新刺激。像幽靈般消失，不留情面地拋棄所有沉沒成本與舊有承諾。", g:"直面系統維護的枯燥，明白真正的自由建立在自律之上。用枯燥裝穩定歷史經驗為自己扎根，將靈感轉為永恆。", e:"[燃燒] 憑藉熱情與價值驅動來爆發能量。新鮮感褪去後，會像無頭蒼蠅般推進多項毫無意義的任務來掩飾焦慮。", p:"熱情是易耗品，紀律才是永動機。強迫自己每天在固定時間執行同一件微小枯燥的任務，馴服你躁動的靈魂。" }, 
        "ISTJ": { b:"高度依賴歷史實證，建立絕對防禦的標準化流程。擅長將模糊的指令轉化為精確、可被檢驗且萬無一失的參數。", c:"以海量的數據與死板規定封殺任何創新變通。祭出不近人情的合規紀錄與鐵腕罰則，如冰冷的城牆般拒絕溝通。", g:"擁抱未知的混沌，試著相信未經驗證的直覺。理解世界並非永遠線性發展，在完美計畫外預留給命運與靈感的彈性。", e:"[構築] 從秩序、可預測性與歷史數據的累積中獲得穩定能量。當系統失控時，會病態地自責微小的決策失誤。", p:"在絕對安全的範圍內，主動引入隨機變數。允許日常 SOP 出現 10% 的偏移，訓練神經系統對未知的容忍度。" }, 
        "ESTJ": { b:"將無序的環境強制結構化，對低效推託零容忍。具備極強的現實推進力，信奉結果定義一切，是維持運轉的引擎。", c:"當眾進行不留情面的階級威懾與物理懲罰。啟動冷酷的行政大清洗，用極具壓迫感的權力傾軋讓異音瞬間消音。", g:"理解人非機器，培養內心深處真正的共情。探索自身與他人隱蔽的靈魂需求，從監工蛻變為領袖。", e:"[推進] 透過將無序環境強制結構化來汲取控制感。遇逢巨大挫折，會用盲目擴張來掩蓋底層的失控恐懼。", p:"承認「脆弱」與「非理性」是人類系統的內建參數。在進行高壓裁決前，強迫自己停下五秒鐘，感知對方的底層情緒。" }, 
        "ISFJ": { b:"精準記憶細節，默默承擔維護秩序與照顧他人的責任。將愛與責任具象化為無微不至的物理付出，是穩定群體的錨。", c:"爆發長期隱忍的委屈，精準翻出過去所有的舊帳。化身絕望的受害者，用無可反駁的付出清單進行情緒勒索。", g:"學會自私，明白滿足自身需求並不邪惡。建立清晰的個人邊界，並學會用冰冷的底層邏輯斬斷有毒的依附關係。", e:"[守護] 從日常的穩定運作與他人的安心感中獲得能量回饋。一旦付出被長久無視，會用尖酸的邏輯挑剔細節。", p:"你不是系統的附屬品。每週設定一個純粹利己的目標，並學習大膽地向外界提出要求，拒絕沒有底線的消耗。" }, 
        "ESFJ": { b:"極度重視儀式與共識，自願擔任組織內的人際樞紐。擅長調動環境氛圍，維持溫暖的社會共振。", c:"動員社交網絡排擠，讓對手在組織內社會性死亡。利用極強的人際影響力發動獵巫，透過群眾壓力將其徹底邊緣化。", g:"敢於戳破虛偽的和諧，培養獨立且客觀的邏輯。在面對群體盲思時，能堅守不迎合他人的客觀真理。", e:"[織網] 透過建立緊密的社會契約與傳統儀式來維持能量滿載。當群體面臨分裂，焦慮地拋出不切實際的討好方案。", p:"人際和諧不是唯一的真理。面對衝突時，嘗試拔除情感濾鏡，用純粹的利益與客觀對錯來進行冷酷但必要的切割。" }, 
        "ISTP": { b:"日常極度節能，危機時以最精簡的動作進行物理除錯。平時對周遭漠不關心，但在致命瞬間能憑直覺邏輯破局。", c:"展現極端的冷漠，面對情緒化衝突時直接物理隔離。毫無預警地徹底消失，用絕對的沉默與無情回應一切。", g:"正視情感價值，為當下的行為制定長遠的戰略願景。學會將對人的關懷與未來的佈局納入人生地圖。", e:"[破局] 在極端物理環境與高壓解謎中能爆發驚人能量。若長期被困行政框架中，會因偏執的陰謀推演而喪失行動力。", p:"停止將人生當成單機通關遊戲。試著為你的技術或天賦設定一個五年期的社會應用願景，賦予冷酷技巧實質的溫度。" }, 
        "ESTP": { b:"活在絕對的當下，具備極強的物理適應力與即戰力。能瞬間掃描環境弱點，用最具破壞力的手段奪取資源。", c:"不講武德，利用現實弱點進行毀滅性的近身搏擊。拋棄所有長遠顧慮與道德包袱，用最野蠻的物理手段將對手擊潰。", g:"停止透支未來，靜下心推演行為的長遠連鎖後果。戒斷對短期快感的成癮，學會在寂靜中聆聽長遠戰略的聲音。", e:"[衝鋒] 永遠在追逐當下的物理刺激與即時勝利。面臨無法用實體手段解決的危機時，透過煽動情緒來轉移焦點。", p:"抗拒大腦對即時多巴胺的渴望。在每次衝動決策前，強制自己推演三步以後的長遠骨牌效應，學會忍受短期的平庸。" }, 
        "ISFP": { b:"具備純粹的實體美學直覺，排斥抽象且冰冷的邏輯辯論。將內在深沉的情感，轉化為無聲但極具衝擊力的物理表達。", c:"爆發無法預測的毀滅性固執，寧願砸毀作品也絕不妥協。瞬間關閉溝通管道，展現出極端不可理喻的抗拒。", g:"將主觀感受轉化為標準化產出，建立高效執行體系。學會運用客觀的行政邏輯將個人才華推向市場。", e:"[體驗] 能量隨內在美學與當下體驗的共鳴而起伏。遭遇世俗強烈否定時，陷入宿命論的自憐與毀滅性固執。", p:"美感需要力量來捍衛。暫時放下藝術家的清高，學習一套冰冷但高效的世俗生存工具，用現實的成功保護純粹。" }, 
        "ESFP": { b:"對環境變量極度敏銳，能瞬間融化社交堅冰帶動氣氛。擁有將任何枯燥場景轉化為極致感官體驗的強大生命力。", c:"用戲劇化的情感爆發來掩飾底層邏輯的極度薄弱。啟動防禦性的情緒宣洩，透過製造混亂與轉移焦點來逃避檢視。", g:"承擔長遠責任，在完全沒有掌聲時推演系統的走向。學會獨處並直面冰冷的未來戰略，建立內核心。", e:"[綻放] 透過掌控環境氛圍與目光來汲取龐大能量。當舞台消失或面臨深層批評時，用粗暴的物質控制來防禦脆弱。", p:"褪去華麗的包裝，學會在無人的暗處面對自己。培養長期的戰略眼光，即使這意味著要忍受極度的枯燥與沒有掌聲的孤獨。" } 
    }
};

function encodeScores(s) { return ENGINE.dimKeys.map(k => Math.max(0, Math.round(s[k] + 100)).toString(36)).join('-'); }
function decodeScores(str) { const arr = str.split('-'); const res = {}; if(arr.length===8) ENGINE.dimKeys.forEach((k,i)=>res[k]=parseInt(arr[i],36)-100); return res; }

// 本地端邊緣運算 (舊版 Softmax 轉換)
function calculateLocalProbabilities(scores) {
    const IDEAL_PROFILES = {
        "INTJ": [1.0, 0.4, -0.8, -0.6, 0.2, 0.8, 0.4, -0.4], "ENTJ": [0.8, 0.2, -0.4, 0.4, 0.4, 1.0, -0.6, -0.8],
        "INTP": [0.2, 0.8, 0.4, -0.4, 1.0, 0.4, -0.8, -0.6], "ENTP": [0.4, 1.0, -0.6, -0.8, 0.8, 0.2, -0.4, 0.4],
        "INFJ": [1.0, 0.4, -0.8, -0.6, 0.4, -0.4, 0.2, 0.8], "ENFJ": [0.8, 0.2, -0.4, 0.4, -0.6, -0.8, 0.4, 1.0],
        "INFP": [0.2, 0.8, 0.4, -0.4, -0.8, -0.6, 1.0, 0.4], "ENFP": [0.4, 1.0, -0.6, -0.8, -0.4, 0.4, 0.8, 0.2],
        "ISTJ": [-0.8, -0.6, 1.0, 0.4, 0.2, 0.8, 0.4, -0.4], "ESTJ": [-0.4, 0.4, 0.8, 0.2, 0.4, 1.0, -0.6, -0.8],
        "ISFJ": [-0.8, -0.6, 1.0, 0.4, 0.4, -0.4, 0.2, 0.8], "ESFJ": [-0.4, 0.4, 0.8, 0.2, -0.6, -0.8, 0.4, 1.0],
        "ISTP": [0.4, -0.4, 0.2, 0.8, 1.0, 0.4, -0.8, -0.6], "ESTP": [-0.6, -0.8, 0.4, 1.0, 0.8, 0.2, -0.4, 0.4],
        "ISFP": [0.4, -0.4, 0.2, 0.8, -0.8, -0.6, 1.0, 0.4], "ESFP": [-0.6, -0.8, 0.4, 1.0, -0.4, 0.4, 0.8, 0.2]
    };

    const orderedScores = [scores.Ni, scores.Ne, scores.Si, scores.Se, scores.Ti, scores.Te, scores.Fi, scores.Fe];
    const mean = orderedScores.reduce((a, b) => a + b, 0) / 8;
    const std = Math.sqrt(orderedScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 8) || 1;
    const zScores = orderedScores.map(s => (s - mean) / std);

    let similarities = {};
    for (const [mbti, ideal] of Object.entries(IDEAL_PROFILES)) {
        let dot = 0, normU = 0, normI = 0;
        for (let i = 0; i < 8; i++) {
            dot += zScores[i] * ideal[i];
            normU += zScores[i] * zScores[i];
            normI += ideal[i] * ideal[i];
        }
        similarities[mbti] = (normU === 0 || normI === 0) ? 0 : dot / (Math.sqrt(normU) * Math.sqrt(normI));
    }

    const TAU = 0.3; 
    const maxSim = Math.max(...Object.values(similarities));
    let expSum = 0;
    let probs = {};
    Object.keys(similarities).forEach(t => {
        const ev = Math.exp((similarities[t] - maxSim) / TAU);
        probs[t] = ev;
        expSum += ev;
    });

    let sorted = Object.keys(probs).sort((a, b) => {
        if (probs[b] !== probs[a]) return probs[b] - probs[a];
        return a.localeCompare(b);
    });
    sorted.forEach(t => { probs[t] = Number(((probs[t] / expSum) * 100).toFixed(2)); });

    return { probs, sorted };
}

// ==========================================
// [動態引擎] 雙軌制：中途算分與路由決策 (D, E, F 卷專用)
// ==========================================

// 計算指定階段為止的混合分數 (降維融合演算法)
function calculatePartialScores(answers, upToPhase, version) {
    let rawLikert = { Ti:0, Te:0, Fi:0, Fe:0, Ni:0, Ne:0, Si:0, Se:0 };
    let finalScores = { Ti:0, Te:0, Fi:0, Fe:0, Ni:0, Ne:0, Si:0, Se:0 };

    // 動態綁定題庫
    let activeLikert = [];
    let activeForced = [];
    let activeSJT = [];
    let activeRanking = [];

    if (version === 'D') {
        activeLikert = typeof mData_Likert_D !== 'undefined' ? mData_Likert_D : [];
        activeForced = typeof mData_Forced_D !== 'undefined' ? mData_Forced_D : [];
        activeSJT = typeof mData_SJT_D !== 'undefined' ? mData_SJT_D : [];
        activeRanking = typeof mData_Ranking_D !== 'undefined' ? mData_Ranking_D : [];
    } else if (version === 'E') {
        activeLikert = typeof mData_Likert_E !== 'undefined' ? mData_Likert_E : [];
        activeForced = typeof mData_Forced_E !== 'undefined' ? mData_Forced_E : [];
        activeSJT = typeof mData_SJT_E !== 'undefined' ? mData_SJT_E : [];
        activeRanking = typeof mData_Ranking_E !== 'undefined' ? mData_Ranking_E : [];
    } else if (version === 'F') {
        activeLikert = typeof mData_Likert_F !== 'undefined' ? mData_Likert_F : [];
        activeForced = typeof mData_Forced_F !== 'undefined' ? mData_Forced_F : [];
        activeSJT = typeof mData_SJT_F !== 'undefined' ? mData_SJT_F : [];
        activeRanking = typeof mData_Ranking_F !== 'undefined' ? mData_Ranking_F : [];
    }

    // 1. 李克特量表 (1-5 轉換為 -2 到 +2)
    if (activeLikert.length > 0) {
        for(let i = 0; i < activeLikert.length; i++) {
            let key = `q_1_likert_${i}`;
            if(answers[key]) {
                let val = parseInt(answers[key]) - 3; 
                let dim = activeLikert[i].dim;
                rawLikert[dim] += val;
            }
        }
    }

    // 局部 Z-Score 標準化：提取維度傾向，消除填答基準線偏差
    let likertArr = Object.values(rawLikert);
    let lMean = likertArr.reduce((a,b) => a + b, 0) / 8;
    let lStd = Math.sqrt(likertArr.reduce((a,b) => a + Math.pow(b - lMean, 2), 0) / 8) || 1;

    ENGINE.dimKeys.forEach(k => {
        // 將標準化的 Z 分數放大，作為後續疊加的基底權重 (約佔 40% 影響力)
        finalScores[k] = ((rawLikert[k] - lMean) / lStd) * 2.5; 
    });

    if (upToPhase < 2) return finalScores;

    // 2. 強制選擇題 (零和扣分)
    if (activeForced.length > 0) {
        for(let i = 0; i < activeForced.length; i++) {
            let key = `q_2_forced_${i}`;
            let ans = answers[key];
            if(ans === 'a') {
                activeForced[i].dA.forEach(d => finalScores[d] += 1.5);
                activeForced[i].dB.forEach(d => finalScores[d] -= 1.5);
            } else if (ans === 'b') {
                activeForced[i].dB.forEach(d => finalScores[d] += 1.5);
                activeForced[i].dA.forEach(d => finalScores[d] -= 1.5);
            }
        }
    }

    if (upToPhase < 3) return finalScores;

    // 3. SJT 或 排序題 (權重補題)
    // SJT
    if (activeSJT.length > 0) {
        for(let i = 0; i < activeSJT.length; i++) {
            let key = `q_3_sjt_${i}`;
            if(answers[key]) {
                let optIdx = parseInt(answers[key]);
                let dims = activeSJT[i].options[optIdx].dims;
                dims.forEach(d => finalScores[d] += 2.0); 
            }
        }
    }

    // Ranking (名次權重：+2.5, +0.5, -0.5, -2.5)
    if (activeRanking.length > 0) {
        const rankWeights = [2.5, 0.5, -0.5, -2.5]; 
        for(let i = 0; i < activeRanking.length; i++) {
            let key = `q_3_rank_${i}`;
            if(answers[key]) {
                let rankArr = answers[key].split(',').map(Number);
                rankArr.forEach((optIdx, rankPos) => {
                    let dim = activeRanking[i].items[optIdx].dim;
                    finalScores[dim] += rankWeights[rankPos];
                });
            }
        }
    }

    return finalScores;
}

// 狀態機決策：決定 Step 3 該走哪條路
window.determineDynamicRoute = function(answers, version) {
    // 取得前兩個階段的融合分數
    let tempScores = calculatePartialScores(answers, 2, version); 
    
    // 找出目前最高與次高的維度
    let sortedDims = ENGINE.dimKeys.slice().sort((a,b) => tempScores[b] - tempScores[a]);
    let diff = tempScores[sortedDims[0]] - tempScores[sortedDims[1]];

    // 分數斷層極大 (主導功能清晰) -> 提早收斂
    if (diff >= 2.0) return 'FINISH';
    
    // 前兩名極度糾纏 -> 啟動 SJT 情境驗證
    if (diff <= 1.0) return 'SJT';
    
    // 介於中間 -> 啟動結構排序驗證
    return 'RANKING';
};

// 最終統整輸出
window.calculateDynamicScores = function(answers, version) {
    return calculatePartialScores(answers, 3, version);
};

// ==========================================
// [Route A] Early Stopping — 答到一半若已可信判定，offer 使用者直接看結果
// ==========================================
// evaluateConfidence(probs)：把 16 型機率 collapse 成 top/second + lead 三個指標
//   probs 形狀：{ INTJ: 67.3, INTP: 12.4, ... }（由 calculateLocalProbabilities 產生）
//   回傳：{ topType, topProb, secondType, secondProb, lead }
function evaluateConfidence(probs) {
    if (!probs || typeof probs !== 'object') {
        return { topType: null, topProb: 0, secondType: null, secondProb: 0, lead: 0 };
    }
    const sorted = Object.keys(probs).sort((a, b) => {
        const diff = (probs[b] || 0) - (probs[a] || 0);
        return diff !== 0 ? diff : a.localeCompare(b);
    });
    const top = sorted[0];
    const second = sorted[1];
    const topProb = probs[top] || 0;
    const secondProb = probs[second] || 0;
    return {
        topType: top,
        topProb: topProb,
        secondType: second,
        secondProb: secondProb,
        lead: topProb - secondProb
    };
}

// canStopEarly(confidence, phasesAnswered)：threshold 隨已答 phase 數放寬。
//   phasesAnswered=2 (32 題已答): 高標 top ≥65 且 lead ≥30 — 僅最篤定的型可提早 50% 結束
//   phasesAnswered=3 (48 題已答): 中標 top ≥55 且 lead ≥25 — 多數穩定型在這邊可結束
//   其餘 (1 / 4): 不 offer — 第 1 phase 資料太薄、第 4 phase 已沒幾題能省
//
// 設計權衡：偏保守（false negative > false positive）。寧可讓使用者多答 16 題，
// 也不要把邊界型錯判導致他複試結果不一樣，引發「為什麼這次跟上次不同型」客訴。
function canStopEarly(confidence, phasesAnswered) {
    if (!confidence || typeof confidence.topProb !== 'number') return false;
    if (phasesAnswered === 2) return confidence.topProb >= 65 && confidence.lead >= 30;
    if (phasesAnswered === 3) return confidence.topProb >= 55 && confidence.lead >= 25;
    return false;
}

// 暴露給 script.js（renderPhase 用）
window.evaluateConfidence = evaluateConfidence;
window.canStopEarly = canStopEarly;

// ==========================================
// [Route B] 4 軸機率與最模糊軸偵測
// ==========================================
// calculateAxisProbabilities(probs)：把 16 型 posterior collapse 成 4 軸機率
//   probs = { INTJ: 30, INFJ: 25, ... } (0..100)
//   回傳 { E, N, T, J } (0..100)，I/S/F/P 都用 100 - 對應值
function calculateAxisProbabilities(probs) {
    if (!probs || typeof probs !== 'object') return null;
    let total = 0, E = 0, N = 0, T = 0, J = 0;
    for (const k in probs) {
        if (k.length !== 4) continue;
        const v = probs[k] || 0;
        total += v;
        if (k[0] === 'E') E += v;
        if (k[1] === 'N') N += v;
        if (k[2] === 'T') T += v;
        if (k[3] === 'J') J += v;
    }
    if (total <= 0) return null;
    return {
        E: (E / total) * 100,
        N: (N / total) * 100,
        T: (T / total) * 100,
        J: (J / total) * 100
    };
}

// findMostAmbiguousAxis(axisProbs, threshold)：4 軸中最接近 50/50 的那一軸
//   axisProbs: { E, N, T, J } (calculateAxisProbabilities 產物)
//   threshold: ambiguity 上限（|prob-50| < threshold 才視為模糊；預設 8 = 差距 <16%）
//   回傳 { axis: 'EI'|'NS'|'TF'|'JP', distance: |prob-50|, value: 該軸 prob } 或 null
function findMostAmbiguousAxis(axisProbs, threshold) {
    if (!axisProbs) return null;
    const t = (typeof threshold === 'number') ? threshold : 8;
    const candidates = [
        { axis: 'EI', value: axisProbs.E, distance: Math.abs(axisProbs.E - 50) },
        { axis: 'NS', value: axisProbs.N, distance: Math.abs(axisProbs.N - 50) },
        { axis: 'TF', value: axisProbs.T, distance: Math.abs(axisProbs.T - 50) },
        { axis: 'JP', value: axisProbs.J, distance: Math.abs(axisProbs.J - 50) }
    ];
    candidates.sort((a, b) => a.distance - b.distance);
    const top = candidates[0];
    if (top.distance >= t) return null; // 沒有模糊軸 → 用單題探針即可
    return top;
}

window.calculateAxisProbabilities = calculateAxisProbabilities;
window.findMostAmbiguousAxis = findMostAmbiguousAxis;