import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, HeartHandshake, ShieldCheck, Truck, LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AuthPage({ onLoginSuccess }) {
  const { login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('donor');
  const [orgType, setOrgType] = useState('restaurant');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('10001');

  // Password Recovery State
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState(1); // 1 = request, 2 = enter code

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemoAccount = (demoRole) => {
    switch (demoRole) {
      case 'admin':
        setEmail('admin@test.com');
        setPassword('password123');
        break;
      case 'donor':
        setEmail('donor@test.com');
        setPassword('password123');
        break;
      case 'ngo_verified':
        setEmail('ngo@test.com');
        setPassword('password123');
        break;
      case 'ngo_pending':
        setEmail('unverified_ngo@test.com');
        setPassword('password123');
        break;
      case 'volunteer':
        setEmail('volunteer@test.com');
        setPassword('password123');
        break;
      default: break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (mode === 'forgot') {
      if (recoveryStep === 1) {
        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (data.demo_reset_token) {
            setResetToken(data.demo_reset_token);
            setSuccessMsg(`Recovery code generated: ${data.demo_reset_token} (Simulated Email Dispatch)`);
          } else {
            setSuccessMsg(data.message);
          }
          setRecoveryStep(2);
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, reset_token: resetToken, new_password: newPassword })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || 'Password reset failed');

          setSuccessMsg('✓ Password successfully reset! Please sign in with your new password.');
          setMode('login');
          setPassword('');
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login'
      ? { email, password }
      : { name, email, password, role, org_type: orgType, phone, address, pincode };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      login(data.access_token, data.user);
      if (onLoginSuccess) onLoginSuccess(data.user.role);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2rem auto' }}>
      <div style={{
        background: '#fff',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--border-bark-subtle)',
        padding: '2rem',
        boxShadow: '0 4px 12px rgba(38,36,30,0.05)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', color: 'var(--color-basil)', marginBottom: '0.5rem' }}>
            Food Redistribution System
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
            Connecting surplus food donors with verified recipient NGOs & volunteers
          </p>
        </div>

        {/* Tab Buttons */}
        {mode !== 'forgot' ? (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-bark-subtle)', paddingBottom: '0.5rem' }}>
            <button
              className={`btn ${mode === 'login' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              <LogIn size={16} /> Sign In
            </button>
            <button
              className={`btn ${mode === 'register' ? 'btn-primary' : 'btn-outline'}`}
              style={{ flex: 1 }}
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            >
              <UserPlus size={16} /> Register
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-bark-subtle)' }}>
            <button
              className="btn btn-outline"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.8125rem' }}
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--color-bark)' }}>
              Password Recovery
            </span>
          </div>
        )}

        {error && (
          <div className="alert-banner danger">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="alert-banner success">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label className="form-label">Select System Role</label>
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="donor">Food Donor (Restaurant, Hotel, Event, Household)</option>
                  <option value="ngo">NGO / Recipient Organization</option>
                  <option value="volunteer">Community Volunteer Courier</option>
                  <option value="admin">System Administrator</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name / Organization Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Green Choice Bistro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization Category</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Restaurant, Shelter"
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+1-555-0199"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Street Address *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="123 Main Street"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode / Zipcode *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="10001"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {mode !== 'forgot' ? (
            <>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password *</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--color-basil)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); setRecoveryStep(1); }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          ) : (
            /* Forgot Password Flow */
            recoveryStep === 1 ? (
              <div className="form-group">
                <label className="form-label">Registered Account Email *</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your registered email..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label className="form-label">8-Character Recovery Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. A3F8B12C"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter new secure password..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (
              mode === 'forgot'
                ? (recoveryStep === 1 ? 'Request Recovery Code' : 'Set New Password')
                : (mode === 'login' ? 'Sign In' : 'Create Account')
            )}
          </button>
        </form>

        {/* Quick Demo Login Preset Buttons */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--border-bark-subtle)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'rgba(38,36,30,0.6)', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
            ⚡ Quick Demo Accounts (Click to Pre-fill Credentials)
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => { setMode('login'); fillDemoAccount('donor'); }}>
              <Utensils size={12} color="var(--color-basil)" /> Verified Donor
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => { setMode('login'); fillDemoAccount('ngo_verified'); }}>
              <HeartHandshake size={12} color="var(--color-marigold)" /> Verified NGO
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => { setMode('login'); fillDemoAccount('volunteer'); }}>
              <Truck size={12} color="var(--color-sage)" /> Volunteer Courier
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem' }} onClick={() => { setMode('login'); fillDemoAccount('admin'); }}>
              <ShieldCheck size={12} /> System Admin
            </button>
            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.35rem', gridColumn: 'span 2' }} onClick={() => { setMode('login'); fillDemoAccount('ngo_pending'); }}>
              <HeartHandshake size={12} color="var(--color-clay)" /> Pending NGO (To test admin verification queue)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
