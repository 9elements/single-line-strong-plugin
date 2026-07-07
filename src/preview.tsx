/**
 * Standalone style-preview harness — NOT shipped to DatoCMS.
 *
 * The real plugin (main.tsx) only renders inside Dato's iframe after a
 * postMessage handshake, so it can't be previewed on its own. This page renders
 * <StrongEditor> directly (it needs no Dato ctx) across a few states so you can
 * iterate on StrongEditor.css with instant hot-reload.
 *
 *   npm run dev  →  open http://localhost:5173/preview.html
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import 'datocms-react-ui/styles.css';
// Supplies the semantic --color--* tokens the host would normally inject, so
// the standalone harness renders with real colors. Must come after the SDK
// stylesheet. See preview-tokens.css.
import './preview-tokens.css';

import { StrongEditor } from './entrypoints/StrongEditor';
import { serializeFieldValue, type Segment } from './segments';

const SAMPLE: Segment[] = [
  { value: 'This is my ', mark: false },
  { value: 'highlighted', mark: true },
  { value: ' text', mark: false },
];

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ font: '600 13px/1.4 system-ui', color: 'var(--color--ink-muted)', margin: '0 0 8px' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Demo() {
  const [value, setValue] = useState<string | null>(serializeFieldValue(SAMPLE));
  const [dark, setDark] = useState(false);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    // Mirror how the DatoCMS runtime switches themes: an attribute on <html>.
    document.documentElement.dataset.colorScheme = next ? 'dark' : 'light';
  };

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px', font: '14px/1.5 system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
        <h1 style={{ font: '700 20px/1.3 system-ui' }}>Single-line Strong — preview</h1>
        <button
          type="button"
          onClick={toggleTheme}
          style={{
            font: '500 13px/1 system-ui',
            padding: '8px 12px',
            cursor: 'pointer',
            border: '1px solid var(--color--border)',
            borderRadius: 4,
            background: 'var(--color--surface-hover)',
            color: 'var(--color--ink)',
          }}
        >
          {dark ? '☀ Light' : '☾ Dark'}
        </button>
      </div>
      <p style={{ color: 'var(--color--ink-muted)' }}>
        Standalone harness for styling. Colors use stand-in --color--* tokens
        (see preview-tokens.css); exact values differ inside DatoCMS, which
        injects them at runtime. Use the toggle to check light and dark.
      </p>

      <Row title="Editable, prefilled with a bold range">
        <StrongEditor
          initialSegments={SAMPLE}
          onChange={(segments) => setValue(serializeFieldValue(segments))}
          label="Headline"
        />
        <pre style={{ background: 'var(--color--surface-muted)', color: 'var(--color--ink-subtle)', padding: 10, marginTop: 8, borderRadius: 4, fontSize: 12, overflowX: 'auto' }}>
          {value ?? 'null'}
        </pre>
      </Row>

      <Row title="Empty, with placeholder">
        <StrongEditor
          initialSegments={[]}
          onChange={() => {}}
          label="Empty"
          placeholder="Type a headline…"
        />
      </Row>

      <Row title="With a 30-character limit (counter + hard block)">
        <StrongEditor
          initialSegments={SAMPLE}
          onChange={() => {}}
          label="Limited"
          maxLength={30}
        />
      </Row>

      <Row title="Disabled (read-only, bold still visible)">
        <StrongEditor
          initialSegments={SAMPLE}
          onChange={() => {}}
          label="Disabled"
          disabled
        />
      </Row>
    </div>
  );
}

createRoot(document.getElementById('preview-root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
);
