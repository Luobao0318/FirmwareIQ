export enum STM32Series {
  F0 = 'STM32F0',
  F1 = 'STM32F1',
  F2 = 'STM32F2',
  F3 = 'STM32F3',
  F4 = 'STM32F4',
  F7 = 'STM32F7',
  H7 = 'STM32H7',
  L0 = 'STM32L0',
  L1 = 'STM32L1',
  L4 = 'STM32L4',
  L5 = 'STM32L5',
  G0 = 'STM32G0',
  G4 = 'STM32G4',
  WB = 'STM32WB',
  WL = 'STM32WL',
}

export enum CodeLanguage {
  C = 'C',
  CPP = 'C++',
  ASM = 'Assembly',
}

export enum LibraryType {
  HAL = 'HAL',
  STD = 'STD',
}

export enum UILanguage {
  EN = 'EN',
  CN = 'CN',
}

export enum IssueSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
  OPTIMIZATION = 'OPTIMIZATION'
}

export interface ProjectFile {
  name: string;
  content: string;
  language: CodeLanguage;
}

export interface AnalysisIssue {
  fileName: string; // File associated with the issue
  line: number;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
}

export interface AnalysisResult {
  isValid: boolean;
  issues: AnalysisIssue[];
  summary: string;
}

export interface Commit {
  id: string;
  message: string;
  timestamp: number;
  files: ProjectFile[]; // Snapshot of all files
  series: STM32Series;
}

export interface AppState {
  files: ProjectFile[];
  activeFileName: string;
  selectedSeries: STM32Series;
  uiLanguage: UILanguage;
  isAnalyzing: boolean;
  isFixing: boolean;
  analysisResult: AnalysisResult | null;
  fixedCode: string | null; // Content of the fix for the ACTIVE file
  commits: Commit[];
}