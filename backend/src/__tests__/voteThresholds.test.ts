import { describe, it, expect } from '@jest/globals';

describe('Vote Threshold Logic', () => {
  describe('Cut Threshold', () => {
    it('should trigger when more than half participants vote Cut', () => {
      const participantCount = 10;
      const cutVotes = 6;

      const shouldSkip = cutVotes > participantCount / 2;

      expect(shouldSkip).toBe(true);
    });

    it('should NOT trigger when exactly half vote Cut', () => {
      const participantCount = 10;
      const cutVotes = 5;

      const shouldSkip = cutVotes > participantCount / 2;

      expect(shouldSkip).toBe(false);
    });

    it('should NOT trigger when less than half vote Cut', () => {
      const participantCount = 10;
      const cutVotes = 4;

      const shouldSkip = cutVotes > participantCount / 2;

      expect(shouldSkip).toBe(false);
    });

    it('should handle odd participant counts correctly', () => {
      const participantCount = 9;
      const cutVotes = 5; // 5 > 4.5, so should skip

      const shouldSkip = cutVotes > participantCount / 2;

      expect(shouldSkip).toBe(true);
    });

    it('should handle single participant', () => {
      const participantCount = 1;
      const cutVotes = 1;

      const shouldSkip = cutVotes > participantCount / 2;

      expect(shouldSkip).toBe(true);
    });
  });

  describe('Meh Threshold', () => {
    it('should trigger when exactly half vote Meh', () => {
      const participantCount = 10;
      const mehVotes = 5;

      const shouldSeek = mehVotes >= participantCount / 2;

      expect(shouldSeek).toBe(true);
    });

    it('should trigger when more than half vote Meh', () => {
      const participantCount = 10;
      const mehVotes = 7;

      const shouldSeek = mehVotes >= participantCount / 2;

      expect(shouldSeek).toBe(true);
    });

    it('should NOT trigger when less than half vote Meh', () => {
      const participantCount = 10;
      const mehVotes = 4;

      const shouldSeek = mehVotes >= participantCount / 2;

      expect(shouldSeek).toBe(false);
    });

    it('should handle odd participant counts correctly', () => {
      const participantCount = 9;
      const mehVotes = 5; // 5 >= 4.5, so should seek

      const shouldSeek = mehVotes >= participantCount / 2;

      expect(shouldSeek).toBe(true);
    });
  });

  describe('Seek Position Calculation', () => {
    it('should seek to closest forward target (middle) when at start', () => {
      const songDuration = 120; // 2 minutes
      const currentTime = 0; // Just started

      const middle = Math.floor(songDuration / 2); // 60 seconds
      const last30 = Math.max(0, songDuration - 30); // 90 seconds
      const last15 = Math.max(0, songDuration - 15); // 105 seconds

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);
      const seekTo = Math.min(...forwardTargets);

      expect(seekTo).toBe(60); // Middle is closest forward target
    });

    it('should seek to last 30s when past middle but before last 30s', () => {
      const songDuration = 180; // 3 minutes
      const currentTime = 100; // 1:40 into the song

      const middle = Math.floor(songDuration / 2); // 90 seconds (1:30)
      const last30 = Math.max(0, songDuration - 30); // 150 seconds (2:30)
      const last15 = Math.max(0, songDuration - 15); // 165 seconds (2:45)

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);
      const seekTo = Math.min(...forwardTargets);

      expect(seekTo).toBe(150); // Last 30s is closest forward target
    });

    it('should seek to last 15s when past middle and last 30s', () => {
      const songDuration = 180; // 3 minutes
      const currentTime = 160; // 2:40 into the song

      const middle = Math.floor(songDuration / 2); // 90 seconds
      const last30 = Math.max(0, songDuration - 30); // 150 seconds
      const last15 = Math.max(0, songDuration - 15); // 165 seconds

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);
      const seekTo = forwardTargets.length > 0 ? Math.min(...forwardTargets) : null;

      expect(seekTo).toBe(165); // Last 15s is the only forward target
    });

    it('should not seek when past all targets', () => {
      const songDuration = 120; // 2 minutes
      const currentTime = 110; // 1:50 into the song

      const middle = Math.floor(songDuration / 2); // 60 seconds
      const last30 = Math.max(0, songDuration - 30); // 90 seconds
      const last15 = Math.max(0, songDuration - 15); // 105 seconds

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);

      expect(forwardTargets.length).toBe(0); // No forward targets
    });

    it('should handle very short songs (under 30 seconds)', () => {
      const songDuration = 20; // 20 seconds
      const currentTime = 0;

      const middle = Math.floor(songDuration / 2); // 10 seconds
      const last30 = Math.max(0, songDuration - 30); // 0 seconds (clamped)
      const last15 = Math.max(0, songDuration - 15); // 5 seconds

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);
      const seekTo = Math.min(...forwardTargets);

      expect(last30).toBe(0); // Clamped to 0
      expect(seekTo).toBe(5); // Last 15s is closest
    });

    it('should seek to middle for 5-minute song at start', () => {
      const songDuration = 300; // 5 minutes
      const currentTime = 0;

      const middle = Math.floor(songDuration / 2); // 150 seconds
      const last30 = Math.max(0, songDuration - 30); // 270 seconds
      const last15 = Math.max(0, songDuration - 15); // 285 seconds

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);
      const seekTo = Math.min(...forwardTargets);

      expect(seekTo).toBe(150); // Middle is closest
    });
  });

  describe('Threshold Priority', () => {
    it('should prioritize Cut over Meh when both thresholds met', () => {
      const participantCount = 10;
      const cutVotes = 6;
      const mehVotes = 5;

      const cutThreshold = cutVotes > participantCount / 2;
      const mehThreshold = mehVotes >= participantCount / 2;

      expect(cutThreshold).toBe(true);
      expect(mehThreshold).toBe(true);

      // Cut should be checked first (using if/else if logic)
      const action = cutThreshold ? 'skip' : mehThreshold ? 'seek' : 'continue';
      expect(action).toBe('skip');
    });

    it('should use Meh when Cut threshold not met', () => {
      const participantCount = 10;
      const cutVotes = 4;
      const mehVotes = 6;

      const cutThreshold = cutVotes > participantCount / 2;
      const mehThreshold = mehVotes >= participantCount / 2;

      expect(cutThreshold).toBe(false);
      expect(mehThreshold).toBe(true);

      const action = cutThreshold ? 'skip' : mehThreshold ? 'seek' : 'continue';
      expect(action).toBe('seek');
    });

    it('should continue when neither threshold met', () => {
      const participantCount = 10;
      const cutVotes = 3;
      const mehVotes = 4;

      const cutThreshold = cutVotes > participantCount / 2;
      const mehThreshold = mehVotes >= participantCount / 2;

      expect(cutThreshold).toBe(false);
      expect(mehThreshold).toBe(false);

      const action = cutThreshold ? 'skip' : mehThreshold ? 'seek' : 'continue';
      expect(action).toBe('continue');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero votes', () => {
      const participantCount = 10;
      const cutVotes = 0;
      const mehVotes = 0;

      const shouldSkip = cutVotes > participantCount / 2;
      const shouldSeek = mehVotes >= participantCount / 2;

      expect(shouldSkip).toBe(false);
      expect(shouldSeek).toBe(false);
    });

    it('should handle all participants voting Cut', () => {
      const participantCount = 10;
      const cutVotes = 10;

      const shouldSkip = cutVotes > participantCount / 2;

      expect(shouldSkip).toBe(true);
    });

    it('should handle all participants voting Meh', () => {
      const participantCount = 10;
      const mehVotes = 10;

      const shouldSeek = mehVotes >= participantCount / 2;

      expect(shouldSeek).toBe(true);
    });

    it('should handle 2 participants (minimum party size)', () => {
      const participantCount = 2;

      // Both vote Cut
      const cutVotes = 2;
      expect(cutVotes > participantCount / 2).toBe(true);

      // One votes Cut (not enough)
      const oneCutVote = 1;
      expect(oneCutVote > participantCount / 2).toBe(false);

      // One votes Meh (exactly half, should seek)
      const oneMehVote = 1;
      expect(oneMehVote >= participantCount / 2).toBe(true);
    });
  });

  describe('Real-world Scenarios', () => {
    it('scenario: 8 people, 5 vote Cut → should skip', () => {
      const participantCount = 8;
      const cutVotes = 5;

      expect(cutVotes > participantCount / 2).toBe(true);
    });

    it('scenario: 8 people, 4 vote Cut → should NOT skip', () => {
      const participantCount = 8;
      const cutVotes = 4;

      expect(cutVotes > participantCount / 2).toBe(false);
    });

    it('scenario: 15 people, 8 vote Meh → should seek', () => {
      const participantCount = 15;
      const mehVotes = 8;

      expect(mehVotes >= participantCount / 2).toBe(true);
    });

    it('scenario: 3:30 song at start, should seek to 1:45 (middle)', () => {
      const songDuration = 210; // 3 minutes 30 seconds
      const currentTime = 0; // Just started

      const middle = Math.floor(songDuration / 2); // 105s (1:45)
      const last30 = Math.max(0, songDuration - 30); // 180s (3:00)
      const last15 = Math.max(0, songDuration - 15); // 195s (3:15)

      const targets = [middle, last30, last15];
      const forwardTargets = targets.filter(t => t > currentTime);
      const seekTo = Math.min(...forwardTargets);

      expect(seekTo).toBe(105);
      // Middle (1:45) is the closest forward target when starting from beginning
    });
  });
});
