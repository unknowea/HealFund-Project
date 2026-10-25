import React, { useState } from 'react';
import { changePassword, deleteAccount } from '../api.js';

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
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [deleteAccountSaving, setDeleteAccountSaving] = useState(false);

  const handleProfileAction = (module) => {
    setActiveModule(module);
    setIsProfileMenuOpen(false);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError(currentLang === 'am' ? 'አዲሶቹ የይለፍ ቃሎች አይዛመዱም።' : 'The new passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(currentLang === 'am' ? 'የይለፍ ቃሉ ቢያንስ 8 ቁምፊዎች መሆን አለበት።' : 'Password must be at least 8 characters long.');
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await changePassword(currentPassword, newPassword);
      setPasswordSuccess(result.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error.message || 'Could not change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteAccountSaving(true);
    setDeleteAccountError('');
    try {
      await deleteAccount();
      setIsDeleteAccountOpen(false);
      onLogout();
    } catch (error) {
      setDeleteAccountError(error.message || 'Could not delete your account.');
    } finally {
      setDeleteAccountSaving(false);
    }
  };

  return (
    <>
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
                  <button type="button" onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsPasswordModalOpen(true);
                  }}
                    style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#0f3b5e', textAlign: 'left' }}
                  >
                    <i className="fas fa-key" style={{ color: '#078930', width: '16px' }}></i>
                    <span>{currentLang === 'am' ? 'የይለፍ ቃል ቀይር' : 'Change password'}</span>
                  </button>
                  {currentUser.role === 'patient' && (
                    <button type="button" onClick={() => {
                      setIsProfileMenuOpen(false);
                      setDeleteAccountError('');
                      setIsDeleteAccountOpen(true);
                    }}
                      style={{ width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#da121a', textAlign: 'left' }}
                      onMouseEnter={(event) => { event.currentTarget.style.background = '#fff5f5'; }}
                      onMouseLeave={(event) => { event.currentTarget.style.background = 'none'; }}
                    >
                      <i className="fas fa-user-times" style={{ width: '16px' }}></i>
                      <span>{currentLang === 'am' ? 'መለያ ሰርዝ' : 'Delete account'}</span>
                    </button>
                  )}
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
    {isPasswordModalOpen && (
      <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !passwordSaving) closePasswordModal();
      }}>
        <form className="modal-box password-change-dialog" onSubmit={handleChangePassword}>
          <div className="password-dialog-heading">
            <div className="password-dialog-icon"><i className="fas fa-key"></i></div>
            <h2>{currentLang === 'am' ? 'የይለፍ ቃል ቀይር' : 'Change password'}</h2>
            <p>{currentLang === 'am' ? 'መለያዎን ለመጠበቅ አሁኑን የይለፍ ቃልዎን ያረጋግጡ።' : 'Verify your current password to secure your account.'}</p>
          </div>
          {passwordError && <div className="password-dialog-alert password-dialog-error" role="alert">{passwordError}</div>}
          {passwordSuccess ? (
            <>
              <div className="password-dialog-alert password-dialog-success" role="status">{passwordSuccess}</div>
              <button className="btn btn-primary password-dialog-submit" type="button" onClick={closePasswordModal}>
                {currentLang === 'am' ? 'ተጠናቋል' : 'Done'}
              </button>
            </>
          ) : (
            <>
              <label className="form-group password-dialog-field">
                {currentLang === 'am' ? 'አሁኑ የይለፍ ቃል' : 'Current password'}
                <input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
              </label>
              <label className="form-group password-dialog-field">
                {currentLang === 'am' ? 'አዲስ የይለፍ ቃል' : 'New password'}
                <input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
              </label>
              <label className="form-group password-dialog-field">
                {currentLang === 'am' ? 'አዲሱን የይለፍ ቃል ያረጋግጡ' : 'Confirm new password'}
                <input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
              </label>
              <div className="password-dialog-actions">
                <button className="btn btn-outline" type="button" onClick={closePasswordModal} disabled={passwordSaving}>
                  {currentLang === 'am' ? 'ተወው' : 'Cancel'}
                </button>
                <button className="btn btn-primary password-dialog-submit" type="submit" disabled={passwordSaving}>
                  <i className="fas fa-lock"></i>{passwordSaving ? (currentLang === 'am' ? 'በመቀየር ላይ...' : 'Updating...') : (currentLang === 'am' ? 'የይለፍ ቃል አዘምን' : 'Update password')}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    )}
    {isDeleteAccountOpen && (
      <div className="modal-overlay" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleteAccountSaving) setIsDeleteAccountOpen(false);
      }}>
        <div className="modal-box" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" style={{ maxWidth: '440px' }}>
          <div className="password-dialog-heading">
            <div className="password-dialog-icon" style={{ color: '#da121a', background: '#fff0f0' }}><i className="fas fa-user-times"></i></div>
            <h2 id="delete-account-title">{currentLang === 'am' ? 'መለያዎን ይሰርዙ?' : 'Delete your account?'}</h2>
            <p>{currentLang === 'am'
              ? 'የመግቢያ መለያዎ በቋሚነት ይሰረዛል እና ከመለያዎ ይወጣሉ። የቀጠሮ፣ የህክምና እና የገንዘብ መዝገቦች ይቀመጣሉ።'
              : 'Your login account will be permanently deleted and you will be signed out. Existing appointments, medical documents, queue entries, and financial records will be kept. Your email can be used to create a new account.'}</p>
          </div>
          {deleteAccountError && <div className="password-dialog-alert password-dialog-error" role="alert">{deleteAccountError}</div>}
          <div className="password-dialog-actions">
            <button className="btn btn-outline" type="button" onClick={() => setIsDeleteAccountOpen(false)} disabled={deleteAccountSaving}>
              {currentLang === 'am' ? 'ተወው' : 'Cancel'}
            </button>
            <button className="btn" type="button" onClick={handleDeleteAccount} disabled={deleteAccountSaving} style={{ background: '#da121a', color: '#fff' }}>
              <i className={`fas ${deleteAccountSaving ? 'fa-spinner fa-spin' : 'fa-trash'}`}></i>
              {deleteAccountSaving ? (currentLang === 'am' ? 'በመሰረዝ ላይ...' : 'Deleting...') : (currentLang === 'am' ? 'መለያ ሰርዝ' : 'Permanently delete')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
