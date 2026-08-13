import React from 'react';

export default function Navbar({
  activeModule,
  setActiveModule,
  currentLang,
  setLanguage,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  return (
    <nav className="navbar">
      <div className="logo">
        <i className="fas fa-heartbeat"></i>
        <span>{currentLang === 'am' ? 'ሂል ፈንድ' : 'HealFund'}</span>
      </div>

      <div className="module-tabs">
        <button
          className={`module-tab ${activeModule === 'patient' ? 'active' : ''}`}
          onClick={() => setActiveModule('patient')}
        >
          <i className="fas fa-user-circle"></i>
          <span>{currentLang === 'am' ? 'የታካሚ ሞጁል' : 'Patient Module'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'referral' ? 'active' : ''}`}
          onClick={() => setActiveModule('referral')}
        >
          <i className="fas fa-hospital-user"></i>
          <span>{currentLang === 'am' ? 'የሆስፒታል ሪፈራል' : 'Hospital Referrals'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveModule('queue')}
        >
          <i className="fas fa-calendar-alt"></i>
          <span>{currentLang === 'am' ? 'ተራ እና ቀጠሮ' : 'Queue & Appointments'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveModule('financial')}
        >
          <i className="fas fa-hand-holding-heart"></i>
          <span>{currentLang === 'am' ? 'የገንዘብ እርዳታ' : 'Financial Assistance'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div className="lang-toggle">
          <button
            className={currentLang === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            EN
          </button>
          <button
            className={currentLang === 'am' ? 'active' : ''}
            onClick={() => setLanguage('am')}
          >
            አማ
          </button>
        </div>

        {currentUser ? (
          <div className="user-profile">
            <div className="avatar-circle">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <span>{currentUser.name ? currentUser.name.split(' ')[0] : 'User'}</span>
            <button
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: '#da121a', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" style={{ padding: '6px 18px', fontSize: '13px' }} onClick={onOpenAuth}>
            {currentLang === 'am' ? 'ይግቡ' : 'Log In'}
          </button>
        )}
      </div>
    </nav>
  );
}
