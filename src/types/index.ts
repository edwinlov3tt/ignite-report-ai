// Campaign Types
export interface LineItem {
  id: string;
  product: string;
  subProduct: string;
  tacticTypeSpecial?: string | string[];
  status: string;
  workflowStepName?: string;
  startDate: string;
  endDate: string;
  wideOrbitOrderNumber?: string;
  woOrderNumber?: string;
  platform?: string;
  totalBudget?: number;
  monthlyBudget?: number;
  initiative?: string;
}

// Initiative tracking
export interface Initiative {
  name: string;
  lineItemCount: number;
  isActive: boolean;
}

export interface CampaignData {
  id: string;
  orderId: string;
  companyName: string;
  orderName: string;
  wideOrbitNumber: string;
  status: string;
  startDate: string;
  endDate: string;
  daysElapsed: number;
  daysRemaining: number;
  lineItems: LineItem[];
}

// Tactic Types
export interface DetectedTactic {
  name: string;
  product: string;
  subProduct: string;
  platform: string;
  lineItemIds: string[];
  status: 'pending' | 'has_files' | 'complete';
}

// File Types
export interface ParsedCSV {
  headers: string[];
  data: Record<string, string | number>[];
  rowCount: number;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  headers: string[];
  data: ParsedCSV['data'];
  tacticName: string;
  confidence: number;
  autoSorted: boolean;
  source: 'manual' | 'zip_extraction' | 'drag_drop' | 'pptx_extraction';
  uploadedAt: Date;
}

export interface FilesByTactic {
  [tacticName: string]: UploadedFile[];
}

// Company Config
export interface CompanyConfig {
  companyName: string;
  industry: string;
  campaignGoals: string;
  additionalNotes: string;
  marketResearchUrl?: string;
}

// Time Range
export interface TimeRange {
  startDate: string;
  endDate: string;
  preset?: string;
  durationDays: number;
}

// AI Analysis Config
export type ToneType = 'professional' | 'conversational' | 'analytical' | 'encouraging' | 'concise' | 'casual';

export interface AnalysisConfig {
  model: string;
  modelName: string;
  temperature: number;
  tone: ToneType;
  customInstructions: string;
}

// Analysis Results
export interface TacticAnalysis {
  summary: string;
  metrics: Record<string, number | string>;
  trends: string[];
  recommendations: string[];
}

export interface AnalysisResults {
  executiveSummary: string;
  tacticPerformance: Record<string, TacticAnalysis>;
  overallMetrics: Record<string, number | string>;
  recommendations: string[];
  generatedAt: string;
  campaignName: string;
  companyName: string;
}

// Schema Types (for file routing)
export interface TableSchema {
  tableName: string;
  fileName: string;
  headers: string[];
  aliases: string[];
}

export interface SubProductSchema {
  performanceTables: TableSchema[];
}

export interface TacticSchema {
  platform: string[];
  product: string;
  subProducts: Record<string, SubProductSchema>;
}

export interface SchemaData {
  platforms: Record<string, string[]>;
  tactics: Record<string, TacticSchema>;
}

// Workflow Step
export type WorkflowStep = 1 | 2 | 3 | 4 | 5;
