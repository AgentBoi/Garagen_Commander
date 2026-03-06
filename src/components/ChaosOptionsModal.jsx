import './Modal.css'
import './OptionsModal.css'

export default function ChaosOptionsModal({
  debugEnabled,
  onToggleDebug,
  onClose,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Chaos options</h2>
            <p>Adjust settings for Chaos Commander.</p>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="option-row">
          <div>
            <h3>Debug mode</h3>
            <p>Show a Debug button to force a roll.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={debugEnabled}
              onChange={(event) => onToggleDebug(event.target.checked)}
            />
            <span className="slider" aria-hidden="true" />
          </label>
        </div>

        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
