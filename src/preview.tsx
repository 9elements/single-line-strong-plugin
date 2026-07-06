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

import { StrongEditor } from './entrypoints/StrongEditor';
import { serializeFieldValue, type Segment } from './segments';

const SAMPLE: Segment[] = [
  { text: 'This is my ', bold: false },
  { text: 'highlighted', bold: true },
  { text: ' text', bold: false },
];

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ font: '600 13px/1.4 system-ui', color: '#666', margin: '0 0 8px' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Demo() {
  const [value, setValue] = useState<string | null>(serializeFieldValue(SAMPLE));

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 24px', font: '14px/1.5 system-ui' }}>
      <h1 style={{ font: '700 20px/1.3 system-ui' }}>Single-line Strong — preview</h1>
      <p style={{ color: '#888' }}>
        Standalone harness for styling. Not the real Dato environment — colors use
        CSS-var fallbacks, so exact theme tokens will differ inside DatoCMS.
      </p>

      <Row title="Editable, prefilled with a bold range">
        <StrongEditor
          initialSegments={SAMPLE}
          onChange={(segments) => setValue(serializeFieldValue(segments))}
          label="Headline"
        />
        <pre style={{ background: '#f5f5f5', padding: 10, marginTop: 8, borderRadius: 4, fontSize: 12, overflowX: 'auto' }}>
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
