import { create } from 'zustand';
export type AiContext = { prompt: string; system: string };
type Review = { context: AiContext; resolve: (value: AiContext | null) => void };
export const useAiContextReview = create<{ pending: Review | null }>(() => ({ pending: null }));
export function reviewAiContext(context: AiContext, signal?: AbortSignal): Promise<AiContext> {
  if (useAiContextReview.getState().pending) return Promise.reject(new Error('Finish the open AI context preview first'));
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (value: AiContext | null) => {
      if (done) return;
      done = true;
      signal?.removeEventListener('abort', abort);
      useAiContextReview.setState({ pending: null });
      if (value) resolve(value); else reject(new DOMException('Canceled', 'AbortError'));
    };
    const abort = () => finish(null);
    useAiContextReview.setState({ pending: { context, resolve: finish } });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}
