/**
 * @file articles.test.ts
 * @description Tests for ARTICLES frozen array and category-to-badge-color bijection.
 *
 * Property 6: Category-to-Badge-Color Bijection
 *   Every article's badgeColor matches the canonical category → color map exactly,
 *   and all 5 slugs are unique.
 *
 * Validates: Requirements 5.3–5.8
 */

import { describe, it, expect } from 'vitest';
import { ARTICLES } from '@/lib/mock/articles';
import type { Article } from '@/lib/types';

// ---------------------------------------------------------------------------
// Canonical bijection map (single source of truth for tests)
// ---------------------------------------------------------------------------

const CATEGORY_COLOR_MAP: Record<Article['category'], Article['badgeColor']> = {
  'QUANT RESEARCH':   'emerald',
  'HARDWARE PHYSICS': 'amber',
  'GRID PHYSICS':     'sky',
  'WHITE PAPER':      'slate',
  'APPLIED CRYPTO':   'violet',
};

// ---------------------------------------------------------------------------
// Array-level invariants
// ---------------------------------------------------------------------------

describe('ARTICLES array invariants', () => {
  it('has exactly 5 articles', () => {
    expect(ARTICLES).toHaveLength(5);
  });

  it('all 5 slugs are unique', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(ARTICLES.length);
  });

  it('is frozen (Object.isFrozen returns true)', () => {
    expect(Object.isFrozen(ARTICLES)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 6: Category-to-Badge-Color Bijection (exhaustive over all articles)
// ---------------------------------------------------------------------------

describe('Property 6 — Category-to-Badge-Color Bijection', () => {
  it('every article badgeColor matches the canonical category map', () => {
    for (const article of ARTICLES) {
      const expected = CATEGORY_COLOR_MAP[article.category];
      expect(
        article.badgeColor,
        `slug="${article.slug}" category="${article.category}"`,
      ).toBe(expected);
    }
  });

  it('QUANT RESEARCH article has badgeColor emerald', () => {
    const article = ARTICLES.find((a) => a.category === 'QUANT RESEARCH');
    expect(article, 'QUANT RESEARCH article must exist').toBeDefined();
    expect(article!.badgeColor).toBe('emerald');
  });

  it('HARDWARE PHYSICS article has badgeColor amber', () => {
    const article = ARTICLES.find((a) => a.category === 'HARDWARE PHYSICS');
    expect(article, 'HARDWARE PHYSICS article must exist').toBeDefined();
    expect(article!.badgeColor).toBe('amber');
  });

  it('GRID PHYSICS article has badgeColor sky', () => {
    const article = ARTICLES.find((a) => a.category === 'GRID PHYSICS');
    expect(article, 'GRID PHYSICS article must exist').toBeDefined();
    expect(article!.badgeColor).toBe('sky');
  });

  it('WHITE PAPER article has badgeColor slate', () => {
    const article = ARTICLES.find((a) => a.category === 'WHITE PAPER');
    expect(article, 'WHITE PAPER article must exist').toBeDefined();
    expect(article!.badgeColor).toBe('slate');
  });

  it('APPLIED CRYPTO article has badgeColor violet', () => {
    const article = ARTICLES.find((a) => a.category === 'APPLIED CRYPTO');
    expect(article, 'APPLIED CRYPTO article must exist').toBeDefined();
    expect(article!.badgeColor).toBe('violet');
  });

  it('all 5 canonical categories are represented exactly once', () => {
    const categories = ARTICLES.map((a) => a.category);
    for (const category of Object.keys(CATEGORY_COLOR_MAP) as Article['category'][]) {
      const count = categories.filter((c) => c === category).length;
      expect(count, `category "${category}" must appear exactly once`).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Per-article content invariants
// ---------------------------------------------------------------------------

describe('Article content invariants', () => {
  it('every article has at least 4 body sections', () => {
    for (const article of ARTICLES) {
      expect(
        article.body.length,
        `slug="${article.slug}" has ${article.body.length} body sections`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it('every article has a non-empty pullQuote', () => {
    for (const article of ARTICLES) {
      expect(
        article.pullQuote.trim().length,
        `slug="${article.slug}" has empty pullQuote`,
      ).toBeGreaterThan(0);
    }
  });

  it('all readTime values are positive integers', () => {
    for (const article of ARTICLES) {
      expect(
        Number.isInteger(article.readTime),
        `slug="${article.slug}" readTime must be an integer`,
      ).toBe(true);
      expect(
        article.readTime,
        `slug="${article.slug}" readTime must be positive`,
      ).toBeGreaterThan(0);
    }
  });

  it('every body section has a non-empty heading and content', () => {
    for (const article of ARTICLES) {
      for (const section of article.body) {
        expect(
          section.heading.trim().length,
          `slug="${article.slug}" has a section with empty heading`,
        ).toBeGreaterThan(0);
        expect(
          section.content.trim().length,
          `slug="${article.slug}" section "${section.heading}" has empty content`,
        ).toBeGreaterThan(0);
      }
    }
  });
});
