/**
 * Frontend scoring utilities for displaying and calculating song scores.
 * These functions help present the new FinalScore system in the UI.
 */

import type { Song } from "../types";

/**
 * Calculate a projected "live" score for a currently playing song.
 * This gives users real-time feedback during playback.
 *
 * @param song - The currently playing song with votes
 * @param elapsedSeconds - How long the song has been playing
 * @returns Projected FinalScore (0-100) or null if insufficient data
 *
 * Formula: (elapsedSeconds / duration) * 100 * voteMultiplier
 */
export function calculateProjectedScore(
  song: Song,
  elapsedSeconds: number
): number | null {
  if (!song || !song.duration || elapsedSeconds < 0) {
    return null;
  }

  // Calculate time score percentage
  const timeScore = Math.min(100, (elapsedSeconds / song.duration) * 100);

  // Calculate vote multiplier from current votes
  const voteMultiplier = calculateVoteMultiplier(song.votes || []);

  // Compute projected final score
  const projectedScore = timeScore * voteMultiplier;

  // Clamp to [0, 100]
  return Math.max(0, Math.min(100, projectedScore));
}

/**
 * Calculate vote multiplier from votes array.
 * Matches backend logic: starts at 1.0, compounds on each vote.
 *
 * Vote multipliers:
 * - score 5 (🔥 Play) → ×1.04
 * - score 4 (👍 Keep) → ×1.02
 * - score 2 (😐 Meh)  → ×0.98
 * - score 1 (⛔ Cut)  → ×0.94
 *
 * @param votes - Array of votes with score property
 * @returns Compounded vote multiplier
 */
function calculateVoteMultiplier(votes: Array<{ score: number }>): number {
  const multiplierMap: Record<number, number> = {
    1: 0.94, // Cut: -6%
    2: 0.98, // Meh: -2%
    4: 1.02, // Keep: +2%
    5: 1.04, // Play: +4%
  };

  let multiplier = 1.0;

  for (const vote of votes) {
    const factor = multiplierMap[vote.score] ?? 1.0;
    multiplier *= factor;
  }

  return multiplier;
}

/**
 * Format a score for display with appropriate precision.
 *
 * @param score - Raw score value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "87.5" or "100.0")
 *
 * Examples:
 * - formatScore(87.456) → "87.5"
 * - formatScore(100) → "100.0"
 * - formatScore(null) → "—"
 */
export function formatScore(
  score: number | null | undefined,
  decimals: number = 1
): string {
  if (score === null || score === undefined) {
    return "—";
  }

  return score.toFixed(decimals);
}

/**
 * Get Tailwind color class based on score tier.
 * Helps visually distinguish high vs low scores.
 *
 * Score tiers:
 * - 90-100: Legendary (purple)
 * - 80-89: Excellent (green)
 * - 60-79: Good (blue)
 * - 40-59: Fair (yellow)
 * - 0-39: Poor (red)
 *
 * @param score - Score value (0-100)
 * @returns Tailwind text color class
 */
export function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return "text-gray-400";
  }

  if (score >= 90) return "text-purple-500";
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-yellow-500";
  return "text-red-500";
}

/**
 * Get score tier label for display.
 *
 * @param score - Score value (0-100)
 * @returns Human-readable tier label
 */
export function getScoreTier(score: number | null | undefined): string {
  if (score === null || score === undefined) {
    return "Not Rated";
  }

  if (score >= 90) return "Legendary";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Work";
}

/**
 * Get medal emoji for leaderboard position.
 *
 * @param position - 1-indexed position (1 = first place)
 * @returns Medal emoji or empty string
 */
export function getMedalEmoji(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "";
}
