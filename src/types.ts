/**
 * Shared domain types.
 *
 * These mirror the payloads returned by the Tauri commands in the Rust
 * backend. Keeping one definition prevents the three copies of `Card` that
 * previously drifted apart between components.
 */

export interface Card {
  id: number;
  folder_id: number;
  front: string;
  back: string;
  due_date: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
}

export interface NewCard {
  folder_id: number;
  front: string;
  back: string;
}

export interface UpdateCard {
  id: number;
  front: string;
  back: string;
}

export interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children: FolderNode[];
}

export interface DayActivity {
  date: string;
  count: number;
  level: number;
}

export interface NewFolder {
  name: string;
  parent_id: number | null;
}

/** Recall quality submitted to the scheduler. Constrained so an out-of-range
 *  value cannot reach the backend. */
export type Rating = 1 | 2 | 3 | 4;

export type View = 'review' | 'reviewall' | 'heatmap' | 'editor' | 'browse';
