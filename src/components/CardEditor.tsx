import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  folderId: number;
}

interface NewCard {
  folder_id: number;
  front: string;
  back: string;
}

type Tab = "write" | "preview";

function renderContent(text: string): string {
  // Convert ```lang ... ``` code blocks to <pre><code> blocks
  return text
    .replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      (_, lang: string, code: string) =>
        `<pre class="code-block"><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`
    )
    // Convert remaining newlines to <br> outside code blocks
    .replace(/\n/g, "<br />");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function PreviewPane({ content }: { content: string }) {
  return (
    <div
      className="preview-pane"
      dangerouslySetInnerHTML={{ __html: renderContent(content) }}
    />
  );
}

export function CardEditor({ folderId }: Props) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontTab, setFrontTab] = useState<Tab>("write");
  const [backTab, setBackTab] = useState<Tab>("write");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      setStatus("error");
      return;
    }

    const payload: NewCard = {
      folder_id: folderId,
      front: front.trim(),
      back: back.trim(),
    };

    try {
      await invoke("create_card", { payload });
      setFront("");
      setBack("");
      setFrontTab("write");
      setBackTab("write");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  const insertSnippet = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: string
  ) => {
    setter(current + "\n```python\n# your code here\n```");
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
              className={frontTab === "write" ? "tab active" : "tab"}
              onClick={() => setFrontTab("write")}
            >Write</button>
            <button
              className={frontTab === "preview" ? "tab active" : "tab"}
              onClick={() => setFrontTab("preview")}
            >Preview</button>
            <button
              className="snippet-btn"
              onClick={() => insertSnippet(setFront, front)}
              title="Insert code block"
            >{"</>"}</button>
          </div>
        </div>

        {frontTab === "write" ? (
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
              className={backTab === "write" ? "tab active" : "tab"}
              onClick={() => setBackTab("write")}
            >Write</button>
            <button
              className={backTab === "preview" ? "tab active" : "tab"}
              onClick={() => setBackTab("preview")}
            >Preview</button>
            <button
              className="snippet-btn"
              onClick={() => insertSnippet(setBack, back)}
              title="Insert code block"
            >{"</>"}</button>
          </div>
        </div>

        {backTab === "write" ? (
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
        {status === "error" && (
          <span className="editor-status error">Both fields are required.</span>
        )}
        {status === "saved" && (
          <span className="editor-status saved">Card saved.</span>
        )}
        <button className="save-btn" onClick={handleSave}>Save Card</button>
      </div>
    </div>
  );
}