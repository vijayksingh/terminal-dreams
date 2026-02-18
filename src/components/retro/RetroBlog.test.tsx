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
            kind: 'post' as const,
          },
        ]}
      />
    );
    expect(screen.getByText('TERMINAL_DREAMS')).toBeInTheDocument();
    expect(screen.getAllByText('Terminal Dreams: Interactive MDX').length).toBeGreaterThan(0);
  });
});


