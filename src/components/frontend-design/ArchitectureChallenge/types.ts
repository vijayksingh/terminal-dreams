/** Shared types for the ArchitectureChallenge primitive */

export type Block = {
  id: string;
  label: string;
  description: string;
  category?: string;
};

export type Connection = {
  from: string;
  to: string;
};

export type ValidationRule = {
  required: Connection[];
  forbidden?: Connection[];
  requiredBlocks?: string[];
  errorMessages: Record<string, string>;
};

export type MysteryBlock = {
  hint: string;
  answer: string;
  answerLabel: string;
};

export type ScalingScenario = {
  id: string;
  title: string;
  description: string;
  initialState?: Connection[];
  addBlocks?: Block[];
  removeBlocks?: string[];
  validation: ValidationRule;
};

export type ArchitectureChallengeProps = {
  title: string;
  blocks: Block[];
  validation: ValidationRule;
  mysteryBlock?: MysteryBlock;
  scenarios?: ScalingScenario[];
  revealedAnswer?: Connection[];
  colorToken?: string;
  /** Callback fired after validation completes */
  onComplete?: (result: ValidationResult) => void;
  /** Pre-place blocks at specific canvas positions instead of auto-layout */
  initialPlacements?: Record<string, { x: number; y: number }>;
};

/** Internal types used by the component */

export type PlacedBlock = {
  id: string;
  x: number;
  y: number;
};

export type ConnectionKey = `${string}->${string}`;

export type ValidationStatus = "idle" | "checking" | "complete";

export type ConnectionFeedback = {
  key: ConnectionKey;
  status: "correct" | "missing" | "extra" | "forbidden";
  message?: string;
};

export type ValidationResult = {
  score: number;
  total: number;
  feedback: ConnectionFeedback[];
};
