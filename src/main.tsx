import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  connect,
  type ManualFieldExtensionsCtx,
  type RenderFieldExtensionCtx,
} from 'datocms-plugin-sdk';
import 'datocms-react-ui/styles.css';

import { SingleLineStrongEditor } from './entrypoints/SingleLineStrongEditor';

// The manual field extension the editor picks as the JSON field's editor.
const FIELD_EXTENSION_ID = 'singleLineStrong';

function render(component: React.ReactNode) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>{component}</StrictMode>,
  );
}

connect({
  manualFieldExtensions(_ctx: ManualFieldExtensionsCtx) {
    return [
      {
        id: FIELD_EXTENSION_ID,
        name: 'Single-line strong',
        type: 'editor',
        // Restricts the extension so it can only be attached to JSON fields.
        fieldTypes: ['json'],
      },
    ];
  },
  renderFieldExtension(fieldExtensionId, ctx: RenderFieldExtensionCtx) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<SingleLineStrongEditor ctx={ctx} />);
    }
  },
});
