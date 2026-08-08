import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';

export const ClassificationSchema = z.object({
  category: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  rootCauseHint: z.string(),
  suggestedFix: z.string(),
  justifyingLogChunkIds: z.array(z.string()),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

@Injectable()
export class ClassifierService {
  private readonly logger = new Logger(ClassifierService.name);
  private readonly apiKey = process.env.GEMINI_API_KEY || process.env.EXTERNAL_EMBEDDING_API_KEY;
  private readonly model = 'models/gemini-2.5-flash';
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  /**
   * Classifies an incident based on its current log chunks and historical similar incidents.
   * Employs Zod validation and retries once on validation failure.
   */
  async classifyIncident(
    logChunks: Array<{ id: string; content: string; sequence: number }>,
    similarIncidents: Array<{
      id: string;
      classification: string | null;
      severity: string;
      rootCauseHint: string | null;
      suggestedFix: string | null;
      logChunks: Array<{ content: string }>;
    }>
  ): Promise<{
    tokensIn: number;
    tokensOut: number;
    result: ClassificationResult;
  } | null> {
    
    // Check for DEMO_MODE bypass
    if (process.env.DEMO_MODE === 'true') {
      this.logger.log('DEMO_MODE is active. Serving pre-computed mock classification without calling Gemini.');
      const mockResult = this.getDemoMockClassification(logChunks);
      return {
        tokensIn: 0,
        tokensOut: 0,
        result: mockResult,
      };
    }

    if (!this.apiKey) {
      this.logger.error('Gemini API key is not configured');
      throw new Error('Classifier API key is missing');
    }

    const prompt = this.buildPrompt(logChunks, similarIncidents);
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    let attempts = 2;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await this.fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini LLM error: HTTP ${response.status}`);
        }

        const data = await response.json();
        const outputText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!outputText) {
          throw new Error('Empty text content received from Gemini');
        }

        // Parse and validate with Zod
        const rawJson = JSON.parse(outputText.trim());
        const validated = ClassificationSchema.parse(rawJson);

        const tokensIn = data.usageMetadata?.promptTokenCount ?? 0;
        const tokensOut = data.usageMetadata?.candidatesTokenCount ?? 0;

        return { tokensIn, tokensOut, result: validated };
      } catch (err: any) {
        this.logger.warn(`Classification attempt ${attempt} failed: ${err.message}`);
        if (attempt === attempts) {
          this.logger.error('Max retry attempts reached for classification Zod validation');
          return null; // Return null to fallback to null classification rather than crashing
        }
      }
    }

    return null;
  }

  private buildPrompt(
    logChunks: Array<{ id: string; content: string; sequence: number }>,
    similarIncidents: Array<{
      id: string;
      classification: string | null;
      severity: string;
      rootCauseHint: string | null;
      suggestedFix: string | null;
      logChunks: Array<{ content: string }>;
    }>
  ): string {
    const logChunksFormatted = logChunks
      .map((c) => `[Chunk ID: ${c.id}, Seq: ${c.sequence}]\n${c.content}`)
      .join('\n\n');

    const historicalFormatted = similarIncidents.length > 0
      ? similarIncidents
          .map(
            (i, idx) => `--- Historical Case #${idx + 1} ---
Category/Classification: ${i.classification || 'Unknown'}
Severity: ${i.severity}
Root Cause Hint: ${i.rootCauseHint || 'None'}
Suggested Fix: ${i.suggestedFix || 'None'}
Sample logs from this case:
${i.logChunks.slice(0, 2).map((c) => c.content).join('\n')}`
          )
          .join('\n\n')
      : 'No historical similar cases found.';

    return `You are an expert site reliability engineering (SRE) copilot. Your task is to analyze the log chunks of a failing system incident, reference any similar historical incidents provided, and classify the failure.

Current Failure Log Chunks to Classify:
${logChunksFormatted}

Similar Historical Incidents:
${historicalFormatted}

Analyze the logs above and output a JSON object adhering to this strict TypeScript interface structure:
{
  "category": "A short, descriptive category for the error (e.g. Database Connection Refused, Missing Env Var, Out Of Memory, API Authentication Failure)",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "rootCauseHint": "A 1-2 sentence explanation of the most likely root cause based on the error output.",
  "suggestedFix": "Concrete actionable steps or instructions to fix this error.",
  "justifyingLogChunkIds": ["Array of Chunk IDs from the current failure logs that directly support your root cause analysis and classification."]
}

Ensure the output is valid JSON. Return ONLY the JSON object, with no backticks or extra explanation.`;
  }

  private getDemoMockClassification(logChunks: Array<{ id: string; content: string }>): ClassificationResult {
    const fullLogText = logChunks.map((c) => c.content).join('\n').toLowerCase();
    
    // Check keywords to return realistic mock classification
    if (fullLogText.includes('connection refused') || fullLogText.includes('pool connection failed') || fullLogText.includes('postgres') || fullLogText.includes('prisma')) {
      return {
        category: 'Database Connection Error',
        severity: 'CRITICAL',
        rootCauseHint: 'The application failed to connect to PostgreSQL. PostgreSQL is either offline, restarting, or the DATABASE_URL connection credentials are incorrect.',
        suggestedFix: '1. Verify PostgreSQL is running.\n2. Ensure the pooled connection credentials in DATABASE_URL environment variables are correct and reachable.',
        justifyingLogChunkIds: [logChunks[0]?.id].filter(Boolean),
      };
    }

    if (fullLogText.includes('token') || fullLogText.includes('key') || fullLogText.includes('unauthorized') || fullLogText.includes('signature')) {
      return {
        category: 'API Authentication Failure',
        severity: 'HIGH',
        rootCauseHint: 'The system failed to authenticate against a downstream API. Either the token is expired, or the webhook signature check failed.',
        suggestedFix: '1. Audit secret tokens in environment configuration.\n2. Verify the webhook verification secret matching logic.',
        justifyingLogChunkIds: [logChunks[0]?.id].filter(Boolean),
      };
    }

    // Default mock response
    return {
      category: 'Unclassified Application Failure',
      severity: 'MEDIUM',
      rootCauseHint: 'An unhandled exception occurred in the application execution. Details can be found in the attached log logs.',
      suggestedFix: 'Check the step stack traces and verify code safety around the failure region.',
      justifyingLogChunkIds: [logChunks[0]?.id].filter(Boolean),
    };
  }

  private async fetchWithRetry(url: string, options: any, attempts = 5, delay = 1000): Promise<Response> {
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429) {
          this.logger.warn(`Gemini API returned 429 (Rate Limit). Retrying in ${delay}ms... (Attempt ${i + 1}/${attempts})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          continue;
        }
        return res;
      } catch (err: any) {
        if (i === attempts - 1) throw err;
        this.logger.warn(`Fetch call failed: ${err.message}. Retrying in ${delay}ms... (Attempt ${i + 1}/${attempts})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('Max retries exceeded');
  }
}
