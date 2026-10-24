import React, { useState, useEffect } from 'react';
import { login, signup, sendOtp, verifyOtp, resetPasswordWithOtp } from '../api.js';

const ETHIOPIA_LOCATIONS = [
  // Addis Ababa sub-cities
  'Addis Ababa, Addis Ketema', 'Addis Ababa, Akaki Kality', 'Addis Ababa, Arada',
  'Addis Ababa, Bole', 'Addis Ababa, Gullele', 'Addis Ababa, Kirkos',
  'Addis Ababa, Kolfe Keranio', 'Addis Ababa, Lideta', 'Addis Ababa, Nifas Silk-Lafto',
  'Addis Ababa, Yeka', 'Addis Ababa, Lemi-Kura',
  // Oromia
  'Adama (Nazret)', 'Jimma', 'Bishoftu (Debre Zeyit)', 'Shashamane',
  'Nekemte', 'Asella', 'Ambo', 'Robe', 'Gimbi', 'Woliso',
  // Amhara
  'Bahir Dar', 'Gondar', 'Dessie', 'Debre Markos', 'Debre Birhan',
  'Woldia', 'Kombolcha', 'Debre Tabor',
  // SNNPR / South Ethiopia
  'Hawassa', 'Arba Minch', 'Wolaita Sodo', 'Dilla', 'Hosaena',
  'Bonga', 'Jinka', 'Yirgalem',
  // Tigray
  'Mekelle', 'Axum', 'Adwa', 'Adigrat', 'Shire',
  // Somali
  'Jijiga', 'Dire Dawa', 'Harar',
  // Afar
  'Semera', 'Logia', 'Asaita',
  // Benishangul-Gumuz
  'Assosa', 'Metekel',
  // Gambela
  'Gambela',
  // Harari
  'Harar',
  // Sidama
  'Hawassa (Sidama)',
  // Central Ethiopia
  'Wolkite', 'Butajira',
];

// Password strength validator
const validatePassword = (pwd) => {
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  const isLong = pwd.length >= 8;
  return { hasLetter, hasNumber, hasSpecial, isLong, valid: hasLetter && hasNumber && hasSpecial && isLong };
};

// Reusable Password Input with Show/Hide toggle
const PasswordInput = ({ value, onChange, show, setShow, placeholder, id }) => (
  <div style={{ position: 'relative' }}>
    <input
      id={id}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      style={{
        width: '100%',
        padding: '10px 40px 10px 14px',
        border: '1px solid #d0dbe8',
        borderRadius: '10px',
        fontSize: '15px',
        transition: '0.2s',
        boxSizing: 'border-box',
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#078930';
        e.target.style.boxShadow = '0 0 0 3px rgba(7,137,48,0.1)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#d0dbe8';
        e.target.style.boxShadow = 'none';
      }}
    />
    <button
      type="button"
      onClick={() => setShow(!show)}
      style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#7a8a9e',
        fontSize: '15px',
        padding: '4px',
      }}
    >
      <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'}`}></i>
    </button>
  </div>
);

