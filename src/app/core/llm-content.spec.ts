import { extractChunkParts, isAbortError } from './llm-content';

describe('extractChunkParts', () => {
  it('returns empty parts for nullish values', () => {
    expect(extractChunkParts(null)).toEqual({ text: '', thinking: '' });
    expect(extractChunkParts(undefined)).toEqual({ text: '', thinking: '' });
  });

  it('treats a string as text', () => {
    expect(extractChunkParts('hello')).toEqual({ text: 'hello', thinking: '' });
  });

  it('reads string content on a chunk', () => {
    expect(extractChunkParts({ content: 'hello' })).toEqual({ text: 'hello', thinking: '' });
  });

  it('joins text blocks and ignores unknown objects', () => {
    expect(extractChunkParts({
      content: [
        { type: 'text', text: 'hi ' },
        { type: 'text', text: 'there' },
        { type: 'image_url', image_url: { url: 'x' } }
      ]
    })).toEqual({ text: 'hi there', thinking: '' });
  });

  it('separates reasoning from visible text', () => {
    expect(extractChunkParts({
      content: [
        { type: 'reasoning', reasoning: 'think first' },
        { type: 'text', text: '42' }
      ]
    })).toEqual({ text: '42', thinking: 'think first' });
  });

  it('understands Anthropic thinking blocks', () => {
    expect(extractChunkParts({
      content: [{ type: 'thinking', thinking: 'hmm' }]
    })).toEqual({ text: '', thinking: 'hmm' });
  });

  it('does not stringify object content as [object Object]', () => {
    expect(extractChunkParts({ content: { type: 'image_url', image_url: {} } }))
      .toEqual({ text: '', thinking: '' });
  });

  it('reads additional_kwargs.reasoning_content', () => {
    expect(extractChunkParts({
      content: 'answer',
      additional_kwargs: { reasoning_content: 'secret thought' }
    })).toEqual({ text: 'answer', thinking: 'secret thought' });
  });

  it('prefers contentBlocks when present', () => {
    expect(extractChunkParts({
      content: 'ignored',
      contentBlocks: [
        { type: 'reasoning', reasoning: 'why' },
        { type: 'text', text: 'because' }
      ]
    })).toEqual({ text: 'because', thinking: 'why' });
  });
});

describe('isAbortError', () => {
  it('detects AbortError by name', () => {
    const error = new Error('stopped');
    error.name = 'AbortError';
    expect(isAbortError(error)).toBeTrue();
    expect(isAbortError(new Error('nope'))).toBeFalse();
    expect(isAbortError('AbortError')).toBeFalse();
  });
});
