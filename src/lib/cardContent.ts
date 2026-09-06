/**
 * Card content rendering.
 *
 * Card text is authored by the user in a small subset of Markdown: fenced
 * code blocks and hard line breaks. This module is the single place that
 * turns that text into HTML, replacing four near-identical copies that had
 * drifted apart.
 *
 * Security note (OWASP A03): the result is passed to
 * `dangerouslySetInnerHTML`, so every character that originates from user
 * input is HTML-escaped here before any markup is added. Only the tags this
 * module generates itself reach the DOM as markup.
 */

/**
 * CSS class applied to generated code blocks. The review surfaces and the
 * editor preview style code blocks differently, so the caller picks one.
 */
export type CodeBlockClass = 'card-code-block' | 'code-block';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes a prose segment and converts its newlines to line breaks. */
function renderProse(segment: string): string {
  return escapeHtml(segment).replace(/\n/g, '<br />');
}

/**
 * Converts fenced code blocks to `<pre><code>` and newlines outside those
 * blocks to `<br />`. Newlines inside a code block are preserved, because the
 * source text is split before any markup is generated.
 */
export function renderContent(
  text: string,
  codeBlockClass: CodeBlockClass = 'card-code-block'
): string {
  const fencePattern = /```(\w*)\n?([\s\S]*?)```/g;
  const output: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(fencePattern)) {
    const start: number = match.index ?? 0;
    const language: string = match[1] ?? '';
    const code: string = match[2] ?? '';

    output.push(renderProse(text.slice(cursor, start)));
    output.push(
      `<pre class="${codeBlockClass}">` +
        `<code class="lang-${escapeHtml(language)}">` +
        `${escapeHtml(code.trim())}</code></pre>`
    );

    cursor = start + match[0].length;
  }

  output.push(renderProse(text.slice(cursor)));
  return output.join('');
}
