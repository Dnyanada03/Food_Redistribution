import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Utensils, LogOut, ShieldCheck, HeartHandshake, Truck, User, Bell, Check, AlertCircle } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, token, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [token]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (notifId) => {
    try {
      const res = await fetch(`/api/notifications/${notifId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n.id === notifId ? { ...n, is_read: true } : n));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'donor': return <Utensils size={14} />;
      case 'ngo': return <HeartHandshake size={14} />;
      case 'volunteer': return <Truck size={14} />;
      case 'admin': return <ShieldCheck size={14} />;
      default: return <User size={14} />;
    }
  };

  return (
    <header className="nav-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <a href="#" className="nav-brand" onClick={() => setActiveTab('home')}>
          <Utensils size={24} color="#E2A33B" />
          <span>Food Redistribution</span>
          <span className="nav-brand-badge">FRS</span>
        </a>

        {user && (
          <nav className="nav-links">
            {user.role === 'donor' && (
              <>
                <button
                  className={`nav-link ${activeTab === 'donor' ? 'active' : ''}`}
                  onClick={() => setActiveTab('donor')}
                >
                  My Food Postings
                </button>
                <button
                  className={`nav-link ${activeTab === 'browse' ? 'active' : ''}`}
                  onClick={() => setActiveTab('browse')}
                >
                  Browse Surplus
                </button>
              </>
            )}

            {user.role === 'ngo' && (
              <>
                <button
                  className={`nav-link ${activeTab === 'browse' ? 'active' : ''}`}
                  onClick={() => setActiveTab('browse')}
                >
                  Browse Available Surplus
                </button>
                <button
                  className={`nav-link ${activeTab === 'ngo_activity' ? 'active' : ''}`}
                  onClick={() => setActiveTab('ngo_activity')}
                >
                  My Claimed Activity
                </button>
              </>
            )}

            {user.role === 'volunteer' && (
              <>
                <button
                  className={`nav-link ${activeTab === 'volunteer' ? 'active' : ''}`}
                  onClick={() => setActiveTab('volunteer')}
                >
                  Volunteer Delivery Tasks
                </button>
              </>
            )}

            {user.role === 'admin' && (
              <button
                className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                Admin Command Center
              </button>
            )}
          </nav>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user ? (
          <>
            {/* Notification Bell with Badge */}
            <div className="notif-container">
              <button
                className="notif-btn"
                title="Notifications"
                onClick={() => setShowNotifs(!showNotifs)}
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showNotifs && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--color-basil)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                        onClick={handleMarkAllRead}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'rgba(38,36,30,0.6)' }}>
                      No notifications yet
                    </div>
                  ) : (
                    <div>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`notif-item ${!n.is_read ? 'unread' : ''}`}
                          onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                        >
                          <div className="notif-title">
                            <span>{n.title}</span>
                            {!n.is_read && <span style={{ height: 6, width: 6, borderRadius: '50%', background: 'var(--color-clay)' }} />}
                          </div>
                          <div className="notif-message">{n.message}</div>
                          <div className="notif-time">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="user-badge">
              <span className={`role-tag ${user.role}`}>
                {getRoleIcon(user.role)} {user.role}
              </span>
              <span style={{ fontWeight: 600 }}>{user.name}</span>
              {(user.role === 'ngo' || user.role === 'donor') && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  backgroundColor: user.is_verified ? 'var(--color-sage)' : 'var(--color-clay)',
                  color: user.is_verified ? '#1f381c' : '#fff'
                }}>
                  {user.is_verified ? 'Verified' : 'Pending Verification'}
                </span>
              )}
            </div>

            <button
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', color: 'var(--color-oat)', borderColor: 'rgba(244, 238, 221, 0.4)' }}
              onClick={logout}
            >
              <LogOut size={14} /> Logout
            </button>
          </>
        ) : (
          <button
            className="btn btn-accent"
            onClick={() => setActiveTab('auth')}
          >
            Sign In / Register
          </button>
        )}
      </div>
    </header>
  );
}
