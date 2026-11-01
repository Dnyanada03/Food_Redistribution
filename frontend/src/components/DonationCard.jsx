import React, { useState } from 'react';
import { Clock, MapPin, AlertTriangle, CheckCircle2, User, Box, Info, Edit2, AlertCircle } from 'lucide-react';
import DonationDetailModal from './DonationDetailModal';
import EditDonationModal from './EditDonationModal';

export default function DonationCard({ donation, onClaim, onDelete, onUpdate, currentUser }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [isClaimingAnim, setIsClaimingAnim] = useState(false);

  const formatTimeRemaining = (expIso) => {
    const expDate = new Date(expIso);
    const now = new Date();
    const diffMs = expDate - now;

    if (diffMs <= 0) return { text: 'Expired', isUrgent: false, isExpired: true };

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 2) {
      return { text: `Expiring in ${hours > 0 ? `${hours}h ` : ''}${mins}m`, isUrgent: true, isExpired: false };
    }
    if (hours < 24) {
      return { text: `Expires in ${hours} hours`, isUrgent: false, isExpired: false };
    }
    const days = Math.floor(hours / 24);
    return { text: `Expires in ${days} days`, isUrgent: false, isExpired: false };
  };

  const expiryInfo = formatTimeRemaining(donation.exp_datetime);

  const handleClaimClick = () => {
    if (!currentUser?.is_verified) return;
    setIsClaimingAnim(true);
    setTimeout(() => {
      onClaim(donation.id);
    }, 600); // 600ms matches DESIGN.md fill-and-settle animation duration
  };

  return (
    <>
      <div className={`card ${expiryInfo.isUrgent ? 'card-urgent' : ''} ${isClaimingAnim ? 'card-claimed-anim' : ''}`}>
        <div>
          {donation.photo_url && (
            <img
              src={donation.photo_url}
              alt={donation.food_name}
              className="card-photo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}

          <div className="card-header">
            <div>
              <h3 className="card-title">{donation.food_name}</h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-basil)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {donation.category.replace('_', ' ')}
              </span>
            </div>
            <span className={`status-badge ${donation.status}`}>
              {donation.status}
            </span>
          </div>

          <div className="card-meta">
            <div className="card-meta-row">
              <Box size={14} color="var(--color-bark)" />
              <span><strong>Quantity:</strong> {donation.quantity}</span>
            </div>

            <div className="card-meta-row">
              <Clock size={14} color={expiryInfo.isUrgent ? 'var(--color-clay)' : 'var(--color-bark)'} />
              <span className={expiryInfo.isUrgent ? 'urgency-badge' : ''}>
                {expiryInfo.isUrgent && <AlertTriangle size={13} />}
                {expiryInfo.text}
              </span>
            </div>

            <div className="card-meta-row">
              <MapPin size={14} color="var(--color-bark)" />
              <span>{donation.pickup_address} (Pincode: {donation.pickup_pincode})</span>
            </div>

            {donation.donor_name && (
              <div className="card-meta-row" style={{ marginTop: '0.2rem' }}>
                <User size={14} color="var(--color-bark)" />
                <span>Donor: <strong>{donation.donor_name}</strong></span>
              </div>
            )}

            {donation.contains_allergens && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--color-clay)' }}>
                <strong>Allergens:</strong> {donation.contains_allergens}
              </div>
            )}
          </div>
        </div>

        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-bark-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: '100%', padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}
            onClick={() => setShowDetail(true)}
          >
            <Info size={14} /> View Details & Safety Info
          </button>

          {currentUser?.role === 'ngo' && donation.status === 'posted' && (
            <button
              className="btn btn-accent"
              style={{ width: '100%' }}
              onClick={handleClaimClick}
              disabled={!currentUser.is_verified || expiryInfo.isExpired || isClaimingAnim}
            >
              <CheckCircle2 size={16} />
              {currentUser.is_verified ? (isClaimingAnim ? 'Claiming...' : 'Claim This Food') : 'Verification Required to Claim'}
            </button>
          )}

          {currentUser?.role === 'donor' && donation.donor_id === currentUser.id && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {donation.status === 'posted' && (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                  onClick={() => setShowEdit(true)}
                >
                  <Edit2 size={13} /> Edit
                </button>
              )}
              {donation.status === 'posted' && (
                <button
                  type="button"
                  className="btn btn-destructive"
                  style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                  onClick={() => onDelete(donation.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showDetail && (
        <DonationDetailModal
          donationId={donation.id}
          onClose={() => setShowDetail(false)}
          onClaimSuccess={(id) => {
            if (onClaim) onClaim(id);
          }}
        />
      )}

      {showEdit && (
        <EditDonationModal
          donation={donation}
          onClose={() => setShowEdit(false)}
          onUpdateSuccess={() => {
            if (onUpdate) onUpdate();
          }}
        />
      )}
    </>
  );
}
