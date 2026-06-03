import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

interface Props {
  folderId: number;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderContent(text: string): string {
  // Replace code blocks first
  const withCode = text.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_: string, lang: string, code: string) =>
      `<pre class="card-code-block"><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`
  );

  // Split on code blocks to avoid adding <br> inside them
  const parts = withCode.split(/(<pre[\s\S]*?<\/pre>)/g);
  return parts
    .map((part) =>
      part.startsWith('<pre') ? part : part.replace(/\n/g, '<br />')
    )
    .join('');
}

function CardFace({ content, dim }: { content: string; dim?: boolean }) {
  return (
    <div
      className={`card-face ${dim ? 'card-face-dim' : ''}`}
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
}

export function CardReview({ folderId }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);

  const loadCards = () => {
    invoke<Card[]>('get_due_cards', { folderId })
      .then((result) => {
        setCards(result);
        setIndex(0);
        setFlipped(false);
        setDone(result.length === 0);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadCards();
  }, [folderId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.key === ' ' || e.key === 'Enter') && !flipped) {
        e.preventDefault();
        setFlipped(true);
      }
      if (flipped) {
        if (e.key === '1') handleRating(1);
        if (e.key === '2') handleRating(2);
        if (e.key === '3') handleRating(3);
        if (e.key === '4') handleRating(4);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, cards, index]);

  const handleRating = async (rating: number) => {
    const card = cards[index];
    await invoke('submit_review', { cardId: card.id, rating });
    const next = index + 1;
    if (next >= cards.length) {
      setDone(true);
    } else {
      setIndex(next);
      setFlipped(false);
    }
  };

  if (done) {
    return (
      <div className="review-done">
        <p>All caught up for this folder.</p>
        <button onClick={loadCards}>Refresh</button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="review-done">
        <p>Loading...</p>
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="review-container">
      <div className="review-progress">
        {index + 1} / {cards.length}
      </div>
      <div className="review-shortcuts">
        Space — flip &nbsp;·&nbsp; 1 Again &nbsp;·&nbsp; 2 Hard &nbsp;·&nbsp; 3
        Good &nbsp;·&nbsp; 4 Easy
      </div>

      {/* Card */}
      <div
        className={`review-card ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped(!flipped)}>
        {!flipped ? (
          <>
            <div className="review-card-label">Question</div>
            <CardFace content={card.front} />
            <div className="review-card-hint">Click to reveal answer</div>
          </>
        ) : (
          <>
            <div className="review-card-label answer-label">Answer</div>
            <CardFace content={card.back} />
          </>
        )}
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className="rating-section">
          <p className="rating-prompt">How well did you recall it?</p>
          <div className="rating-buttons">
            <button className="btn-again" onClick={() => handleRating(1)}>
              <span className="btn-rating-label">Again</span>
              <span className="btn-rating-sub">Forgot</span>
            </button>
            <button className="btn-hard" onClick={() => handleRating(2)}>
              <span className="btn-rating-label">Hard</span>
              <span className="btn-rating-sub">Struggled</span>
            </button>
            <button className="btn-good" onClick={() => handleRating(3)}>
              <span className="btn-rating-label">Good</span>
              <span className="btn-rating-sub">Got it</span>
            </button>
            <button className="btn-easy" onClick={() => handleRating(4)}>
              <span className="btn-rating-label">Easy</span>
              <span className="btn-rating-sub">Instant</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
