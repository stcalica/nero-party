import type { Meta, StoryObj } from '@storybook/react';
import EmojiTheme from './EmojiTheme';

/**
 * EmojiTheme creates immersive visual effects when users vote on songs.
 * Each vote score triggers a unique theme with:
 * - Colored glow around screen edges
 * - Continuous raining emojis with smart spawning
 * - Persistent effects that match the emoji's vibe
 *
 * Themes auto-toggle based on the user's current vote.
 */
const meta: Meta<typeof EmojiTheme> = {
  title: 'Components/EmojiTheme',
  component: EmojiTheme,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'app-bg',
      values: [
        { name: 'app-bg', value: '#FAFAF8' },
        { name: 'dark', value: '#1F1F1D' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isActive: {
      control: 'boolean',
      description: 'Whether the theme is currently active',
    },
    emoji: {
      control: 'text',
      description: 'The emoji to display in the theme',
    },
    glowColor: {
      control: 'color',
      description: 'The glow color in rgba format',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          textAlign: 'center',
          color: '#1F1F1D',
        }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '600' }}>
            Emoji Theme Active
          </h1>
          <p style={{ color: '#9A9A95', fontSize: '1.125rem' }}>
            Watch the continuous raining emojis and colored glow
          </p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EmojiTheme>;

/**
 * Fire theme (Score 4) - THE ULTIMATE VOTE
 * Warm orange glow with continuous fire emoji rain
 */
export const FireTheme: Story = {
  args: {
    isActive: true,
    emoji: '🔥',
    glowColor: 'rgba(249, 115, 22, 0.15)',
  },
};

/**
 * Okay theme (Score 3)
 * Purple ambient glow with music notes drifting down
 */
export const OkayTheme: Story = {
  args: {
    isActive: true,
    emoji: '🎵',
    glowColor: 'rgba(168, 85, 247, 0.15)',
  },
};

/**
 * Boring theme (Score 2)
 * Soft gray glow with floating sleepy emojis
 */
export const BoringTheme: Story = {
  args: {
    isActive: true,
    emoji: '😴',
    glowColor: 'rgba(156, 163, 175, 0.15)',
  },
};

/**
 * Terrible theme (Score 1)
 * Dark red glow with raining thumbs down emojis
 */
export const TerribleTheme: Story = {
  args: {
    isActive: true,
    emoji: '👎',
    glowColor: 'rgba(139, 0, 0, 0.15)',
  },
};

/**
 * Inactive theme - no visual effects
 */
export const Inactive: Story = {
  args: {
    isActive: false,
    emoji: '🔥',
    glowColor: 'rgba(249, 115, 22, 0.15)',
  },
};
