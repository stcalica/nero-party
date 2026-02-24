import type { Meta, StoryObj } from '@storybook/react';
import PartyQRCode from './PartyQRCode';

/**
 * PartyQRCode component displays a QR code for easy party joining.
 * The QR code encodes a URL with the party code for instant joining via mobile scan.
 */
const meta: Meta<typeof PartyQRCode> = {
  title: 'Components/PartyQRCode',
  component: PartyQRCode,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#FAFAF8' },
        { name: 'dark', value: '#1F1F1D' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    partyCode: {
      control: 'text',
      description: 'The 6-character party code to encode in the QR code',
    },
  },
};

export default meta;
type Story = StoryObj<typeof PartyQRCode>;

/**
 * Default QR code with a standard party code
 */
export const Default: Story = {
  args: {
    partyCode: 'ABC123',
  },
};

/**
 * QR code with all letters
 */
export const AllLetters: Story = {
  args: {
    partyCode: 'XYZABC',
  },
};

/**
 * QR code with all numbers
 */
export const AllNumbers: Story = {
  args: {
    partyCode: '123456',
  },
};

/**
 * QR code with mixed characters
 */
export const MixedCharacters: Story = {
  args: {
    partyCode: 'A1B2C3',
  },
};
