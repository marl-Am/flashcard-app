import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { FolderNode, NewFolder } from '../types';

interface Props {
  onSelectFolder: (id: number) => void;
  selectedFolderId: number | null;
}

const INDENT_BASE_PX = 16;
const INDENT_STEP_PX = 16;
/** Width reserved for the collapse chevron, so leaf folders and the
 *  rename input stay aligned with folders that have one. */
const TOGGLE_SLOT_PX = 18;

/** Sums a count map over a node and all of its descendants. */
function sumTree(node: FolderNode, counts: Map<number, number>): number {
  const own = counts.get(node.id) ?? 0;
  return node.children.reduce(
    (total, child) => total + sumTree(child, counts),
    own
  );
}

export function FolderSidebar({
  onSelectFolder,
  selectedFolderId,
}: Props): ReactElement {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [totalCounts, setTotalCounts] = useState<Map<number, number>>(
    new Map()
  );
  const [dueCounts, setDueCounts] = useState<Map<number, number>>(new Map());
  const [newName, setNewName] = useState<string>('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  // Ids of folders whose children are hidden. Absent means expanded, so
  // newly created folders default to open.
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<number>>(
    new Set()
  );
  const [renameValue, setRenameValue] = useState<string>('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Set when Escape is pressed so the blur that follows does not commit.
  const renameCancelledRef = useRef<boolean>(false);

  const loadTree = (): void => {
    invoke<FolderNode[]>('get_folder_tree').then(setTree).catch(console.error);
  };

  const loadDueCounts = (): void => {
    invoke<Array<[number, number]>>('get_due_counts')
      .then((rows) => setDueCounts(new Map(rows)))
      .catch(console.error);
  };

  const loadTotalCounts = (): void => {
    invoke<Array<[number, number]>>('get_total_counts')
      .then((rows) => setTotalCounts(new Map(rows)))
      .catch(console.error);
  };

  useEffect(() => {
    loadTree();
    loadDueCounts();
    loadTotalCounts();
  }, []);

  useEffect(() => {
    if (renamingId !== null) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  const handleCreate = async (): Promise<void> => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    const payload: NewFolder = { name: trimmed, parent_id: parentId };
    try {
      await invoke('create_folder', { payload });
      setNewName('');
      setShowInput(false);
      loadTree();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (
    e: React.MouseEvent,
    id: number
  ): Promise<void> => {
    e.stopPropagation();
    if (!window.confirm('Delete this folder and all its cards?')) {
      return;
    }
    try {
      await invoke('delete_folder', { id });
      loadTree();
      loadTotalCounts();
      loadDueCounts();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleCollapsed = (e: React.MouseEvent, id: number): void => {
    e.stopPropagation();
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const startRename = (e: React.MouseEvent, node: FolderNode): void => {
    e.stopPropagation();
    renameCancelledRef.current = false;
    setRenamingId(node.id);
    setRenameValue(node.name);
  };

  /**
   * Commits on blur only. Enter and Escape blur the field rather than
   * committing directly, so a rename can never be submitted twice.
   */
  const commitRename = async (id: number): Promise<void> => {
    const trimmed = renameValue.trim();
    setRenamingId(null);
    setRenameValue('');

    if (renameCancelledRef.current || !trimmed) {
      renameCancelledRef.current = false;
      return;
    }

    try {
      await invoke('rename_folder', { id, name: trimmed });
      loadTree();
    } catch (error) {
      console.error(error);
    }
  };

  const renderNode = (node: FolderNode, depth: number = 0): ReactNode => {
    const dueCount = sumTree(node, dueCounts);
    const totalCount = sumTree(node, totalCounts);
    const indentPx = INDENT_BASE_PX + depth * INDENT_STEP_PX;
    const paddingLeft = `${indentPx}px`;
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.id);

    return (
      <div key={node.id}>
        {renamingId === node.id ? (
          <div
            className="folder-rename-row"
            style={{ paddingLeft: `${indentPx + TOGGLE_SLOT_PX}px` }}>
            <input
              ref={renameInputRef}
              className="folder-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  renameCancelledRef.current = true;
                  e.currentTarget.blur();
                }
              }}
              onBlur={() => void commitRename(node.id)}
            />
          </div>
        ) : (
          <div
            className={`folder-item ${
              selectedFolderId === node.id ? 'selected' : ''
            }`}
            style={{ paddingLeft }}
            onClick={() => onSelectFolder(node.id)}>
            {hasChildren ? (
              <button
                className="folder-toggle"
                onClick={(e) => toggleCollapsed(e, node.id)}
                aria-expanded={!isCollapsed}
                title={isCollapsed ? 'Expand folder' : 'Collapse folder'}>
                {isCollapsed ? '▸' : '▾'}
              </button>
            ) : (
              <span className="folder-toggle-spacer" aria-hidden="true" />
            )}
            <span className="folder-name">📁 {node.name}</span>
            <div className="folder-item-right">
              {(dueCount > 0 || totalCount > 0) && (
                <span className="due-badge">
                  {dueCount > 0 ? (
                    <>
                      <span className="badge-due">{dueCount}</span>
                      <span className="badge-sep">/</span>
                      <span className="badge-total">{totalCount}</span>
                    </>
                  ) : (
                    <span className="badge-total">{totalCount}</span>
                  )}
                </span>
              )}
              <div className="folder-actions">
                <button
                  className="folder-action-btn"
                  onClick={(e) => startRename(e, node)}
                  title="Rename folder">
                  ✎
                </button>
                <button
                  className="folder-action-btn folder-delete"
                  onClick={(e) => void handleDelete(e, node.id)}
                  title="Delete folder">
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
        {!isCollapsed &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="folder-sidebar">
      <div className="folder-toolbar">
        <button
          onClick={() => {
            setParentId(null);
            setShowInput(true);
          }}
          title="New root folder">
          + Folder
        </button>
        {selectedFolderId !== null && (
          <button
            onClick={() => {
              setParentId(selectedFolderId);
              setShowInput(true);
            }}
            title="New subfolder">
            + Sub
          </button>
        )}
      </div>

      {showInput && (
        <div className="folder-input">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleCreate();
              if (e.key === 'Escape') setShowInput(false);
            }}
            placeholder={parentId === null ? 'Folder name' : 'Subfolder name'}
          />
          <button onClick={() => void handleCreate()}>Add</button>
        </div>
      )}

      <div className="folder-tree">
        {tree.length === 0 ? (
          <div className="folder-empty">No folders yet.</div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>
    </div>
  );
}
