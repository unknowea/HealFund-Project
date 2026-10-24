import React, { useState, useEffect } from 'react';
import { getFinancialCases, donate, verifyDonation } from '../api.js';

export default function FinancialAssistancePortal({ currentLang }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [donationAmount, setDonationAmount] = useState('1000');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donationErrorMsg, setDonationErrorMsg] = useState('');
  const [donationSuccessMsg, setDonationSuccessMsg] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [donating, setDonating] = useState(false);

  const isAm = currentLang === 'am';
  const remainingAmount = selectedCase
    ? Math.max(0, Number(selectedCase.targetAmount) - Number(selectedCase.raisedAmount) - Number(selectedCase.pendingAmount || 0))
    : 0;
  const amountExceedsRemaining = selectedCase && Number(donationAmount) > remainingAmount;

  useEffect(() => {
    fetchCases();
    const params = new URLSearchParams(window.location.search);
    const txRef = params.get('tx_ref');
    if (params.get('payment') === 'return' && txRef) {
      confirmDonation(txRef);
    }
  }, []);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const data = await getFinancialCases();
      setCases(data.cases || []);
    } catch (err) {
      console.error('Fetch financial cases error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmDonation = async (txRef) => {
    try {
      const data = await verifyDonation(txRef);
      await fetchCases();
      setDonationSuccessMsg(data.status === 'Paid'
        ? 'Payment confirmed. Thank you for supporting this patient.'
        : data.message || 'Payment is still awaiting confirmation.');
    } catch (err) {
      setDonationSuccessMsg(`Payment verification failed: ${err.message}`);
    } finally {
      const params = new URLSearchParams(window.location.search);
      params.delete('payment');
      params.delete('tx_ref');
      params.delete('case_id');
      const query = params.toString();
      window.history.replaceState({}, document.title, `${window.location.pathname}${query ? `?${query}` : ''}`);
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;
    setPaymentError('');
    const requestedAmt = Number(donationAmount);
    if (!Number.isFinite(requestedAmt) || requestedAmt < 1) {
      setDonationErrorMsg('Enter a valid donation amount of at least 1 ETB.');
      return;
    }
    if (requestedAmt > remainingAmount) {
      setDonationErrorMsg(`The maximum available donation is ${remainingAmount.toLocaleString()} ETB.`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail.trim())) {
      setPaymentError('Enter a valid email address for the Chapa receipt.');
      return;
    }

    setDonationErrorMsg('');
    setDonating(true);
    try {
      const data = await donate(selectedCase.caseId, {
        amount: requestedAmt,
        donorName,
        email: donorEmail,
      });
      if (!data.checkoutUrl) throw new Error('Chapa did not return a checkout URL');
      setSelectedCase(null);
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      const message = err.message === 'Online donations are not configured yet'
        ? 'Secure checkout is not available yet. Please contact HealFund support to complete payment setup.'
        : `Payment could not start: ${err.message}`;
      setPaymentError(message);
    } finally {
      setDonating(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
          <i className="fas fa-hand-holding-heart"></i> {isAm ? 'የሂል ፈንድ ሆስፒታል-ተረጋገጠ የገንዘብ እርዳታ' : 'HealFund Hospital-Verified Financial Assistance'}
        </h2>
        <p style={{ color: '#e0f2fe', fontSize: '14px', maxWidth: '750px' }}>
          {isAm ? 'በዘውዲቱ ሆስፒታል ሁለት ደረጃ ተረጋግጠዋል።' : 'Two-stage verified healthcare crowdfunding. Cases verified by Zewditu Memorial Hospital.'}
        </p>
      </div>

      {donationSuccessMsg && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', fontWeight: 600, fontSize: '15px' }}>
          {donationSuccessMsg}
          <button onClick={() => setDonationSuccessMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#155724' }}>✕</button>
        </div>
      )}

      <div className="card" style={{ background: '#fafcff', border: '1px solid #e2eaf3' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #d0dbe8' }}>
            <h4 style={{ color: '#078930', marginBottom: '4px' }}><i className="fas fa-check-circle"></i> Stage 1 — Medical Record Verification</h4>
            <p style={{ fontSize: '13px', color: '#5e6f82', margin: 0 }}>The clinical department at Zewditu Memorial Hospital inspects and verifies patient medical records.</p>
          </div>
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #d0dbe8' }}>
            <h4 style={{ color: '#078930', marginBottom: '4px' }}><i className="fas fa-user-check"></i> Stage 2 — Financial Need Verification</h4>
            <p style={{ fontSize: '13px', color: '#5e6f82', margin: 0 }}>The hospital social work team evaluates clinical necessity and approves public support for patients.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#7a8a9e' }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '12px', display: 'block' }}></i>
          Loading cases...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {cases.map((c) => {
            const pct = Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100));
            return (
              <div key={c.caseId} className="card" style={{ borderTop: '5px solid #078930', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="status-badge status-verified"><i className="fas fa-shield-alt"></i> Stage 1 & 2 Verified</span>
                    <span style={{ fontSize: '12px', color: '#7a8a9e', fontWeight: 600 }}>{c.caseId}</span>
                  </div>
                  <h3 style={{ color: '#0f3b5e', fontSize: '20px', marginBottom: '4px' }}>{c.patientName}</h3>
                  <p style={{ fontSize: '13px', color: '#5e6f82', marginBottom: '12px' }}>{c.age} yrs · {c.location} · <strong>{c.diagnosis}</strong></p>
                  <p style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '16px', lineHeight: '1.5' }}>{c.description}</p>
                  <div style={{ background: '#f8faff', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#5e6f82' }}><i className="fas fa-hospital"></i> Verified by: <strong>{c.verifyingHospital}</strong></div>
                    <div style={{ fontSize: '12px', color: '#5e6f82', marginTop: '2px' }}><i className="fas fa-user-md"></i> Officer: <strong>{c.verifiedByDoctor}</strong></div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                      <span><strong>{c.raisedAmount.toLocaleString()} ETB</strong> raised</span>
                      <span style={{ color: '#7a8a9e' }}>Goal: {c.targetAmount.toLocaleString()} ETB</span>
                    </div>
                    <div className="progress-container"><div className="progress-bar-fill" style={{ width: `${pct}%` }}></div></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5e6f82', marginTop: '4px' }}>
                      <span>{pct}% Funded</span><span>{c.donorsCount} Supporters</span>
                    </div>
                  </div>
                </div>
                <button className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} onClick={() => { setSelectedCase(c); setDonationErrorMsg(''); }} disabled={Number(c.targetAmount) - Number(c.raisedAmount) - Number(c.pendingAmount || 0) < 1}>
                  <i className="fas fa-donate"></i> Support This Verified Case
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Donation Modal */}
      {selectedCase && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ color: '#0f3b5e', margin: 0 }}><i className="fas fa-heart" style={{ color: '#da121a' }}></i> Support {selectedCase.patientName}</h3>
              <button onClick={() => setSelectedCase(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
            </div>
            <p style={{ fontSize: '14px', color: '#5e6f82', marginBottom: '16px' }}>
              Case: <strong>{selectedCase.caseId}</strong> — Verified by {selectedCase.verifyingHospital}
              {selectedCase.targetAmount - selectedCase.raisedAmount < selectedCase.targetAmount && (
                <span style={{ display: 'block', marginTop: '4px', color: '#078930', fontWeight: 600 }}>
                  Remaining to goal: <strong>{Math.max(0, selectedCase.targetAmount - selectedCase.raisedAmount - Number(selectedCase.pendingAmount || 0)).toLocaleString()} ETB</strong>
                </span>
              )}
            </p>
            {paymentError && (
              <div role="alert" style={{ background: '#fff1f0', color: '#a8071a', border: '1px solid #ffa39e', padding: '12px', borderRadius: '8px', marginBottom: '14px', fontSize: '14px' }}>
                <i className="fas fa-exclamation-circle"></i> {paymentError}
              </div>
            )}
            <form onSubmit={handleDonate}>
              <div className="form-group">
                <label>Donor Name *</label>
                <input type="text" placeholder="e.g. Samuel Girma" value={donorName} onChange={(e) => setDonorName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label htmlFor="donation-amount">Donation Amount (ETB) *</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {['200', '500', '1000', '2500'].map((amt) => (
                    <button key={amt} type="button" className={`slot ${donationAmount === String(Math.min(Number(amt), remainingAmount)) ? 'selected' : ''}`} onClick={() => { setDonationAmount(String(Math.min(Number(amt), remainingAmount))); setDonationErrorMsg(''); }} style={{ flex: 1, padding: '6px' }}>{amt} ETB</button>
                  ))}
                </div>
                <input id="donation-amount" type="number" value={donationAmount} onChange={(e) => { const value = e.target.value; setDonationAmount(value); setDonationErrorMsg(Number(value) > remainingAmount ? `Maximum available donation is ${remainingAmount.toLocaleString()} ETB.` : ''); }} placeholder="Custom amount" required min="1" max={remainingAmount} step="0.01" />
              </div>
              <div className="form-group">
                <label htmlFor="donor-email">Receipt Email *</label>
                <input id="donor-email" type="email" autoComplete="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              {(donationErrorMsg || amountExceedsRemaining) && <p role="alert" style={{ color: '#b42318', fontSize: '13px', margin: '4px 0 10px' }}>{donationErrorMsg || `Maximum available donation is ${remainingAmount.toLocaleString()} ETB.`}</p>}
              <p style={{ fontSize: '13px', color: '#5e6f82' }}>You will complete payment securely on Chapa. Funds are counted only after payment verification.</p>
              <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '12px', marginTop: '10px' }} disabled={donating || remainingAmount < 1 || amountExceedsRemaining}>
                {donating ? <><i className="fas fa-spinner fa-spin"></i> Preparing checkout...</> : <><i className="fas fa-lock"></i> Continue to secure payment</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
