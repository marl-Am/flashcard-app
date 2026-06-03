import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Card {
  id: number;
  folder_id: number;
  front: string;
  back: string;
  due_date: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
}

interface UpdateCard {
  id: number;
  front: string;
  back: string;
}

interface Props {
  folderId: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderContent(text: string): string {
  return text
    .replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      (_: string, lang: string, code: string) =>
        `<pre class="code-block"><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`
    )
    .replace(/\n/g, "<br />");
}

function formatDate(iso: string): string {
  const d = new Date(iso + "Z"); // SQLite stores UTC, append Z
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function CardBrowser({ folderId }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadCards = () => {
    invoke<Card[]>('get_all_cards', { folderId })
      .then(setCards)
      .catch(console.error);
  };

  useEffect(() => {
    loadCards();
    setEditingId(null);
    setSearch("");
    setExpandedId(null);
  }, [folderId]);

  const startEdit = (card: Card) => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
    setExpandedId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFront("");
    setEditBack("");
  };

  const saveEdit = async (id: number) => {
    if (!editFront.trim() || !editBack.trim()) return;
    const payload: UpdateCard = { id, front: editFront.trim(), back: editBack.trim() };
    await invoke("update_card", { payload });
    cancelEdit();
    loadCards();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this card? This cannot be undone.")) return;
    await invoke('delete_card', { id });
    loadCards();
  };

  const filtered = cards.filter(
    (c) =>
      c.front.toLowerCase().includes(search.toLowerCase()) ||
      c.back.toLowerCase().includes(search.toLowerCase())
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
        <div className="placeholder" style={{ marginTop: "40px" }}>
          {cards.length === 0 ? "No cards in this folder yet." : "No cards match your search."}
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
                <button className="btn-cancel" onClick={cancelEdit}>Cancel</button>
                <button className="save-btn" onClick={() => saveEdit(card.id)}>Save</button>
              </div>
            </div>
          ) : (
            // ── View Mode ──────────────────────────────────────────────────
            <div key={card.id} className="browser-card">
              <div
                className="browser-card-front"
                onClick={() =>
                  setExpandedId(expandedId === card.id ? null : card.id)
                }
              >
                <div
                  className="browser-card-text"
                  dangerouslySetInnerHTML={{ __html: renderContent(card.front) }}
                />
                <span className="expand-icon">
                  {expandedId === card.id ? "▲" : "▼"}
                </span>
              </div>

              {expandedId === card.id && (
                <div
                  className="browser-card-back"
                  dangerouslySetInnerHTML={{ __html: renderContent(card.back) }}
                />
              )}

              <div className="browser-card-meta">
                <span>Reviews: {card.review_count}</span>
                <span>Interval: {Math.round(card.interval_days)}d</span>
                <span>Due: {formatDate(card.due_date)}</span>
                <div className="browser-card-actions">
                  <button className="btn-edit" onClick={() => startEdit(card)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(card.id)}>Delete</button>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}