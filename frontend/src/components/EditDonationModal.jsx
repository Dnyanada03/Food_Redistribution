import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Edit3 } from 'lucide-react';

export default function EditDonationModal({ donation, onClose, onUpdateSuccess }) {
  const { token } = useAuth();
  const [foodName, setFoodName] = useState(donation.food_name || '');
  const [category, setCategory] = useState(donation.category || 'prepared_meal');
  const [quantity, setQuantity] = useState(donation.quantity || '');
  const [allergens, setAllergens] = useState(donation.contains_allergens || '');
  const [pickupWindow, setPickupWindow] = useState(donation.pickup_window || '');
  const [pickupAddress, setPickupAddress] = useState(donation.pickup_address || '');
  const [pickupPincode, setPickupPincode] = useState(donation.pickup_pincode || '');
  const [photoUrl, setPhotoUrl] = useState(donation.photo_url || '');

  const formatIsoForInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '');
  const [mfdDatetime, setMfdDatetime] = useState(formatIsoForInput(donation.mfd_datetime));
  const [expDatetime, setExpDatetime] = useState(formatIsoForInput(donation.exp_datetime));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/donations/${donation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          food_name: foodName,
          category,
          quantity,
          contains_allergens: allergens,
          mfd_datetime: new Date(mfdDatetime).toISOString(),
          exp_datetime: new Date(expDatetime).toISOString(),
          pickup_address: pickupAddress,
          pickup_pincode: pickupPincode,
          pickup_window: pickupWindow,
          photo_url: photoUrl || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update donation');

      if (onUpdateSuccess) onUpdateSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={18} color="var(--color-basil)" />
            <h3 className="card-title" style={{ margin: 0 }}>Edit Surplus Food Listing</h3>
          </div>
          <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert-banner danger">{error}</div>}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Food Title *</label>
                <input
                  type="text"
                  className="form-control"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="prepared_meal">Prepared Cooked Meal</option>
                  <option value="produce">Fresh Produce</option>
                  <option value="bakery">Bakery & Bread</option>
                  <option value="canned">Canned Food</option>
                  <option value="packaged">Packaged Snacks</option>
                  <option value="raw_ingredient">Raw Groceries</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity & Servings *</label>
                <input
                  type="text"
                  className="form-control"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Allergens</label>
                <input
                  type="text"
                  className="form-control"
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Prepared Date & Time *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={mfdDatetime}
                  onChange={(e) => setMfdDatetime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date & Time (Strict Safety Limit) *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={expDatetime}
                  onChange={(e) => setExpDatetime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pickup Address *</label>
                <input
                  type="text"
                  className="form-control"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pickup Pincode *</label>
                <input
                  type="text"
                  className="form-control"
                  value={pickupPincode}
                  onChange={(e) => setPickupPincode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pickup Window *</label>
                <input
                  type="text"
                  className="form-control"
                  value={pickupWindow}
                  onChange={(e) => setPickupWindow(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Image URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
