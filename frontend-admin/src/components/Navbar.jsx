import React from 'react';

export default function Navbar({
  activeModule,
  setActiveModule,
  currentLang,
  setLanguage,
  currentUser,
  onLogout,
}) {
  return (
    <nav className="navbar">
      <div className="logo" onClick={() => setActiveModule('inbox')} style={{ cursor: 'pointer' }}>
        <i className="fas fa-shield-alt"></i>
        <span>{currentLang === 'am' ? 'ሂል ፈንድ — አስተዳዳሪ' : 'HealFund Admin'}</span>
      </div>

      <div className="module-tabs">
        <button
          className={`module-tab ${activeModule === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveModule('inbox')}
        >
          <i className="fas fa-inbox"></i>
          <span>{currentLang === 'am' ? 'የመልዕክት ሳጥን' : 'Inbox'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveModule('referrals')}
        >
          <i className="fas fa-hospital-user"></i>
          <span>{currentLang === 'am' ? 'ሪፈራሎች' : 'Referrals'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveModule('queue')}
        >
          <i className="fas fa-stream"></i>
          <span>{currentLang === 'am' ? 'የታካሚ ተራ' : 'Patient Queue'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveModule('messages')}
        >
          <i className="fas fa-comments"></i>
          <span>{currentLang === 'am' ? 'መልዕክቶች' : 'Messages'}</span>
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="lang-toggle">
          <button className={currentLang === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
          <button className={currentLang === 'am' ? 'active' : ''} onClick={() => setLanguage('am')}>አማ</button>
        </div>

        {currentUser && (
          <div className="user-profile">
            <div className="avatar-circle">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div style={{ lineHeight: '1.2' }}>
              <span style={{ display: 'block' }}>{currentUser.name ? currentUser.name.split(' ')[0] : 'Admin'}</span>
              {currentUser.role && (
                <span style={{ fontSize: '11px', color: '#5e6f82' }}>{currentUser.role}</span>
              )}
            </div>
            <button
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: '#da121a', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
