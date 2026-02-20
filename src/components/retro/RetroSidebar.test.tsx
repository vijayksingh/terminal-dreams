import { render, screen, within } from '@testing-library/react';
import { RetroSidebar } from './RetroSidebar';

describe('RetroSidebar', () => {
  it('renders as a complementary landmark', () => {
    render(<RetroSidebar postsCount={5} />);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it('displays the System Status heading', () => {
    render(<RetroSidebar postsCount={5} />);
    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).getByRole('heading', { level: 3 })).toHaveTextContent(/System Status/);
  });

  it('displays the post count from props', () => {
    render(<RetroSidebar postsCount={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
  });

  it('displays all stat labels', () => {
    render(<RetroSidebar postsCount={5} />);
    expect(screen.getByText('Visitors')).toBeInTheDocument();
    expect(screen.getByText('Posts')).toBeInTheDocument();
    expect(screen.getByText('Dreams')).toBeInTheDocument();
    expect(screen.getByText('Forever')).toBeInTheDocument();
  });

  it('does not contain any h1 headings', () => {
    render(<RetroSidebar postsCount={5} />);
    const h1Elements = screen.queryAllByRole('heading', { level: 1 });
    expect(h1Elements).toHaveLength(0);
  });

  // RED TEST: The sidebar stats currently render as visually prominent
  // standalone blocks. After the fix, each stat should be grouped with
  // its label using a description list (dl/dt/dd) pattern for better
  // semantics and reduced visual dominance.
  it('renders statistics as a description list for proper semantics', () => {
    render(<RetroSidebar postsCount={5} />);
    // After the fix, stats should use <dl>/<dt>/<dd> pattern
    // Currently they use generic divs with no semantic structure
    const sidebar = screen.getByRole('complementary');
    // A definition list should group the stats
    const definitionList = within(sidebar).getByRole('list');
    expect(definitionList).toBeInTheDocument();
  });
});
