import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  connect,
  type ManualFieldExtensionsCtx,
  type RenderFieldExtensionCtx,
  type RenderManualFieldExtensionConfigScreenCtx,
} from 'datocms-plugin-sdk';
import 'datocms-react-ui/styles.css';

import { SingleLineStrongEditor } from './entrypoints/SingleLineStrongEditor';
import { StrongEditorConfigScreen } from './entrypoints/StrongEditorConfigScreen';

// The manual field extension the editor picks as the JSON field's editor.
const FIELD_EXTENSION_ID = 'singleLineStrong';

// DatoCMS re-invokes the render hook whenever ctx changes (e.g. on every
// keystroke, as the field value updates). Create the React root ONCE and
// re-render into it so React reconciles the existing tree instead of
// remounting it — otherwise the <input> is recreated each render and loses
// focus after a single character.
let root: Root | null = null;

function render(component: React.ReactNode) {
  if (!root) {
    root = createRoot(document.getElementById('root')!);
  }
  root.render(<StrictMode>{component}</StrictMode>);
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
        // Enables the per-field config screen (renderManualFieldExtensionConfigScreen).
        configurable: true,
      },
    ];
  },
  renderFieldExtension(fieldExtensionId, ctx: RenderFieldExtensionCtx) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<SingleLineStrongEditor ctx={ctx} />);
    }
  },
  renderManualFieldExtensionConfigScreen(
    fieldExtensionId,
    ctx: RenderManualFieldExtensionConfigScreenCtx,
  ) {
    if (fieldExtensionId === FIELD_EXTENSION_ID) {
      render(<StrongEditorConfigScreen ctx={ctx} />);
    }
  },
});
