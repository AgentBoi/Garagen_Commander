import './Modal.css'
import './OptionsModal.css'

export default function OptionsModal({
  partnerOnly,
  colorBans,
  monoChoiceEnabled,
  rerollsEnabled,
  onTogglePartnerOnly,
  onToggleColorBans,
  onToggleMonoChoice,
  onToggleRerolls,
  onClose,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Draft options</h2>
            <p>Spice up your draft experience with special rules.</p>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="option-row">
          <div>
            <h3>Partner-only pool</h3>
            <p>
              Limit to Partner, Partner with, Partner-X, Background, Friends
              forever, and Doctor's companion commanders.
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={partnerOnly}
              onChange={(event) => onTogglePartnerOnly(event.target.checked)}
            />
            <span className="slider" aria-hidden="true" />
          </label>
        </div>
        <div className="option-row">
          <div>
            <h3>Color bans</h3>
            <p>
              Each player bans up to two colors. Commanders that include those colors cannot won't appear in that player's pool.
              !Currently does not work with partner commanders!
            </p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={colorBans}
              onChange={(event) => onToggleColorBans(event.target.checked)}
            />
            <span className="slider" aria-hidden="true" />
          </label>
        </div>
        <div className="option-row">
          <div>
            <h3>Mono-color choice</h3>
            <p>Let each player decide whether mono-colored commanders appear.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={monoChoiceEnabled}
              onChange={(event) => onToggleMonoChoice(event.target.checked)}
            />
            <span className="slider" aria-hidden="true" />
          </label>
        </div>
        <div className="option-row">
          <div>
            <h3>Allow rerolls</h3>
            <p>Show reroll buttons under the commander options.</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={rerollsEnabled}
              onChange={(event) => onToggleRerolls(event.target.checked)}
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
