import './Modal.css'

export default function PartnerModal({
  partnerCard,
  partnerLoading,
  partnerError,
  partnerOptions,
  selectedPartner,
  onSelectPartner,
  onClose,
  getCardImage,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>Choose a partner</h2>
            <p>{partnerCard?.name}</p>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {partnerLoading && <p>Loading partner options...</p>}
        {partnerError && <p className="error">{partnerError}</p>}
        <div className="modal-grid">
          {partnerOptions.map((option) => (
            <button
              key={option.id}
              className={
                selectedPartner?.id === option.id
                  ? 'modal-card selected'
                  : 'modal-card'
              }
              onClick={() => onSelectPartner(option)}
              type="button"
            >
              <img
                src={getCardImage(option)}
                alt={option.name}
                loading="lazy"
              />
              <span>{option.name}</span>
            </button>
          ))}
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
