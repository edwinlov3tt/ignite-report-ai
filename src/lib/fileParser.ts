import Papa from 'papaparse';
import JSZip from 'jszip';
import type { ParsedCSV, UploadedFile } from '@/types';

/**
 * Parse a CSV file using Papa Parse with Web Worker support
 */
export async function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      worker: true, // Use web worker for large files
      dynamicTyping: true, // Auto-convert numbers
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parse warnings:', results.errors);
        }
        resolve({
          headers: results.meta.fields || [],
          data: results.data as Record<string, string | number>[],
          rowCount: results.data.length,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Parse CSV from text content (for ZIP extraction)
 */
export function parseCSVText(content: string): ParsedCSV {
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (results.errors.length > 0) {
    console.warn('CSV parse warnings:', results.errors);
  }

  return {
    headers: results.meta.fields || [],
    data: results.data as Record<string, string | number>[],
    rowCount: results.data.length,
  };
}

/**
 * Extract CSV files from a ZIP archive with progress tracking
 */
export async function extractZip(
  file: File,
  onProgress?: (percent: number, currentFile: string) => void
): Promise<{ name: string; content: string; parsed: ParsedCSV }[]> {
  const zip = await JSZip.loadAsync(file);
  const csvFiles: { name: string; content: string; parsed: ParsedCSV }[] = [];

  const entries = Object.entries(zip.files).filter(
    ([path, entry]) => path.toLowerCase().endsWith('.csv') && !entry.dir
  );

  for (let i = 0; i < entries.length; i++) {
    const [path, zipEntry] = entries[i];

    // Skip macOS resource fork files
    if (path.includes('__MACOSX') || path.startsWith('.')) {
      continue;
    }

    onProgress?.((i / entries.length) * 100, path);

    const content = await zipEntry.async('text');
    const parsed = parseCSVText(content);

    // Only include files with actual data
    if (parsed.headers.length > 0 && parsed.rowCount > 0) {
      csvFiles.push({
        name: path.split('/').pop() || path, // Get filename from path
        content,
        parsed,
      });
    }
  }

  onProgress?.(100, 'Complete');
  return csvFiles;
}

/**
 * Calculate Jaccard similarity between two sets of headers
 */
export function calculateJaccardSimilarity(
  headers1: string[],
  headers2: string[]
): number {
  const set1 = new Set(headers1.map((h) => h.toLowerCase().trim()));
  const set2 = new Set(headers2.map((h) => h.toLowerCase().trim()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

/**
 * Generate a unique ID for uploaded files
 */
export function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an UploadedFile object from parsed CSV
 */
export function createUploadedFile(
  file: File | { name: string; size?: number },
  parsed: ParsedCSV,
  tacticName: string,
  confidence: number,
  source: UploadedFile['source']
): UploadedFile {
  return {
    id: generateFileId(),
    name: file.name,
    size: 'size' in file ? file.size || 0 : (file as File).size,
    headers: parsed.headers,
    data: parsed.data,
    tacticName,
    confidence,
    autoSorted: confidence > 0,
    source,
    uploadedAt: new Date(),
  };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
