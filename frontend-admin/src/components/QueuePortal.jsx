import React, { useState, useEffect } from 'react';

export default function QueuePortal({ currentLang, currentUser }) {
  const [queueItems, setQueueItems] = useState([]);
  const [searchToken, setSearchToken] = useState('');
  const [activeQueueToken, setActiveQueueToken] = useState('C-023');
  const [selectedDept, setSelectedDept] = useState('all');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      if (data.success) setQueueItems(data.queue);
    } catch (err) {
      console.error('Fetch queue error:', err);
    }
  };

  const isAm = currentLang === 'am';

  const filteredQueue = queueItems.filter((q) => {
    if (searchToken && !q.token.toLowerCase().includes(searchToken.toLowerCase()) && !q.patientName.toLowerCase().includes(searchToken.toLowerCase())) {
      return false;
    }
    if (selectedDept !== 'all' && !q.department.toLowerCase().includes(selectedDept.toLowerCase())) {
      return false;
    }
    return true;
  });

  const activeTicket = queueItems.find((q) => q.token === activeQueueToken) || queueItems[0];

  return (
    <div>
      {/* Header Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
              <i className="fas fa-list-ol"></i> {isAm ? 'የዘውዲቱ መታሰቢያ ሆስፒታል የታካሚ ተራ እና ቀጠሮ ሥርዓት' : 'Zewditu Memorial Hospital Live Queue & Token Tracker'}
            </h2>
            <p style={{ color: '#e0f2fe', fontSize: '14px', maxWidth: '700px' }}>
              {isAm
                ? 'በሪፈራል የመጡ ታካሚዎች የተራ ቁጥር (Queue Token) እና የዶክተር ቀጠሮ በቀጥታ ይከታተሉ።'
                : 'Real-time queue tracking for referred and registered patients. Displays queue tokens, room numbers, assigned doctors, and arrival instructions.'}
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '14px', backdropFilter: 'blur(4px)', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Ticket Serving</span>
            <h1 style={{ fontSize: '32px', color: '#fff', margin: 0 }}>C-023</h1>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Active Ticket Card */}
        <div>
          {activeTicket ? (
            <div className="card" style={{ borderTop: '5px solid #078930' }}>
              <div className="card-header">
                <h3><i className="fas fa-ticket-alt"></i> Queue Token Details</h3>
                <span className="status-badge status-verified">{activeTicket.status}</span>
              </div>

              <div style={{ textAlign: 'center', background: '#f8faff', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #e9edf4' }}>
                <span style={{ fontSize: '14px', color: '#5e6f82', fontWeight: 600 }}>Queue Token Number</span>
                <h1 style={{ fontSize: '48px', color: '#078930', margin: '4px 0' }}>{activeTicket.token}</h1>
                <h3 style={{ color: '#0f3b5e', fontSize: '20px' }}>{activeTicket.patientName} ({activeTicket.patientId})</h3>
              </div>

              <div className="info-row">
                <span className="label"><i className="fas fa-hospital-alt"></i> Clinic / Room:</span>
                <span className="value">{activeTicket.department}</span>
              </div>
              <div className="info-row">
                <span className="label"><i className="fas fa-user-md"></i> Assigned Doctor:</span>
                <span className="value"><strong>{activeTicket.assignedDoctor}</strong></span>
              </div>
              <div className="info-row">
                <span className="label"><i className="fas fa-clock"></i> Scheduled Time:</span>
                <span className="value">{new Date(activeTicket.estimatedTime).toLocaleString()}</span>
              </div>
              <div className="info-row">
                <span className="label"><i className="fas fa-exclamation-circle"></i> Priority Level:</span>
                <span className="value" style={{ color: activeTicket.urgency === 'High' ? '#da121a' : '#078930' }}>
                  {activeTicket.urgency || 'Standard'}
                </span>
              </div>

              <div style={{ marginTop: '20px', background: '#fafcff', padding: '16px', borderRadius: '12px', border: '1px solid #e2eaf3' }}>
                <h5 style={{ color: '#0f3b5e', marginBottom: '8px' }}><i className="fas fa-file-invoice"></i> Required Arrival Documents:</h5>
                <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#4a5a6e' }}>
                  {activeTicket.requiredDocuments ? (
                    activeTicket.requiredDocuments.map((doc, i) => <li key={i}>{doc}</li>)
                  ) : (
                    <>
                      <li>Referral Letter</li>
                      <li>HealFund Patient QR / ID Card</li>
                      <li>Previous Medical & Lab Reports</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="card">No active queue token selected</div>
          )}
        </div>

        {/* Live Queue Directory */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-stream"></i> Zewditu Hospital Live Patient Queue</h3>
            <span className="badge" style={{ background: '#078930', padding: '4px 12px' }}>{filteredQueue.length} Waiting</span>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search by Token (e.g. C-023) or Patient Name..."
              value={searchToken}
              onChange={(e) => setSearchToken(e.target.value)}
              style={{ flex: 1, minWidth: '200px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d0dbe8' }}
            />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d0dbe8' }}
            >
              <option value="all">All Clinics</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Surgery">General Surgery</option>
              <option value="Pediatrics">Pediatrics</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredQueue.map((item) => (
              <div
                key={item.token}
                onClick={() => setActiveQueueToken(item.token)}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '12px',
                  background: activeQueueToken === item.token ? '#e3f0fa' : '#fafcff',
                  border: activeQueueToken === item.token ? '2px solid #078930' : '1px solid #e9edf4',
                  cursor: 'pointer',
                  transition: '0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '12px',
                      background: '#078930',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                    }}
                  >
                    {item.token}
                  </div>
                  <div>
                    <h4 style={{ color: '#0f3b5e', margin: 0, fontSize: '16px' }}>{item.patientName}</h4>
                    <span style={{ fontSize: '13px', color: '#5e6f82' }}>
                      {item.department} · {item.assignedDoctor}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className={`status-badge ${item.status === 'Scheduled' ? 'status-verified' : 'status-pending'}`} style={{ fontSize: '12px' }}>
                    {item.status}
                  </span>
                  <div style={{ fontSize: '12px', color: '#7a8a9e', marginTop: '4px' }}>
                    {new Date(item.estimatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
