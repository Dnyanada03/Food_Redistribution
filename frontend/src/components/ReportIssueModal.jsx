import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, X } from 'lucide-react';

export default function ReportIssueModal({ donationId, claimId, onClose, onSuccess }) {
  const { token } = useAuth();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subject,
          description,
          donation_id: donationId || null,
          claim_id: claimId || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to submit issue');

      if (onSuccess) onSuccess('Issue ticket submitted to administrators.');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} color="var(--color-clay)" />
            <h3 className="card-title" style={{ margin: 0 }}>Report Issue or Dispute</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert-banner danger">{error}</div>}

            <p style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)', marginBottom: '1.25rem' }}>
              Submit concerns regarding food safety, delivery discrepancies, or cancellations. System administrators audit every report.
            </p>

            <div className="form-group">
              <label className="form-label">Subject / Issue Summary *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Temperature issue, volunteer delay, address change"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Detailed Description *</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Please describe what occurred with specific details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-destructive" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
