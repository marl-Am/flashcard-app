import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { renderContent } from '../lib/cardContent';
import type { Card, UpdateCard } from '../types';

interface Props {
  folderId: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'Z'); // SQLite stores UTC, append Z
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CardBrowser({ folderId }: Props): ReactElement {
  const [cards, setCards] = useState<Card[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState<string>('');
  const [editBack, setEditBack] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadCards = (): void => {
    invoke<Card[]>('get_all_cards', { folderId })
      .then(setCards)
      .catch(console.error);
  };

  useEffect(() => {
    loadCards();
    setEditingId(null);
    setSearch('');
    setExpandedId(null);
  }, [folderId]);

  const startEdit = (card: Card): void => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
    setExpandedId(null);
  };

  const cancelEdit = (): void => {
    setEditingId(null);
    setEditFront('');
    setEditBack('');
  };

  const saveEdit = async (id: number): Promise<void> => {
    if (!editFront.trim() || !editBack.trim()) {
      return;
    }
    const payload: UpdateCard = {
      id,
      front: editFront.trim(),
      back: editBack.trim(),
    };
    try {
      await invoke('update_card', { payload });
      cancelEdit();
      loadCards();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (!window.confirm('Delete this card? This cannot be undone.')) {
      return;
    }
    try {
      await invoke('delete_card', { id });
      loadCards();
    } catch (error) {
      console.error(error);
    }
  };

  const needle = search.toLowerCase();
  const filtered = cards.filter(
    (c) =>
      c.front.toLowerCase().includes(needle) ||
      c.back.toLowerCase().includes(needle)
  );

  return (
    <div className="browser-container">
      <div className="browser-header">
        <h2 className="editor-title">Cards ({cards.length})</h2>
        <input
          className="browser-search"
          type="text"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && (
        <div className="placeholder" style={{ marginTop: '40px' }}>
          {cards.length === 0
            ? 'No cards in this folder yet.'
            : 'No cards match your search.'}
        </div>
      )}

      <div className="browser-list">
        {filtered.map((card) =>
          editingId === card.id ? (
            // ── Edit Mode ──────────────────────────────────────────────────
            <div key={card.id} className="browser-card editing">
              <div className="browser-edit-field">
                <label className="editor-label">Front</label>
                <textarea
                  className="editor-textarea"
                  rows={4}
                  value={editFront}
                  onChange={(e) => setEditFront(e.target.value)}
                />
              </div>
              <div className="browser-edit-field">
                <label className="editor-label">Back</label>
                <textarea
                  className="editor-textarea"
                  rows={5}
                  value={editBack}
                  onChange={(e) => setEditBack(e.target.value)}
                />
              </div>
              <div className="browser-card-actions">
                <button className="btn-cancel" onClick={cancelEdit}>
                  Cancel
                </button>
                <button
                  className="save-btn"
                  onClick={() => void saveEdit(card.id)}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            // ── View Mode ──────────────────────────────────────────────────
            <div key={card.id} className="browser-card">
              <div
                className="browser-card-front"
                onClick={() =>
                  setExpandedId(expandedId === card.id ? null : card.id)
                }>
                <div
                  className="browser-card-text"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(card.front, 'code-block'),
                  }}
                />
                <span className="expand-icon">
                  {expandedId === card.id ? '▲' : '▼'}
                </span>
              </div>

              {expandedId === card.id && (
                <div
                  className="browser-card-back"
                  dangerouslySetInnerHTML={{
                    __html: renderContent(card.back, 'code-block'),
                  }}
                />
              )}

              <div className="browser-card-meta">
                <span>Reviews: {card.review_count}</span>
                <span>Interval: {Math.round(card.interval_days)}d</span>
                <span>Due: {formatDate(card.due_date)}</span>
                <div className="browser-card-actions">
                  <button className="btn-edit" onClick={() => startEdit(card)}>
                    Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => void handleDelete(card.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
