import logger from '../core/logger';

export interface Chunk {
  content: string;
  metadata: Record<string, any>;
}

export class RagTextProcessor {
  /**
   * Cleans and normalizes text for embedding.
   */
  public cleanText(text: string): string {
    return text
      .replace(/[^\S\r\n]+/g, ' ') // Collapse spaces but keep newlines
      .replace(/[\r\n]{3,}/g, '\n\n') // Collapse excessive newlines
      .trim();
  }

  /**
   * Chunks text semantically.
   * Simple implementation: Fixed size with overlap.
   */
  public chunkText(text: string, size: number = 500, overlap: number = 50): string[] {
    const chunks: string[] = [];
    if (!text) return chunks;

    let start = 0;
    while (start < text.length) {
      let end = start + size;
      
      // Try to find a sentence boundary or newline near the end
      if (end < text.length) {
        const nextPeriod = text.indexOf('.', end - 50);
        const nextNewline = text.indexOf('\n', end - 50);

        if (nextNewline !== -1 && nextNewline < end + 50) {
            end = nextNewline + 1;
        } else if (nextPeriod !== -1 && nextPeriod < end + 50) {
            end = nextPeriod + 1;
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlap;
      if (start < 0) start = 0;
      if (start >= text.length) break;
      if (end >= text.length) break;
    }
    return chunks;
  }
}

export const ragTextProcessor = new RagTextProcessor();
