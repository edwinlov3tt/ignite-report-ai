import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CampaignData,
  DetectedTactic,
  CompanyConfig,
  TimeRange,
  AnalysisConfig,
  AnalysisResults,
  FilesByTactic,
  UploadedFile,
  WorkflowStep,
  ToneType,
} from '@/types';

interface AppState {
  // Workflow
  currentStep: WorkflowStep;
  setCurrentStep: (step: WorkflowStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // Campaign Data
  campaignData: CampaignData | null;
  setCampaignData: (data: CampaignData | null) => void;

  // Detected Tactics
  detectedTactics: DetectedTactic[];
  setDetectedTactics: (tactics: DetectedTactic[]) => void;
  removeTactic: (tacticName: string) => void;

  // Company Config
  companyConfig: CompanyConfig;
  setCompanyConfig: (config: Partial<CompanyConfig>) => void;

  // Time Range
  timeRange: TimeRange | null;
  setTimeRange: (range: TimeRange | null) => void;

  // File Uploads
  filesByTactic: FilesByTactic;
  addFileToTactic: (tacticName: string, file: UploadedFile) => void;
  removeFileFromTactic: (tacticName: string, fileId: string) => void;
  clearFilesForTactic: (tacticName: string) => void;
  clearAllFiles: () => void;

  // Analysis Config
  analysisConfig: AnalysisConfig;
  setAnalysisConfig: (config: Partial<AnalysisConfig>) => void;

  // Analysis Results
  analysisResults: AnalysisResults | null;
  setAnalysisResults: (results: AnalysisResults | null) => void;

  // Loading States
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;

  // Errors
  error: string | null;
  setError: (error: string | null) => void;

  // Reset
  resetStore: () => void;
}

const defaultCompanyConfig: CompanyConfig = {
  companyName: '',
  industry: '',
  campaignGoals: '',
  additionalNotes: '',
};

const defaultAnalysisConfig: AnalysisConfig = {
  model: 'claude-sonnet-4-20250514',
  modelName: 'Claude Sonnet 4',
  temperature: 0.5,
  tone: 'professional' as ToneType,
  customInstructions: '',
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Workflow
      currentStep: 1,
      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => {
        const { currentStep } = get();
        if (currentStep < 5) {
          set({ currentStep: (currentStep + 1) as WorkflowStep });
        }
      },
      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: (currentStep - 1) as WorkflowStep });
        }
      },

      // Campaign Data
      campaignData: null,
      setCampaignData: (data) => set({ campaignData: data }),

      // Detected Tactics
      detectedTactics: [],
      setDetectedTactics: (tactics) => set({ detectedTactics: tactics }),
      removeTactic: (tacticName) =>
        set((state) => ({
          detectedTactics: state.detectedTactics.filter((t) => t.name !== tacticName),
        })),

      // Company Config
      companyConfig: defaultCompanyConfig,
      setCompanyConfig: (config) =>
        set((state) => ({
          companyConfig: { ...state.companyConfig, ...config },
        })),

      // Time Range
      timeRange: null,
      setTimeRange: (range) => set({ timeRange: range }),

      // File Uploads
      filesByTactic: {},
      addFileToTactic: (tacticName, file) =>
        set((state) => ({
          filesByTactic: {
            ...state.filesByTactic,
            [tacticName]: [...(state.filesByTactic[tacticName] || []), file],
          },
        })),
      removeFileFromTactic: (tacticName, fileId) =>
        set((state) => ({
          filesByTactic: {
            ...state.filesByTactic,
            [tacticName]: (state.filesByTactic[tacticName] || []).filter(
              (f) => f.id !== fileId
            ),
          },
        })),
      clearFilesForTactic: (tacticName) =>
        set((state) => {
          const newFilesByTactic = { ...state.filesByTactic };
          delete newFilesByTactic[tacticName];
          return { filesByTactic: newFilesByTactic };
        }),
      clearAllFiles: () => set({ filesByTactic: {} }),

      // Analysis Config
      analysisConfig: defaultAnalysisConfig,
      setAnalysisConfig: (config) =>
        set((state) => ({
          analysisConfig: { ...state.analysisConfig, ...config },
        })),

      // Analysis Results
      analysisResults: null,
      setAnalysisResults: (results) => set({ analysisResults: results }),

      // Loading States
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      loadingMessage: '',
      setLoadingMessage: (message) => set({ loadingMessage: message }),

      // Errors
      error: null,
      setError: (error) => set({ error: error }),

      // Reset
      resetStore: () =>
        set({
          currentStep: 1,
          campaignData: null,
          detectedTactics: [],
          companyConfig: defaultCompanyConfig,
          timeRange: null,
          filesByTactic: {},
          analysisConfig: defaultAnalysisConfig,
          analysisResults: null,
          isLoading: false,
          loadingMessage: '',
          error: null,
        }),
    }),
    {
      name: 'report-ai-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        campaignData: state.campaignData,
        detectedTactics: state.detectedTactics,
        companyConfig: state.companyConfig,
        timeRange: state.timeRange,
        filesByTactic: state.filesByTactic,
        analysisConfig: state.analysisConfig,
      }),
    }
  )
);
