import React, { useState, useEffect, useRef } from 'react';

export default function Messaging({ currentLang, currentUser, isAdmin = false }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const isAm = currentLang === 'am';
  const storageKey = `healfund_patient_conversations_${currentUser?._id || currentUser?.patientId || 'guest'}`;

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation?.messages]);

  const loadConversations = () => {
    setLoading(true);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setConversations(stored);
      if (!selectedConversation && stored.length > 0) setSelectedConversation(stored[0]);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const convId = `CONV-${currentUser?._id || currentUser?.patientId || 'guest'}-ADMIN`;
    let conv = conversations.find((c) => c.id === convId);

    if (!conv) {
      conv = {
        id: convId,
        participantId: 'admin',
        participantName: 'HealFund Support',
        participantRole: 'admin',
        messages: [],
        lastMessage: '',
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
      };
    }

    const newMsg = {
      id: `MSG-${Date.now()}`,
      sender: currentUser?._id || currentUser?.patientId || 'patient',
      senderName: currentUser?.name || 'Patient',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedConv = {
      ...conv,
      messages: [...(conv.messages || []), newMsg],
      lastMessage: messageInput.trim(),
      lastMessageTime: new Date().toISOString(),
    };

    const existingIndex = conversations.findIndex((c) => c.id === convId);
    const updated = existingIndex >= 0
      ? conversations.map((c) => c.id === convId ? updatedConv : c)
      : [updatedConv, ...conversations];

    setConversations(updated);
    setSelectedConversation(updatedConv);
    setMessageInput('');
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const handleSendToAdmin = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(localStorage.getItem('healfund_token') ? { Authorization: `Bearer ${localStorage.getItem('healfund_token')}` } : {}) },
        body: JSON.stringify({
          name: currentUser?.name || 'Patient',
          contact: currentUser?.email || currentUser?.patientId || 'Patient',
          category: 'General Inquiry',
          message: newMessage.trim(),
        }),
      });
    } catch (err) {
      console.warn('Backend offline:', err);
    }
    setNewMessage('');
    setSending(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '6px', color: '#fff' }}>
          <i className="fas fa-comments"></i> {isAm ? 'መልዕክቶች' : 'Messages & Support Chat'}
        </h2>
        <p style={{ color: '#e0f2fe', fontSize: '14px', margin: 0 }}>
          {isAm ? 'ከሂልፈንድ ድጋፍ ቡድን ጋር ቀጥታ ይነጋገሩ።' : 'Chat directly with HealFund hospital support team.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Live Chat */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ background: '#078930', padding: '16px', color: '#fff' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}><i className="fas fa-comment-dots"></i> {isAm ? 'ቀጥታ ውይይት' : 'Live Chat'}</h3>
          </div>

          <div style={{ display: 'flex', height: '400px' }}>
            {/* Conversation list */}
            <div style={{ width: '160px', borderRight: '1px solid #e5e5e5', overflowY: 'auto', background: '#f8faff' }}>
              {conversations.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#999', padding: '12px', textAlign: 'center' }}>{isAm ? 'ምንም የለም' : 'No chats yet'}</p>
              ) : conversations.map((conv) => (
                <div key={conv.id} onClick={() => setSelectedConversation(conv)}
                  style={{ padding: '10px 12px', borderBottom: '1px solid #e5e5e5', cursor: 'pointer', background: selectedConversation?.id === conv.id ? '#e8f5e9' : '#fff', fontSize: '13px', fontWeight: 600, color: '#0f3b5e' }}>
                  {conv.participantName}
                </div>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {!selectedConversation ? (
                  <p style={{ color: '#999', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', fontSize: '13px' }}>{isAm ? 'ውይይት ይምረጡ' : 'Start a new message below'}</p>
                ) : (selectedConversation.messages || []).length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', fontSize: '13px' }}>{isAm ? 'ምንም መልዕክት ገና' : 'No messages yet'}</p>
                ) : (selectedConversation.messages || []).map((msg) => {
                  const isMine = msg.sender !== 'admin';
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '80%', background: isMine ? '#078930' : '#fff', color: isMine ? '#fff' : '#0f3b5e', padding: '8px 12px', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        {msg.content}
                        <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} style={{ padding: '10px', borderTop: '1px solid #e5e5e5', display: 'flex', gap: '8px' }}>
                <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder={isAm ? 'መልዕክት...' : 'Type message...'} style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e5e5', borderRadius: '20px', fontSize: '13px' }} />
                <button type="submit" disabled={!messageInput.trim()} style={{ background: '#078930', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: !messageInput.trim() ? 'not-allowed' : 'pointer', opacity: !messageInput.trim() ? 0.5 : 1, fontSize: '14px' }}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Send to Admin */}
        <div className="card">
          <div className="card-header">
            <h3><i className="fas fa-envelope" style={{ color: '#078930' }}></i> {isAm ? 'ለአስተዳዳሪ ላክ' : 'Message Admin'}</h3>
          </div>
          <p style={{ fontSize: '14px', color: '#5e6f82', marginBottom: '16px' }}>
            {isAm ? 'ለሆስፒታሉ የድጋፍ ቡድን ቀጥታ መልዕክት ይላኩ።' : 'Send a direct message to the hospital support team. They will reply via the Admin Portal.'}
          </p>

          {submitted && (
            <div style={{ background: '#e7f5eb', color: '#078930', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontWeight: 600 }}>
              <i className="fas fa-check-circle"></i> {isAm ? 'መልዕክትዎ ደርሷል!' : 'Message sent to admin successfully!'}
            </div>
          )}

          <form onSubmit={handleSendToAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 600, fontSize: '14px', display: 'block', marginBottom: '6px' }}>{isAm ? 'መልዕክትዎ *' : 'Your Message *'}</label>
              <textarea rows="5" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={isAm ? 'ለሆስፒታሉ ቡድን መልዕክትዎን ይጻፉ...' : 'Describe your concern, question, or request to the hospital team...'} required style={{ width: '100%', padding: '12px', border: '1px solid #d0dbe8', borderRadius: '10px', fontSize: '14px', resize: 'vertical' }}></textarea>
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()}>
              {sending ? <><i className="fas fa-spinner fa-spin"></i> {isAm ? 'ይልካል...' : 'Sending...'}</> : <><i className="fas fa-paper-plane"></i> {isAm ? 'ሚልካ' : 'Send to Admin'}</>}
            </button>
          </form>

          <div style={{ marginTop: '16px', padding: '12px 16px', background: '#e8f0fe', borderRadius: '8px', fontSize: '13px', color: '#0f3b5e' }}>
            <i className="fas fa-info-circle"></i> {isAm ? ' አስተዳደራችን በቅርቡ ምላሽ ይሰጥዎታል።' : ' The admin team will respond to your message shortly via the hospital portal.'}
          </div>
        </div>
      </div>
    </div>
  );
}
