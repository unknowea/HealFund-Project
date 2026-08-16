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
      <div className="logo" onClick={() => setActiveModule('home')} style={{ cursor: 'pointer' }}>
        <i className="fas fa-heartbeat"></i>
        <span>{currentLang === 'am' ? 'ሂል ፈንድ' : 'HealFund'}</span>
      </div>

      <div className="module-tabs">
        <button
          className={`module-tab ${activeModule === 'home' ? 'active' : ''}`}
          onClick={() => setActiveModule('home')}
        >
          <i className="fas fa-home"></i>
          <span>{currentLang === 'am' ? 'መነሻ' : 'Home'}</span>
        </button>

        {currentUser && (
          <>
            <button
              className={`module-tab ${activeModule === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveModule('dashboard')}
            >
              <i className="fas fa-tachometer-alt"></i>
              <span>{currentLang === 'am' ? 'ዳሽቦርድ' : 'Dashboard'}</span>
            </button>

            <button
              className={`module-tab ${activeModule === 'appointments' ? 'active' : ''}`}
              onClick={() => setActiveModule('appointments')}
            >
              <i className="fas fa-calendar-check"></i>
              <span>{currentLang === 'am' ? 'ቀጠሮዎች' : 'Appointments'}</span>
            </button>

            <button
              className={`module-tab ${activeModule === 'files' ? 'active' : ''}`}
              onClick={() => setActiveModule('files')}
            >
              <i className="fas fa-file-medical"></i>
              <span>{currentLang === 'am' ? 'ፋይሎች' : 'Files'}</span>
            </button>

            <button
              className={`module-tab ${activeModule === 'referral' ? 'active' : ''}`}
              onClick={() => setActiveModule('referral')}
            >
              <i className="fas fa-hospital-user"></i>
              <span>{currentLang === 'am' ? 'የሆስፒታል ሪፈራል' : 'Referrals'}</span>
            </button>

            <button
              className={`module-tab ${activeModule === 'queue' ? 'active' : ''}`}
              onClick={() => setActiveModule('queue')}
            >
              <i className="fas fa-stream"></i>
              <span>{currentLang === 'am' ? 'ተራ እና ቀጠሮ' : 'Queue'}</span>
            </button>

            <button
              className={`module-tab ${activeModule === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveModule('admin')}
            >
              <i className="fas fa-inbox"></i>
              <span>{currentLang === 'am' ? 'የአስተዳዳሪ ሳጥን' : 'Admin Inbox'}</span>
            </button>
          </>
        )}

        <button
          className={`module-tab ${activeModule === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveModule('financial')}
        >
          <i className="fas fa-hand-holding-heart"></i>
          <span>{currentLang === 'am' ? 'የገንዘብ እርዳታ' : 'Financial Aid'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'help' ? 'active' : ''}`}
          onClick={() => setActiveModule('help')}
        >
          <i className="fas fa-question-circle"></i>
          <span>{currentLang === 'am' ? 'እርዳታ' : 'Help'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'about' ? 'active' : ''}`}
          onClick={() => setActiveModule('about')}
        >
          <i className="fas fa-info-circle"></i>
          <span>{currentLang === 'am' ? 'ስለ እኛ' : 'About Us'}</span>
        </button>

        <button
          className={`module-tab ${activeModule === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveModule('contact')}
        >
          <i className="fas fa-envelope"></i>
          <span>{currentLang === 'am' ? 'አግኙን' : 'Contact Us'}</span>
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
