import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, MapPin, Phone, Clock, Box, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import ReportIssueModal from '../components/ReportIssueModal';

export default function VolunteerDashboard() {
  const { user, token } = useAuth();
  const [subtab, setSubtab] = useState('available'); // 'available' or 'my_tasks'
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [activeIssueModal, setActiveIssueModal] = useState(null); // claimId if modal open
  const [deliveryNotes, setDeliveryNotes] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [availRes, myRes] = await Promise.all([
        fetch('/api/claims/tasks', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/claims/volunteer/my', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (availRes.ok && myRes.ok) {
        setAvailableTasks(await availRes.json());
        setMyTasks(await myRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleAcceptTask = async (claimId) => {
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`/api/claims/${claimId}/accept-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to accept task');

      setMessage({ text: '🎉 Task accepted! Check "My Deliveries" tab for navigation and contact details.', type: 'success' });
      fetchData();
      setSubtab('my_tasks');
    } catch (err) {
      setMessage({ text: err.message, type: 'danger' });
    }
  };

  const handleUpdateStatus = async (claimId, newStatus) => {
    setMessage({ text: '', type: '' });
    try {
      const notes = deliveryNotes[claimId] || '';
      const res = await fetch(`/api/claims/${claimId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, delivery_notes: notes })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to update status');

      const actionText = newStatus === 'in_transit' ? 'Food marked In Transit (Picked Up)' : 'Delivery confirmed completed! Thank you!';
      setMessage({ text: `✓ ${actionText}`, type: 'success' });
      fetchData();
    } catch (err) {
      setMessage({ text: err.message, type: 'danger' });
    }
  };

  const activeDeliveries = myTasks.filter(t => t.status === 'claimed' || t.status === 'in_transit');
  const completedDeliveries = myTasks.filter(t => t.status === 'delivered');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <span className="role-tag volunteer" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.6rem', marginBottom: '0.5rem' }}>
            Volunteer Operations
          </span>
          <h1 className="heading-serif" style={{ color: 'var(--color-basil)', marginTop: '0.25rem' }}>
            Volunteer Dispatch Center
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
            Accept surplus food pickup tasks and safely transport meals from donors to recipient shelters
          </p>
        </div>

        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }} onClick={fetchData}>
          <RefreshCw size={14} /> Refresh Tasks
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
          className={`subtab-btn ${subtab === 'available' ? 'active' : ''}`}
          onClick={() => setSubtab('available')}
        >
          <Truck size={16} />
          Available Pickup Tasks ({availableTasks.length})
        </button>

        <button
          className={`subtab-btn ${subtab === 'my_tasks' ? 'active' : ''}`}
          onClick={() => setSubtab('my_tasks')}
        >
          <CheckCircle2 size={16} />
          My Deliveries & Route ({activeDeliveries.length} active, {completedDeliveries.length} completed)
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '3rem', color: 'rgba(38,36,30,0.6)' }}>Loading volunteer dispatch queue...</p>
      ) : subtab === 'available' ? (
        /* Available Tasks Feed */
        availableTasks.length === 0 ? (
          <div style={{
            padding: '3.5rem',
            textAlign: 'center',
            background: '#fff',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--border-bark-subtle)'
          }}>
            <Truck size={40} color="var(--color-sage)" style={{ marginBottom: '1rem' }} />
            <h3>No tasks currently waiting for volunteer pickup</h3>
            <p style={{ color: 'rgba(38,36,30,0.6)', marginTop: '0.5rem' }}>
              All current donations have assigned couriers, or are pending NGO claims. Check back shortly!
            </p>
          </div>
        ) : (
          <div className="card-grid">
            {availableTasks.map((task) => (
              <div key={task.id} className="card" style={{ borderLeft: '4px solid var(--color-sage)' }}>
                <div>
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">{task.food_name}</h3>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-basil)', textTransform: 'uppercase' }}>
                        {task.category.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="status-badge claimed">
                      Ready for Pickup
                    </span>
                  </div>

                  <div className="card-meta">
                    <div className="card-meta-row">
                      <Box size={14} color="var(--color-bark)" />
                      <span><strong>Quantity:</strong> {task.quantity}</span>
                    </div>

                    <div className="card-meta-row">
                      <Clock size={14} color="var(--color-bark)" />
                      <span><strong>Pickup Window:</strong> {task.pickup_window}</span>
                    </div>

                    {/* Donor Origin */}
                    <div style={{ background: '#fff', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-bark-subtle)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-basil)' }}>
                        📍 1. PICKUP AT (Donor):
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-bark)' }}>
                        {task.donor_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.7)' }}>
                        {task.pickup_address} (Pincode: {task.pickup_pincode})
                      </div>
                      {task.pickup_distance_km && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-basil)', fontWeight: 600, marginTop: '2px' }}>
                          Approx. {task.pickup_distance_km} km from you
                        </div>
                      )}
                    </div>

                    {/* Recipient Destination */}
                    <div style={{ background: '#fff', padding: '0.6rem', borderRadius: '4px', border: '1px solid var(--border-bark-subtle)', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-marigold)' }}>
                        🏁 2. DELIVER TO (Recipient NGO):
                      </div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-bark)' }}>
                        {task.recipient_ngo_name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.7)' }}>
                        {task.recipient_address} (Pincode: {task.recipient_pincode})
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-bark-subtle)' }}>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', backgroundColor: 'var(--color-sage)', color: 'var(--color-bark)' }}
                    onClick={() => handleAcceptTask(task.id)}
                  >
                    <Truck size={16} /> Accept Delivery Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* My Deliveries Tab */
        <div>
          {/* Active Tasks */}
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-bark)', marginBottom: '1rem' }}>
            Active Logistics In-Progress ({activeDeliveries.length})
          </h2>

          {activeDeliveries.length === 0 ? (
            <div style={{
              padding: '2rem',
              textAlign: 'center',
              background: '#fff',
              borderRadius: 'var(--radius-card)',
              border: '1px solid var(--border-bark-subtle)',
              marginBottom: '2rem'
            }}>
              <CheckCircle2 size={32} color="var(--color-sage)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ color: 'rgba(38,36,30,0.6)' }}>No active deliveries in progress. Accept tasks from the Available tab.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2.5rem' }}>
              {activeDeliveries.map((t) => (
                <div key={t.id} style={{
                  background: '#fff',
                  border: '1px solid var(--border-bark-subtle)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.5rem',
                  boxShadow: '0 2px 8px rgba(38,36,30,0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <span className={`status-badge ${t.status === 'in_transit' ? 'picked_up' : 'claimed'}`} style={{ marginBottom: '0.35rem' }}>
                        {t.status === 'in_transit' ? 'En Route (In Transit)' : 'Accepted - Awaiting Pickup'}
                      </span>
                      <h3 className="heading-serif" style={{ fontSize: '1.35rem', margin: 0 }}>
                        {t.food_name}
                      </h3>
                      <span style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>
                        Quantity: <strong>{t.quantity}</strong> • Window: {t.pickup_window}
                      </span>
                    </div>

                    <button
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', color: 'var(--color-clay)', borderColor: 'var(--color-clay)' }}
                      onClick={() => setActiveIssueModal(t.id)}
                    >
                      <AlertCircle size={13} /> Report Problem
                    </button>
                  </div>

                  {/* Route Timeline Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#fbf8f1', padding: '1rem', borderRadius: 'var(--radius-card)', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-basil)', textTransform: 'uppercase' }}>
                        Step 1: Pickup Location (Donor)
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.2rem' }}>{t.donor_name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>{t.pickup_address} (Pincode: {t.pickup_pincode})</div>
                      {t.donor_phone && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-basil)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={13} /> Call Donor: {t.donor_phone}
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-marigold)', textTransform: 'uppercase' }}>
                        Step 2: Destination Shelter (NGO)
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: '0.2rem' }}>{t.recipient_ngo_name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>{t.recipient_address} (Pincode: {t.recipient_pincode})</div>
                      {t.recipient_phone && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--color-marigold)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Phone size={13} /> Call Shelter: {t.recipient_phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Notes input */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(38,36,30,0.7)' }}>Logistics Notes / Special Instructions:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Received 40 boxes in good condition, driving via Highway 2..."
                      value={deliveryNotes[t.id] !== undefined ? deliveryNotes[t.id] : (t.delivery_notes || '')}
                      onChange={(e) => setDeliveryNotes({ ...deliveryNotes, [t.id]: e.target.value })}
                      style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}
                    />
                  </div>

                  {/* Status Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    {t.status === 'claimed' && (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleUpdateStatus(t.id, 'in_transit')}
                      >
                        <Truck size={16} /> Mark Picked Up & Start Delivery
                      </button>
                    )}

                    {t.status === 'in_transit' && (
                      <button
                        className="btn btn-primary"
                        style={{ backgroundColor: 'var(--color-sage)', color: 'var(--color-bark)' }}
                        onClick={() => handleUpdateStatus(t.id, 'delivered')}
                      >
                        <CheckCircle2 size={16} /> Confirm Delivery Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed History Table */}
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-bark)', marginBottom: '1rem' }}>
            Completed Delivery History ({completedDeliveries.length})
          </h2>

          {completedDeliveries.length === 0 ? (
            <p style={{ color: 'rgba(38,36,30,0.6)' }}>No past deliveries recorded yet.</p>
          ) : (
            <div className="table-responsive">
              <table className="dense-table">
                <thead>
                  <tr>
                    <th>Food Item</th>
                    <th>Donor</th>
                    <th>Recipient Shelter</th>
                    <th>Delivered Date & Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {completedDeliveries.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.food_name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{item.quantity}</div>
                      </td>
                      <td>{item.donor_name}</td>
                      <td>{item.recipient_ngo_name}</td>
                      <td>{item.delivered_at ? new Date(item.delivered_at).toLocaleString() : 'Completed'}</td>
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

      {activeIssueModal && (
        <ReportIssueModal
          claimId={activeIssueModal}
          onClose={() => setActiveIssueModal(null)}
          onSuccess={(msg) => setMessage({ text: msg, type: 'success' })}
        />
      )}
    </div>
  );
}