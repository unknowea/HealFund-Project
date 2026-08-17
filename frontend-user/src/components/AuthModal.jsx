import React, { useState } from 'react';
import { login, signup } from '../api.js';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, currentLang }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [location, setLocation] = useState('Addis Ababa, Lideta');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
    if (!name || !email || !password || !age) {
      setError('Please fill in all required fields');
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

  const isAm = currentLang === 'am';

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: '#078930', fontSize: '24px' }}>
            <i className="fas fa-heartbeat"></i> HealFund
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
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
              <label>{isAm ? 'ሙሉ ስም' : 'Full Name'}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmed Kamara" required />
            </div>
            <div className="form-group">
              <label>{isAm ? 'ኢሜይል' : 'Email'}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="form-group">
              <label>{isAm ? 'የይለፍ ቃል' : 'Password'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>{isAm ? 'ዕድሜ' : 'Age'}</label>
                <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min="1" max="120" placeholder="e.g. 30" required />
              </div>
              <div className="form-group">
                <label>{isAm ? 'ጾታ' : 'Gender'}</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>{isAm ? 'አካባቢ' : 'Location'}</label>
              <select value={location} onChange={(e) => setLocation(e.target.value)}>
                <option value="Addis Ababa, Lideta">Addis Ababa, Lideta</option>
                <option value="Addis Ababa, Bole">Addis Ababa, Bole</option>
                <option value="Addis Ababa, Kirkos">Addis Ababa, Kirkos</option>
                <option value="Adama">Adama</option>
                <option value="Bahir Dar">Bahir Dar</option>
                <option value="Hawassa">Hawassa</option>
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
