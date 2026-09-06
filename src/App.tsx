import { useState, useCallback } from 'react';
import type { ReactElement } from 'react';
import { FolderSidebar } from './components/FolderSidebar';
import { CardReview } from './components/CardReview';
import { CardEditor } from './components/CardEditor';
import { CardBrowser } from './components/CardBrowser';
import { Heatmap } from './components/Heatmap';
import { StreakCounter } from './components/StreakCounter';
import { ReviewAll } from './components/ReviewAll';
import type { View } from './types';

export type { View };

const MIN_WIDTH = 180;
const MAX_WIDTH = 480;
const DEFAULT_WIDTH = 240;

/** Views that operate on a single folder, with the prompt shown when none is
 *  selected. `heatmap` is absent because it is application-wide. */
type FolderView = Exclude<View, 'heatmap'>;

const FOLDER_PROMPTS: Record<FolderView, string> = {
  review: 'Select a folder to start reviewing.',
  reviewall: 'Select a folder to review all its cards.',
  editor: 'Select a folder first.',
  browse: 'Select a folder to browse its cards.',
};

const NAV_ITEMS: ReadonlyArray<{ view: View; label: string }> = [
  { view: 'review', label: 'Review Due' },
  { view: 'reviewall', label: 'Review All' },
  { view: 'editor', label: 'Add Card' },
  { view: 'browse', label: 'Browse' },
  { view: 'heatmap', label: 'Heatmap' },
];

function renderFolderView(view: FolderView, folderId: number): ReactElement {
  switch (view) {
    case 'review':
      return <CardReview folderId={folderId} />;
    case 'reviewall':
      return <ReviewAll folderId={folderId} />;
    case 'editor':
      return <CardEditor folderId={folderId} />;
    case 'browse':
      return <CardBrowser folderId={folderId} />;
  }
}

export default function App(): ReactElement {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [view, setView] = useState<View>('review');
  const [sidebarWidth, setSidebarWidth] = useState<number>(DEFAULT_WIDTH);

  const startDrag = useCallback((e: React.MouseEvent): void => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent: MouseEvent): void => {
      const newWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, moveEvent.clientX)
      );
      setSidebarWidth(newWidth);
    };

    const onUp = (): void => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const renderMain = (): ReactElement => {
    if (view === 'heatmap') {
      return <Heatmap />;
    }
    if (selectedFolderId === null) {
      return <div className="placeholder">{FOLDER_PROMPTS[view]}</div>;
    }
    return renderFolderView(view, selectedFolderId);
  };

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
          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={view === item.view ? 'active' : ''}>
              {item.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Drag handle */}
      <div
        className="sidebar-resizer"
        onMouseDown={startDrag}
        title="Drag to resize"
      />

      <main className="main-content">{renderMain()}</main>
    </div>
  );
}
