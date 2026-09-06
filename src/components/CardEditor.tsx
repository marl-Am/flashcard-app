import { useState } from 'react';
import type { Dispatch, ReactElement, SetStateAction } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { renderContent } from '../lib/cardContent';
import type { NewCard } from '../types';

interface Props {
  folderId: number;
}

type Tab = 'write' | 'preview';
type SaveStatus = 'idle' | 'saved' | 'error';

const SNIPPET_TEMPLATE = '\n```python\n# your code here\n```';
const STATUS_RESET_MS = 2000;

function PreviewPane({ content }: { content: string }): ReactElement {
  return (
    <div
      className="preview-pane"
      dangerouslySetInnerHTML={{ __html: renderContent(content, 'code-block') }}
    />
  );
}

export function CardEditor({ folderId }: Props): ReactElement {
  const [front, setFront] = useState<string>('');
  const [back, setBack] = useState<string>('');
  const [frontTab, setFrontTab] = useState<Tab>('write');
  const [backTab, setBackTab] = useState<Tab>('write');
  const [status, setStatus] = useState<SaveStatus>('idle');

  const handleSave = async (): Promise<void> => {
    if (!front.trim() || !back.trim()) {
      setStatus('error');
      return;
    }

    const payload: NewCard = {
      folder_id: folderId,
      front: front.trim(),
      back: back.trim(),
    };

    try {
      await invoke('create_card', { payload });
      setFront('');
      setBack('');
      setFrontTab('write');
      setBackTab('write');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), STATUS_RESET_MS);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const insertSnippet = (setter: Dispatch<SetStateAction<string>>): void => {
    setter((current) => current + SNIPPET_TEMPLATE);
  };

  return (
    <div className="editor-container">
      <h2 className="editor-title">New Card</h2>

      {/* Front */}
      <div className="editor-field">
        <div className="editor-field-header">
          <span className="editor-label">Front</span>
          <div className="tab-bar">
            <button
              className={frontTab === 'write' ? 'tab active' : 'tab'}
              onClick={() => setFrontTab('write')}>
              Write
            </button>
            <button
              className={frontTab === 'preview' ? 'tab active' : 'tab'}
              onClick={() => setFrontTab('preview')}>
              Preview
            </button>
            <button
              className="snippet-btn"
              onClick={() => insertSnippet(setFront)}
              title="Insert code block">
              {'</>'}
            </button>
          </div>
        </div>

        {frontTab === 'write' ? (
          <textarea
            className="editor-textarea"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder="Question or prompt. Use ```python ... ``` for code blocks."
            rows={6}
          />
        ) : (
          <PreviewPane content={front} />
        )}
      </div>

      {/* Back */}
      <div className="editor-field">
        <div className="editor-field-header">
          <span className="editor-label">Back</span>
          <div className="tab-bar">
            <button
              className={backTab === 'write' ? 'tab active' : 'tab'}
              onClick={() => setBackTab('write')}>
              Write
            </button>
            <button
              className={backTab === 'preview' ? 'tab active' : 'tab'}
              onClick={() => setBackTab('preview')}>
              Preview
            </button>
            <button
              className="snippet-btn"
              onClick={() => insertSnippet(setBack)}
              title="Insert code block">
              {'</>'}
            </button>
          </div>
        </div>

        {backTab === 'write' ? (
          <textarea
            className="editor-textarea"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Answer or solution. Use ```python ... ``` for code blocks."
            rows={8}
          />
        ) : (
          <PreviewPane content={back} />
        )}
      </div>

      {/* Actions */}
      <div className="editor-actions">
        {status === 'error' && (
          <span className="editor-status error">Both fields are required.</span>
        )}
        {status === 'saved' && (
          <span className="editor-status saved">Card saved.</span>
        )}
        <button className="save-btn" onClick={() => void handleSave()}>
          Save Card
        </button>
      </div>
    </div>
  );
}
