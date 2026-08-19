import React, { useState } from 'react';
import AdminPortal from './components/AdminPortal';

export default function App() {
  const [currentLang, setCurrentLang] = useState('en');

  return (
    <div className="app-container" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <main style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
        <AdminPortal currentLang={currentLang} />
      </main>
      <footer className="footer-note" style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
        <i className="fas fa-shield-alt"></i> HealFund Standalone Administration Hub · Port 3001
      </footer>
    </div>
  );
}
