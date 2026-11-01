import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import DonationCard from '../components/DonationCard';
import ReportIssueModal from '../components/ReportIssueModal';
import { Search, Filter, RefreshCw, HeartHandshake, ShieldAlert, CheckCircle2, Truck, Clock, MapPin, Phone, AlertCircle } from 'lucide-react';

export default function NgoDashboard({ initialSubtab = 'browse' }) {
  const { token, user } = useAuth();
  const [subtab, setSubtab] = useState(initialSubtab); // 'browse' or 'activity'
  const [donations, setDonations] = useState([]);
  const [myClaims, setMyClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('all');
  const [pincode, setPincode] = useState('');
  const [search, setSearch] = useState('');

  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeIssueClaimId, setActiveIssueClaimId] = useState(null);

  const fetchAvailableDonations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (pincode) params.append('pincode', pincode);
      if (search) params.append('search', search);
      if (user?.pincode) params.append('user_pincode', user.pincode);

      const res = await fetch(`/api/donations?${params.toString()}`);
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

  const fetchMyClaims = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/claims/my', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMyClaims(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAvailableDonations();
    if (token) fetchMyClaims();
  }, [category, pincode, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAvailableDonations();
  };

  const handleClaimDonation = async (donationId) => {
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`/api/donations/${donationId}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to claim donation');
      }

      setMessage({
        text: '🎉 Donation claimed successfully! You can track pickup and volunteer dispatch in My Activity.',
        type: 'success'
      });

      // Remove claimed donation from list immediately
      setDonations(donations.filter(d => d.id !== donationId));
      fetchMyClaims();

    } catch (err) {
      setMessage({ text: err.message, type: 'danger' });
    }
  };

  const handleDirectMarkReceived = async (claimId) => {
    try {
      const res = await fetch(`/api/claims/${claimId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'delivered', delivery_notes: 'Marked directly received by shelter staff.' })
      });
      if (res.ok) {
        setMessage({ text: '✓ Donation confirmed received safely.', type: 'success' });
        fetchMyClaims();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeClaims = myClaims.filter(c => c.status === 'claimed' || c.status === 'in_transit');
  const completedClaims = myClaims.filter(c => c.status === 'delivered');

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="role-tag ngo" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.6rem', marginBottom: '0.5rem' }}>
            NGO Recipient Portal
          </span>
          <h1 className="heading-serif" style={{ color: 'var(--color-basil)', marginTop: '0.25rem' }}>
            Surplus Food Discovery & Tracking
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
            Discover unexpired surplus food listings nearby, claim for your shelter, and track volunteer transport
          </p>
        </div>

        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }} onClick={() => { fetchAvailableDonations(); fetchMyClaims(); }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Verification Warning for Pending NGOs */}
      {user?.role === 'ngo' && !user.is_verified && (
        <div className="alert-banner warning">
          <ShieldAlert size={20} color="var(--color-marigold)" />
          <div>
            <strong>NGO Account Verification Pending:</strong> Your organization account is under review by our administration team. You can browse active listings, but account approval is required before claiming food.
          </div>
        </div>
      )}

      {message.text && (
        <div className={`alert-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Subtabs */}
      <div className="subtabs-container">
        <button
          className={`subtab-btn ${subtab === 'browse' ? 'active' : ''}`}
          onClick={() => setSubtab('browse')}
        >
          <HeartHandshake size={16} />
          Available Surplus Food ({donations.length})
        </button>

        {user && (
          <button
            className={`subtab-btn ${subtab === 'activity' ? 'active' : ''}`}
            onClick={() => setSubtab('activity')}
          >
            <Truck size={16} />
            My Claimed Activity & Deliveries ({activeClaims.length} active, {completedClaims.length} received)
          </button>
        )}
      </div>

      {subtab === 'browse' ? (
        <div>
          {/* Search & Filter Toolbar */}
          <div style={{
            background: '#fff',
            padding: '1.25rem',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-bark-subtle)',
            marginBottom: '1.5rem'
          }}>
            <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 140px auto', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search food title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ paddingLeft: '2.25rem' }}
                />
                <Search size={16} color="rgba(38,36,30,0.5)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <select
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="prepared_meal">Prepared Cooked Meals</option>
                <option value="produce">Fresh Produce</option>
                <option value="bakery">Bakery & Bread</option>
                <option value="canned">Canned / Packaged</option>
                <option value="raw_ingredient">Raw Groceries</option>
              </select>

              <input
                type="text"
                className="form-control"
                placeholder="Pincode..."
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
              />

              <button type="submit" className="btn btn-accent">
                <Filter size={16} /> Filter
              </button>
            </form>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <p style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(38,36,30,0.6)' }}>Searching available surplus listings...</p>
          ) : donations.length === 0 ? (
            <div style={{
              padding: '3.5rem',
              textAlign: 'center',
              background: '#fff',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-bark-subtle)',
              marginTop: '1.5rem'
            }}>
              <HeartHandshake size={40} color="var(--color-marigold)" style={{ marginBottom: '1rem' }} />
              <h3>No active donations match your search</h3>
              <p style={{ color: 'rgba(38,36,30,0.6)', marginTop: '0.5rem' }}>
                Check back shortly or clear filters to see surplus listings in nearby zones.
              </p>
            </div>
          ) : (
            <div className="card-grid">
              {donations.map((d) => (
                <DonationCard
                  key={d.id}
                  donation={d}
                  currentUser={user}
                  onClaim={handleClaimDonation}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Claimed Activity & Deliveries Tab */
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-bark)', marginBottom: '1rem' }}>
            In-Progress Claims & Dispatched Couriers ({activeClaims.length})
          </h2>

          {activeClaims.length === 0 ? (
            <div style={{
              padding: '2.5rem',
              textAlign: 'center',
              background: '#fff',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-bark-subtle)',
              marginBottom: '2rem'
            }}>
              <Truck size={36} color="var(--color-marigold)" style={{ marginBottom: '0.5rem' }} />
              <h3>No active deliveries currently in progress</h3>
              <p style={{ color: 'rgba(38,36,30,0.6)', marginTop: '0.25rem' }}>
                Claim surplus food from the Available tab to schedule pickup.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {activeClaims.map((claim) => (
                <div key={claim.id} style={{
                  background: '#fff',
                  border: '1px solid var(--border-bark-subtle)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.5rem',
                  boxShadow: '0 2px 8px rgba(38,36,30,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span className={`status-badge ${claim.status === 'in_transit' ? 'picked_up' : 'claimed'}`} style={{ marginBottom: '0.35rem' }}>
                        {claim.status === 'in_transit' ? 'Volunteer En Route (In Transit)' : 'Claim Confirmed - Awaiting Volunteer'}
                      </span>
                      <h3 className="heading-serif" style={{ fontSize: '1.35rem', margin: 0 }}>
                        {claim.donation?.food_name}
                      </h3>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)', marginTop: '0.2rem' }}>
                        Quantity: <strong>{claim.donation?.quantity}</strong> • Window: {claim.donation?.pickup_window}
                      </div>
                    </div>

                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--color-clay)', borderColor: 'var(--color-clay)' }}
                      onClick={() => setActiveIssueClaimId(claim.id)}
                    >
                      <AlertCircle size={13} /> Report Problem
                    </button>
                  </div>

                  {/* Donor & Volunteer Info */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#fbf8f1', padding: '1rem', borderRadius: 'var(--radius-card)', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-basil)', textTransform: 'uppercase' }}>
                        Origin Donor Details
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.2rem' }}>{claim.donation?.donor_name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>{claim.donation?.pickup_address} (Pincode: {claim.donation?.pickup_pincode})</div>
                      {claim.donation?.donor_phone && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-basil)', marginTop: '0.25rem' }}>
                          Phone: {claim.donation?.donor_phone}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-sage)', textTransform: 'uppercase' }}>
                        Assigned Delivery Volunteer
                      </div>
                      {claim.volunteer ? (
                        <>
                          <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.2rem' }}>{claim.volunteer.name}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>Phone: {claim.volunteer.phone}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-sage)', fontWeight: 600, marginTop: '0.25rem' }}>
                            ✓ Assigned Courier Dispatch
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.6)', marginTop: '0.25rem' }}>
                          Broadcasting to nearby community volunteers. (Or your team can pick up directly).
                        </div>
                      )}
                    </div>
                  </div>

                  {claim.delivery_notes && (
                    <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.8)', background: '#fff', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-bark-subtle)', marginBottom: '1rem' }}>
                      <strong>Volunteer Note:</strong> {claim.delivery_notes}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      className="btn btn-primary"
                      style={{ backgroundColor: 'var(--color-sage)', color: 'var(--color-bark)' }}
                      onClick={() => handleDirectMarkReceived(claim.id)}
                    >
                      <CheckCircle2 size={16} /> Confirm Meals Received at Shelter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Received History */}
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-bark)', marginBottom: '1rem' }}>
            History of Received Food Donations ({completedClaims.length})
          </h2>

          {completedClaims.length === 0 ? (
            <p style={{ color: 'rgba(38,36,30,0.6)' }}>No past completed deliveries yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="dense-table">
                <thead>
                  <tr>
                    <th>Food Item</th>
                    <th>Donor Organization</th>
                    <th>Delivered Date & Time</th>
                    <th>Volunteer Courier</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedClaims.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.donation?.food_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{c.donation?.quantity}</div>
                      </td>
                      <td>{c.donation?.donor_name}</td>
                      <td>{c.delivered_at ? new Date(c.delivered_at).toLocaleString() : 'Completed'}</td>
                      <td>{c.volunteer?.name || 'Direct Pickup'}</td>
                      <td>
                        <span className="status-badge completed">Delivered</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeIssueClaimId && (
        <ReportIssueModal
          claimId={activeIssueClaimId}
          onClose={() => setActiveIssueClaimId(null)}
          onSuccess={(msg) => setMessage({ text: msg, type: 'success' })}
        />
      )}
    </div>
  );
}
