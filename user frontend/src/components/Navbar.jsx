import React, { useState } from 'react';

export default function Navbar({
  activeModule,
  setActiveModule,
  currentLang,
  setLanguage,
  currentUser,
  onOpenAuth,
  onLogout,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleProfileAction = (module) => {
    setActiveModule(module);
    setIsProfileMenuOpen(false);
  };

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
          <button className={currentLang === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
          <button className={currentLang === 'am' ? 'active' : ''} onClick={() => setLanguage('am')}>አማ</button>
        </div>

        {currentUser ? (
          <div className="user-profile-wrapper" style={{ position: 'relative' }}>
            <button
              type="button"
              className="user-profile"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <div className="avatar-circle">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <span style={{ fontWeight: 600, fontSize: '15px' }}>
                {currentUser.name ? currentUser.name.split(' ')[0] : 'User'}
              </span>
              <i className="fas fa-chevron-down" style={{ fontSize: '11px', color: '#5e6f82' }}></i>
            </button>

            {isProfileMenuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', background: '#fff',
                borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                border: '1px solid #e2eaf3', zIndex: 100, minWidth: '180px', overflow: 'hidden'
              }}>
                {[
                  { module: 'dashboard', icon: 'fa-tachometer-alt', label: currentLang === 'am' ? 'ዳሽቦርድ' : 'Dashboard' },
                  { module: 'appointments', icon: 'fa-calendar-check', label: currentLang === 'am' ? 'ቀጠሮዎች' : 'Appointments' },
                  { module: 'files', icon: 'fa-file-medical', label: currentLang === 'am' ? 'ፋይሎች' : 'Files' },
                  { module: 'queue', icon: 'fa-stream', label: currentLang === 'am' ? 'ተራ እና ቀጠሮ' : 'Queue' },
                ].map(({ module, icon, label }) => (
                  <button key={module} type="button" onClick={() => handleProfileAction(module)}
                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#0f3b5e', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f9f3'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className={`fas ${icon}`} style={{ color: '#078930', width: '16px' }}></i>
                    <span>{label}</span>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #e2eaf3' }}>
                  <button type="button" onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#da121a', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <i className="fas fa-sign-out-alt" style={{ width: '16px' }}></i>
                    <span>{currentLang === 'am' ? 'ውጣ' : 'Logout'}</span>
                  </button>
                </div>
              </div>
            )}
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
