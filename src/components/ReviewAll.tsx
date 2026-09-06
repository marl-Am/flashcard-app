import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { renderContent } from '../lib/cardContent';
import type { Card } from '../types';

interface Props {
  folderId: number;
}

export function ReviewAll({ folderId }: Props): ReactElement {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);

  useEffect(() => {
    invoke<Card[]>('get_all_cards', { folderId })
      .then((result) => {
        setCards(result);
        setIndex(0);
        setFlipped(false);
      })
      .catch(console.error);
  }, [folderId]);

  const goNext = (): void => {
    setIndex((i) => Math.min(i + 1, cards.length - 1));
    setFlipped(false);
  };

  const goPrev = (): void => {
    setIndex((i) => Math.max(i - 1, 0));
    setFlipped(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      // Ignore keystrokes aimed at a text field.
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goNext();
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cards.length]);

  const card = cards[index];

  if (card === undefined) {
    return (
      <div className="review-done">
        <p>No cards in this folder yet.</p>
      </div>
    );
  }

  const isFirst = index === 0;
  const isLast = index === cards.length - 1;

  return (
    <div className="review-container">
      {/* Header */}
      <div className="review-all-header">
        <span className="review-progress">
          {index + 1} / {cards.length}
        </span>
        <span className="review-all-badge">Read-only · No SRS effect</span>
      </div>

      <div className="review-shortcuts">
        Space — flip &nbsp;·&nbsp; ← → — navigate
      </div>

      {/* Card */}
      <div
        className={`review-card ${flipped ? 'is-flipped' : ''}`}
        onClick={() => setFlipped((f) => !f)}>
        {!flipped ? (
          <>
            <div className="review-card-label">Question</div>
            <div
              className="card-face"
              dangerouslySetInnerHTML={{ __html: renderContent(card.front) }}
            />
            <div className="review-card-hint">Click or Space to reveal</div>
          </>
        ) : (
          <>
            <div className="review-card-label answer-label">Answer</div>
            <div
              className="card-face"
              dangerouslySetInnerHTML={{ __html: renderContent(card.back) }}
            />
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="review-all-nav">
        <button className="nav-btn" onClick={goPrev} disabled={isFirst}>
          ← Previous
        </button>

        <div className="nav-dots">
          {cards.map((navCard, i) => (
            <button
              key={navCard.id}
              className={`nav-dot ${i === index ? 'active' : ''}`}
              onClick={() => {
                setIndex(i);
                setFlipped(false);
              }}
              title={`Card ${i + 1}`}
            />
          ))}
        </div>

        <button className="nav-btn" onClick={goNext} disabled={isLast}>
          Next →
        </button>
      </div>

      {/* Card meta */}
      <div className="review-all-meta">
        Reviews: {card.review_count} &nbsp;·&nbsp; Interval:{' '}
        {Math.round(card.interval_days)}d &nbsp;·&nbsp; Ease:{' '}
        {card.ease_factor.toFixed(1)}
      </div>
    </div>
  );
}
