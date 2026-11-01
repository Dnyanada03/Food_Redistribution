import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DonationCard from '../components/DonationCard';
import ReportIssueModal from '../components/ReportIssueModal';
import { PlusCircle, Utensils, RefreshCw, AlertCircle, Truck, CheckCircle2, User, Phone, MapPin } from 'lucide-react';

export default function DonorDashboard() {
  const { token, user } = useAuth();
  const [subtab, setSubtab] = useState('listings'); // 'listings' or 'logistics'
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // New Donation Form State
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState('prepared_meal');
  const [quantity, setQuantity] = useState('');
  const [allergens, setAllergens] = useState('');
  const [pickupWindow, setPickupWindow] = useState('Today 6:00 PM - 8:30 PM');
  const [pickupAddress, setPickupAddress] = useState(user?.address || '');
  const [pickupPincode, setPickupPincode] = useState(user?.pincode || '10001');
  const [photoUrl, setPhotoUrl] = useState('');

  // Datetimes (ISO string helpers)
  const getDefaultMfd = () => new Date().toISOString().slice(0, 16);
  const getDefaultExp = () => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return d.toISOString().slice(0, 16);
  };

  const [mfdDatetime, setMfdDatetime] = useState(getDefaultMfd());
  const [expDatetime, setExpDatetime] = useState(getDefaultExp());

  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [activeIssueDonationId, setActiveIssueDonationId] = useState(null);

  const fetchMyDonations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/donations/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDonations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMyDonations();
  }, [token]);

  const handlePostDonation = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
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
      if (!res.ok) throw new Error(data.detail || 'Failed to post donation');

      setMessage({ text: 'Food donation posted successfully! Verified NGOs have been notified.', type: 'success' });
      setShowForm(false);

      // Reset form
      setFoodName('');
      setQuantity('');
      setAllergens('');
      setPhotoUrl('');

      fetchMyDonations();
    } catch (err) {
      setMessage({ text: err.message, type: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to cancel this donation listing?')) return;
    try {
      const res = await fetch(`/api/donations/${donationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ text: 'Listing cancelled successfully.', type: 'success' });
        fetchMyDonations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activePostings = donations.filter(d => d.status === 'posted');
  const claimedPostings = donations.filter(d => d.status !== 'posted');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <span className="role-tag donor" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.6rem', marginBottom: '0.5rem' }}>
            Donor Organization
          </span>
          <h1 className="heading-serif" style={{ color: 'var(--color-basil)', marginTop: '0.25rem' }}>
            Surplus Food Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
            Manage surplus listings, monitor shelter claims, and track volunteer pickups for {user?.name}
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <PlusCircle size={18} />
          {showForm ? 'Close Listing Form' : 'Post Surplus Food'}
        </button>
      </div>

      {message.text && (
        <div className={`alert-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Subtabs */}
      <div className="subtabs-container">
        <button
          className={`subtab-btn ${subtab === 'listings' ? 'active' : ''}`}
          onClick={() => setSubtab('listings')}
        >
          <Utensils size={16} />
          Active Surplus Listings ({activePostings.length})
        </button>

        <button
          className={`subtab-btn ${subtab === 'logistics' ? 'active' : ''}`}
          onClick={() => setSubtab('logistics')}
        >
          <Truck size={16} />
          Claims & Delivery Tracking ({claimedPostings.length})
        </button>
      </div>

      {/* Post Donation Modal / Form Panel */}
      {showForm && (
        <div style={{
          background: '#fff',
          padding: '1.75rem',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-bark-subtle)',
          marginBottom: '2rem',
          boxShadow: '0 4px 12px rgba(38,36,30,0.05)'
        }}>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-basil)', marginBottom: '1.25rem' }}>
            Post Surplus Food Listing
          </h2>
          <form onSubmit={handlePostDonation}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Food Item / Title *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 50 Boxed Veg Meals"
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Food Category *</label>
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="prepared_meal">Prepared Cooked Meal</option>
                  <option value="produce">Fresh Produce / Fruits</option>
                  <option value="bakery">Bakery & Bread</option>
                  <option value="canned">Canned Food</option>
                  <option value="packaged">Packaged Snacks</option>
                  <option value="raw_ingredient">Raw Groceries / Ingredients</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity & Servings *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 30 servings / 15 kg"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Allergen Information (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Contains peanuts, gluten"
                  value={allergens}
                  onChange={(e) => setAllergens(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Manufactured / Prepared Date & Time *</label>
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
                  placeholder="Back kitchen door address"
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
                <label className="form-label">Pickup Time Window *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Today 6:00 PM - 8:30 PM"
                  value={pickupWindow}
                  onChange={(e) => setPickupWindow(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Food Image URL (Optional)</label>
                <input
                  type="url"
                  className="form-control"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Publishing...' : 'Publish Surplus Listing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(38,36,30,0.6)' }}>Loading donor workspace...</p>
      ) : subtab === 'listings' ? (
        /* Active Listings Tab */
        activePostings.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            background: '#fff',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-bark-subtle)',
            marginTop: '1.5rem'
          }}>
            <Utensils size={40} color="var(--color-sage)" style={{ marginBottom: '1rem' }} />
            <h3>No active un-claimed listings posted</h3>
            <p style={{ color: 'rgba(38,36,30,0.6)', marginTop: '0.5rem' }}>
              Report surplus prepared meals, produce, or bakery batches to divert food waste into meals.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setShowForm(true)}>
              Post Surplus Food Now
            </button>
          </div>
        ) : (
          <div className="card-grid">
            {activePostings.map((d) => (
              <DonationCard
                key={d.id}
                donation={d}
                currentUser={user}
                onDelete={handleDeleteDonation}
                onUpdate={fetchMyDonations}
              />
            ))}
          </div>
        )
      ) : (
        /* Claims & Logistics Tab */
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-bark)', marginBottom: '1rem' }}>
            Claimed Surplus Food & Delivery Status ({claimedPostings.length})
          </h2>

          {claimedPostings.length === 0 ? (
            <p style={{ color: 'rgba(38,36,30,0.6)' }}>No claims or delivery tasks currently recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {claimedPostings.map((item) => (
                <div key={item.id} style={{
                  background: '#fff',
                  border: '1px solid var(--border-bark-subtle)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.5rem',
                  boxShadow: '0 2px 8px rgba(38,36,30,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span className={`status-badge ${item.status}`} style={{ marginBottom: '0.35rem' }}>
                        {item.status}
                      </span>
                      <h3 className="heading-serif" style={{ fontSize: '1.35rem', margin: 0 }}>
                        {item.food_name}
                      </h3>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)', marginTop: '0.2rem' }}>
                        Quantity: <strong>{item.quantity}</strong> • Category: {item.category.replace('_', ' ')}
                      </div>
                    </div>

                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--color-clay)', borderColor: 'var(--color-clay)' }}
                      onClick={() => setActiveIssueDonationId(item.id)}
                    >
                      <AlertCircle size={13} /> Report Issue
                    </button>
                  </div>

                  {/* Recipient & Courier Card */}
                  {item.claim ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#fbf8f1', padding: '1rem', borderRadius: 'var(--radius-card)' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-marigold)', textTransform: 'uppercase' }}>
                          Claimed by Recipient NGO
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.2rem' }}>{item.claim.ngo_name}</div>
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>{item.claim.ngo_address}</div>
                        {item.claim.ngo_phone && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--color-basil)', marginTop: '0.25rem' }}>
                            Phone: {item.claim.ngo_phone}
                          </div>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sage)', textTransform: 'uppercase' }}>
                          Volunteer Courier Status
                        </div>
                        {item.claim.volunteer_name ? (
                          <>
                            <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.2rem' }}>{item.claim.volunteer_name}</div>
                            {item.claim.volunteer_phone && (
                              <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>Phone: {item.claim.volunteer_phone}</div>
                            )}
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-sage)', fontWeight: 600, marginTop: '0.25rem' }}>
                              Status: {item.claim.status.replace('_', ' ').toUpperCase()}
                            </div>
                          </>
                        ) : (
                          <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.6)', marginTop: '0.25rem' }}>
                            Awaiting volunteer assignment or direct recipient pickup.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#fbf8f1', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>
                      Status: {item.status.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeIssueDonationId && (
        <ReportIssueModal
          donationId={activeIssueDonationId}
          onClose={() => setActiveIssueDonationId(null)}
          onSuccess={(msg) => setMessage({ text: msg, type: 'success' })}
        />
      )}
    </div>
  );
}
