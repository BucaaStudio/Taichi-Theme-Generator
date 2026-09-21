import { interpretThemePrompt } from './interpretThemePrompt.js';
import {
  AI_PHILOSOPHY,
  PromptThemeError,
  buildThemeFromIntent,
  normalizeThemeCurrent,
  normalizeThemeRequest,
} from './promptTheme.js';

export interface PromptThemeResult {
  status: number;
  payload: Record<string, unknown>;
}

// Shared by the Vercel function and the Vite dev middleware so the two cannot
// drift apart.
export async function runPromptTheme(
  rawBody: unknown,
  onPartial?: (partial: unknown) => void
): Promise<PromptThemeResult> {
  const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as Record<string, unknown>;
  try {
    const parsed = normalizeThemeRequest(body);
    if ('error' in parsed) {
      return { status: 400, payload: { success: false, error: parsed.error, code: parsed.code } };
    }

    const intent = await interpretThemePrompt(parsed.prompt, parsed.image, {
      current: normalizeThemeCurrent(body.current),
      fresh: body.fresh === true,
      onPartial,
    });
    const result = buildThemeFromIntent(intent);

    return {
      status: 200,
      payload: {
        success: true,
        light: result.light,
        dark: result.dark,
        intent,
        metadata: {
          mode: result.mode,
          style: result.mode,
          seed: result.seed,
          timestamp: Date.now(),
          colorSpace: 'OKLCH',
          philosophy: AI_PHILOSOPHY,
          prompt: parsed.prompt,
          rationale: intent.rationale,
          options: intent.options,
        },
      },
    };
  } catch (error) {
    const mapped = error instanceof PromptThemeError
      ? error
      : new PromptThemeError('Could not generate a theme from that prompt.', 'AI_FAILED', 502);
    console.error('Error prompting theme:', mapped);
    return { status: mapped.status, payload: { success: false, error: mapped.message, code: mapped.code } };
  }
}

// Streaming responses are newline-delimited JSON: {type:'partial', intent}
// lines while the model writes, then one {type:'done', ...payload} line.
export async function streamPromptTheme(rawBody: unknown, write: (line: string) => void): Promise<void> {
  const { payload } = await runPromptTheme(rawBody, (partial) => {
    write(`${JSON.stringify({ type: 'partial', intent: partial })}\n`);
  });
  write(`${JSON.stringify({ type: 'done', ...payload })}\n`);
}
