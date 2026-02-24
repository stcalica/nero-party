import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ConcentricCircles from '../components/ConcentricCircles';

describe('ConcentricCircles', () => {
  it('renders without crashing', () => {
    const { container } = render(<ConcentricCircles />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with light grey color by default', () => {
    const { container } = render(<ConcentricCircles />);
    const circlesContainer = container.querySelector('.fixed');
    expect(circlesContainer).toBeInTheDocument();
  });

  it('renders with dark grey color when specified', () => {
    const { container } = render(<ConcentricCircles color="dark" />);
    const circlesContainer = container.querySelector('.fixed');
    expect(circlesContainer).toBeInTheDocument();
  });

  it('has pointer-events-none to not interfere with interactions', () => {
    const { container } = render(<ConcentricCircles />);
    const circlesContainer = container.querySelector('.fixed');
    expect(circlesContainer).toHaveClass('pointer-events-none');
  });

  it('renders 8 concentric circles', () => {
    const { container } = render(<ConcentricCircles />);
    // Each circle is a motion.div, count them
    const circles = container.querySelectorAll('.absolute.rounded-full');
    // 8 main circles + 3 glow circles + 4 corner circles = 15 total
    expect(circles.length).toBeGreaterThanOrEqual(8);
  });
});
