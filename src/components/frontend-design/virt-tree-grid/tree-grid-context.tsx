"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const TOTAL_STEPS = 8;

export const STEP_LABELS = ["Tr", "Df", "Ex", "Gr", "Rw", "Cl", "Cx", "Pr"] as const;

export const STEP_TITLES = [
  "Tree Structure",
  "DFS Flattening",
  "Expand / Collapse",
  "Grid Overview",
  "Row Window",
  "Column Window",
  "Cell Intersection",
  "Production Libraries",
] as const;

export type TreeNode = {
  id: string;
  label: string;
  isFolder: boolean;
  children: TreeNode[];
};

export const MOCK_TREE: TreeNode = {
  id: "root",
  label: "src",
  isFolder: true,
  children: [
    {
      id: "components",
      label: "components",
      isFolder: true,
      children: [
        { id: "button", label: "Button.tsx", isFolder: false, children: [] },
        { id: "modal", label: "Modal.tsx", isFolder: false, children: [] },
        {
          id: "forms",
          label: "forms",
          isFolder: true,
          children: [
            { id: "input", label: "Input.tsx", isFolder: false, children: [] },
            { id: "select", label: "Select.tsx", isFolder: false, children: [] },
          ],
        },
      ],
    },
    {
      id: "utils",
      label: "utils",
      isFolder: true,
      children: [
        { id: "cn", label: "cn.ts", isFolder: false, children: [] },
        { id: "format", label: "format.ts", isFolder: false, children: [] },
      ],
    },
    {
      id: "hooks",
      label: "hooks",
      isFolder: true,
      children: [
        { id: "use-auth", label: "useAuth.ts", isFolder: false, children: [] },
      ],
    },
    { id: "index", label: "index.ts", isFolder: false, children: [] },
  ],
};

export type FlatNode = {
  id: string;
  label: string;
  depth: number;
  isFolder: boolean;
  hasChildren: boolean;
  isExpanded: boolean;
};

export function flattenTree(
  node: TreeNode,
  expanded: Set<string>,
  depth: number = 0,
): FlatNode[] {
  const result: FlatNode[] = [];
  const isExpanded = expanded.has(node.id);

  result.push({
    id: node.id,
    label: node.label,
    depth,
    isFolder: node.isFolder,
    hasChildren: node.children.length > 0,
    isExpanded,
  });

  if (isExpanded) {
    for (const child of node.children) {
      result.push(...flattenTree(child, expanded, depth + 1));
    }
  }

  return result;
}

type TreeGridContextValue = {
  activeStep: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  flatNodes: FlatNode[];
};

const TreeGridContext = createContext<TreeGridContextValue | null>(null);

export function useTreeGridContext(): TreeGridContextValue {
  const ctx = useContext(TreeGridContext);
  if (!ctx) throw new Error("useTreeGridContext must be used within TreeGridProvider");
  return ctx;
}

export function TreeGridProvider({
  activeStep,
  children,
}: {
  activeStep: number;
  children: ReactNode;
}) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    () => new Set(["root", "components", "utils"]),
  );

  const toggleNode = useCallback((id: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const flatNodes = useMemo(
    () => flattenTree(MOCK_TREE, expandedNodes),
    [expandedNodes],
  );

  return (
    <TreeGridContext.Provider value={{ activeStep, expandedNodes, toggleNode, flatNodes }}>
      {children}
    </TreeGridContext.Provider>
  );
}
