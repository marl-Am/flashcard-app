import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children: FolderNode[];
}

interface Props {
  onSelectFolder: (id: number) => void;
  selectedFolderId: number | null;
}

export function FolderSidebar({ onSelectFolder, selectedFolderId }: Props) {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [totalCounts, setTotalCounts] = useState<Map<number, number>>(
    new Map()
  );
  const [dueCounts, setDueCounts] = useState<Map<number, number>>(new Map());
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const loadTree = () => {
    invoke<FolderNode[]>('get_folder_tree').then(setTree).catch(console.error);
  };

  const loadDueCounts = () => {
    invoke<[number, number][]>('get_due_counts')
      .then((rows) => setDueCounts(new Map(rows)))
      .catch(console.error);
  };

  const loadTotalCounts = () => {
    invoke<[number, number][]>('get_total_counts')
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

  // Recursively sum due counts for a node and all its descendants
  const getTotalDue = (node: FolderNode): number => {
    const own = dueCounts.get(node.id) ?? 0;
    const childTotal = node.children.reduce(
      (sum, child) => sum + getTotalDue(child),
      0
    );
    return own + childTotal;
  };

  const getTotalCards = (node: FolderNode): number => {
    const own = totalCounts.get(node.id) ?? 0;
    const childTotal = node.children.reduce(
      (sum, child) => sum + getTotalCards(child),
      0
    );
    return own + childTotal;
  };

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await invoke('create_folder', {
      payload: { name: trimmed, parent_id: parentId },
    });
    setNewName('');
    setShowInput(false);
    loadTree();
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Delete this folder and all its cards?')) return;
    await invoke('delete_folder', { id });
    loadTree();
    loadTotalCounts();
    loadDueCounts();
  };

  const startRename = (e: React.MouseEvent, node: FolderNode) => {
    e.stopPropagation();
    setRenamingId(node.id);
    setRenameValue(node.name);
  };

  const commitRename = async (id: number) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      await invoke('rename_folder', { id, name: trimmed });
      loadTree();
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const renderNode = (node: FolderNode, depth: number = 0): React.ReactNode => {
    const dueCount = getTotalDue(node);

    return (
      <div key={node.id}>
        {renamingId === node.id ? (
          <div
            className="folder-rename-row"
            style={{ paddingLeft: `${16 + depth * 16}px` }}>
            <input
              ref={renameInputRef}
              className="folder-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename(node.id);
                if (e.key === 'Escape') cancelRename();
              }}
              onBlur={() => commitRename(node.id)}
            />
          </div>
        ) : (
          <div
            className={`folder-item ${selectedFolderId === node.id ? 'selected' : ''}`}
            style={{ paddingLeft: `${16 + depth * 16}px` }}
            onClick={() => onSelectFolder(node.id)}>
            <span className="folder-name">📁 {node.name}</span>
            <div className="folder-item-right">
              {(dueCount > 0 || getTotalCards(node) > 0) && (
                <span className="due-badge">
                  {dueCount > 0 ? (
                    <>
                      <span className="badge-due">{dueCount}</span>
                      <span className="badge-sep">/</span>
                      <span className="badge-total">{getTotalCards(node)}</span>
                    </>
                  ) : (
                    <span className="badge-total">{getTotalCards(node)}</span>
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
                  onClick={(e) => handleDelete(e, node.id)}
                  title="Delete folder">
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}
        {node.children.map((child) => renderNode(child, depth + 1))}
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
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowInput(false);
            }}
            placeholder={parentId ? 'Subfolder name' : 'Folder name'}
          />
          <button onClick={handleCreate}>Add</button>
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
