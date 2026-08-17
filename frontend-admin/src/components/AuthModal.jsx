import React, { useState } from 'react';
import { login } from '../api.js';

export default function AuthModal({ isOpen, onClose, onLoginSuccess, currentLang, adminMode = false }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isAm = currentLang === 'am';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      // Admin portal: only allow hospital_officer or admin roles
      if (adminMode && data.user.role === 'patient') {
        setError('Access denied. Staff credentials required.');
        setLoading(false);
        return;
      }
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

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ color: '#078930', fontSize: '24px' }}>
            <i className="fas fa-shield-alt"></i> {adminMode ? 'HealFund Admin' : 'HealFund'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ color: '#5e6f82', fontSize: '14px', marginBottom: '20px' }}>
            {adminMode ? 'Sign in with your hospital staff credentials' : (isAm ? 'ወደ መለያዎ ይግቡ' : 'Sign in to your account')}
          </p>
          {error && <div style={{ color: '#da121a', fontSize: '13px', marginBottom: '12px', background: '#fff5f5', padding: '8px 12px', borderRadius: '8px' }}>{error}</div>}

          <div className="form-group">
            <label>{isAm ? 'ኢሜይል' : 'Email'}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={adminMode ? 'admin@zewditu.gov.et' : 'you@example.com'} required />
          </div>
          <div className="form-group">
            <label>{isAm ? 'የይለፍ ቃል' : 'Password'}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? <><i className="fas fa-spinner fa-spin"></i> Signing in...</> : (isAm ? 'ይግቡ' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
