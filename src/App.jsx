import React, { useState } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import PatientPortal from './components/PatientPortal';
import ReferralPortal from './components/ReferralPortal';
import QueuePortal from './components/QueuePortal';
import FinancialAssistancePortal from './components/FinancialAssistancePortal';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';

export default function App() {
  const [activeModule, setActiveModule] = useState('home');
  const [currentLang, setCurrentLang] = useState('en'); // 'en' | 'am'
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveModule('home');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveModule('dashboard');
  };

  const isProtectedRoute = ['dashboard', 'appointments', 'files', 'referral', 'queue'].includes(activeModule);

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
        onLogout={handleLogout}
      />

      {/* Render Active Module / Page */}
      <main>
        {isProtectedRoute && !currentUser ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#e8f0fe',
              color: '#0f3b5e',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '16px'
            }}>
              <i className="fas fa-lock"></i>
            </div>
            <h2 style={{ color: '#0f3b5e', marginBottom: '8px' }}>
              {currentLang === 'am' ? 'እባክዎ መጀመሪያ ይግቡ' : 'Authentication Required'}
            </h2>
            <p style={{ color: '#4a5a6e', fontSize: '15px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
              {currentLang === 'am'
                ? 'የታካሚ ዳሽቦርድ፣ ቀጠሮዎች፣ ፋይሎች፣ ሪፈራል እና ተራ መረጃዎችን ለማግኘት እባክዎ ወደ ሂል ፈንድ አካውንትዎ ይግቡ።'
                : 'Please log in to access your Patient Dashboard, Appointment schedule, Verified Medical Files, Hospital Referrals, and Live Queue.'}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setIsAuthOpen(true)}>
                <i className="fas fa-sign-in-alt"></i> {currentLang === 'am' ? 'ይግቡ / ይመዝገቡ' : 'Log In / Register'}
              </button>
              <button className="btn btn-outline" onClick={() => setActiveModule('home')}>
                <i className="fas fa-home"></i> {currentLang === 'am' ? 'ወደ መነሻ ተመለስ' : 'Back to Home'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {['home', 'dashboard', 'appointments', 'files', 'help', 'patient'].includes(activeModule) && (
              <PatientPortal
                currentLang={currentLang}
                currentUser={currentUser}
                onOpenAuth={() => setIsAuthOpen(true)}
                activeTab={activeModule === 'patient' ? 'home' : activeModule}
                setActiveTab={setActiveModule}
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
          </>
        )}

        {activeModule === 'financial' && (
          <FinancialAssistancePortal
            currentLang={currentLang}
          />
        )}

        {activeModule === 'about' && (
          <AboutUs
            currentLang={currentLang}
          />
        )}

        {activeModule === 'contact' && (
          <ContactUs
            currentLang={currentLang}
          />
        )}
      </main>

      {/* Auth Modal (Login / Signup) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
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
