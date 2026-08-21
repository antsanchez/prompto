export interface ChunkParts {
  text: string;
  thinking: string;
}

const EMPTY: ChunkParts = { text: '', thinking: '' };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function merge(left: ChunkParts, right: ChunkParts): ChunkParts {
  return {
    text: left.text + right.text,
    thinking: left.thinking + right.thinking
  };
}

function partsFromBlock(block: unknown): ChunkParts {
  if (typeof block === 'string') {
    return { text: block, thinking: '' };
  }

  const rec = asRecord(block);
  if (!rec) {
    return EMPTY;
  }

  const type = rec['type'];
  const text = typeof rec['text'] === 'string' ? rec['text'] : '';
  const reasoning = typeof rec['reasoning'] === 'string' ? rec['reasoning'] : '';
  const thinking = typeof rec['thinking'] === 'string' ? rec['thinking'] : '';

  if (type === 'reasoning' || type === 'thinking' || type === 'reasoning_content') {
    return { text: '', thinking: reasoning || thinking };
  }

  if (type === 'text' || type === 'output_text') {
    return { text, thinking: '' };
  }

  if (reasoning || thinking) {
    return { text, thinking: reasoning || thinking };
  }

  if (text) {
    return { text, thinking: '' };
  }

  return EMPTY;
}

function partsFromContent(content: unknown): ChunkParts {
  if (content == null) {
    return EMPTY;
  }
  if (typeof content === 'string') {
    return { text: content, thinking: '' };
  }
  if (Array.isArray(content)) {
    return content.reduce<ChunkParts>((acc, block) => merge(acc, partsFromBlock(block)), { ...EMPTY });
  }
  return partsFromBlock(content);
}

export function extractChunkParts(chunk: unknown): ChunkParts {
  if (chunk == null) {
    return EMPTY;
  }
  if (typeof chunk === 'string') {
    return { text: chunk, thinking: '' };
  }

  const rec = asRecord(chunk);
  if (!rec) {
    if (Array.isArray(chunk)) {
      return partsFromContent(chunk);
    }
    return EMPTY;
  }

  let parts = EMPTY;

  if (Array.isArray(rec['contentBlocks']) && rec['contentBlocks'].length > 0) {
    parts = partsFromContent(rec['contentBlocks']);
  }

  if (!parts.text && !parts.thinking) {
    parts = partsFromContent(rec['content']);
  }

  if (!parts.text && typeof rec['text'] === 'string') {
    parts = { ...parts, text: rec['text'] };
  }

  const kwargs = asRecord(rec['additional_kwargs']);
  const reasoningContent = kwargs && typeof kwargs['reasoning_content'] === 'string'
    ? kwargs['reasoning_content']
    : '';
  if (reasoningContent && !parts.thinking.includes(reasoningContent)) {
    parts = { ...parts, thinking: parts.thinking + reasoningContent };
  }

  return parts;
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const name = (error as { name?: string }).name;
  return name === 'AbortError';
}