export default function AuthModal({ isOpen, onClose, onLoginSuccess, currentLang }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [signupStep, setSignupStep] = useState('form'); // 'form' | 'otp'
  const [forgotStep, setForgotStep] = useState('email'); // 'email' | 'otp'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown countdown timer for OTP resends
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const isAm = currentLang === 'am';
  const pwdCheck = validatePassword(password);
  const newPwdCheck = validatePassword(newPassword);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setName('');
    setAge('');
    setGender('');
    setLocation('');
    setOtp('');
    setError('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirm(false);
    setShowNewPassword(false);
    setRememberMe(false);
    setSignupStep('form');
    setForgotStep('email');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.removeItem('healfund_token');
      localStorage.removeItem('healfund_user');
      sessionStorage.removeItem('healfund_token');
      sessionStorage.removeItem('healfund_user');
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('healfund_token', data.token);
      storage.setItem('healfund_user', JSON.stringify(data.user));
      if (rememberMe) localStorage.setItem('healfund_remember_me', 'true');
      else localStorage.removeItem('healfund_remember_me');
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Signup: Validate fields and send OTP to email
  const handleInitiateSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name || !email || !password || !age || !gender || !location) {
      setError(isAm ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill in all required fields');
      return;
    }
    if (!pwdCheck.valid) {
      setError(
        isAm
          ? 'የይለፍ ቃል ቢያንስ 8 ቁምፊ፣ ፊደል፣ ቁጥር እና ልዩ ቁምፊ መያዝ አለበት'
          : 'Password must be at least 8 characters with letters, numbers, and a special character'
      );
      return;
    }
    if (password !== confirmPassword) {
      setError(isAm ? 'የይለፍ ቃሎቹ አይዛመዱም' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await sendOtp(email, 'signup');
      setSignupStep('otp');
      setResendCooldown(60);
      setSuccessMsg(
        isAm
          ? `ባለ 6 አሃዝ የማረጋገጫ ኮድ ወደ ${email} ተልኳል።`
          : `A 6-digit verification code has been sent to ${email}.`
      );
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Signup: Submit OTP and create account
  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp || otp.trim().length !== 6) {
      setError(isAm ? 'እባክዎ ባለ 6 አሃዝ የማረጋገጫ ኮድ ያስገቡ' : 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otp.trim(), 'signup');
      const data = await signup({
        name,
        email,
        password,
        age,
        gender,
        location,
      });
      sessionStorage.setItem('healfund_token', data.token);
      sessionStorage.setItem('healfund_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP for signup
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await sendOtp(email, mode === 'forgot' ? 'reset-password' : 'signup');
      setResendCooldown(60);
      setSuccessMsg(isAm ? 'አዲስ የማረጋገጫ ኮድ ተልኳል!' : 'A new verification code has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Step 1: Send OTP
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!email) {
      setError(isAm ? 'እባክዎ ኢሜይልዎን ያስገቡ' : 'Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(email, 'reset-password');
      setForgotStep('otp');
      setResendCooldown(60);
      setSuccessMsg(
        isAm
          ? `የይለፍ ቃል መቀየሪያ ኮድ ወደ ${email} ተልኳል።`
          : `Password reset verification code sent to ${email}.`
      );
    } catch (err) {
      setError(err.message || 'No account found with this email.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Step 2: Verify OTP and save new password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp || otp.trim().length !== 6) {
      setError(isAm ? 'እባክዎ ባለ 6 አሃዝ ኮድ ያስገቡ' : 'Please enter the 6-digit code');
      return;
    }
    if (!newPwdCheck.valid) {
      setError(
        isAm
          ? 'የይለፍ ቃል ቢያንስ 8 ቁምፊ፣ ፊደል፣ ቁጥር እና ልዩ ቁምፊ መያዝ አለበት'
          : 'Password must be at least 8 characters with letters, numbers, and symbols'
      );
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(isAm ? 'የይለፍ ቃሎቹ አይዛመዱም' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp(email, otp.trim(), newPassword);
      setMode('login');
      setForgotStep('email');
      setSuccessMsg(isAm ? 'የይለፍ ቃልዎ ተቀይሯል! አሁን መግባት ይችላሉ።' : 'Password reset successfully! You can now log in.');
      setPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Check the verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength score
  const strengthScore = [pwdCheck.isLong, pwdCheck.hasLetter, pwdCheck.hasNumber, pwdCheck.hasSpecial].filter(Boolean).length;
  const strengthColor = ['#ddd', '#da121a', '#f59e0b', '#078930', '#078930'][strengthScore];
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: '#078930', fontSize: '24px' }}>
            <i className="fas fa-heartbeat"></i> HealFund
          </h2>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}
          >
            ✕
          </button>
        </div>

        {/* Global Error & Success Alerts */}
        {error && (
          <div style={{ color: '#da121a', fontSize: '13px', marginBottom: '12px', background: '#fff5f5', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ color: '#078930', fontSize: '13px', marginBottom: '12px', background: '#edf7f0', padding: '8px 12px', borderRadius: '8px', border: '1px solid #b7dfc4' }}>
            <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
            {successMsg}
          </div>
        )}

        {/* MODE 1: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '20px' }}>
              {isAm ? 'ወደ መለያዎ ይግቡ' : 'Sign in to access your health profile'}
            </p>

            <div className="form-group">
              <label>{isAm ? 'ኢሜይል' : 'Email'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ margin: 0 }}>{isAm ? 'የይለፍ ቃል' : 'Password'}</label>
                <a
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{ fontSize: '12px', color: '#078930', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isAm ? 'የይለፍ ቃል ረሱ?' : 'Forgot password?'}
                </a>
              </div>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} show={showPassword} setShow={setShowPassword} placeholder="••••••••" id="login-pwd" />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#4a5a6e', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
              {isAm ? 'አስታውሰኝ' : 'Remember me'}
            </label>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '14px' }} disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> {isAm ? 'በመግባት ላይ...' : 'Signing in...'}
                </>
              ) : isAm ? (
                'ይግቡ'
              ) : (
                'Sign In'
              )}
            </button>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5a6e' }}>
              {isAm ? 'መለያ የለዎትም?' : "Don't have an account?"}{' '}
              <a
                onClick={() => {
                  setMode('signup');
                  setSignupStep('form');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}
              >
                {isAm ? 'አዲስ መለያ ፈጥሩ' : 'Create one'}
              </a>
            </div>
          </form>
        )}

        {/* MODE 2: SIGNUP (STEP 1: DETAILS) */}
        {mode === 'signup' && signupStep === 'form' && (
          <form onSubmit={handleInitiateSignup}>
            <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '16px' }}>
              {isAm ? 'አዲስ መለያ ይክፈቱ (የኢሜይል ማረጋገጫ ያስፈልጋል)' : 'Create your HealFund profile (Email OTP verification required)'}
            </p>

            <div className="form-group">
              <label>{isAm ? 'ሙሉ ስም *' : 'Full Name *'}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Kamara" required />
            </div>
            <div className="form-group">
              <label>{isAm ? 'ኢሜይል *' : 'Email *'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            {/* Password with show/hide and strength */}
            <div className="form-group">
              <label>{isAm ? 'የይለፍ ቃል *' : 'Password *'}</label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                show={showPassword}
                setShow={setShowPassword}
                placeholder="Min 8 chars, letters, numbers & symbols"
                id="signup-pwd"
              />
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: '4px',
                          borderRadius: '4px',
                          background: i <= strengthScore ? strengthColor : '#e0e0e0',
                          transition: '0.3s',
                        }}
                      ></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7a8a9e' }}>
                    <span>{strengthLabel && <span style={{ color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>}</span>
                    <span style={{ display: 'flex', gap: '8px' }}>
                      <span style={{ color: pwdCheck.isLong ? '#078930' : '#ccc' }}>8+ chars</span>
                      <span style={{ color: pwdCheck.hasLetter ? '#078930' : '#ccc' }}>A-Z</span>
                      <span style={{ color: pwdCheck.hasNumber ? '#078930' : '#ccc' }}>0-9</span>
                      <span style={{ color: pwdCheck.hasSpecial ? '#078930' : '#ccc' }}>!@#</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label>{isAm ? 'የይለፍ ቃል ያረጋግጡ *' : 'Confirm Password *'}</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                show={showConfirm}
                setShow={setShowConfirm}
                placeholder="Re-enter your password"
                id="confirm-pwd"
              />
              {confirmPassword && password !== confirmPassword && (
                <p style={{ color: '#da121a', fontSize: '12px', marginTop: '4px' }}>
                  <i className="fas fa-times-circle"></i> {isAm ? 'የይለፍ ቃሎቹ አይዛመዱም' : 'Passwords do not match'}
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p style={{ color: '#078930', fontSize: '12px', marginTop: '4px' }}>
                  <i className="fas fa-check-circle"></i> {isAm ? 'የይለፍ ቃሎቹ ይዛመዳሉ' : 'Passwords match'}
                </p>
              )}
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>{isAm ? 'ዕድሜ *' : 'Age *'}</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min="1" max="120" placeholder="e.g. 30" required />
              </div>
              <div className="form-group">
                <label>{isAm ? 'ጾታ *' : 'Gender *'}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="" disabled>
                    {isAm ? 'ይምረጡ' : 'Select Gender'}
                  </option>
                  <option value="Male">{isAm ? 'ወንድ' : 'Male'}</option>
                  <option value="Female">{isAm ? 'ሴት' : 'Female'}</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{isAm ? 'ቦታ *' : 'Location *'}</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} required>
                <option value="" disabled>
                  {isAm ? 'ቦታ ይምረጡ' : 'Select your location'}
                </option>
                <optgroup label="Addis Ababa">
                  {ETHIOPIA_LOCATIONS.filter((l) => l.startsWith('Addis Ababa')).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Oromia Region">
                  {ETHIOPIA_LOCATIONS.filter((l) =>
                    ['Adama', 'Jimma', 'Bishoftu', 'Shashamane', 'Nekemte', 'Asella', 'Ambo', 'Robe', 'Gimbi', 'Woliso'].some((c) =>
                      l.startsWith(c)
                    )
                  ).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Amhara Region">
                  {['Bahir Dar', 'Gondar', 'Dessie', 'Debre Markos', 'Debre Birhan', 'Woldia', 'Kombolcha', 'Debre Tabor'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="SNNPR / South Ethiopia">
                  {['Hawassa', 'Arba Minch', 'Wolaita Sodo', 'Dilla', 'Hosaena', 'Bonga', 'Jinka', 'Yirgalem'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tigray Region">
                  {['Mekelle', 'Axum', 'Adwa', 'Adigrat', 'Shire'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Other Regions">
                  {['Jijiga', 'Dire Dawa', 'Harar', 'Semera', 'Assosa', 'Gambela'].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> {isAm ? 'ኮድ በመላክ ላይ...' : 'Sending Code...'}
                </>
              ) : (
                <>
                  <i className="fas fa-envelope"></i> {isAm ? 'የማረጋገጫ ኮድ ላክ & ቀጥል' : 'Send Verification Code'}
                </>
              )}
            </button>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5a6e' }}>
              {isAm ? 'አስቀድመው መለያ አለዎት?' : 'Already have an account?'}{' '}
              <a
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}
              >
                {isAm ? 'ይግቡ' : 'Sign in'}
              </a>
            </div>
          </form>
        )}

        {/* MODE 2: SIGNUP (STEP 2: EMAIL OTP VERIFICATION) */}
        {mode === 'signup' && signupStep === 'otp' && (
          <form onSubmit={handleVerifyAndSignup}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#e8f4ec',
                  color: '#078930',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '12px',
                }}
              >
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3 style={{ color: '#0d5a3d', fontSize: '20px', marginBottom: '6px' }}>
                {isAm ? 'ኢሜይልዎን ያረጋግጡ' : 'Verify Your Email'}
              </h3>
              <p style={{ color: '#5e6f82', fontSize: '14px', lineHeight: '1.5' }}>
                {isAm
                  ? `ባለ 6 አሃዝ የማረጋገጫ ኮድ ወደ ${email} ልከናል።`
                  : `We sent a 6-digit verification code to `}
                <strong>{email}</strong>
              </p>
            </div>

            <div className="form-group" style={{ textAlign: 'center' }}>
              <label style={{ textAlign: 'center', marginBottom: '8px' }}>
                {isAm ? 'ባለ 6 አሃዝ የማረጋገጫ ኮድ' : 'Enter 6-Digit OTP Code'}
              </label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                required
                style={{
                  textAlign: 'center',
                  fontSize: '26px',
                  letterSpacing: '10px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '2px solid #078930',
                  background: '#f8fdfa',
                  width: '80%',
                  margin: '0 auto',
                  display: 'block',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 0 20px', fontSize: '13px' }}>
              <button
                type="button"
                onClick={() => setSignupStep('form')}
                style={{ background: 'none', border: 'none', color: '#5e6f82', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <i className="fas fa-arrow-left"></i> {isAm ? 'ተመለስ / ኢሜይል ቀይር' : 'Change email'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#9ca3af' : '#078930',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {resendCooldown > 0
                  ? isAm
                    ? `እንደገና ላክ (${resendCooldown}s)`
                    : `Resend code (${resendCooldown}s)`
                  : isAm
                  ? 'ኮድ እንደገና ላክ'
                  : 'Resend Code'}
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading || otp.length !== 6}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> {isAm ? 'በማረጋገጥ ላይ...' : 'Verifying & Creating...'}
                </>
              ) : isAm ? (
                'አረጋግጥ እና መለያ ፍጠር'
              ) : (
                'Verify & Complete Registration'
              )}
            </button>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD (STEP 1: EMAIL) */}
        {mode === 'forgot' && forgotStep === 'email' && (
          <form onSubmit={handleSendResetOtp}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  color: '#d97706',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '12px',
                }}
              >
                <i className="fas fa-key"></i>
              </div>
              <h3 style={{ color: '#0d5a3d', fontSize: '20px', marginBottom: '6px' }}>
                {isAm ? 'የይለፍ ቃልዎን ይቀይሩ' : 'Reset Your Password'}
              </h3>
              <p style={{ color: '#5e6f82', fontSize: '14px' }}>
                {isAm
                  ? 'የተመዘገቡበትን ኢሜይል ያስገቡ። የማረጋገጫ ኮድ እንልክልዎታለን።'
                  : 'Enter your registered email to receive a password reset code.'}
              </p>
            </div>

            <div className="form-group">
              <label>{isAm ? 'ኢሜይል' : 'Email Address'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> {isAm ? 'በመላክ ላይ...' : 'Sending Code...'}
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i> {isAm ? 'የማረጋገጫ ኮድ ላክ' : 'Send Reset Code'}
                </>
              )}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px' }}>
              <a
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccessMsg('');
                }}
                style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}
              >
                {isAm ? 'ወደ መግቢያ ተመለስ' : 'Back to Login'}
              </a>
            </div>
          </form>
        )}

        {/* MODE 3: FORGOT PASSWORD (STEP 2: OTP & NEW PASSWORD) */}
        {mode === 'forgot' && forgotStep === 'otp' && (
          <form onSubmit={handleResetPasswordSubmit}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#0d5a3d', fontSize: '20px', marginBottom: '6px' }}>
                {isAm ? 'አዲስ የይለፍ ቃል ይፍጠሩ' : 'Set New Password'}
              </h3>
              <p style={{ color: '#5e6f82', fontSize: '14px' }}>
                {isAm ? `ወደ ${email} የተላከውን ኮድ ያስገቡ` : `Enter the verification code sent to ${email}`}
              </p>
            </div>

            <div className="form-group" style={{ textAlign: 'center' }}>
              <label>{isAm ? 'የማረጋገጫ ኮድ' : 'Verification Code'}</label>
              <input
                type="text"
                maxLength="6"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                required
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '8px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '2px solid #078930',
                  width: '75%',
                  margin: '0 auto',
                  display: 'block',
                }}
              />
            </div>

            <div className="form-group">
              <label>{isAm ? 'አዲስ የይለፍ ቃል' : 'New Password'}</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                show={showNewPassword}
                setShow={setShowNewPassword}
                placeholder="Min 8 chars, letters, numbers & symbols"
                id="reset-new-pwd"
              />
            </div>

            <div className="form-group">
              <label>{isAm ? 'አዲሱን የይለፍ ቃል ያረጋግጡ' : 'Confirm New Password'}</label>
              <PasswordInput
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                show={showConfirm}
                setShow={setShowConfirm}
                placeholder="Re-enter new password"
                id="reset-confirm-pwd"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 16px', fontSize: '13px' }}>
              <button
                type="button"
                onClick={() => setForgotStep('email')}
                style={{ background: 'none', border: 'none', color: '#5e6f82', cursor: 'pointer' }}
              >
                <i className="fas fa-arrow-left"></i> {isAm ? 'ተመለስ' : 'Back'}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#9ca3af' : '#078930',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
              </button>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> {isAm ? 'በመቀየር ላይ...' : 'Resetting...'}
                </>
              ) : isAm ? (
                'የይለፍ ቃል ቀይር'
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
