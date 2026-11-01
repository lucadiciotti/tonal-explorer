import { SessionStats, ReactionTimeStats } from '../types';

export type ResultEntry = 'H' | 'M';

const EMPTY_REACTION: ReactionTimeStats = { mean: 0, mode: 0, min: 0, max: 0, count: 0 };

export function calculateReactionTimeStats(timesMs: number[]): ReactionTimeStats {
  if (timesMs.length === 0) return EMPTY_REACTION;

  const sorted = [...timesMs].sort((a, b) => a - b);
  const mean = timesMs.reduce((sum, t) => sum + t, 0) / timesMs.length;

  const bucketSize = 100;
  const buckets = new Map<number, number>();
  for (const t of timesMs) {
    const bucket = Math.round(t / bucketSize) * bucketSize;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  let modeValue = 0;
  let modeCount = 0;
  for (const [bucket, count] of buckets) {
    if (count > modeCount) {
      modeCount = count;
      modeValue = bucket;
    }
  }

  return {
    mean: Math.round(mean),
    mode: modeValue,
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    count: timesMs.length,
  };
}

export function calculateStreaks(results: ResultEntry[], hitReactionTimesMs: number[]): SessionStats {
  const reactionTime = calculateReactionTimeStats(hitReactionTimesMs);

  if (results.length === 0) {
    return { maxHitStreak: 0, minHitStreak: 0, maxMissStreak: 0, minMissStreak: 0, reactionTime };
  }

  const hitStreaks: number[] = [];
  const missStreaks: number[] = [];
  let currentType = results[0];
  let currentLength = 1;

  for (let i = 1; i < results.length; i++) {
    if (results[i] === currentType) {
      currentLength++;
    } else {
      (currentType === 'H' ? hitStreaks : missStreaks).push(currentLength);
      currentType = results[i];
      currentLength = 1;
    }
  }
  (currentType === 'H' ? hitStreaks : missStreaks).push(currentLength);

  return {
    maxHitStreak: hitStreaks.length > 0 ? Math.max(...hitStreaks) : 0,
    minHitStreak: hitStreaks.length > 0 ? Math.min(...hitStreaks) : 0,
    maxMissStreak: missStreaks.length > 0 ? Math.max(...missStreaks) : 0,
    minMissStreak: missStreaks.length > 0 ? Math.min(...missStreaks) : 0,
    reactionTime,
  };
}
