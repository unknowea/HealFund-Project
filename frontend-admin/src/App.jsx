import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPortal from './components/AdminPortal';
import ReferralPortal from './components/ReferralPortal';
import QueuePortal from './components/QueuePortal';

export default function App() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [currentLang, setCurrentLang] = useState('en');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Restore session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('healfund_user');
    const savedToken = localStorage.getItem('healfund_token');
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        if (user.role === 'admin' || user.role === 'hospital_officer') {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error('Failed to parse saved user', e);
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
    setActiveModule('dashboard');
  };

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        currentLang={currentLang}
        setLanguage={setCurrentLang}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {activeModule === 'referrals' && currentUser ? (
          <ReferralPortal
            currentLang={currentLang}
            currentUser={currentUser}
            setActiveModule={setActiveModule}
          />
        ) : activeModule === 'queue' && currentUser ? (
          <QueuePortal currentLang={currentLang} currentUser={currentUser} />
        ) : (
          <AdminPortal
            currentLang={currentLang}
            currentUser={currentUser}
            activeTab={activeModule === 'inbox' ? 'messages' : activeModule === 'messages' ? 'chat' : activeModule}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}
      </main>

      <footer className="footer-note" style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
        <i className="fas fa-shield-alt"></i> HealFund Standalone Administration Hub · Zewditu Memorial Hospital Operations
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentLang={currentLang}
        adminMode
      />
    </div>
  );
}
