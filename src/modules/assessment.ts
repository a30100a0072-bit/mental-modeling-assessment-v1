// 定義 16 型人格的基準理想向量 (順序嚴格對應: Ni, Ne, Si, Se, Ti, Te, Fi, Fe)
// 根據 Beebe 畢比模型 8 維位置推導：Dom(1.0), Aux(0.8), Tert(0.4), Inf(-0.6), Opp(0.4), Crit(0.2), Trick(-0.4), Demon(-0.8)
//
// ⚠️ 此常數同時存在於 public/engine.js calculateLocalProbabilities 內，兩端必須 1:1 同步
// （前端動態算分使用），有 algorithm-parity test 防漂移。改了一邊就要同步另一邊。
export const IDEAL_PROFILES: Record<string, number[]> = {
    "INTJ": [1.0, 0.4, -0.8, -0.6, 0.2, 0.8, 0.4, -0.4],
    "ENTJ": [0.8, 0.2, -0.4, 0.4, 0.4, 1.0, -0.6, -0.8],
    "INTP": [0.2, 0.8, 0.4, -0.4, 1.0, 0.4, -0.8, -0.6],
    "ENTP": [0.4, 1.0, -0.6, -0.8, 0.8, 0.2, -0.4, 0.4],
    "INFJ": [1.0, 0.4, -0.8, -0.6, 0.4, -0.4, 0.2, 0.8],
    "ENFJ": [0.8, 0.2, -0.4, 0.4, -0.6, -0.8, 0.4, 1.0],
    "INFP": [0.2, 0.8, 0.4, -0.4, -0.8, -0.6, 1.0, 0.4],
    "ENFP": [0.4, 1.0, -0.6, -0.8, -0.4, 0.4, 0.8, 0.2],
    "ISTJ": [-0.8, -0.6, 1.0, 0.4, 0.2, 0.8, 0.4, -0.4],
    "ESTJ": [-0.4, 0.4, 0.8, 0.2, 0.4, 1.0, -0.6, -0.8],
    "ISFJ": [-0.8, -0.6, 1.0, 0.4, 0.4, -0.4, 0.2, 0.8],
    "ESFJ": [-0.4, 0.4, 0.8, 0.2, -0.6, -0.8, 0.4, 1.0],
    "ISTP": [0.4, -0.4, 0.2, 0.8, 1.0, 0.4, -0.8, -0.6],
    "ESTP": [-0.6, -0.8, 0.4, 1.0, 0.8, 0.2, -0.4, 0.4],
    "ISFP": [0.4, -0.4, 0.2, 0.8, -0.8, -0.6, 1.0, 0.4],
    "ESFP": [-0.6, -0.8, 0.4, 1.0, -0.4, 0.4, 0.8, 0.2]
};

// 熱力學平滑參數 (控制機率分佈的銳利度，越低越極端)
export const SOFTMAX_TAU = 0.3;

/**
 * 1. Z-Score 標準化
 * 消除使用者「全部選極度同意」或「全部選極度不同意」的基準線偏差
 */
export function calculateZScores(rawScores: number[]): number[] {
    const n = rawScores.length;
    if (n === 0) return [];

    const mean = rawScores.reduce((a, b) => a + b, 0) / n;
    const variance = rawScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // 若標準差為 0 (全選相同分數)，直接回傳全 0 陣列避免 NaN
    if (stdDev === 0) return Array(n).fill(0);

    return rawScores.map(score => (score - mean) / stdDev);
}

/**
 * 2. 餘弦相似度 (Cosine Similarity)
 * 計算兩組多維向量在空間中的夾角相似度 (-1 到 1)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) throw new Error("向量維度不一致");
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 3. Softmax 機率分佈
 * 將各維度的相似度轉換為總和 100% 的機率分佈，結合溫度參數(Tau)
 */
export function calculateSoftmaxProbabilities(similarities: Record<string, number>): Record<string, number> {
    const types = Object.keys(similarities);
    const scores = Object.values(similarities);

    // 找出最大值防止指數爆炸 (數值穩定性優化)
    const maxScore = Math.max(...scores);
    
    const exps = scores.map(score => Math.exp((score - maxScore) / SOFTMAX_TAU));
    const sumExps = exps.reduce((a, b) => a + b, 0);

    const probabilities: Record<string, number> = {};
    for (let i = 0; i < types.length; i++) {
        // 轉換為百分比並四捨五入至小數點後二位
        probabilities[types[i]] = Number(((exps[i] / sumExps) * 100).toFixed(2));
    }

    return probabilities;
}

/**
 * 4. 主控引擎：處理測驗結果計算與封裝
 */
export function processAssessmentResult(rawScores: number[], timeSpentMs: number) {
    if (rawScores.length !== 8) throw new Error("必須提供完整的八維分數");

    // 取得 Z-Score
    const zScores = calculateZScores(rawScores);

    // 計算精神能量指標 (答題時間越短且變異數越大，推論其精神能量釋放越集中)
    const scoreVariance = rawScores.reduce((a, b) => a + Math.pow(b - (rawScores.reduce((x, y) => x + y, 0) / 8), 2), 0) / 8;
    const psychicEnergyIndex = Number(((scoreVariance * 100000) / (timeSpentMs || 1)).toFixed(4));

    // 計算與 16 型的相似度
    const similarities: Record<string, number> = {};
    for (const [mbti, idealVector] of Object.entries(IDEAL_PROFILES)) {
        similarities[mbti] = cosineSimilarity(zScores, idealVector);
    }

    // 轉換為機率分佈
    const probabilities = calculateSoftmaxProbabilities(similarities);

    // [修復核心]：強制穩定排序，若機率完全相等，以字母順序為基準判定，杜絕盲測分裂症
    const sortedTypes = Object.keys(probabilities).sort((a, b) => {
        if (probabilities[b] !== probabilities[a]) return probabilities[b] - probabilities[a];
        return a.localeCompare(b);
    });
    
    const primaryType = sortedTypes[0];

    return {
        primaryType,
        probabilities,
        zScores,
        psychicEnergyIndex
    };
}