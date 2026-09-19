/**
 * @file index.ts
 * @description Export barrel for all UI primitives
 */

// Editorial primitives (already existed)
export { Reveal, Hairline, SectionLabel, Statement, NumberedList, Marquee, Timeline, PixelMascot } from './Editorial';

// New terminal primitives (Phase 2)
export { PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';
export { TerminalPanel } from './TerminalPanel';
export type { TerminalPanelProps } from './TerminalPanel';
export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable';
export { SegmentedPill } from './SegmentedPill';
export type { SegmentedPillProps } from './SegmentedPill';
export { KeyValue } from './KeyValue';
export type { KeyValueProps, KeyValueItem } from './KeyValue';
export { Sparkline } from './Sparkline';
export type { SparklineProps } from './Sparkline';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';
export { ScrollProgress } from './ScrollProgress';
export { CursorDot } from './CursorDot';

// Theme toggle (already existed)
export { ThemeToggle } from './ThemeToggle';
