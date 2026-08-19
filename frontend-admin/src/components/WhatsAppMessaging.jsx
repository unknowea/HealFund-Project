import React, { useState, useEffect, useRef } from 'react';
import { getConversations, sendChatMessage, markConversationRead } from '../api.js';

export default function WhatsAppMessaging({ currentLang, currentUser, isAdmin = false }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const isAm = currentLang === 'am';

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConv?.messages?.length]);

  const fetchConversations = async () => {
    try {
      const data = await getConversations();
      const convs = data.conversations || [];
      setConversations(convs);
      if (!selectedConv && convs.length > 0) setSelectedConv(convs[0]);
      else if (selectedConv) {
        const updated = convs.find((c) => c.conversationId === selectedConv.conversationId);
        if (updated) setSelectedConv(updated);
      }
    } catch (err) {
      console.warn('Fetch conversations error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConv = async (conv) => {
    setSelectedConv(conv);
    if (conv.unreadByAdmin > 0) {
      await markConversationRead(conv.conversationId).catch(() => {});
      setConversations((prev) => prev.map((c) => c.conversationId === conv.conversationId ? { ...c, unreadByAdmin: 0 } : c));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConv || sending) return;
    setSending(true);

    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      sender: 'admin',
      senderName: 'HealFund Support',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setSelectedConv((prev) => ({ ...prev, messages: [...(prev.messages || []), optimisticMsg] }));
    const sentText = messageInput.trim();
    setMessageInput('');

    try {
      await sendChatMessage(selectedConv.conversationId, sentText);
      fetchConversations();
    } catch (err) {
      console.warn('Send error:', err.message);
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter((c) =>
    (c.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.conversationId || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadByAdmin || 0), 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 220px)', minHeight: '500px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      {/* Sidebar */}
      <div style={{ width: '300px', background: '#f8faff', borderRight: '1px solid #e2eaf3', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', background: '#0f3b5e', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              <i className="fas fa-comments"></i> {isAm ? 'ቀጥታ ውይይቶች' : 'Patient Chats'}
            </h3>
            {totalUnread > 0 && (
              <span style={{ background: '#da121a', color: '#fff', borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: 700 }}>{totalUnread}</span>
            )}
          </div>
          <input type="text" placeholder={isAm ? 'ፈልግ...' : 'Search patients...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', fontSize: '13px', background: 'rgba(255,255,255,0.15)', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#7a8a9e' }}><i className="fas fa-spinner fa-spin"></i></div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#7a8a9e', fontSize: '13px' }}>
              <i className="fas fa-comment-slash" style={{ fontSize: '28px', marginBottom: '8px', display: 'block' }}></i>
              {isAm ? 'ምንም ቀጥታ ውይይት የለም' : 'No patient conversations yet'}
            </div>
          ) : filteredConvs.map((conv) => {
            const isSelected = selectedConv?.conversationId === conv.conversationId;
            return (
              <div key={conv.conversationId} onClick={() => handleSelectConv(conv)}
                style={{ padding: '14px 16px', borderBottom: '1px solid #e2eaf3', cursor: 'pointer', background: isSelected ? '#e8f5e9' : '#fff', transition: '0.15s' }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8faff'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isSelected ? '#078930' : '#0f3b5e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, flexShrink: 0 }}>
                      {(conv.patientName || 'P').charAt(0).toUpperCase()}
                    </div>
                    <strong style={{ fontSize: '14px', color: '#0f3b5e' }}>{conv.patientName || conv.conversationId}</strong>
                  </div>
                  {conv.unreadByAdmin > 0 && (
                    <span style={{ background: '#078930', color: '#fff', borderRadius: '12px', padding: '2px 7px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{conv.unreadByAdmin}</span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#7a8a9e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingLeft: '44px' }}>
                  {conv.lastMessage || (isAm ? 'ምንም መልዕክት' : 'No messages yet')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
        {selectedConv ? (
          <>
            <div style={{ padding: '14px 20px', background: '#078930', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700 }}>
                {(selectedConv.patientName || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>{selectedConv.patientName || 'Patient'}</h4>
                <span style={{ fontSize: '12px', opacity: 0.8 }}>{selectedConv.conversationId}</span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: '#f5f8fa', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(selectedConv.messages || []).length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', color: '#7a8a9e' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>💬</div>
                  <p style={{ fontSize: '14px' }}>{isAm ? 'ምንም መልዕክት ገና' : 'No messages yet. Start the conversation!'}</p>
                </div>
              ) : (selectedConv.messages || []).map((msg, i) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div key={msg._id || i} style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                    {!isAdmin && (
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0f3b5e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        {(selectedConv.patientName || 'P').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ maxWidth: '68%' }}>
                      <div style={{ background: isAdmin ? '#078930' : '#fff', color: isAdmin ? '#fff' : '#0f3b5e', padding: '10px 14px', borderRadius: isAdmin ? '18px 18px 4px 18px' : '18px 18px 18px 4px', wordWrap: 'break-word', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', fontSize: '14px', lineHeight: '1.5' }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize: '10px', color: '#aaa', marginTop: '3px', textAlign: isAdmin ? 'right' : 'left' }}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {isAdmin && (
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#078930', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                        A
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid #e5e5e5', background: '#fff', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder={isAm ? 'ለታካሚው መልስ ይጻፉ...' : 'Reply to patient...'}
                disabled={sending} style={{ flex: 1, padding: '10px 16px', border: '1.5px solid #d0dbe8', borderRadius: '24px', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                onFocus={(e) => e.target.style.borderColor = '#078930'}
                onBlur={(e) => e.target.style.borderColor = '#d0dbe8'}
              />
              <button type="submit" disabled={!messageInput.trim() || sending}
                style={{ background: '#078930', color: '#fff', border: 'none', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (!messageInput.trim() || sending) ? 'not-allowed' : 'pointer', opacity: (!messageInput.trim() || sending) ? 0.5 : 1, fontSize: '16px' }}>
                {sending ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a8a9e', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '56px' }}>💬</div>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#0f3b5e' }}>{isAm ? 'ውይይት ይምረጡ' : 'Select a conversation'}</p>
            <p style={{ fontSize: '13px' }}>{isAm ? 'ከግራ ዝርዝር ይምረጡ' : 'Choose a patient from the left to start chatting'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
