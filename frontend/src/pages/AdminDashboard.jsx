import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, CheckCircle2, XCircle, Users, Utensils, Award, AlertCircle, Truck, Trash2, Ban, Check, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const [subtab, setSubtab] = useState('users'); // 'users', 'donations', 'deliveries', 'issues', 'reports'
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Filters & issue resolution state
  const [donationFilter, setDonationFilter] = useState('all');
  const [resolvingIssueId, setResolvingIssueId] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, delivRes, issRes, sRes] = await Promise.all([
        fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/donations${donationFilter !== 'all' ? `?status_filter=${donationFilter}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/deliveries', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/issues/admin/all', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (uRes.ok) setUsers(await uRes.json());
      if (dRes.ok) setDonations(await dRes.json());
      if (delivRes.ok) setDeliveries(await delivRes.json());
      if (issRes.ok) setIssues(await issRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAllData();
  }, [token, donationFilter]);

  const handleVerifyUser = async (userId, isVerified) => {
    setMessage({ text: '', type: '' });
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_verified: isVerified })
      });

      if (res.ok) {
        setMessage({
          text: `User verification status updated to ${isVerified ? 'VERIFIED' : 'REJECTED'}.`,
          type: isVerified ? 'success' : 'warning'
        });
        fetchAllData();
      }
    } catch (err) {
      setMessage({ text: 'Error updating user verification', type: 'danger' });
    }
  };

  const handleToggleActive = async (userId, newActive) => {
    const reason = prompt(`Enter reason for ${newActive ? 'reactivating' : 'deactivating'} this account:`);
    if (reason === null) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newActive, reason })
      });

      if (res.ok) {
        setMessage({ text: `User account ${newActive ? 'reactivated' : 'deactivated'}.`, type: 'success' });
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDonation = async (donationId) => {
    if (!window.confirm('Are you sure you want to remove this listing? The donor will be notified of removal.')) return;
    try {
      const res = await fetch(`/api/admin/donations/${donationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessage({ text: 'Listing removed by administrator.', type: 'success' });
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveIssue = async (issueId, newStatus) => {
    try {
      const res = await fetch(`/api/issues/${issueId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, admin_notes: resolutionNotes })
      });

      if (res.ok) {
        setMessage({ text: `Issue status updated to ${newStatus}.`, type: 'success' });
        setResolvingIssueId(null);
        setResolutionNotes('');
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <span className="role-tag admin" style={{ fontSize: '0.8125rem', padding: '0.2rem 0.6rem', marginBottom: '0.5rem' }}>
            System Administration
          </span>
          <h1 className="heading-serif" style={{ color: 'var(--color-bark)', marginTop: '0.25rem' }}>
            Administrative Command & Audit Console
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
            Verify organizations, monitor redistribution logistics, resolve reported disputes, and audit community impact
          </p>
        </div>

        <button className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }} onClick={fetchAllData}>
          <RefreshCw size={14} /> Refresh Console
        </button>
      </div>

      {message.text && (
        <div className={`alert-banner ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Metric Cards Banner */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total_users}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-marigold)' }}>{stats.verified_ngos}</div>
            <div className="stat-label">Verified NGO Partners</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-sage)' }}>{stats.active_volunteers}</div>
            <div className="stat-label">Active Couriers</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-basil)' }}>{stats.meals_saved_estimate}</div>
            <div className="stat-label">Estimated Meals Saved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--color-clay)' }}>{stats.open_issues}</div>
            <div className="stat-label">Open Issues / Tickets</div>
          </div>
        </div>
      )}

      {/* Subtabs */}
      <div className="subtabs-container">
        <button
          className={`subtab-btn ${subtab === 'users' ? 'active' : ''}`}
          onClick={() => setSubtab('users')}
        >
          <Users size={16} />
          User Verifications ({users.length})
        </button>

        <button
          className={`subtab-btn ${subtab === 'donations' ? 'active' : ''}`}
          onClick={() => setSubtab('donations')}
        >
          <Utensils size={16} />
          Donation Listings ({donations.length})
        </button>

        <button
          className={`subtab-btn ${subtab === 'deliveries' ? 'active' : ''}`}
          onClick={() => setSubtab('deliveries')}
        >
          <Truck size={16} />
          Delivery Logistics Monitor ({deliveries.length})
        </button>

        <button
          className={`subtab-btn ${subtab === 'issues' ? 'active' : ''}`}
          onClick={() => setSubtab('issues')}
        >
          <AlertCircle size={16} />
          Disputes & Issue Tickets ({issues.length})
        </button>

        <button
          className={`subtab-btn ${subtab === 'reports' ? 'active' : ''}`}
          onClick={() => setSubtab('reports')}
        >
          <Award size={16} />
          Impact & Redistribution Report
        </button>
      </div>

      {loading ? (
        <p style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(38,36,30,0.6)' }}>Loading administration database...</p>
      ) : subtab === 'users' ? (
        /* Tab 1: Users & Verifications */
        <div className="table-responsive">
          <table className="dense-table">
            <thead>
              <tr>
                <th>User / Organization</th>
                <th>Role</th>
                <th>Org Category</th>
                <th>Contact Details</th>
                <th>Pincode</th>
                <th>Verification</th>
                <th>Account Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.6 }}>
                  <td>
                    <strong style={{ color: 'var(--color-bark)' }}>{u.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span className={`role-tag ${u.role}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>{u.org_type || 'N/A'}</td>
                  <td>
                    {u.phone}
                    <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{u.address}</div>
                  </td>
                  <td>{u.pincode}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: u.is_verified ? 'var(--color-sage)' : 'var(--color-clay)'
                    }}>
                      {u.is_verified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {u.is_verified ? 'Verified' : 'Pending'}
                    </span>
                    {u.verification_notes && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(38,36,30,0.5)', maxWidth: '140px' }}>{u.verification_notes}</div>
                    )}
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: u.is_active ? 'var(--color-basil)' : 'var(--color-clay)'
                    }}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {!u.is_verified ? (
                        <button
                          className="btn btn-accent"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleVerifyUser(u.id, true)}
                        >
                          Approve
                        </button>
                      ) : (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', color: 'var(--color-clay)', borderColor: 'var(--color-clay)' }}
                          onClick={() => handleVerifyUser(u.id, false)}
                        >
                          Revoke
                        </button>
                      )}

                      {u.id !== user.id && (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                          onClick={() => handleToggleActive(u.id, !u.is_active)}
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : subtab === 'donations' ? (
        /* Tab 2: All Donations */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Filter Status:</span>
            {['all', 'posted', 'claimed', 'picked_up', 'completed', 'expired'].map((st) => (
              <button
                key={st}
                className={`btn ${donationFilter === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.8125rem' }}
                onClick={() => setDonationFilter(st)}
              >
                {st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          <div className="table-responsive">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Food Title</th>
                  <th>Donor</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Expiry Timestamp</th>
                  <th>Claim Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.food_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Pincode: {d.pickup_pincode}</div>
                    </td>
                    <td>{d.donor_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{d.category.replace('_', ' ')}</td>
                    <td>{d.quantity}</td>
                    <td>
                      <span className={`status-badge ${d.status}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{new Date(d.exp_datetime).toLocaleString()}</td>
                    <td>
                      {d.claim ? (
                        <span style={{ fontSize: '0.75rem' }}>
                          Claimed by {d.claim.ngo_name}
                          {d.claim.volunteer_name && ` (Courier: ${d.claim.volunteer_name})`}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.5)' }}>Unclaimed</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-destructive"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => handleDeleteDonation(d.id)}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : subtab === 'deliveries' ? (
        /* Tab 3: Delivery Logistics Monitor */
        <div className="table-responsive">
          <table className="dense-table">
            <thead>
              <tr>
                <th>Food Item</th>
                <th>Donor (Origin)</th>
                <th>Recipient NGO (Destination)</th>
                <th>Courier Volunteer</th>
                <th>Current Status</th>
                <th>Claimed At</th>
                <th>Delivered At</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((deliv) => (
                <tr key={deliv.id}>
                  <td>
                    <strong>{deliv.food_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{deliv.quantity}</div>
                  </td>
                  <td>
                    <div>{deliv.donor_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{deliv.donor_address}</div>
                  </td>
                  <td>
                    <div>{deliv.ngo_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{deliv.ngo_address}</div>
                  </td>
                  <td>
                    <strong>{deliv.volunteer_name}</strong>
                    {deliv.volunteer_phone && <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{deliv.volunteer_phone}</div>}
                  </td>
                  <td>
                    <span className={`status-badge ${deliv.status}`}>
                      {deliv.status}
                    </span>
                  </td>
                  <td>{new Date(deliv.claimed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{deliv.delivered_at ? new Date(deliv.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : subtab === 'issues' ? (
        /* Tab 4: Disputes & Issues */
        <div>
          <h2 style={{ fontSize: '1.25rem', color: 'var(--color-bark)', marginBottom: '1rem' }}>
            Reported Platform Tickets & Safety Disputes ({issues.length})
          </h2>

          <div className="table-responsive">
            <table className="dense-table">
              <thead>
                <tr>
                  <th>Ticket Subject</th>
                  <th>Reported By</th>
                  <th>Role</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Admin Resolution</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((iss) => (
                  <tr key={iss.id}>
                    <td>
                      <strong>{iss.subject}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.5)' }}>
                        {new Date(iss.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div>{iss.reporter_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>{iss.reporter_email}</div>
                    </td>
                    <td>
                      <span className={`role-tag ${iss.reporter_role}`}>{iss.reporter_role}</span>
                    </td>
                    <td style={{ maxWidth: '280px', fontSize: '0.8125rem' }}>
                      {iss.description}
                    </td>
                    <td>
                      <span className={`status-badge ${iss.status === 'resolved' ? 'completed' : iss.status === 'dismissed' ? 'expired' : 'claimed'}`}>
                        {iss.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>
                      {iss.admin_notes || 'Pending review'}
                    </td>
                    <td>
                      {iss.status === 'open' || iss.status === 'under_review' ? (
                        resolvingIssueId === iss.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '160px' }}>
                            <input
                              type="text"
                              className="form-control"
                              placeholder="Resolution notes..."
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              style={{ fontSize: '0.75rem', padding: '0.25rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button
                                className="btn btn-primary"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                                onClick={() => handleResolveIssue(iss.id, 'resolved')}
                              >
                                Resolve
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
                                onClick={() => handleResolveIssue(iss.id, 'dismissed')}
                              >
                                Dismiss
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-accent"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => { setResolvingIssueId(iss.id); setResolutionNotes(''); }}
                          >
                            Resolve Ticket
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-sage)', fontWeight: 600 }}>✓ Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 5: Impact & Reports */
        stats && (
          <div style={{ background: '#fff', border: '1px solid var(--border-bark-subtle)', borderRadius: 'var(--radius-card)', padding: '2rem' }}>
            <h2 className="heading-serif" style={{ color: 'var(--color-basil)', marginBottom: '0.5rem' }}>
              System Redistribution Impact Audit
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)', marginBottom: '1.5rem' }}>
              Ecological and social metrics tracking food surplus diverted from landfills to community meal tables.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ background: '#fbf8f1', padding: '1.25rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-bark-subtle)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>Total Meals Delivered & Saved</div>
                <div className="stat-value" style={{ color: 'var(--color-basil)', fontSize: '2.25rem' }}>{stats.meals_saved_estimate}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.5)', marginTop: '0.25rem' }}>Calculated at standard 28 meals/donation</div>
              </div>

              <div style={{ background: '#fbf8f1', padding: '1.25rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-bark-subtle)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>Food Waste Diverted from Landfill</div>
                <div className="stat-value" style={{ color: 'var(--color-sage)', fontSize: '2.25rem' }}>{stats.waste_reduced_kg_estimate} kg</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.5)', marginTop: '0.25rem' }}>Approx. greenhouse gas offset: {roundNum(stats.waste_reduced_kg_estimate * 2.5)} kg CO2e</div>
              </div>

              <div style={{ background: '#fbf8f1', padding: '1.25rem', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-bark-subtle)' }}>
                <div style={{ fontSize: '0.8125rem', color: 'rgba(38,36,30,0.7)' }}>Active Redistribution Network</div>
                <div className="stat-value" style={{ color: 'var(--color-marigold)', fontSize: '2.25rem' }}>{stats.verified_ngos + stats.active_donors}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.5)', marginTop: '0.25rem' }}>{stats.verified_ngos} NGOs • {stats.active_donors} Donors • {stats.active_volunteers} Volunteers</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.125rem', color: 'var(--color-bark)', marginBottom: '0.75rem' }}>
              Redistribution Lifecycle Efficiency
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', textAlign: 'center' }}>
              <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-bark-subtle)', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-basil)' }}>{stats.total_donations}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Total Posted</div>
              </div>
              <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-bark-subtle)', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-marigold)' }}>{stats.claimed_donations}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Total Claimed</div>
              </div>
              <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-bark-subtle)', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-sage)' }}>{stats.completed_deliveries}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Delivered Safely</div>
              </div>
              <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-bark-subtle)', borderRadius: '4px' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-clay)' }}>{stats.expired_donations}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(38,36,30,0.6)' }}>Expired / Archived</div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

function roundNum(val) {
  return Math.round(val * 10) / 10;
}
