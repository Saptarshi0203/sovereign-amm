/**
 * @file rag.test.ts
 * @description Property tests for the local keyword-matching RAG mock.
 *
 * **Validates: Requirements 6.1–6.10**
 *
 * Property 7: RAG Keyword Routing
 *   Any query containing a keyword from group G resolves to G's result
 *   (isFallback === false, answer string is non-empty).
 *
 * Property 8: RAG Fallback
 *   Any query with no matching keywords resolves with isFallback === true,
 *   empty sources array, and non-empty suggestedQuestions.
 *
 * Timing note: `matchQuery` resolves after a 600 ms simulated delay.
 * We use `vi.useFakeTimers()` so tests do not block for real-wall time.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matchQuery } from '@/lib/mock/rag';
import type { RagResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Fake-timer helpers
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Resolve `matchQuery(query)` synchronously by advancing fake timers 600 ms.
 * Returns the settled RagResult.
 */
async function resolveQuery(query: string): Promise<RagResult> {
  const promise = matchQuery(query);
  vi.advanceTimersByTime(600);
  return promise;
}

// ---------------------------------------------------------------------------
// Property 7: RAG Keyword Routing
// Each group keyword → isFallback === false, answer is non-empty
// ---------------------------------------------------------------------------

describe('Property 7: RAG Keyword Routing', () => {
  it("query containing 'glft' resolves with isFallback === false and GLFT answer", async () => {
    const result = await resolveQuery('explain glft pricing');
    expect(result.isFallback).toBe(false);
    expect(result.answer.toLowerCase()).toContain('glft');
  });

  it("query containing 'market maker' resolves with isFallback === false", async () => {
    const result = await resolveQuery('what is a market maker?');
    expect(result.isFallback).toBe(false);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("query containing 'rainflow' resolves with isFallback === false and cycle-counting answer", async () => {
    const result = await resolveQuery('how does rainflow work');
    expect(result.isFallback).toBe(false);
    expect(result.answer.toLowerCase()).toContain('rainflow');
  });

  it("query containing 'degradation' resolves with isFallback === false", async () => {
    const result = await resolveQuery('battery degradation cost');
    expect(result.isFallback).toBe(false);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("query containing 'ptdf' resolves with isFallback === false and power-flow answer", async () => {
    const result = await resolveQuery('what are ptdf coefficients');
    expect(result.isFallback).toBe(false);
    expect(result.answer.toLowerCase()).toContain('ptdf');
  });

  it("query containing 'congestion' resolves with isFallback === false", async () => {
    const result = await resolveQuery('how is congestion handled');
    expect(result.isFallback).toBe(false);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("query containing 'zk' resolves with isFallback === false and ZK/Pedersen answer", async () => {
    const result = await resolveQuery('zk solvency proof');
    expect(result.isFallback).toBe(false);
    expect(result.answer.toLowerCase()).toContain('pedersen');
  });

  it("query containing 'zero knowledge' resolves with isFallback === false", async () => {
    const result = await resolveQuery('tell me about zero knowledge proofs');
    expect(result.isFallback).toBe(false);
    expect(result.answer.length).toBeGreaterThan(0);
  });

  it("query containing 'micro price' resolves with isFallback === false and OBI answer", async () => {
    const result = await resolveQuery('what is the micro price formula');
    expect(result.isFallback).toBe(false);
    expect(result.answer.toLowerCase()).toContain('micro');
  });

  it("query containing 'soc' resolves with isFallback === false", async () => {
    const result = await resolveQuery('how does soc affect pricing');
    expect(result.isFallback).toBe(false);
    expect(result.answer.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Property 8: RAG Fallback
// ---------------------------------------------------------------------------

describe('Property 8: RAG Fallback', () => {
  it("query 'random words with no match' resolves with isFallback === true", async () => {
    const result = await resolveQuery('random words with no match');
    expect(result.isFallback).toBe(true);
  });

  it('empty string query resolves with isFallback === true', async () => {
    const result = await resolveQuery('');
    expect(result.isFallback).toBe(true);
  });

  it('fallback result has empty sources array', async () => {
    const result = await resolveQuery('');
    expect(result.sources).toEqual([]);
  });

  it('fallback result has non-empty suggestedQuestions', async () => {
    const result = await resolveQuery('');
    expect(result.suggestedQuestions.length).toBeGreaterThan(0);
  });

  it('fallback result has non-empty answer', async () => {
    const result = await resolveQuery('absolutely unrelated query xyz123');
    expect(result.answer.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// General invariants — all results, matched or fallback
// ---------------------------------------------------------------------------

describe('RAG general invariants', () => {
  it('case-insensitive: GLFT (uppercase) matches the GLFT group', async () => {
    const result = await resolveQuery('tell me about GLFT pricing');
    expect(result.isFallback).toBe(false);
    expect(result.answer.toLowerCase()).toContain('glft');
  });

  it('case-insensitive: RAINFLOW (uppercase) matches the degradation group', async () => {
    const result = await resolveQuery('RAINFLOW cycle counting');
    expect(result.isFallback).toBe(false);
  });

  it('all matched results have non-empty answer string', async () => {
    const queries = [
      'glft',
      'rainflow',
      'ptdf',
      'zk',
      'micro price',
      'soc',
    ];
    for (const q of queries) {
      const result = await resolveQuery(q);
      expect(result.answer.length).toBeGreaterThan(0);
    }
  });

  it('all matched results have a sources array', async () => {
    const queries = ['glft', 'rainflow', 'ptdf', 'zk', 'micro price', 'soc'];
    for (const q of queries) {
      const result = await resolveQuery(q);
      expect(Array.isArray(result.sources)).toBe(true);
    }
  });

  it('all matched results have a suggestedQuestions array', async () => {
    const queries = ['glft', 'rainflow', 'ptdf', 'zk', 'micro price', 'soc'];
    for (const q of queries) {
      const result = await resolveQuery(q);
      expect(Array.isArray(result.suggestedQuestions)).toBe(true);
      expect(result.suggestedQuestions.length).toBeGreaterThan(0);
    }
  });

  it('resolves after exactly 600 ms of simulated time (fake timer check)', async () => {
    let resolved = false;
    const promise = matchQuery('glft');
    promise.then(() => {
      resolved = true;
    });

    // Has not resolved yet without advancing timers
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(600);
    await promise;

    expect(resolved).toBe(true);
  });
});
