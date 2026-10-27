import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import PatientPortal from './components/PatientPortal';
import QueuePortal from './components/QueuePortal';
import FinancialAssistancePortal from './components/FinancialAssistancePortal';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import { removePushSubscription } from './api.js';

export default function App() {
  const [activeModule, setActiveModule] = useState(() => (
    new URLSearchParams(window.location.search).get('notification') === '1'
      ? 'dashboard'
      : new URLSearchParams(window.location.search).get('payment') === 'return' ? 'financial' : 'home'
  ));
  const [currentLang, setCurrentLang] = useState('en');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Restore only explicitly remembered sessions, or the current browser session.
  useEffect(() => {
    const isRemembered = localStorage.getItem('healfund_remember_me') === 'true';
    const rememberedUser = isRemembered ? localStorage.getItem('healfund_user') : null;
    const rememberedToken = isRemembered ? localStorage.getItem('healfund_token') : null;
    if (!isRemembered) {
      localStorage.removeItem('healfund_token');
      localStorage.removeItem('healfund_user');
    }
    const sessionUser = sessionStorage.getItem('healfund_user');
    const sessionToken = sessionStorage.getItem('healfund_token');
    const candidates = [
      { user: rememberedUser, token: rememberedToken, storage: localStorage },
      { user: sessionUser, token: sessionToken, storage: sessionStorage },
    ];

    for (const candidate of candidates) {
      if (!candidate.user || !candidate.token) continue;
      try {
        const user = JSON.parse(candidate.user);
        if (user?.role === 'patient') {
          setCurrentUser(user);
          break;
        }
        candidate.storage.removeItem('healfund_token');
        candidate.storage.removeItem('healfund_user');
      } catch {
        candidate.storage.removeItem('healfund_token');
        candidate.storage.removeItem('healfund_user');
      }
    }
    if (!localStorage.getItem('healfund_token') || !localStorage.getItem('healfund_user')) {
      localStorage.removeItem('healfund_remember_me');
    }
  }, []);

  const handleLogout = () => {
    const unsubscribePush = async () => {
      try {
        const registration = await navigator.serviceWorker?.getRegistration('/service-worker.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await removePushSubscription(subscription.endpoint);
          await subscription.unsubscribe();
        }
      } catch (error) {
        console.warn('Could not disable browser push during sign out:', error);
      }
    };
    void unsubscribePush();
    localStorage.removeItem('healfund_token');
    localStorage.removeItem('healfund_user');
    localStorage.removeItem('healfund_remember_me');
    sessionStorage.removeItem('healfund_token');
    sessionStorage.removeItem('healfund_user');
    setCurrentUser(null);
    setActiveModule('home');
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setActiveModule('dashboard');
  };

  const isProtectedRoute = ['dashboard', 'appointments', 'files', 'queue'].includes(activeModule);

  return (
    <div className="app-container">
      <Navbar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        currentLang={currentLang}
        setLanguage={setCurrentLang}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main>
        {isProtectedRoute && !currentUser ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8f0fe', color: '#0f3b5e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '16px' }}>
              <i className="fas fa-lock"></i>
            </div>
            <h2 style={{ color: '#0f3b5e', marginBottom: '8px' }}>
              {currentLang === 'am' ? 'እባክዎ መጀመሪያ ይግቡ' : 'Authentication Required'}
            </h2>
            <p style={{ color: '#4a5a6e', fontSize: '15px', maxWidth: '500px', margin: '0 auto 24px auto' }}>
              {currentLang === 'am'
                ? 'የታካሚ ዳሽቦርድ፣ ቀጠሮዎች፣ ፋይሎች እና ተራ መረጃዎችን ለማግኘት እባክዎ ወደ ሂል ፈንድ አካውንትዎ ይግቡ።'
                : 'Please log in to access your Patient Dashboard, Appointments, Medical Files, and Live Queue.'}
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
            {activeModule === 'queue' && (
              <QueuePortal currentLang={currentLang} currentUser={currentUser} />
            )}

          </>
        )}

        {activeModule === 'financial' && <FinancialAssistancePortal currentLang={currentLang} />}
        {activeModule === 'about' && <AboutUs currentLang={currentLang} />}
        {activeModule === 'contact' && <ContactUs currentLang={currentLang} />}
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentLang={currentLang}
      />

      <footer className="footer-note">
        <div className="footer-grid">
          <div className="footer-brand">
            <strong><i className="fas fa-heartbeat"></i> HealFund</strong>
            <p>{currentLang === 'am' ? 'ታካሚዎችን እና ሆስፒታሎችን በተረጋገጠ የጤና አገልግሎት ማገናኘት።' : 'Connecting patients and hospitals through verified care, appointments, and financial support.'}</p>
          </div>
          <div>
            <h4>{currentLang === 'am' ? 'ፈጣን አገናኞች' : 'Quick Links'}</h4>
            <button onClick={() => setActiveModule('home')}>Home</button>
            <button onClick={() => setActiveModule('financial')}>Financial Aid</button>
            <button onClick={() => setActiveModule('about')}>About Us</button>
            <button onClick={() => setActiveModule('contact')}>Contact Us</button>
          </div>
          <div>
            <h4>{currentLang === 'am' ? 'አገልግሎቶች' : 'Services'}</h4>
            <button onClick={() => setActiveModule('appointments')}>Appointments</button>
            <button onClick={() => setActiveModule('files')}>Medical Files</button>
            <button onClick={() => setActiveModule('queue')}>Patient Queue</button>
            <button onClick={() => setActiveModule('financial')}>Financial Support</button>
          </div>
          <div className="footer-contact">
            <h4>{currentLang === 'am' ? 'ያግኙን' : 'Contact'}</h4>
            <p>Zewditu Memorial Hospital</p>
            <p>Lideta / Kirkos Sub-City, Addis Ababa</p>
            <p>HealFundET@gmail.com</p>
            <p>+251921198350</p>
            <a href="https://www.linkedin.com/in/heal-fund" target="_blank" rel="noopener noreferrer" aria-label="HealFund on LinkedIn">LinkedIn</a>
            <p>Emergency Triage: 24/7</p>
          </div>
        </div>
        <div className="footer-bottom">© 2026 HealFund. All rights reserved.</div>
      </footer>
    </div>
  );
}
