import React, { useState, useEffect } from 'react';
import { getQueue, updateQueueStatus } from '../api.js';

export default function QueuePortal({ currentLang, currentUser }) {
  const [queueItems, setQueueItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToken, setSearchToken] = useState('');
  const [activeQueueToken, setActiveQueueToken] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [updatingToken, setUpdatingToken] = useState(null);
  const [notification, setNotification] = useState('');

  const isAm = currentLang === 'am';

  useEffect(() => { fetchQueue(); }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await getQueue();
      const items = data.queue || [];
      setQueueItems(items);
      if (items.length > 0 && !activeQueueToken) setActiveQueueToken(items[0].token);
    } catch (err) {
      console.error('Fetch queue error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (token, newStatus) => {
    setUpdatingToken(token);
    try {
      await updateQueueStatus(token, newStatus);
      setQueueItems(queueItems.map((q) => q.token === token ? { ...q, status: newStatus } : q));
      setNotification(`Token ${token} status updated to "${newStatus}"`);
      setTimeout(() => setNotification(''), 4000);
    } catch (err) {
      setNotification(`❌ Error: ${err.message}`);
    } finally {
      setUpdatingToken(null);
    }
  };

  const filteredQueue = queueItems.filter((q) => {
    if (searchToken && !q.token.toLowerCase().includes(searchToken.toLowerCase()) && !q.patientName.toLowerCase().includes(searchToken.toLowerCase())) return false;
    if (selectedDept !== 'all' && !q.department.toLowerCase().includes(selectedDept.toLowerCase())) return false;
    return true;
  });

  const activeTicket = queueItems.find((q) => q.token === activeQueueToken) || queueItems[0];

  const statusColors = { Scheduled: '#078930', Waiting: '#f59e0b', 'In Progress': '#0d5a3d', Completed: '#6b7280', 'No Show': '#da121a' };

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0d5a3d 0%, #078930 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
              <i className="fas fa-list-ol"></i> {isAm ? 'የዘውዲቱ ሆስፒታል ተራ አስተዳደር' : 'Zewditu Hospital Queue Management'}
            </h2>
            <p style={{ color: '#d4f0e0', fontSize: '14px', maxWidth: '700px' }}>
              {isAm ? 'ታካሚዎችን ይቀበሉ፣ ሁኔታ ይቀይሩ እና ተራ ያስተዳድሩ።' : 'Monitor patient flow, update statuses, and manage the live clinic queue.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 20px', borderRadius: '14px', textAlign: 'center' }}>
              <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Now Serving</span>
              <h1 style={{ fontSize: '32px', color: '#fff', margin: 0 }}>{queueItems[0]?.token || '—'}</h1>
            </div>
            <button className="btn btn-outline" onClick={fetchQueue} style={{ color: '#fff', borderColor: '#fff' }}>
              <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
        </div>
      </div>

      {notification && (
        <div style={{ background: notification.startsWith('❌') ? '#fde8e8' : '#d4edda', color: notification.startsWith('❌') ? '#721c24' : '#155724', padding: '12px 20px', borderRadius: '12px', marginBottom: '16px', fontWeight: 600 }}>
          {notification}
        </div>
      )}

      {/* Stats row */}
      <div className="stats-row" style={{ marginTop: 0 }}>
        {[
          ['Scheduled', '#078930'], ['Waiting', '#f59e0b'], ['In Progress', '#0d5a3d'], ['Completed', '#6b7280']
        ].map(([status, color]) => (
          <div key={status} className="stat-item" style={{ borderLeft: `4px solid ${color}` }}>
            <h2 style={{ color }}>{queueItems.filter((q) => q.status === status).length}</h2>
            <p>{status}</p>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Active Ticket */}
        <div>
          {activeTicket ? (
            <div className="card" style={{ borderTop: '5px solid #078930' }}>
              <div className="card-header">
                <h3><i className="fas fa-ticket-alt"></i> Queue Token Details</h3>
                <span className="status-badge status-verified">{activeTicket.status}</span>
              </div>
              <div style={{ textAlign: 'center', background: '#f4f9f6', padding: '24px', borderRadius: '16px', marginBottom: '20px', border: '1px solid #d4f0e0' }}>
                <span style={{ fontSize: '14px', color: '#5e6f82', fontWeight: 600 }}>Queue Token</span>
                <h1 style={{ fontSize: '48px', color: '#078930', margin: '4px 0' }}>{activeTicket.token}</h1>
                <h3 style={{ color: '#0d5a3d', fontSize: '20px' }}>{activeTicket.patientName}</h3>
                <p style={{ color: '#5e6f82', fontSize: '14px', margin: 0 }}>Patient ID: {activeTicket.patientId}</p>
              </div>

              {[
                ['Clinic / Room', activeTicket.department],
                ['Assigned Doctor', activeTicket.assignedDoctor],
                ['Scheduled Time', activeTicket.estimatedTime ? new Date(activeTicket.estimatedTime).toLocaleString() : '—'],
                ['Priority', activeTicket.urgency],
              ].map(([label, val]) => (
                <div key={label} className="info-row">
                  <span className="label">{label}:</span>
                  <span className="value" style={label === 'Priority' ? { color: activeTicket.urgency === 'High' ? '#da121a' : '#078930' } : {}}>{val}</span>
                </div>
              ))}

              <div style={{ marginTop: '20px', background: '#f4f9f6', padding: '16px', borderRadius: '12px', border: '1px solid #d4f0e0' }}>
                <h5 style={{ color: '#0d5a3d', marginBottom: '8px' }}><i className="fas fa-file-invoice"></i> Required Documents:</h5>
                <ul style={{ paddingLeft: '20px', fontSize: '14px', color: '#4a5a6e' }}>
                  {(activeTicket.requiredDocuments || []).map((doc, i) => <li key={i}>{doc}</li>)}
                </ul>
              </div>

              {/* Status Management */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e8f4ec' }}>
                <h5 style={{ color: '#0d5a3d', marginBottom: '12px' }}><i className="fas fa-cogs"></i> Update Status:</h5>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Waiting', 'In Progress', 'Completed', 'No Show'].map((s) => (
                    <button key={s} onClick={() => handleUpdateStatus(activeTicket.token, s)}
                      disabled={activeTicket.status === s || updatingToken === activeTicket.token}
                      style={{ padding: '7px 14px', borderRadius: '20px', border: `2px solid ${statusColors[s] || '#078930'}`, background: activeTicket.status === s ? statusColors[s] : 'transparent', color: activeTicket.status === s ? '#fff' : statusColors[s] || '#078930', fontWeight: 600, fontSize: '13px', cursor: activeTicket.status === s ? 'default' : 'pointer', transition: '0.2s' }}>
                      {updatingToken === activeTicket.token ? <i className="fas fa-spinner fa-spin"></i> : s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="card"><p style={{ color: '#7a8a9e', textAlign: 'center', padding: '30px' }}>{loading ? 'Loading queue...' : 'No queue items.'}</p></div>
          )}
        </div>

        {/* Queue Directory */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-stream"></i> Live Patient Queue</h3>
            <span className="badge" style={{ background: '#078930', padding: '4px 12px' }}>{filteredQueue.length} in queue</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search by Token or Patient Name..." value={searchToken} onChange={(e) => setSearchToken(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '8px 14px', borderRadius: '8px', border: '1px solid #d0dbe8' }} />
            <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #d0dbe8' }}>
              <option value="all">All Clinics</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Surgery">General Surgery</option>
              <option value="Pediatrics">Pediatrics</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#7a8a9e' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i></div>
          ) : filteredQueue.length === 0 ? (
            <p style={{ color: '#7a8a9e', textAlign: 'center', padding: '20px' }}>No queue items found.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {filteredQueue.map((item) => (
                <div key={item._id || item.token} onClick={() => setActiveQueueToken(item.token)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '12px', background: activeQueueToken === item.token ? '#e3f0fa' : '#fafcff', border: activeQueueToken === item.token ? '2px solid #078930' : '1px solid #e9edf4', cursor: 'pointer', transition: '0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: statusColors[item.status] || '#078930', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>{item.token}</div>
                    <div>
                      <h4 style={{ color: '#0f3b5e', margin: 0, fontSize: '15px' }}>{item.patientName}</h4>
                      <span style={{ fontSize: '12px', color: '#5e6f82' }}>{item.department} · {item.assignedDoctor}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '12px', background: `${statusColors[item.status]}20`, color: statusColors[item.status] || '#078930', fontWeight: 700 }}>{item.status}</span>
                    <div style={{ fontSize: '12px', color: '#7a8a9e', marginTop: '4px' }}>
                      {item.estimatedTime ? new Date(item.estimatedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
