import { render, screen } from '@testing-library/react';
import RetroBlog from './RetroBlog';

describe('RetroBlog', () => {
  it('renders header title and posts ', () => {
    render(
      <RetroBlog
        posts={[
          {
            slug: 'sample-interactive',
            title: 'Terminal Dreams: Interactive MDX',
            date: '2025-09-01',
            category: 'Cyberspace',
            readTime: '3 min read',
            summary: 'A sample MDX post with code highlighting and an interactive counter component.',
          },
        ]}
      />
    );
    expect(screen.getByText('TERMINAL_DREAMS')).toBeInTheDocument();
    expect(screen.getAllByText('Terminal Dreams: Interactive MDX').length).toBeGreaterThan(0);
  });
});


