import * as FileSystem from 'expo-file-system/legacy';
import { initLlama, type LlamaContext } from 'llama.rn';

export const MODEL_URL =
  'https://huggingface.co/HuggingFaceTB/SmolLM3-3B-Instruct-GGUF/resolve/main/SmolLM3-3B-Instruct-Q4_K_M.gguf';

const MODEL_FILENAME = 'SmolLM3-3B-Instruct-Q4_K_M.gguf';
export const MODEL_PATH = `${FileSystem.documentDirectory}${MODEL_FILENAME}`;

let _ctx: LlamaContext | null = null;

const LEGACY_FILENAMES = ['smollm2-1.7b-instruct-q4_k_m.gguf'];

export async function isModelDownloaded(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(MODEL_PATH);
  return info.exists && (info as any).size > 50_000_000;
}

export async function cleanLegacyModels(): Promise<void> {
  for (const name of LEGACY_FILENAMES) {
    const path = `${FileSystem.documentDirectory}${name}`;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

export async function downloadModel(
  onProgress: (progress: number) => void,
): Promise<void> {
  const dl = FileSystem.createDownloadResumable(
    MODEL_URL,
    MODEL_PATH,
    {},
    (d: FileSystem.DownloadProgressData) => {
      if (d.totalBytesExpectedToWrite > 0)
        onProgress(d.totalBytesWritten / d.totalBytesExpectedToWrite);
    },
  );
  const result = await dl.downloadAsync();
  if (!result || result.status !== 200)
    throw new Error(`Download failed (${result?.status ?? 'unknown'})`);
}

export async function loadModel(): Promise<void> {
  if (_ctx) return;
  _ctx = await initLlama({
    model: MODEL_PATH,
    use_mlock: false,
    n_ctx: 2048,
    n_batch: 512,
  });
}

export function isModelLoaded(): boolean {
  return _ctx !== null;
}

export async function releaseModel(): Promise<void> {
  if (_ctx) {
    await _ctx.release();
    _ctx = null;
  }
}

export type LLMMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function chat(
  messages: LLMMessage[],
  onToken: (token: string) => void,
): Promise<void> {
  if (!_ctx) throw new Error('Model not loaded');
  await _ctx.completion(
    {
      messages,
      n_predict: 512,
      temperature: 0.7,
      top_p: 0.9,
      stop: ['<|im_end|>', '<|endoftext|>'],
    },
    (data: { token: string }) => onToken(data.token),
  );
}
