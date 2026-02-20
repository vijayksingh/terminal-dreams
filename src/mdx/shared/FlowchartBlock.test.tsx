import { render, screen } from '@testing-library/react';
import { FlowchartBlock } from './FlowchartBlock';

describe('FlowchartBlock', () => {
  it('renders box-drawing content as a styled pre element, not a code editor', () => {
    render(<FlowchartBlock content="┌──────┐\n│ Node │\n└──────┘" />);
    expect(screen.getByRole('figure')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('does not activate for code blocks that have a language tag', () => {
    const { container } = render(<FlowchartBlock content="const x = 1;" language="typescript" />);
    // Component should return null when language is provided
    expect(container.firstChild).toBeNull();
  });

  it('preserves all box-drawing characters without corruption', () => {
    const boxArt = '╔═══╗\n║ A ║\n╚═══╝';
    render(<FlowchartBlock content={boxArt} />);
    const pre = screen.getByRole('figure').querySelector('pre');
    expect(pre).toHaveTextContent('╔═══╗');
    expect(pre).toHaveTextContent('║ A ║');
    expect(pre).toHaveTextContent('╚═══╝');
  });

  it('renders with monospace font to preserve character alignment', () => {
    const diagram = '┌───┐    ┌───┐\n│ A │───→│ B │\n└───┘    └───┘';
    render(<FlowchartBlock content={diagram} />);
    const pre = screen.getByRole('figure').querySelector('pre');
    const fontFamily = pre?.style.fontFamily || '';
    expect(fontFamily).toMatch(/mono/i);
  });
});
