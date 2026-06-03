import { useState, useRef, useCallback } from 'react';
import { FolderSidebar } from './components/FolderSidebar';
import { CardReview } from './components/CardReview';
import { CardEditor } from './components/CardEditor';
import { CardBrowser } from './components/CardBrowser';
import { Heatmap } from './components/Heatmap';
import { StreakCounter } from './components/StreakCounter';
import { ReviewAll } from './components/ReviewAll';
import './App.css';

export type View = 'review' | 'reviewall' | 'heatmap' | 'editor' | 'browse';

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

export default function App() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [view, setView] = useState<View>('review');
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, moveEvent.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const onUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div className="app-layout">
      <aside
        className="sidebar"
        style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
        <div className="sidebar-header">
          <h1>Flashcards</h1>
        </div>
        <div className="streak-wrapper">
          <StreakCounter />
        </div>
        <FolderSidebar
          onSelectFolder={setSelectedFolderId}
          selectedFolderId={selectedFolderId}
        />
        <div className="sidebar-nav">
          <button
            onClick={() => setView('review')}
            className={view === 'review' ? 'active' : ''}>
            Review Due
          </button>
          <button
            onClick={() => setView('reviewall')}
            className={view === 'reviewall' ? 'active' : ''}>
            Review All
          </button>
          <button
            onClick={() => setView('editor')}
            className={view === 'editor' ? 'active' : ''}>
            Add Card
          </button>
          <button
            onClick={() => setView('browse')}
            className={view === 'browse' ? 'active' : ''}>
            Browse
          </button>
          <button
            onClick={() => setView('heatmap')}
            className={view === 'heatmap' ? 'active' : ''}>
            Heatmap
          </button>
        </div>
      </aside>

      {/* Drag handle */}
      <div
        className="sidebar-resizer"
        onMouseDown={startDrag}
        title="Drag to resize"
      />

      <main className="main-content">
        {view === 'review' &&
          (selectedFolderId ? (
            <CardReview folderId={selectedFolderId} />
          ) : (
            <div className="placeholder">
              Select a folder to start reviewing.
            </div>
          ))}
        {view === 'reviewall' &&
          (selectedFolderId ? (
            <ReviewAll folderId={selectedFolderId} />
          ) : (
            <div className="placeholder">
              Select a folder to review all its cards.
            </div>
          ))}
        {view === 'editor' &&
          (selectedFolderId ? (
            <CardEditor folderId={selectedFolderId} />
          ) : (
            <div className="placeholder">Select a folder first.</div>
          ))}
        {view === 'browse' &&
          (selectedFolderId ? (
            <CardBrowser folderId={selectedFolderId} />
          ) : (
            <div className="placeholder">
              Select a folder to browse its cards.
            </div>
          ))}
        {view === 'heatmap' && <Heatmap />}
      </main>
    </div>
  );
}
