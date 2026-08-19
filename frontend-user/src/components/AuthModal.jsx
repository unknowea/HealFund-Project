import React, { useState } from 'react';
import { login, signup } from '../api.js';

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

export default function AuthModal({ isOpen, onClose, onLoginSuccess, currentLang }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isAm = currentLang === 'am';
  const pwdCheck = validatePassword(password);

  const resetForm = () => {
    setEmail(''); setPassword(''); setConfirmPassword('');
    setName(''); setAge(''); setGender(''); setLocation('');
    setError(''); setShowPassword(false); setShowConfirm(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem('healfund_token', data.token);
      localStorage.setItem('healfund_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !age || !gender || !location) {
      setError(isAm ? 'እባክዎ ሁሉንም መስኮች ይሙሉ' : 'Please fill in all required fields');
      return;
    }
    if (!gender) {
      setError(isAm ? 'እባክዎ ጾታ ይምረጡ' : 'Please select your gender');
      return;
    }
    if (!location) {
      setError(isAm ? 'እባክዎ ቦታ ይምረጡ' : 'Please select your location');
      return;
    }
    if (!pwdCheck.valid) {
      setError(isAm ? 'የይለፍ ቃል ቢያንስ 8 ቁምፊ፣ ፊደል፣ ቁጥር እና ልዩ ቁምፊ መያዝ አለበት' : 'Password must be at least 8 characters with letters, numbers, and a special character');
      return;
    }
    if (password !== confirmPassword) {
      setError(isAm ? 'የይለፍ ቃሎቹ አይዛመዱም' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await signup({ name, email, password, age, gender, location });
      localStorage.setItem('healfund_token', data.token);
      localStorage.setItem('healfund_user', JSON.stringify(data.user));
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Password strength bar color
  const strengthScore = [pwdCheck.isLong, pwdCheck.hasLetter, pwdCheck.hasNumber, pwdCheck.hasSpecial].filter(Boolean).length;
  const strengthColor = ['#ddd', '#da121a', '#f59e0b', '#078930', '#078930'][strengthScore];
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strengthScore];

  const PasswordInput = ({ value, onChange, show, setShow, placeholder, id }) => (
    <div style={{ position: 'relative' }}>
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder} required
        style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid #d0dbe8', borderRadius: '10px', fontSize: '15px', transition: '0.2s', boxSizing: 'border-box' }}
        onFocus={(e) => { e.target.style.borderColor = '#078930'; e.target.style.boxShadow = '0 0 0 3px rgba(7,137,48,0.1)'; }}
        onBlur={(e) => { e.target.style.borderColor = '#d0dbe8'; e.target.style.boxShadow = 'none'; }}
      />
      <button type="button" onClick={() => setShow(!show)}
        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#7a8a9e', fontSize: '15px', padding: '4px' }}>
        <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'}`}></i>
      </button>
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '460px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: '#078930', fontSize: '24px' }}>
            <i className="fas fa-heartbeat"></i> HealFund
          </h2>
          <button onClick={() => { onClose(); resetForm(); }} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '20px' }}>
              {isAm ? 'ወደ መለያዎ ይግቡ' : 'Sign in to access your health profile'}
            </p>
            {error && <div style={{ color: '#da121a', fontSize: '13px', marginBottom: '12px', background: '#fff5f5', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}

            <div className="form-group">
              <label>{isAm ? 'ኢሜይል' : 'Email'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>{isAm ? 'የይለፍ ቃል' : 'Password'}</label>
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} show={showPassword} setShow={setShowPassword} placeholder="••••••••" id="login-pwd" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> {isAm ? 'በመግባት ላይ...' : 'Signing in...'}</> : (isAm ? 'ይግቡ' : 'Sign In')}
            </button>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5a6e' }}>
              {isAm ? 'መለያ የለዎትም?' : "Don't have an account?"}{' '}
              <a onClick={() => { setMode('signup'); setError(''); }} style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}>
                {isAm ? 'አዲስ መለያ ፈጥሩ' : 'Create one'}
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit}>
            <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '16px' }}>
              {isAm ? 'አዲስ መለያ ይክፈቱ' : 'Create your HealFund profile'}
            </p>
            {error && <div style={{ color: '#da121a', fontSize: '13px', marginBottom: '12px', background: '#fff5f5', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}

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
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} show={showPassword} setShow={setShowPassword} placeholder="Min 8 chars, letters, numbers & symbols" id="signup-pwd" />
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1,2,3,4].map((i) => (
                      <div key={i} style={{ flex: 1, height: '4px', borderRadius: '4px', background: i <= strengthScore ? strengthColor : '#e0e0e0', transition: '0.3s' }}></div>
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
              <PasswordInput value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} show={showConfirm} setShow={setShowConfirm} placeholder="Re-enter your password" id="confirm-pwd" />
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
              {/* Gender — item 5: default to "Choose" */}
              <div className="form-group">
                <label>{isAm ? 'ጾታ *' : 'Gender *'}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="" disabled>{isAm ? 'ይምረጡ' : 'Choose'}</option>
                  <option value="Male">{isAm ? 'ወንድ' : 'Male'}</option>
                  <option value="Female">{isAm ? 'ሴት' : 'Female'}</option>
                  <option value="Other">{isAm ? 'ሌላ' : 'Other'}</option>
                </select>
              </div>
            </div>

            {/* Location — item 4: all Ethiopian regions */}
            <div className="form-group">
              <label>{isAm ? 'ቦታ *' : 'Location *'}</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} required>
                <option value="" disabled>{isAm ? 'ቦታ ይምረጡ' : 'Select your location'}</option>
                <optgroup label="Addis Ababa">
                  {ETHIOPIA_LOCATIONS.filter((l) => l.startsWith('Addis Ababa')).map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
                <optgroup label="Oromia Region">
                  {ETHIOPIA_LOCATIONS.filter((l) => ['Adama','Jimma','Bishoftu','Shashamane','Nekemte','Asella','Ambo','Robe','Gimbi','Woliso'].some((c) => l.startsWith(c))).map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
                <optgroup label="Amhara Region">
                  {['Bahir Dar','Gondar','Dessie','Debre Markos','Debre Birhan','Woldia','Kombolcha','Debre Tabor'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
                <optgroup label="SNNPR / South Ethiopia">
                  {['Hawassa','Arba Minch','Wolaita Sodo','Dilla','Hosaena','Bonga','Jinka','Yirgalem'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
                <optgroup label="Tigray Region">
                  {['Mekelle','Axum','Adwa','Adigrat','Shire'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
                <optgroup label="Other Regions">
                  {['Jijiga','Dire Dawa','Harar','Semera','Assosa','Gambela'].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
              {loading ? <><i className="fas fa-spinner fa-spin"></i> {isAm ? 'በመፍጠር ላይ...' : 'Creating...'}</> : (isAm ? 'መለያ ፍጠር' : 'Create Account')}
            </button>
            <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5a6e' }}>
              {isAm ? 'አስቀድመው መለያ አለዎት?' : 'Already have an account?'}{' '}
              <a onClick={() => { setMode('login'); setError(''); }} style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}>
                {isAm ? 'ይግቡ' : 'Sign in'}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
