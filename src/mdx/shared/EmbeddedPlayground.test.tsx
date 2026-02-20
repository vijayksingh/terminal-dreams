import { render, screen } from '@testing-library/react';
import { EmbeddedPlayground } from './EmbeddedPlayground';
import type { PlaygroundWorkspace } from '@/components/playground/types';

// Mock next/dynamic — Monaco becomes a simple editor mock
jest.mock('next/dynamic', () => {
  return (loader: () => Promise<unknown>, opts?: { loading?: () => React.ReactNode }) => {
    const DynamicComponent = (props: Record<string, unknown>) => {
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

// Mock the ShikiCodeViewer
jest.mock('./ShikiCodeViewer', () => ({
  ShikiCodeViewer: ({ code }: { code: string }) => (
    <div role="region" aria-label="Code preview">{code}</div>
  ),
}));

// Control whether builds resolve or not
let buildResolver: ((result: { srcDoc: string; blobUrls: string[] }) => void) | null = null;
let buildRejecter: ((err: Error) => void) | null = null;

jest.mock('@/components/playground/runtime', () => ({
  buildPlaygroundSource: jest.fn(() => new Promise((resolve, reject) => {
    buildResolver = resolve;
    buildRejecter = reject;
  })),
  revokeBlobUrls: jest.fn(),
}));

jest.mock('@/components/playground/presets', () => ({
  createWorkspaceFromPreset: jest.fn(() => createTestWorkspace()),
}));

function createTestWorkspace(): PlaygroundWorkspace {
  return {
    version: 1,
    preset: 'react-ts',
    entry: '/src/main.tsx',
    activeFileId: 'file-1',
    folders: ['/src'],
    files: [
      {
        id: 'file-1',
        path: '/src/main.tsx',
        language: 'typescript',
        content: 'export default function App() { return <div>Hello</div>; }',
      },
    ],
    dependencies: { react: '19.0.0' },
  };
}

describe('EmbeddedPlayground', () => {
  beforeEach(() => {
    buildResolver = null;
    buildRejecter = null;
  });

  it('renders file tabs that user can see', () => {
    render(<EmbeddedPlayground preset="react-ts" height={400} initialWorkspace={createTestWorkspace()} />);
    expect(screen.getByRole('button', { name: /main\.tsx/i })).toBeInTheDocument();
  });

  it('shows building status while compiling', () => {
    render(<EmbeddedPlayground preset="react-ts" height={400} initialWorkspace={createTestWorkspace()} />);
    // Build is in progress (promise never resolved)
    expect(screen.getByText('Building\u2026')).toBeInTheDocument();
  });

  it('shows preview iframe with title after build completes', async () => {
    render(<EmbeddedPlayground preset="react-ts" height={400} initialWorkspace={createTestWorkspace()} />);
    // Resolve the build
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        buildResolver?.({ srcDoc: '<html><body>Hello</body></html>', blobUrls: [] });
        resolve();
      }, 0);
    });
    // Wait for state update
    const iframe = await screen.findByTitle('Playground preview');
    expect(iframe).toBeInTheDocument();
  });

  it('shows descriptive error text when a build fails', async () => {
    render(<EmbeddedPlayground preset="react-ts" height={400} initialWorkspace={createTestWorkspace()} />);
    // Reject the build
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        buildRejecter?.(new Error('Syntax error in main.tsx'));
        resolve();
      }, 0);
    });
    expect(await screen.findByText('Build Error')).toBeInTheDocument();
    expect(await screen.findByText(/Syntax error in main\.tsx/)).toBeInTheDocument();
  });

  // RED TEST: The current EmbeddedPlayground has NO resize handle between
  // editor and preview panes. After the fix, there should be a draggable
  // separator (role="separator") that users can drag to resize panes.
  it('has a draggable resize handle between editor and preview panes', () => {
    render(<EmbeddedPlayground preset="react-ts" height={400} initialWorkspace={createTestWorkspace()} />);
    const separator = screen.getByRole('separator');
    expect(separator).toBeInTheDocument();
  });

  // RED TEST: When the build hasn't completed yet, the preview area should
  // show meaningful loading content, not a blank/empty iframe.
  // Currently the iframe gets srcDoc="" which renders as blank white/black box.
  it('does not show an empty iframe while build is pending', () => {
    render(<EmbeddedPlayground preset="react-ts" height={400} initialWorkspace={createTestWorkspace()} />);
    // While building, the iframe should not be present with empty srcDoc
    const iframe = screen.queryByTitle('Playground preview');
    // The iframe currently exists with empty srcDoc — we want it to NOT
    // be present until build completes (or show a loading placeholder instead)
    if (iframe) {
      // If iframe is present, its srcdoc should not be empty
      expect(iframe).toHaveAttribute('srcdoc');
      const srcDoc = iframe.getAttribute('srcdoc');
      expect(srcDoc).not.toBe('');
    }
  });
});
