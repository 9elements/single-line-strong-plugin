import { Canvas } from 'datocms-react-ui';
import type { RenderManualFieldExtensionConfigScreenCtx } from 'datocms-plugin-sdk';

import { permissivenessWarnings } from '../field-config';
import './StructuredTextConfigScreen.css';

type Props = {
  ctx: RenderManualFieldExtensionConfigScreenCtx;
};

/**
 * The structured_text addon's config screen, shown when a modeller enables the
 * addon on a field. The addon has nothing to configure, so this only reports how the
 * field's own settings compare with what the single-line editor can show.
 *
 * It warns and never blocks: a field that allows more still works, because the
 * editor flattens what it cannot show, and nothing here stops the field being saved.
 */
export function StructuredTextConfigScreen({ ctx }: Props) {
  const warnings = permissivenessWarnings(ctx.pendingField);

  return (
    <Canvas ctx={ctx}>
      <div className="st-config">
        {warnings.length === 0 ? (
          <p className="st-config__lead">
            This field is set up the way the single-line editor wants: bold only, no
            other formatting.
          </p>
        ) : (
          <>
            <p className="st-config__lead">
              This field allows more than the single-line editor can show.
            </p>
            <ul className="st-config__warnings">
              {warnings.map((warning) => (
                <li key={warning} className="st-config__warning">
                  {warning}
                </li>
              ))}
            </ul>
            <p className="st-config__note">
              This is only a heads-up. You can still save the field.
            </p>
          </>
        )}
      </div>
    </Canvas>
  );
}
