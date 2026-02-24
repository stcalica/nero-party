import type { Meta, StoryObj } from '@storybook/react';
import ConcentricCircles from './ConcentricCircles';

/**
 * ConcentricCircles is an interactive background visualizer with smooth mouse-following
 * concentric circles that create depth and visual interest across the application.
 *
 * Features:
 * - 8 concentric circles with smooth spring physics
 * - Mouse-following animation within 80px radius
 * - Pulsing effects with staggered timing
 * - Two grey tone variations (light and dark)
 */
const meta: Meta<typeof ConcentricCircles> = {
  title: 'Components/ConcentricCircles',
  component: ConcentricCircles,
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
    color: {
      control: 'radio',
      options: ['light', 'dark'],
      description: 'Color variant for the circles',
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
          <h1 style={{ fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Move your mouse
          </h1>
          <p style={{ color: '#9A9A95' }}>
            Watch the circles follow smoothly
          </p>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConcentricCircles>;

/**
 * Light grey circles - used on main screens (home, active party, party ended)
 */
export const LightGrey: Story = {
  args: {
    color: 'light',
  },
};

/**
 * Dark grey circles - used on secondary screens (create/join forms, lobby)
 */
export const DarkGrey: Story = {
  args: {
    color: 'dark',
  },
};
