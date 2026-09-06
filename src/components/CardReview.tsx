import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { renderContent } from '../lib/cardContent';
import type { Card, Rating } from '../types';

interface Props {
  folderId: number;
}

interface RatingOption {
  value: Rating;
  label: string;
  sub: string;
  className: string;
}

const RATING_OPTIONS: ReadonlyArray<RatingOption> = [
  { value: 1, label: 'Again', sub: 'Forgot', className: 'btn-again' },
  { value: 2, label: 'Hard', sub: 'Struggled', className: 'btn-hard' },
  { value: 3, label: 'Good', sub: 'Got it', className: 'btn-good' },
  { value: 4, label: 'Easy', sub: 'Instant', className: 'btn-easy' },
];

function CardFace({
  content,
  dim,
}: {
  content: string;
  dim?: boolean;
}): ReactElement {
  return (
    <div
      className={`card-face ${dim ? 'card-face-dim' : ''}`}
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
}

export function CardReview({ folderId }: Props): ReactElement {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  const loadCards = (): void => {
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

  const handleRating = async (rating: Rating): Promise<void> => {
    const card = cards[index];
    if (card === undefined) {
      return;
    }

    try {
      await invoke('submit_review', { cardId: card.id, rating });
    } catch (error) {
      console.error(error);
      return;
    }

    const next = index + 1;
    if (next >= cards.length) {
      setDone(true);
    } else {
      setIndex(next);
      setFlipped(false);
    }
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

      if ((e.key === ' ' || e.key === 'Enter') && !flipped) {
        e.preventDefault();
        setFlipped(true);
        return;
      }

      if (flipped) {
        const option = RATING_OPTIONS.find(
          (candidate) => String(candidate.value) === e.key
        );
        if (option !== undefined) {
          void handleRating(option.value);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, cards, index]);

  if (done) {
    return (
      <div className="review-done">
        <p>All caught up for this folder.</p>
        <button onClick={loadCards}>Refresh</button>
      </div>
    );
  }

  const card = cards[index];

  if (card === undefined) {
    return (
      <div className="review-done">
        <p>Loading...</p>
      </div>
    );
  }

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
            {RATING_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={option.className}
                onClick={() => void handleRating(option.value)}>
                <span className="btn-rating-label">{option.label}</span>
                <span className="btn-rating-sub">{option.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
