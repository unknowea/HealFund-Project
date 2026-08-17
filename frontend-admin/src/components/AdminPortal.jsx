import React, { useState, useEffect } from 'react';
import { getMessages, updateMessageStatus, deleteMessage } from '../api.js';

export default function AdminPortal({ currentLang, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySuccessMsg, setReplySuccessMsg] = useState('');

  const isAm = currentLang === 'am';

  useEffect(() => { fetchMessages(); }, []);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const data = await getMessages();
      const msgs = data.messages || [];
      setMessages(msgs);
      if (!selectedMessage && msgs.length > 0) setSelectedMessage(msgs[0]);
    } catch (err) {
      console.error('Fetch messages error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (msgId) => {
    const target = messages.find((m) => m.messageId === msgId || m._id === msgId);
    if (!target) return;
    const nextStatus = target.status === 'Unread' ? 'Read' : 'Unread';
    const id = target.messageId || msgId;

    const updated = messages.map((m) =>
      (m.messageId === msgId || m._id === msgId) ? { ...m, status: nextStatus } : m
    );
    setMessages(updated);
    if (selectedMessage && (selectedMessage.messageId === msgId || selectedMessage._id === msgId)) {
      setSelectedMessage({ ...selectedMessage, status: nextStatus });
    }

    try { await updateMessageStatus(id, nextStatus); } catch (e) {}
  };

  const handleDeleteMessage = async (msgId) => {
    const target = messages.find((m) => m.messageId === msgId || m._id === msgId);
    const id = target?.messageId || msgId;

    const filtered = messages.filter((m) => m.messageId !== msgId && m._id !== msgId);
    setMessages(filtered);
    if (selectedMessage && (selectedMessage.messageId === msgId || selectedMessage._id === msgId)) {
      setSelectedMessage(filtered.length > 0 ? filtered[0] : null);
    }

    try { await deleteMessage(id); } catch (e) {}
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;
    setReplySuccessMsg(`Email reply sent to ${selectedMessage.contact}!`);
    setReplyText('');

    const msgId = selectedMessage.messageId || selectedMessage._id;
    const updated = messages.map((m) =>
      (m.messageId === msgId || m._id === msgId) ? { ...m, status: 'Replied' } : m
    );
    setMessages(updated);
    setSelectedMessage({ ...selectedMessage, status: 'Replied' });
    setTimeout(() => setReplySuccessMsg(''), 4000);

    try { updateMessageStatus(msgId, 'Replied'); } catch (e) {}
  };

  const filteredMessages = messages.filter((msg) => {
    if (activeFilter === 'unread' && msg.status !== 'Unread') return false;
    if (activeFilter === 'read' && msg.status === 'Unread') return false;
    if (selectedCategory !== 'all' && msg.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return msg.name.toLowerCase().includes(q) || (msg.contact || '').toLowerCase().includes(q) || msg.message.toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = messages.filter((m) => m.status === 'Unread').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ background: '#e0f2fe', color: '#0f3b5e', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
              <i className="fas fa-shield-alt"></i> {isAm ? 'የሆስፒታል አስተዳዳሪ' : 'Hospital Administration'}
            </span>
            <h2 style={{ fontSize: '24px', margin: '8px 0 4px 0', color: '#fff' }}>
              <i className="fas fa-inbox"></i> {isAm ? 'የአስተዳዳሪ የመልዕክት ሳጥን' : 'Admin Portal & Message Inbox'}
            </h2>
            <p style={{ color: '#e0f2fe', fontSize: '14px', margin: 0 }}>
              {isAm ? 'ከተጠቃሚዎች የተላኩ መልዕክቶች እና ጥያቄዎች።' : 'Patient inquiries, medical verification questions, and emergency assistance requests.'}
            </p>
          </div>
          <button className="btn btn-outline" onClick={fetchMessages} style={{ color: '#fff', borderColor: '#e0f2fe' }}>
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> {isAm ? 'አድስ' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginTop: 0 }}>
        <div className="stat-item" style={{ borderLeft: '4px solid #078930' }}><h2 style={{ color: '#078930' }}>{unreadCount}</h2><p>{isAm ? 'ያልተነበቡ' : 'Unread Messages'}</p></div>
        <div className="stat-item" style={{ borderLeft: '4px solid #0f3b5e' }}><h2 style={{ color: '#0f3b5e' }}>{messages.length}</h2><p>{isAm ? 'ጠቅላላ' : 'Total Messages'}</p></div>
        <div className="stat-item" style={{ borderLeft: '4px solid #f59e0b' }}><h2 style={{ color: '#f59e0b' }}>32</h2><p>{isAm ? 'አጋር ጤና ጣቢያዎች' : 'Active Partner Clinics'}</p></div>
        <div className="stat-item" style={{ borderLeft: '4px solid #da121a' }}><h2 style={{ color: '#da121a', fontSize: '16px' }}>Zewditu</h2><p>{isAm ? 'ዋና ማዕከል' : 'Central Verification Hub'}</p></div>
      </div>

      {/* Inbox Layout */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.3fr', alignItems: 'start' }}>
        {/* Message List */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ marginBottom: '14px' }}>
            <input type="text" placeholder={isAm ? 'ፈልግ...' : 'Search messages...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d0dbe8', fontSize: '13.5px' }} />
          </div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {[['all', `${isAm ? 'ሁሉም' : 'All'} (${messages.length})`], ['unread', `${isAm ? 'ያልተነበቡ' : 'Unread'} (${unreadCount})`], ['read', `${isAm ? 'የተነበቡ' : 'Read'} (${messages.length - unreadCount})`]].map(([val, label]) => (
              <button key={val} className={`module-tab ${activeFilter === val ? 'active' : ''}`} onClick={() => setActiveFilter(val)} style={{ fontSize: '12px', padding: '4px 12px' }}>{label}</button>
            ))}
          </div>
          <div style={{ marginBottom: '16px' }}>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d0dbe8', fontSize: '13px', background: '#f8fafc' }}>
              <option value="all">{isAm ? 'ሁሉም ዘርፎች' : 'All Categories'}</option>
              <option value="General Inquiry">{isAm ? 'አጠቃላይ ጥያቄ' : 'General Inquiry'}</option>
              <option value="Medical File Verification">{isAm ? 'ፋይል ማረጋገጫ' : 'Medical File Verification'}</option>
              <option value="Hospital Referral">{isAm ? 'ሆስፒታል ሪፈራል' : 'Hospital Referral'}</option>
              <option value="Financial Assistance">{isAm ? 'የህክምና ፈንድ' : 'Financial Assistance'}</option>
              <option value="Community Agent">{isAm ? 'ወኪል ጥያቄ' : 'Community Agent'}</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#7a8a9e' }}><i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i><p style={{ marginTop: '8px' }}>Loading...</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto' }}>
              {filteredMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#7a8a9e' }}>
                  <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
                  <p style={{ margin: 0, fontSize: '14px' }}>{isAm ? 'ምንም መልዕክት አልተገኘም' : 'No messages found'}</p>
                </div>
              ) : filteredMessages.map((msg) => {
                const id = msg.messageId || msg._id;
                const isSelected = selectedMessage && (selectedMessage.messageId === id || selectedMessage._id === id);
                const isUnread = msg.status === 'Unread';
                return (
                  <div key={id} onClick={() => { setSelectedMessage(msg); if (isUnread) handleToggleStatus(id); }}
                    style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', border: isSelected ? '2px solid #078930' : '1px solid #e2eaf3', background: isSelected ? '#f0f9f3' : isUnread ? '#fff' : '#f8fafd', transition: 'all 0.15s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isUnread && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#078930', flexShrink: 0 }}></span>}
                        <strong style={{ fontSize: '14px', color: '#0f3b5e' }}>{msg.name}</strong>
                      </div>
                      <span style={{ fontSize: '11px', color: '#7a8a9e' }}>{new Date(msg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '6px', background: '#e8f0fe', color: '#0f3b5e', fontWeight: 600 }}>{msg.category}</span>
                      {msg.status === 'Replied' && <span style={{ fontSize: '10.5px', padding: '2px 8px', borderRadius: '6px', background: '#e7f5eb', color: '#078930', fontWeight: 600 }}><i className="fas fa-check"></i> Replied</span>}
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: '#4a5a6e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="card" style={{ padding: '24px' }}>
          {selectedMessage ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eef2f7', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#078930', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 700 }}>
                    {selectedMessage.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#0f3b5e', fontSize: '18px' }}>{selectedMessage.name}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}><i className="fas fa-envelope" style={{ marginRight: '4px' }}></i> {selectedMessage.contact || 'No contact provided'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-outline" onClick={() => handleToggleStatus(selectedMessage.messageId || selectedMessage._id)} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    <i className={`fas ${selectedMessage.status === 'Unread' ? 'fa-envelope-open' : 'fa-envelope'}`}></i> {selectedMessage.status === 'Unread' ? 'Mark Read' : 'Mark Unread'}
                  </button>
                  <button className="btn-outline" onClick={() => handleDeleteMessage(selectedMessage.messageId || selectedMessage._id)} style={{ fontSize: '12px', padding: '6px 12px', color: '#da121a', borderColor: '#fca5a5' }}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
                <div><strong>{isAm ? 'ዘርፍ' : 'Category'}:</strong> <span style={{ color: '#078930', fontWeight: 600 }}>{selectedMessage.category}</span></div>
                <div><strong>{isAm ? 'ቀን' : 'Received'}:</strong> <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span></div>
              </div>

              <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2eaf3', fontSize: '14.5px', lineHeight: '1.7', color: '#1e293b', marginBottom: '24px', minHeight: '100px' }}>
                {selectedMessage.message}
              </div>

              <div style={{ borderTop: '1px solid #eef2f7', paddingTop: '16px' }}>
                <h4 style={{ color: '#0f3b5e', marginBottom: '10px', fontSize: '15px' }}>
                  <i className="fas fa-reply" style={{ color: '#078930' }}></i> {isAm ? 'ቀጥታ መልስ ይላኩ' : 'Send Official Hospital Reply'}
                </h4>
                {replySuccessMsg && (
                  <div style={{ background: '#e7f5eb', color: '#078930', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13.5px', fontWeight: 600 }}>
                    <i className="fas fa-check-circle"></i> {replySuccessMsg}
                  </div>
                )}
                <form onSubmit={handleSendReply}>
                  <textarea rows="3" placeholder={isAm ? 'ለታካሚው መልስ እዚህ ይጻፉ...' : `Reply to ${selectedMessage.name}...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d0dbe8', fontSize: '14px', marginBottom: '10px' }} required></textarea>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', fontSize: '13.5px' }}>
                      <i className="fas fa-paper-plane"></i> {isAm ? 'መልስ ላክ' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a8a9e' }}>
              <i className="fas fa-envelope-open-text" style={{ fontSize: '48px', marginBottom: '12px', color: '#cbd5e1' }}></i>
              <h3 style={{ color: '#0f3b5e', marginBottom: '6px' }}>{isAm ? 'መልዕክት ይምረጡ' : 'Select a message'}</h3>
              <p style={{ fontSize: '14px' }}>{isAm ? 'ዝርዝሩን ለማየት ከግራ ይምረጡ።' : 'Click any message from the list to read and reply.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
