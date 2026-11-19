/** 成长体系：等级 / XP 推导（纯前端，零额外存储）。
 *  单独成模块，供 progress.js 与 fun.js 共用，避免循环依赖。 */
export const LEVEL_TITLES = ['萌新', '初学者', '进阶者', '熟练者', '小能手', '达人', '高手', '大师', '宗师', '传奇阅者'];

export function levelInfo(xp) {
  const x = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(x / 50)) + 1;
  const base = (level - 1) * (level - 1) * 50;
  const next = level * level * 50;
  return {
    level,
    xp: x,
    base,
    next,
    pct: Math.max(0, Math.min(100, Math.round(((x - base) / (next - base)) * 100))),
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
  };
}

export function deriveXp(s) {
  const total = s.total || 0;
  const streak = s.streak || 0;
  const wErr = Object.keys(s.wordErrors || {}).length;
  const pErr = Object.keys(s.phonemeErrors || {}).length;
  return total * 10 + streak * 30 + wErr * 5 + pErr * 8;
}
