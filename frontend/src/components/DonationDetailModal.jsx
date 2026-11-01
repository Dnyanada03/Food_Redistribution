import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Clock, MapPin, Box, User, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import ReportIssueModal from './ReportIssueModal';

export default function DonationDetailModal({ donationId, onClose, onClaimSuccess }) {
  const { user, token } = useAuth();
  const [donation, setDonation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);

  useEffect(() => {
    fetch(`/api/donations/${donationId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load listing details');
        return res.json();
      })
      .then((data) => setDonation(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [donationId]);

  const handleClaim = async () => {
    setClaiming(true);
    setError('');
    try {
      const res = await fetch(`/api/donations/${donationId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to claim donation');

      if (onClaimSuccess) onClaimSuccess(donationId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  };

  const formatExpiry = (expIso) => {
    if (!expIso) return { text: '', isUrgent: false };
    const diff = new Date(expIso) - new Date();
    if (diff <= 0) return { text: 'Expired', isUrgent: false, isExpired: true };
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours < 2) return { text: `Expiring in ${hours > 0 ? `${hours}h ` : ''}${mins}m`, isUrgent: true };
    return { text: `Expires in ${hours} hours`, isUrgent: false };
  };

  if (loading) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading donation details...</p>
        </div>
      </div>
    );
  }

  if (!donation) return null;

  const expiry = formatExpiry(donation.exp_datetime);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <span className={`status-badge ${donation.status}`} style={{ marginBottom: '0.25rem' }}>
                {donation.status}
              </span>
              <h2 className="heading-serif" style={{ fontSize: '1.35rem', margin: 0 }}>
                {donation.food_name}
              </h2>
            </div>
            <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          <div className="modal-body">
            {error && <div className="alert-banner danger">{error}</div>}

            {donation.photo_url && (
              <img
                src={donation.photo_url}
                alt={donation.food_name}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-card)',
                  marginBottom: '1rem',
                  border: '1px solid var(--border-bark-subtle)'
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}

            {/* Quick Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#fbf8f1', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-bark-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Category & Quantity</div>
                <div style={{ fontWeight: 600, color: 'var(--color-bark)', textTransform: 'capitalize' }}>
                  {donation.category.replace('_', ' ')} • {donation.quantity}
                </div>
              </div>

              <div style={{ background: '#fbf8f1', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-bark-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Consumption Safety Limit</div>
                <div style={{
                  fontWeight: 600,
                  color: expiry.isUrgent ? 'var(--color-clay)' : 'var(--color-basil)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  {expiry.isUrgent && <AlertTriangle size={14} />}
                  {expiry.text}
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.75)', marginBottom: '1rem' }}>
              <div><strong>Prepared:</strong> {new Date(donation.mfd_datetime).toLocaleString()}</div>
              <div><strong>Strict Expiry:</strong> {new Date(donation.exp_datetime).toLocaleString()}</div>
              <div><strong>Pickup Window:</strong> {donation.pickup_window}</div>
            </div>

            {/* Allergens warning */}
            {donation.contains_allergens && (
              <div className="alert-banner warning" style={{ padding: '0.6rem 0.8rem', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                <AlertCircle size={16} />
                <div>
                  <strong>Allergen Notice:</strong> {donation.contains_allergens}
                  {donation.allergen_flags?.length > 0 && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-clay)' }}>
                      Identified allergens: {donation.allergen_flags.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Donor & Pickup Details */}
            <div style={{ background: '#fff', border: '1px solid var(--border-bark-subtle)', borderRadius: '4px', padding: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                <User size={15} color="var(--color-basil)" />
                <span>Donor: {donation.donor_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8125rem', color: 'rgba(38,36,30,0.8)' }}>
                <MapPin size={15} color="var(--color-bark)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{donation.pickup_address} (Pincode: {donation.pickup_pincode})</span>
              </div>
              {donation.donor_phone && (
                <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)', marginTop: '0.25rem', paddingLeft: '1.4rem' }}>
                  Contact: {donation.donor_phone}
                </div>
              )}
            </div>

            {/* Simulated Map View */}
            {donation.coordinates && (
              <div style={{
                background: '#f4eedd',
                borderRadius: '4px',
                border: '1px solid var(--border-bark-subtle)',
                padding: '0.75rem',
                textAlign: 'center',
                fontSize: '0.75rem',
                color: 'rgba(38,36,30,0.7)'
              }}>
                <MapPin size={16} color="var(--color-basil)" style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                <strong>Locality GPS Coordinates:</strong> {donation.coordinates.lat}° N, {donation.coordinates.lng}° W
                <div style={{ fontSize: '0.7rem', marginTop: '2px', color: 'rgba(38,36,30,0.5)' }}>
                  Distance calculated via Locality Service Provider
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', color: 'var(--color-clay)', borderColor: 'var(--color-clay)' }}
              onClick={() => setShowReportIssue(true)}
            >
              <AlertCircle size={14} /> Report Concern
            </button>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>
                Close
              </button>

              {user?.role === 'ngo' && donation.status === 'posted' && (
                <button
                  type="button"
                  className="btn btn-accent"
                  onClick={handleClaim}
                  disabled={!user.is_verified || expiry.isExpired || claiming}
                >
                  <CheckCircle2 size={16} />
                  {claiming ? 'Claiming...' : (user.is_verified ? 'Claim This Food' : 'Verification Required')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showReportIssue && (
        <ReportIssueModal
          donationId={donation.id}
          onClose={() => setShowReportIssue(false)}
          onSuccess={() => alert('Issue reported to administration.')}
        />
      )}
    </>
  );
}
