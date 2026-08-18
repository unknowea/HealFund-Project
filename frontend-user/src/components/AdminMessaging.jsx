import React, { useState, useEffect } from 'react';

export default function AdminMessaging({ currentLang, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isAm = currentLang === 'am';

  useEffect(() => {
    // Load messages from localStorage
    if (currentUser) {
      const storedMessages = JSON.parse(
        localStorage.getItem(`healfund_admin_messages_${currentUser.id}`) || '[]'
      );
      setMessages(storedMessages);
    }
  }, [currentUser]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    setSubmitted(false);

    const message = {
      id: `ADMIN-${Date.now()}`,
      userId: currentUser?.id,
      userName: currentUser?.name,
      userEmail: currentUser?.email,
      content: newMessage.trim(),
      status: 'Sent',
      createdAt: new Date().toISOString(),
      read: false,
    };

    try {
      await fetch('/api/admin-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (err) {
      console.warn('Backend offline, message saved locally:', err);
    }

    // Save to localStorage
    const storedMessages = JSON.parse(
      localStorage.getItem(`healfund_admin_messages_${currentUser?.id}`) || '[]'
    );
    localStorage.setItem(
      `healfund_admin_messages_${currentUser?.id}`,
      JSON.stringify([message, ...storedMessages])
    );

    setMessages([message, ...messages]);
    setNewMessage('');
    setLoading(false);
    setSubmitted(true);

    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div className="card-header" style={{ borderBottom: '2px solid #e8f0fe', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '24px', color: '#0f3b5e' }}>
            <i className="fas fa-envelope"></i> {isAm ? 'አስተዳደርን መላክ' : 'Message Admin'}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#7a8a9e',
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>
      </div>

      {/* Messages Display */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
          marginBottom: '20px',
          padding: '16px',
          background: '#f5f8fc',
          borderRadius: '8px',
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: '#7a8a9e', textAlign: 'center', margin: '32px 0' }}>
            {isAm ? 'ገና መልዕክት የለም' : 'No messages yet'}
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                background: '#fff',
                padding: '12px 16px',
                marginBottom: '12px',
                borderRadius: '6px',
                borderLeft: '4px solid #078930',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <strong style={{ color: '#0f3b5e' }}>{isAm ? 'አንተ' : 'You'}</strong>
                <span style={{ fontSize: '12px', color: '#7a8a9e' }}>
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: 0, color: '#2a3a4e', lineHeight: '1.6' }}>{msg.content}</p>
            </div>
          ))
        )}
      </div>

      {/* Submitted Confirmation */}
      {submitted && (
        <div
          style={{
            background: '#e8f5e9',
            color: '#078930',
            padding: '12px 16px',
            borderRadius: '6px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fas fa-check-circle"></i>
          <span>{isAm ? 'መልዕክትዎ ተልኩልዋል' : 'Your message has been sent'}</span>
        </div>
      )}

      {/* Message Form */}
      <form onSubmit={handleSendMessage}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isAm ? 'መልዕክትዎን ይጻፉ...' : 'Type your message...'}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #d0dce6',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '14px',
              resize: 'vertical',
              minHeight: '80px',
              maxHeight: '200px',
            }}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !newMessage.trim()}
          className="btn btn-primary"
          style={{
            marginTop: '12px',
            width: '100%',
            opacity: loading || !newMessage.trim() ? 0.6 : 1,
            cursor: loading || !newMessage.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> {isAm ? 'ይልካል...' : 'Sending...'}
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane"></i> {isAm ? 'ሚልካ' : 'Send Message'}
            </>
          )}
        </button>
      </form>

      {/* Info Message */}
      <div style={{ marginTop: '20px', padding: '12px 16px', background: '#e8f0fe', borderRadius: '6px', color: '#0f3b5e', fontSize: '13px' }}>
        <i className="fas fa-info-circle"></i> {isAm ? ' አስተዳደራችን በቅርቡ ምላሽ ይሰጥዎታል' : ' Admin will respond to your message shortly'}
      </div>
    </div>
  );
}
