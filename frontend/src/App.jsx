import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import DonorDashboard from './pages/DonorDashboard';
import NgoDashboard from './pages/NgoDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { Utensils, HeartHandshake, ShieldCheck, Truck, ArrowRight } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (user) {
      if (user.role === 'donor') setActiveTab('donor');
      else if (user.role === 'ngo') setActiveTab('browse');
      else if (user.role === 'volunteer') setActiveTab('volunteer');
      else if (user.role === 'admin') setActiveTab('admin');
      else setActiveTab('browse');
    } else {
      setActiveTab('home');
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: 'var(--color-oat)' }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-basil)' }}>
          Loading Food Redistribution System...
        </p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === 'home' && !user && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <span className="role-tag donor" style={{ fontSize: '0.875rem', padding: '0.3rem 0.8rem', marginBottom: '1rem' }}>
              FRS Platform v1.0
            </span>
            <h1 className="heading-serif" style={{ fontSize: '2.75rem', color: 'var(--color-basil)', marginTop: '0.5rem', marginBottom: '1rem' }}>
              Bridge Surplus Food to Shelters in Minutes
            </h1>
            <p style={{ maxWidth: '680px', margin: '0 auto 2rem auto', fontSize: '1.125rem', color: 'rgba(38,36,30,0.8)', lineHeight: '1.6' }}>
              Restaurants, hotels, households, and event organizers post excess meals. Verified NGOs claim surplus food, and volunteers move meals safely before expiration.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
              <button className="btn btn-accent" style={{ padding: '0.875rem 1.75rem', fontSize: '1.05rem' }} onClick={() => setActiveTab('auth')}>
                Get Started / Sign In <ArrowRight size={18} />
              </button>
              <button className="btn btn-outline" style={{ padding: '0.875rem 1.75rem', fontSize: '1.05rem' }} onClick={() => setActiveTab('browse_public')}>
                Browse Active Surplus
              </button>
            </div>

            {/* Role Features Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '2rem', textAlign: 'left' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Utensils color="var(--color-basil)" size={24} />
                  <h3 className="card-title">Food Donors</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
                  Post surplus meals, bakery items, or produce with safety MFD/EXP times and pickup locations.
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <HeartHandshake color="var(--color-marigold)" size={24} />
                  <h3 className="card-title">Verified NGOs</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
                  Browse nearby surplus food, filter by category and pincode, and claim meals with instant confirmation.
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Truck color="var(--color-sage)" size={24} />
                  <h3 className="card-title">Volunteers</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
                  Accept pickup tasks, view delivery routes, and update status from donor to recipient shelter.
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <ShieldCheck color="var(--color-bark)" size={24} />
                  <h3 className="card-title">Admins</h3>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(38,36,30,0.7)' }}>
                  Verify organization credentials, prevent system abuse, monitor activity, and audit impact metrics.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'auth' && (
          <AuthPage onLoginSuccess={(role) => {
            if (role === 'donor') setActiveTab('donor');
            else if (role === 'ngo') setActiveTab('browse');
            else if (role === 'volunteer') setActiveTab('volunteer');
            else if (role === 'admin') setActiveTab('admin');
            else setActiveTab('browse');
          }} />
        )}

        {(activeTab === 'browse' || activeTab === 'browse_public') && <NgoDashboard initialSubtab="browse" />}
        {activeTab === 'ngo_activity' && <NgoDashboard initialSubtab="activity" />}
        {activeTab === 'donor' && <DonorDashboard />}
        {activeTab === 'volunteer' && <VolunteerDashboard />}
        {activeTab === 'admin' && <AdminDashboard />}
      </main>

      <footer style={{
        backgroundColor: 'var(--color-bark)',
        color: 'var(--color-oat)',
        textAlign: 'center',
        padding: '1.25rem',
        fontSize: '0.8125rem',
        marginTop: 'auto'
      }}>
        Food Redistribution System (FRS) — Practical & Trustworthy Surplus Food Logistics
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
