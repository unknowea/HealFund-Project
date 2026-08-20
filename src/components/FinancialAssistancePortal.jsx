import React, { useState, useEffect } from 'react';

export default function FinancialAssistancePortal({ currentLang }) {
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [donationAmount, setDonationAmount] = useState('1000');
  const [donorName, setDonorName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Telebirr');
  const [donationSuccessMsg, setDonationSuccessMsg] = useState('');

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await fetch('/api/financial-cases');
      const data = await res.json();
      if (data.success) setCases(data.cases);
    } catch (err) {
      console.error('Fetch financial cases error:', err);
    }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;

    try {
      const res = await fetch(`/api/financial-cases/${selectedCase.id}/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: donationAmount,
          donorName: donorName || 'Anonymous Supporter',
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCases(cases.map((c) => (c.id === selectedCase.id ? data.case : c)));
        setDonationSuccessMsg(`🎉 Thank you! ${data.message}`);
        setSelectedCase(null);
      }
    } catch (err) {
      const amt = parseFloat(donationAmount) || 1000;
      setCases(
        cases.map((c) =>
          c.id === selectedCase.id
            ? { ...c, raisedAmount: c.raisedAmount + amt, donorsCount: c.donorsCount + 1 }
            : c
        )
      );
      setDonationSuccessMsg(`🎉 Thank you! Simulated donation of ${amt} ETB via ${paymentMethod} processed successfully.`);
      setSelectedCase(null);
    }
  };

  const isAm = currentLang === 'am';

  return (
    <div>
      {/* Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
          <i className="fas fa-hand-holding-heart"></i> {isAm ? 'የሂል ፈንድ በሆስፒታል የተረጋገጠ የገንዘብ እርዳታ' : 'HealFund Hospital-Verified Financial Assistance'}
        </h2>
        <p style={{ color: '#e0f2fe', fontSize: '14px', maxWidth: '750px' }}>
          {isAm
            ? 'በዘውዲቱ ሆስፒታል በሁለት ደረጃዎች (2-Stage Verification) የተረጋገጡ የታካሚዎች የህክምና ህክምና ፈንድ ድጋፍ።'
            : 'Two-stage verified healthcare crowdfunding. Cases are first verified via medical records (Stage 1), then financial need is confirmed by Zewditu Memorial Hospital social work team (Stage 2).'}
        </p>
      </div>

      {donationSuccessMsg && (
        <div style={{ background: '#d4edda', color: '#155724', padding: '16px 20px', borderRadius: '14px', marginBottom: '24px', fontWeight: 600, fontSize: '15px' }}>
          {donationSuccessMsg}
          <button onClick={() => setDonationSuccessMsg('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#155724' }}>✕</button>
        </div>
      )}

      {/* Verification Stages Explanation Banner */}
      <div className="card" style={{ background: '#fafcff', border: '1px solid #e2eaf3' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #d0dbe8' }}>
            <h4 style={{ color: '#078930', marginBottom: '4px' }}>
              <i className="fas fa-check-circle"></i> Stage 1 — Medical Record Verification
            </h4>
            <p style={{ fontSize: '13px', color: '#5e6f82', margin: 0 }}>
              Primary health center (Lideta HC) submits verified medical records to Zewditu Memorial Hospital. Prevents unverified medical claims.
            </p>
          </div>
          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #d0dbe8' }}>
            <h4 style={{ color: '#078930', marginBottom: '4px' }}>
              <i className="fas fa-user-check"></i> Stage 2 — Financial Need Verification
            </h4>
            <p style={{ fontSize: '13px', color: '#5e6f82', margin: 0 }}>
              Zewditu Memorial Hospital evaluates clinical necessity and approves HealFund public support for patients who cannot afford care.
            </p>
          </div>
        </div>
      </div>

      {/* Financial Cases Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {cases.map((c) => {
          const pct = Math.min(100, Math.round((c.raisedAmount / c.targetAmount) * 100));
          return (
            <div key={c.id} className="card" style={{ borderTop: '5px solid #078930', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <span className="status-badge status-verified">
                    <i className="fas fa-shield-alt"></i> Stage 1 & 2 Verified
                  </span>
                  <span style={{ fontSize: '12px', color: '#7a8a9e', fontWeight: 600 }}>{c.id}</span>
                </div>

                <h3 style={{ color: '#0f3b5e', fontSize: '20px', marginBottom: '4px' }}>{c.patientName}</h3>
                <p style={{ fontSize: '13px', color: '#5e6f82', marginBottom: '12px' }}>
                  {c.age} yrs · {c.location} · Diagnosis: <strong>{c.diagnosis}</strong>
                </p>

                <p style={{ fontSize: '14px', color: '#4a5a6e', marginBottom: '16px', lineHeight: '1.5' }}>
                  {c.description}
                </p>

                <div style={{ background: '#f8faff', padding: '12px', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#5e6f82' }}>
                    <i className="fas fa-hospital"></i> Verified by: <strong>{c.verifyingHospital}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: '#5e6f82', marginTop: '2px' }}>
                    <i className="fas fa-user-md"></i> Officer: <strong>{c.verifiedByDoctor}</strong>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                    <span><strong>{c.raisedAmount.toLocaleString()} ETB</strong> raised</span>
                    <span style={{ color: '#7a8a9e' }}>Goal: {c.targetAmount.toLocaleString()} ETB</span>
                  </div>
                  <div className="progress-container">
                    <div className="progress-bar-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#5e6f82', marginTop: '4px' }}>
                    <span>{pct}% Funded</span>
                    <span>{c.donorsCount} Supporters</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={() => setSelectedCase(c)}
              >
                <i className="fas fa-donate"></i> Support This Verified Case
              </button>
            </div>
          );
        })}
      </div>

      {/* Simulated Donation Modal */}
      {selectedCase && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ color: '#0f3b5e', margin: 0 }}>
                <i className="fas fa-heart" style={{ color: '#da121a' }}></i> Support {selectedCase.patientName}
              </h3>
              <button onClick={() => setSelectedCase(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#7a8a9e' }}>✕</button>
            </div>

            <p style={{ fontSize: '14px', color: '#5e6f82', marginBottom: '16px' }}>
              Case: <strong>{selectedCase.id}</strong> — Verified by {selectedCase.verifyingHospital}
            </p>

            <form onSubmit={handleDonate}>
              <div className="form-group">
                <label>Your Name / Supporter (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Samuel Girma or Anonymous"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Donation Amount (ETB) *</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {['200', '500', '1000', '2500'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      className={`slot ${donationAmount === amt ? 'selected' : ''}`}
                      onClick={() => setDonationAmount(amt)}
                      style={{ flex: 1, padding: '6px' }}
                    >
                      {amt} ETB
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="Enter custom amount"
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method (Simulated)</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="Telebirr">Telebirr (*127#)</option>
                  <option value="CBE Birr">CBE Birr</option>
                  <option value="Chapa / Bank Transfer">Chapa / Bank Card</option>
                </select>
              </div>

              <button type="submit" className="btn btn-success" style={{ width: '100%', padding: '12px', marginTop: '10px' }}>
                <i className="fas fa-lock"></i> Process {donationAmount || '1000'} ETB Donation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
