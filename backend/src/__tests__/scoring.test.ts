/**
 * Tests for pure scoring functions.
 * These tests verify the math and edge cases.
 */

import {
  computeTimeScore,
  updateVoteMultiplier,
  computeFinalScore,
  getScoringSnapshot,
} from "../scoring";

describe("computeTimeScore", () => {
  it("calculates 100% when song plays completely", () => {
    expect(computeTimeScore(120, 120)).toBe(100);
  });

  it("calculates 50% when song plays halfway", () => {
    expect(computeTimeScore(60, 120)).toBe(50);
  });

  it("calculates 0% when song doesn't play", () => {
    expect(computeTimeScore(0, 120)).toBe(0);
  });

  it("clamps to 100% if playedSeconds exceeds duration", () => {
    expect(computeTimeScore(150, 120)).toBe(100);
  });

  it("returns 0 for invalid duration", () => {
    expect(computeTimeScore(60, 0)).toBe(0);
    expect(computeTimeScore(60, -10)).toBe(0);
  });

  it("returns 0 for negative playedSeconds", () => {
    expect(computeTimeScore(-10, 120)).toBe(0);
  });

  it("calculates precise percentages", () => {
    expect(computeTimeScore(75, 100)).toBeCloseTo(75);
    expect(computeTimeScore(33, 100)).toBeCloseTo(33);
  });
});

describe("updateVoteMultiplier", () => {
  it("increases multiplier by 4% for Play (score=5)", () => {
    expect(updateVoteMultiplier(1.0, 5)).toBeCloseTo(1.04);
  });

  it("increases multiplier by 2% for Keep (score=4)", () => {
    expect(updateVoteMultiplier(1.0, 4)).toBeCloseTo(1.02);
  });

  it("decreases multiplier by 2% for Meh (score=2)", () => {
    expect(updateVoteMultiplier(1.0, 2)).toBeCloseTo(0.98);
  });

  it("decreases multiplier by 6% for Cut (score=1)", () => {
    expect(updateVoteMultiplier(1.0, 1)).toBeCloseTo(0.94);
  });

  it("compounds correctly over multiple votes", () => {
    let multiplier = 1.0;
    multiplier = updateVoteMultiplier(multiplier, 5); // 1.04
    multiplier = updateVoteMultiplier(multiplier, 5); // 1.0816
    expect(multiplier).toBeCloseTo(1.0816);
  });

  it("handles downward spiral (multiple cuts)", () => {
    let multiplier = 1.0;
    multiplier = updateVoteMultiplier(multiplier, 1); // 0.94
    multiplier = updateVoteMultiplier(multiplier, 1); // 0.8836
    expect(multiplier).toBeCloseTo(0.8836);
  });

  it("returns unchanged multiplier for unexpected score", () => {
    expect(updateVoteMultiplier(1.0, 3)).toBe(1.0);
    expect(updateVoteMultiplier(1.0, 100)).toBe(1.0);
  });

  it("never returns negative multiplier", () => {
    let multiplier = 0.01;
    multiplier = updateVoteMultiplier(multiplier, 1); // Should stay >= 0
    expect(multiplier).toBeGreaterThanOrEqual(0);
  });
});

describe("computeFinalScore", () => {
  it("returns timeScore when multiplier is 1.0", () => {
    expect(computeFinalScore(50, 1.0)).toBe(50);
  });

  it("boosts timeScore when multiplier > 1.0", () => {
    expect(computeFinalScore(50, 1.2)).toBe(60);
  });

  it("reduces timeScore when multiplier < 1.0", () => {
    expect(computeFinalScore(50, 0.8)).toBe(40);
  });

  it("clamps to 100 when multiplied score exceeds 100", () => {
    expect(computeFinalScore(80, 1.5)).toBe(100);
  });

  it("clamps to 0 when multiplied score is negative", () => {
    expect(computeFinalScore(-10, 1.0)).toBe(0);
  });

  it("handles edge case: perfect song", () => {
    expect(computeFinalScore(100, 1.0)).toBe(100);
  });

  it("handles edge case: cut immediately", () => {
    expect(computeFinalScore(0, 0.94)).toBe(0);
  });
});

describe("getScoringSnapshot", () => {
  it("returns all scoring metrics", () => {
    const snapshot = getScoringSnapshot(60, 120, 1.04);

    expect(snapshot).toEqual({
      playedSeconds: 60,
      durationSeconds: 120,
      timeScore: 50.0,
      voteMultiplier: 1.04,
      finalScore: 52.0,
    });
  });

  it("rounds values appropriately", () => {
    const snapshot = getScoringSnapshot(33, 100, 1.123456);

    expect(snapshot.timeScore).toBeCloseTo(33.0, 2);
    expect(snapshot.voteMultiplier).toBeCloseTo(1.1235, 4);
    expect(snapshot.finalScore).toBeCloseTo(37.07, 2);
  });
});

describe("Integration: Realistic scoring scenarios", () => {
  it("Scenario 1: Loved song that plays to completion", () => {
    let multiplier = 1.0;
    // 5 people vote Play
    multiplier = updateVoteMultiplier(multiplier, 5);
    multiplier = updateVoteMultiplier(multiplier, 5);
    multiplier = updateVoteMultiplier(multiplier, 5);
    multiplier = updateVoteMultiplier(multiplier, 5);
    multiplier = updateVoteMultiplier(multiplier, 5);

    const timeScore = computeTimeScore(180, 180); // Full song
    const finalScore = computeFinalScore(timeScore, multiplier);

    expect(finalScore).toBe(100); // Clamped to 100
    expect(multiplier).toBeGreaterThan(1.2); // Strong boost
  });

  it("Scenario 2: Hated song cut early", () => {
    let multiplier = 1.0;
    // 3 people vote Cut
    multiplier = updateVoteMultiplier(multiplier, 1);
    multiplier = updateVoteMultiplier(multiplier, 1);
    multiplier = updateVoteMultiplier(multiplier, 1);

    const timeScore = computeTimeScore(15, 180); // Cut after 15 seconds
    const finalScore = computeFinalScore(timeScore, multiplier);

    expect(finalScore).toBeLessThan(10); // Very low score
    expect(multiplier).toBeCloseTo(0.831, 3); // Harsh penalty
  });

  it("Scenario 3: Mixed reactions, moderate survival", () => {
    let multiplier = 1.0;
    // Mixed votes: 2 Play, 1 Keep, 2 Meh
    multiplier = updateVoteMultiplier(multiplier, 5); // 1.04
    multiplier = updateVoteMultiplier(multiplier, 5); // 1.0816
    multiplier = updateVoteMultiplier(multiplier, 4); // 1.103232
    multiplier = updateVoteMultiplier(multiplier, 2); // 1.08116736
    multiplier = updateVoteMultiplier(multiplier, 2); // 1.0595440128

    const timeScore = computeTimeScore(90, 180); // 50% played
    const finalScore = computeFinalScore(timeScore, multiplier);

    expect(finalScore).toBeGreaterThan(50);
    expect(finalScore).toBeLessThan(55);
    expect(multiplier).toBeCloseTo(1.0595, 4); // Slight boost from mixed reactions
  });
});
