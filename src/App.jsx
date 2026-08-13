import React, { useState } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import PatientPortal from './components/PatientPortal';
import ReferralPortal from './components/ReferralPortal';
import QueuePortal from './components/QueuePortal';
import FinancialAssistancePortal from './components/FinancialAssistancePortal';

export default function App() {
  const [activeModule, setActiveModule] = useState('patient'); // 'patient' | 'referral' | 'queue' | 'financial'
  const [currentLang, setCurrentLang] = useState('en'); // 'en' | 'am'
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Main Navbar */}
      <Navbar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        currentLang={currentLang}
        setLanguage={setCurrentLang}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => setCurrentUser(null)}
      />

      {/* Render Active Module */}
      <main>
        {activeModule === 'patient' && (
          <PatientPortal
            currentLang={currentLang}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            setActiveModule={setActiveModule}
          />
        )}

        {activeModule === 'referral' && (
          <ReferralPortal
            currentLang={currentLang}
            currentUser={currentUser}
            setActiveModule={setActiveModule}
          />
        )}

        {activeModule === 'queue' && (
          <QueuePortal
            currentLang={currentLang}
            currentUser={currentUser}
          />
        )}

        {activeModule === 'financial' && (
          <FinancialAssistancePortal
            currentLang={currentLang}
          />
        )}
      </main>

      {/* Auth Modal (Login / Signup) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
        currentLang={currentLang}
      />

      {/* Footer */}
      <footer className="footer-note">
        <i className="fas fa-heart"></i>{' '}
        <span>
          {currentLang === 'am'
            ? 'ሂል ፈንድ — ለኢትዮጵያ ሁሉ የጤና ተደራሽነት ማጎልበት።'
            : 'HealFund — Empowering health access for every Ethiopian.'}
        </span>
      </footer>
    </div>
  );
}
