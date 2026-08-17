import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPortal from './components/AdminPortal';
import ReferralPortal from './components/ReferralPortal';
import QueuePortal from './components/QueuePortal';

export default function App() {
  const [activeModule, setActiveModule] = useState('inbox');
  const [currentLang, setCurrentLang] = useState('en');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('healfund_user');
    const savedToken = localStorage.getItem('healfund_token');
    if (savedUser && savedToken) {
      const user = JSON.parse(savedUser);
      if (user.role === 'admin' || user.role === 'hospital_officer') {
        setCurrentUser(user);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('healfund_token');
    localStorage.removeItem('healfund_user');
    setCurrentUser(null);
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveModule('inbox');
  };

  if (!currentUser) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ fontSize: '56px', color: '#078930', marginBottom: '16px' }}>
            <i className="fas fa-shield-alt"></i>
          </div>
          <h2 style={{ color: '#0f3b5e', marginBottom: '8px', fontSize: '26px' }}>HealFund Admin Portal</h2>
          <p style={{ color: '#4a5a6e', marginBottom: '28px', fontSize: '15px' }}>
            This portal is for authorised hospital staff only. Sign in with your staff credentials.
          </p>
          <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={() => setIsAuthOpen(true)}>
            <i className="fas fa-sign-in-alt"></i> Staff Sign In
          </button>
          <div style={{ marginTop: '16px', fontSize: '13px', color: '#7a8a9e' }}>
            Demo: <strong>admin@zewditu.gov.et</strong> / <strong>admin123</strong><br />
            or: <strong>staff@lidetahc.gov.et</strong> / <strong>hospital123</strong>
          </div>
        </div>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} onLoginSuccess={handleLoginSuccess} currentLang={currentLang} adminMode />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Navbar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        currentLang={currentLang}
        setLanguage={setCurrentLang}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main>
        {activeModule === 'inbox' && <AdminPortal currentLang={currentLang} currentUser={currentUser} />}
        {activeModule === 'referrals' && <ReferralPortal currentLang={currentLang} currentUser={currentUser} setActiveModule={setActiveModule} />}
        {activeModule === 'queue' && <QueuePortal currentLang={currentLang} currentUser={currentUser} />}
      </main>

      <footer className="footer-note">
        <i className="fas fa-hospital"></i>{' '}
        <span>HealFund Admin — Zewditu Memorial Hospital Operations Portal</span>
      </footer>
    </div>
  );
}
