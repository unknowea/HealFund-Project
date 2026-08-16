import React, { useState } from 'react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, currentLang, adminMode = false }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('42');
  const [gender, setGender] = useState('Male');
  const [location, setLocation] = useState('Addis Ababa, Lideta');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      // Fallback local authentication
      const users = JSON.parse(localStorage.getItem('healfund_users') || '{}');
      if (users[email] && users[email].password === password) {
        onLoginSuccess(users[email]);
        onClose();
      } else {
        setError('Invalid email or password');
      }
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !age) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, age, gender, location }),
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(data.user);
        onClose();
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      const newUser = {
        name,
        email,
        password,
        age: parseInt(age),
        gender,
        location,
        patientId: 'HF-' + Math.floor(1000 + Math.random() * 9000),
        status: 'Verified',
        registered: '12 Aug 2026',
      };
      const users = JSON.parse(localStorage.getItem('healfund_users') || '{}');
      users[email] = newUser;
      localStorage.setItem('healfund_users', JSON.stringify(users));
      onLoginSuccess(newUser);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div style={{ textAlignment: 'right', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: '#078930', fontSize: '24px' }}>
            <i className="fas fa-heartbeat"></i> HealFund
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>
            ✕
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit}>
            <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '20px' }}>
              {currentLang === 'am' ? 'ወደ መለያዎ ይግቡ' : 'Sign in to access your health profile'}
            </p>

            {error && <div style={{ color: '#da121a', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

            <div className="form-group">
              <label>{currentLang === 'am' ? 'ኢሜይል' : 'Email'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div className="form-group">
              <label>{currentLang === 'am' ? 'የይለፍ ቃል' : 'Password'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {currentLang === 'am' ? 'ይግቡ' : 'Sign In'}
            </button>

            {!adminMode && (
              <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5a6e' }}>
                {currentLang === 'am' ? 'መለያ የለዎትም?' : "Don't have an account?"}{' '}
                <a onClick={() => { setMode('signup'); setError(''); }} style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}>
                  {currentLang === 'am' ? 'አዲስ መለያ ፈጥሩ' : 'Create one'}
                </a>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleSignupSubmit}>
            <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '16px' }}>
              {currentLang === 'am' ? 'አዲስ መለያ ይክፈቱ' : 'Create your HealFund profile'}
            </p>

            {error && <div style={{ color: '#da121a', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

            <div className="form-group">
              <label>{currentLang === 'am' ? 'ሙሉ ስም' : 'Full Name'}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmed Kamara" required />
            </div>

            <div className="form-group">
              <label>{currentLang === 'am' ? 'ኢሜይል' : 'Email'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            <div className="form-group">
              <label>{currentLang === 'am' ? 'የይለፍ ቃል' : 'Password'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>{currentLang === 'am' ? 'ዕድሜ' : 'Age'}</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min="1" max="120" required />
              </div>
              <div className="form-group">
                <label>{currentLang === 'am' ? 'ጾታ' : 'Gender'}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{currentLang === 'am' ? 'አካባቢ' : 'Location'}</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="Addis Ababa, Lideta">Addis Ababa, Lideta</option>
                <option value="Addis Ababa, Bole">Addis Ababa, Bole</option>
                <option value="Addis Ababa, Kirkos">Addis Ababa, Kirkos</option>
                <option value="Adama">Adama</option>
                <option value="Bahir Dar">Bahir Dar</option>
                <option value="Hawassa">Hawassa</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              {currentLang === 'am' ? 'መለያ ፍጠር' : 'Create Account'}
            </button>

            <div style={{ marginTop: '16px', fontSize: '14px', color: '#4a5a6e' }}>
              {currentLang === 'am' ? 'አስቀድመው መለያ አለዎት?' : 'Already have an account?'}{' '}
              <a onClick={() => { setMode('login'); setError(''); }} style={{ color: '#078930', fontWeight: 600, cursor: 'pointer' }}>
                {currentLang === 'am' ? 'ይግቡ' : 'Sign in'}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
