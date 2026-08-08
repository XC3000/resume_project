import { Injectable, Logger } from '@nestjs/common';

export interface IEmbeddingService {
  embedText(text: string): Promise<number[]>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

@Injectable()
export class GeminiEmbeddingService implements IEmbeddingService {
  private readonly logger = new Logger(GeminiEmbeddingService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || process.env.EXTERNAL_EMBEDDING_API_KEY;
  private readonly model = 'models/text-embedding-004';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async embedText(text: string): Promise<number[]> {
    const embeddings = await this.embedTexts([text]);
    if (!embeddings[0]) {
      throw new Error('Failed to generate embedding');
    }
    return embeddings[0];
  }

  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    if (!this.apiKey) {
      this.logger.error('Gemini API key is not configured (GEMINI_API_KEY / EXTERNAL_EMBEDDING_API_KEY)');
      throw new Error('Embedding service API key is missing');
    }

    // Call Gemini API in batch mode
    const url = `${this.baseUrl}/${this.model}:batchEmbedContents?key=${this.apiKey}`;
    const requests = texts.map((text) => ({
      model: this.model,
      content: {
        parts: [{ text }],
      },
      outputDimensionality: 768,
    }));

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.error(`Gemini Embedding API error: HTTP ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch embeddings: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.embeddings || !Array.isArray(data.embeddings)) {
      throw new Error('Invalid response payload from Gemini Embedding API');
    }

    return data.embeddings.map((item: any) => item.values);
  }

  private async fetchWithRetry(url: string, options: any, attempts = 5, delay = 1000): Promise<Response> {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429) {
          this.logger.warn(`Gemini Embedding API returned 429. Retrying in ${delay}ms... (Attempt ${i + 1}/${attempts})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          continue;
        }
        return res;
      } catch (err: any) {
        if (i === attempts - 1) throw err;
        this.logger.warn(`Fetch error: ${err.message}. Retrying in ${delay}ms... (Attempt ${i + 1}/${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('Max retries exceeded');
  }
}
