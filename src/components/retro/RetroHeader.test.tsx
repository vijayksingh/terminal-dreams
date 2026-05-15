import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroHeader } from './RetroHeader';

// Mock motion/react — render as plain span, forwarding DOM-standard events only
jest.mock('motion/react', () => ({
  motion: {
    span: ({ children, onHoverStart, onHoverEnd, className, ...rest }: Record<string, unknown>) => {
      // motion.span uses onHoverStart/onHoverEnd which are not DOM events
      // We render a plain span — hover via userEvent won't trigger scramble
      return <span className={className as string}>{children as React.ReactNode}</span>;
    },
  },
}));

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => (
    <img {...props} alt={props.alt as string} />
  ),
}));

// Mock FaultyTerminal — WebGL component, not testable in jsdom
jest.mock('@/components/interactions/FaultyTerminal', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock RetroAboutCard
jest.mock('./RetroAboutCard', () => ({
  RetroAboutCard: () => <aside aria-label="About the author">About card</aside>,
}));

// Mock matchMedia for usePrefersReducedMotion
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

describe('RetroHeader', () => {
  it('renders the TERMINAL_DREAMS heading', () => {
    render(<RetroHeader />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('TERMINAL_DREAMS');
  });

  it('renders the ASCII art banner', () => {
    render(<RetroHeader />);
    // The ASCII art contains the closing ║ characters
    expect(screen.getByText(/╔═══/)).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<RetroHeader />);
    const nav = screen.getByRole('navigation');
    const links = within(nav).getAllByRole('link');
    expect(links.length).toBe(5);

    // Check that each expected href exists
    const hrefs = links.map((link) => link.getAttribute('href'));
    expect(hrefs).toContain('/blog');
    expect(hrefs).toContain('/playground');
    expect(hrefs).toContain('/about');
    expect(hrefs).toContain('/guestbook');
    expect(hrefs).toContain('/webring');
  });

  it('renders subtitle text', () => {
    render(<RetroHeader />);
    expect(screen.getByText(/Nostalgic bytes from the digital underground/)).toBeInTheDocument();
  });

  // RED TEST: When the user hovers a nav link, the ScrambleHover component
  // should change the displayed text (scramble animation). Currently,
  // with motion/react mocked as a plain span, the onHoverStart callback
  // never fires, so the text remains unchanged. This test asserts that
  // the visible text CHANGES — it should FAIL because the mock strips
  // the hover interaction.
  it('changes displayed text when user hovers a navigation link', async () => {
    const user = userEvent.setup();
    render(<RetroHeader />);
    const nav = screen.getByRole('navigation');
    const archiveLink = within(nav).getByRole('link', { name: /archive/i });

    // Get the original visible text inside the link
    const originalText = archiveLink.textContent;

    // Hover over the link
    await user.hover(archiveLink);

    // After hover, the ScrambleHover should have changed the text
    // With the motion mock stripping onHoverStart, this WILL FAIL
    // because the text stays the same
    await new Promise((r) => setTimeout(r, 100));
    expect(archiveLink.textContent).not.toBe(originalText);
  });

  it('renders the about card when showAboutCard is true', () => {
    render(<RetroHeader showAboutCard />);
    expect(screen.getByLabelText('About the author')).toBeInTheDocument();
  });
});
