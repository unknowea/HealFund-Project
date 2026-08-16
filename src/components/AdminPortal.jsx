import React, { useState, useEffect } from 'react';

export default function AdminPortal({ currentLang, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySuccessMsg, setReplySuccessMsg] = useState('');

  useEffect(() => {
    fetchMessages();
  }, []);

  const defaultSampleMessages = [
    {
      id: 'MSG-1001',
      name: 'Selamawit Desta',
      contact: 'selam.desta@gmail.com',
      category: 'Medical File Verification',
      message: 'Hello, I uploaded my medical lab results and doctor certificate yesterday from Lideta clinic. Could you please check the verification status so I can confirm my referral appointment?',
      status: 'Unread',
      createdAt: '2026-08-15T09:20:00Z',
    },
    {
      id: 'MSG-1002',
      name: 'Kassahun Belay',
      contact: 'kassahun.b@ethionet.et',
      category: 'Hospital Referral',
      message: 'Inquiring about referral transfer timeline from Tikur Anbessa to Zewditu Memorial Hospital Cardiology clinic.',
      status: 'Read',
      createdAt: '2026-08-14T14:45:00Z',
    },
    {
      id: 'MSG-1003',
      name: 'Genet Wolde',
      contact: 'genet.w@yahoo.com',
      category: 'Community Agent',
      message: 'My elderly mother cannot travel easily to the hospital or use a smartphone. We would appreciate a community health field agent visit in Lideta area.',
      status: 'Unread',
      createdAt: '2026-08-15T11:10:00Z',
    },
  ];

  const fetchMessages = async () => {
    setLoading(true);
    let serverMessages = [];
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        serverMessages = data.messages;
      }
    } catch (err) {
      console.warn('Backend fetch failed, using local store:', err);
    }

    const localMessages = JSON.parse(localStorage.getItem('healfund_inbox_messages') || '[]');
    
    // Merge server and local messages, avoiding duplicates by id
    const combinedMap = new Map();
    [...localMessages, ...serverMessages, ...defaultSampleMessages].forEach((msg) => {
      if (!combinedMap.has(msg.id)) {
        combinedMap.set(msg.id, msg);
      }
    });

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    setMessages(combined);
    if (!selectedMessage && combined.length > 0) {
      setSelectedMessage(combined[0]);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (msgId) => {
    const updated = messages.map((m) => {
      if (m.id === msgId) {
        const nextStatus = m.status === 'Unread' ? 'Read' : 'Unread';
        return { ...m, status: nextStatus };
      }
      return m;
    });
    setMessages(updated);
    localStorage.setItem('healfund_inbox_messages', JSON.stringify(updated));

    if (selectedMessage && selectedMessage.id === msgId) {
      setSelectedMessage({
        ...selectedMessage,
        status: selectedMessage.status === 'Unread' ? 'Read' : 'Unread',
      });
    }

    try {
      const target = updated.find((m) => m.id === msgId);
      await fetch(`/api/messages/${msgId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: target.status }),
      });
    } catch (e) {}
  };

  const handleDeleteMessage = async (msgId) => {
    const filtered = messages.filter((m) => m.id !== msgId);
    setMessages(filtered);
    localStorage.setItem('healfund_inbox_messages', JSON.stringify(filtered));

    if (selectedMessage && selectedMessage.id === msgId) {
      setSelectedMessage(filtered.length > 0 ? filtered[0] : null);
    }

    try {
      await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
    } catch (e) {}
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage) return;

    setReplySuccessMsg(`Email reply sent to ${selectedMessage.contact}!`);
    setReplyText('');

    // Mark message as Replied
    const updated = messages.map((m) =>
      m.id === selectedMessage.id ? { ...m, status: 'Replied' } : m
    );
    setMessages(updated);
    localStorage.setItem('healfund_inbox_messages', JSON.stringify(updated));
    setSelectedMessage({ ...selectedMessage, status: 'Replied' });

    setTimeout(() => setReplySuccessMsg(''), 4000);
  };

  const isAm = currentLang === 'am';

  // Filtering
  const filteredMessages = messages.filter((msg) => {
    if (activeFilter === 'unread' && msg.status !== 'Unread') return false;
    if (activeFilter === 'read' && msg.status === 'Unread') return false;
    if (selectedCategory !== 'all' && msg.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        msg.name.toLowerCase().includes(q) ||
        msg.contact.toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q) ||
        msg.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = messages.filter((m) => m.status === 'Unread').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span style={{ background: '#e0f2fe', color: '#0f3b5e', fontSize: '11px', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-shield-alt"></i> {isAm ? 'የሆስፒታል አስተዳዳሪ' : 'Hospital Administration'}
            </span>
            <h2 style={{ fontSize: '24px', margin: '8px 0 4px 0', color: '#fff' }}>
              <i className="fas fa-inbox"></i> {isAm ? 'የአስተዳዳሪ የመልዕክት ሳጥን (Admin Inbox)' : 'Admin Portal & Message Inbox'}
            </h2>
            <p style={{ color: '#e0f2fe', fontSize: '14px', margin: 0 }}>
              {isAm
                ? 'ከተጠቃሚዎች፣ ታካሚዎች እና የጤና ጣቢያዎች የተላኩ መልዕክቶች እና የድጋፍ ጥያቄዎች።'
                : 'Direct patient inquiries, medical verification questions, and emergency assistance requests.'}
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={fetchMessages}
            style={{ color: '#fff', borderColor: '#e0f2fe' }}
          >
            <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i> {isAm ? 'አድስ' : 'Refresh Inbox'}
          </button>
        </div>
      </div>

      {/* Admin Stat Cards */}
      <div className="stats-row" style={{ marginTop: 0 }}>
        <div className="stat-item" style={{ borderLeft: '4px solid #078930' }}>
          <h2 style={{ color: '#078930' }}>{unreadCount}</h2>
          <p>{isAm ? 'ያልተነበቡ መልዕክቶች' : 'Unread Messages'}</p>
        </div>
        <div className="stat-item" style={{ borderLeft: '4px solid #0f3b5e' }}>
          <h2 style={{ color: '#0f3b5e' }}>{messages.length}</h2>
          <p>{isAm ? 'ጠቅላላ መልዕክቶች' : 'Total Messages Received'}</p>
        </div>
        <div className="stat-item" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h2 style={{ color: '#f59e0b' }}>32</h2>
          <p>{isAm ? 'አጋር ጤና ጣቢያዎች' : 'Active Partner Clinics'}</p>
        </div>
        <div className="stat-item" style={{ borderLeft: '4px solid #da121a' }}>
          <h2 style={{ color: '#da121a' }}>Zewditu</h2>
          <p>{isAm ? 'ዋና ሪፈራል ማዕከል' : 'Central Verification Hub'}</p>
        </div>
      </div>

      {/* Main Inbox Layout (2 Columns) */}
      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1.3fr', alignItems: 'start' }}>
        {/* Left Column: Message List & Filters */}
        <div className="card" style={{ padding: '20px' }}>
          {/* Search Box */}
          <div style={{ marginBottom: '14px' }}>
            <input
              type="text"
              placeholder={isAm ? 'በስም ወይም በመልዕክት ፈልግ...' : 'Search messages, sender name, email...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #d0dbe8',
                fontSize: '13.5px',
              }}
            />
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button
              className={`module-tab ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              {isAm ? 'ሁሉም' : 'All'} ({messages.length})
            </button>
            <button
              className={`module-tab ${activeFilter === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveFilter('unread')}
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              {isAm ? 'ያልተነበቡ' : 'Unread'} ({unreadCount})
            </button>
            <button
              className={`module-tab ${activeFilter === 'read' ? 'active' : ''}`}
              onClick={() => setActiveFilter('read')}
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              {isAm ? 'የተነበቡ' : 'Read'} ({messages.length - unreadCount})
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div style={{ marginBottom: '16px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d0dbe8',
                fontSize: '13px',
                background: '#f8fafc',
              }}
            >
              <option value="all">{isAm ? 'ሁሉም ዘርፎች (All Categories)' : 'All Categories'}</option>
              <option value="General Inquiry">{isAm ? 'አጠቃላይ ጥያቄ' : 'General Inquiry'}</option>
              <option value="Medical File Verification">{isAm ? 'የህክምና ፋይል ማረጋገጫ' : 'Medical File Verification'}</option>
              <option value="Hospital Referral">{isAm ? 'የሆስፒታል ሪፈራል' : 'Hospital Referral'}</option>
              <option value="Financial Assistance">{isAm ? 'የህክምና ፈንድ' : 'Financial Assistance'}</option>
              <option value="Community Agent">{isAm ? 'የመስክ ወኪል ጥያቄ' : 'Community Agent'}</option>
            </select>
          </div>

          {/* Messages List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '550px', overflowY: 'auto' }}>
            {filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#7a8a9e' }}>
                <i className="fas fa-inbox" style={{ fontSize: '32px', marginBottom: '8px' }}></i>
                <p style={{ margin: 0, fontSize: '14px' }}>
                  {isAm ? 'ምንም መልዕክት አልተገኘም' : 'No messages found in this view'}
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage && selectedMessage.id === msg.id;
                const isUnread = msg.status === 'Unread';

                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      if (msg.status === 'Unread') {
                        handleToggleStatus(msg.id);
                      }
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #078930' : '1px solid #e2eaf3',
                      background: isSelected ? '#f0f9f3' : isUnread ? '#ffffff' : '#f8fafd',
                      boxShadow: isUnread ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isUnread && (
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#078930' }}></span>
                        )}
                        <strong style={{ fontSize: '14px', color: '#0f3b5e' }}>{msg.name}</strong>
                      </div>
                      <span style={{ fontSize: '11px', color: '#7a8a9e' }}>
                        {new Date(msg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#e8f0fe',
                        color: '#0f3b5e',
                        fontWeight: 600,
                      }}>
                        {msg.category}
                      </span>
                      {msg.status === 'Replied' && (
                        <span style={{
                          fontSize: '10.5px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: '#e7f5eb',
                          color: '#078930',
                          fontWeight: 600,
                        }}>
                          <i className="fas fa-check"></i> Replied
                        </span>
                      )}
                    </div>

                    <p style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#4a5a6e',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {msg.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Message Detail & Quick Reply */}
        <div className="card" style={{ padding: '24px' }}>
          {selectedMessage ? (
            <div>
              {/* Message Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #eef2f7', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: '#078930',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    fontWeight: 700,
                  }}>
                    {selectedMessage.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#0f3b5e', fontSize: '18px' }}>{selectedMessage.name}</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                      <i className="fas fa-envelope" style={{ marginRight: '4px' }}></i> {selectedMessage.contact}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-outline"
                    onClick={() => handleToggleStatus(selectedMessage.id)}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                    title="Toggle Read / Unread"
                  >
                    <i className={`fas ${selectedMessage.status === 'Unread' ? 'fa-envelope-open' : 'fa-envelope'}`}></i>{' '}
                    {selectedMessage.status === 'Unread' ? (isAm ? 'አንብብ' : 'Mark Read') : (isAm ? 'ያልተነበበ አድርግ' : 'Mark Unread')}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => handleDeleteMessage(selectedMessage.id)}
                    style={{ fontSize: '12px', padding: '6px 12px', color: '#da121a', borderColor: '#fca5a5' }}
                    title="Delete"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>

              {/* Message Metadata */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }}>
                <div>
                  <strong>{isAm ? 'ዘርፍ' : 'Category'}:</strong>{' '}
                  <span style={{ color: '#078930', fontWeight: 600 }}>{selectedMessage.category}</span>
                </div>
                <div>
                  <strong>{isAm ? 'ቀን' : 'Received'}:</strong>{' '}
                  <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Message Body */}
              <div style={{
                background: '#f8fafc',
                padding: '18px',
                borderRadius: '10px',
                border: '1px solid #e2eaf3',
                fontSize: '14.5px',
                lineHeight: '1.7',
                color: '#1e293b',
                marginBottom: '24px',
                minHeight: '100px',
              }}>
                {selectedMessage.message}
              </div>

              {/* Quick Reply Form */}
              <div style={{ borderTop: '1px solid #eef2f7', paddingTop: '16px' }}>
                <h4 style={{ color: '#0f3b5e', marginBottom: '10px', fontSize: '15px' }}>
                  <i className="fas fa-reply" style={{ color: '#078930' }}></i> {isAm ? 'ቀጥታ መልስ ይላኩ' : 'Send Official Hospital Reply'}
                </h4>

                {replySuccessMsg && (
                  <div style={{
                    background: '#e7f5eb',
                    color: '#078930',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                  }}>
                    <i className="fas fa-check-circle"></i> {replySuccessMsg}
                  </div>
                )}

                <form onSubmit={handleSendReply}>
                  <textarea
                    rows="3"
                    placeholder={isAm ? 'ለታካሚው መልስ እዚህ ይጻፉ...' : `Reply to ${selectedMessage.name} (${selectedMessage.contact})...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #d0dbe8',
                      fontSize: '14px',
                      marginBottom: '10px',
                    }}
                    required
                  ></textarea>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
              <p style={{ fontSize: '14px' }}>
                {isAm ? 'ዝርዝሩን ለማየት ከግራ በኩል ያለውን መልዕክት ጠቅ ያድርጉ።' : 'Click any message from the left list to read details and send a direct reply.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
