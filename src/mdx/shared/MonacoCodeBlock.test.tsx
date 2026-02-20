import { render, screen } from '@testing-library/react';
import { MonacoCodeBlock } from './MonacoCodeBlock';

// Track options passed to Monaco
let lastMonacoOptions: Record<string, unknown> | undefined;

// Mock next/dynamic to just render the component synchronously
jest.mock('next/dynamic', () => {
  return (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    // Return a component that calls the loader synchronously-ish
    const DynamicComponent = (props: Record<string, unknown>) => {
      // Capture the options for assertion
      lastMonacoOptions = props.options as Record<string, unknown> | undefined;
      const value = props.value as string;
      return (
        <div role="textbox" aria-label="Code editor">
          {value}
        </div>
      );
    };
    DynamicComponent.displayName = 'DynamicMock';
    return DynamicComponent;
  };
});

jest.mock('@/lib/monaco-setup', () => ({
  setupMonaco: jest.fn(),
}));

jest.mock('@/lib/monaco-vesper', () => ({
  VESPER_THEME_NAME: 'vesper',
}));


describe('MonacoCodeBlock', () => {
  beforeEach(() => {
    lastMonacoOptions = undefined;
  });

  it('renders code content visible to the user', () => {
    render(
      <MonacoCodeBlock>
        <code className="language-typescript">const x = 42;</code>
      </MonacoCodeBlock>
    );
    expect(screen.getByRole('textbox', { name: 'Code editor' })).toHaveTextContent('const x = 42;');
  });

  it('renders copy button accessible to the user', () => {
    render(
      <MonacoCodeBlock>
        <code className="language-typescript">const x = 42;</code>
      </MonacoCodeBlock>
    );
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toBeVisible();
  });

  // RED TEST: The current MonacoCodeBlock options do NOT include guides config
  // to disable indent guides. After the fix, the options will include
  // guides: { indentation: false } to remove visual clutter.
  it('passes options to disable indent guides in the editor', () => {
    render(
      <MonacoCodeBlock>
        <code className="language-typescript">{'function hello() {\n  return 42;\n}'}</code>
      </MonacoCodeBlock>
    );
    expect(lastMonacoOptions).toBeDefined();
    const guides = lastMonacoOptions?.guides as { indentation?: boolean } | undefined;
    expect(guides).toBeDefined();
    expect(guides?.indentation).toBe(false);
  });
});
