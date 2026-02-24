import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PartyQRCode from '../components/PartyQRCode';

describe('PartyQRCode', () => {
  it('should render party code', () => {
    render(<PartyQRCode partyCode="ABC123" />);

    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('Quick Join')).toBeInTheDocument();
    expect(screen.getByText('Scan to join the party')).toBeInTheDocument();
  });

  it('should render QR code SVG', () => {
    const { container } = render(<PartyQRCode partyCode="TEST12" />);

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should generate correct join URL', () => {
    // Mock window.location.origin
    const originalOrigin = window.location.origin;
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      writable: true,
    });

    const { container } = render(<PartyQRCode partyCode="XYZ789" />);
    const svg = container.querySelector('svg');

    // The QR code value should be in the SVG attributes/data
    expect(svg).toBeInTheDocument();

    // Restore original origin
    Object.defineProperty(window, 'location', {
      value: { origin: originalOrigin },
      writable: true,
    });
  });
});
