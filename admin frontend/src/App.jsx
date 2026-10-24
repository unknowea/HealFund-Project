import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import AdminPortal from './components/AdminPortal';
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
      {currentUser && (
        <Navbar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          currentLang={currentLang}
          setLanguage={setCurrentLang}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        {activeModule === 'queue' && currentUser ? (
          <QueuePortal currentLang={currentLang} currentUser={currentUser} />
        ) : (
          <AdminPortal
            currentLang={currentLang}
            currentUser={currentUser}
            activeTab={activeModule === 'inbox' ? 'messages' : activeModule}
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleLogout}
          />
        )}
      </main>

      {currentUser && (
        <footer className="footer-note">
          <div className="footer-grid">
            <div className="footer-brand">
              <strong><i className="fas fa-shield-alt"></i> HealFund</strong>
              <p>Connecting patients and hospitals through verified care, appointments, queue tracking, and financial support.</p>
            </div>
            <div>
              <h4>Quick Links</h4>
              <button onClick={() => setActiveModule('dashboard')}>Dashboard</button>
              <button onClick={() => setActiveModule('appointments')}>Appointments</button>
              <button onClick={() => setActiveModule('queue')}>Patient Queue</button>
              <button onClick={() => setActiveModule('documents')}>Documents</button>
            </div>
            <div>
              <h4>Administration</h4>
              <button onClick={() => setActiveModule('users')}>Users</button>
              <button onClick={() => setActiveModule('financial')}>Financials</button>
            </div>
            <div className="footer-contact">
              <h4>Contact</h4>
              <p>Zewditu Memorial Hospital</p>
              <p>Lideta / Kirkos Sub-City, Addis Ababa</p>
              <p>HealFundET@gmail.com</p>
              <p>+251921198350</p>
              <p>Emergency Triage: 24/7</p>
            </div>
          </div>
          <div className="footer-bottom">© 2026 HealFund. All rights reserved.</div>
        </footer>
      )}

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
