import React, { useState } from 'react';
import { sendMessage } from '../api.js';

export default function ContactUs({ currentLang }) {
  const [formData, setFormData] = useState({ name: '', contact: '', subject: '', category: 'General Inquiry', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isAm = currentLang === 'am';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim() || !formData.contact.trim()) return;
    setLoading(true);
    setError('');

    try {
      await sendMessage({
        name: formData.name.trim(),
        contact: formData.contact.trim(),
        category: formData.category,
        message: formData.subject ? `[${formData.subject}] ${formData.message}` : formData.message,
      });
      setSubmitted(true);
    } catch (err) {
      setError(isAm ? 'መልዕክት መላክ አልተሳካም። እንደገና ይሞክሩ።' : 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="card" style={{ background: 'linear-gradient(135deg, #078930 0%, #0f3b5e 100%)', color: '#fff' }}>
        <h2 style={{ fontSize: '26px', marginBottom: '8px', color: '#fff' }}>
          <i className="fas fa-envelope-open-text"></i> {isAm ? 'አግኙን / የድጋፍ መስመር' : 'Contact Us & Support'}
        </h2>
        <p style={{ color: '#e0f2fe', fontSize: '15px', maxWidth: '820px', lineHeight: '1.7', margin: 0 }}>
          {isAm
            ? 'ስለ ሂል ፈንድ ማንኛውም ጥያቄ ካለዎት ከዚህ በታች ያለውን ቅጽ ይጠቀሙ።'
            : 'Have questions or need help? Send us a message and our hospital support team will respond promptly.'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        {/* Left: Contact Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><h3><i className="fas fa-address-card" style={{ color: '#078930' }}></i> {isAm ? 'የግንኙነት መረጃ' : 'Direct Channels'}</h3></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f3b5e', flexShrink: 0, fontSize: '18px' }}><i className="fas fa-envelope"></i></div>
                <div>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>{isAm ? 'ኦፊሴላዊ ኢሜይል' : 'Official Support Email'}</strong>
                  <p style={{ margin: 0, color: '#4a5a6e', fontSize: '14px', fontWeight: 600 }}>HealFundET@gmail.com</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e7f5eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078930', flexShrink: 0, fontSize: '18px' }}><i className="fas fa-hospital"></i></div>
                <div>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>{isAm ? 'ዋና ሪፈራል ማዕከል' : 'Central Hospital Hub'}</strong>
                  <p style={{ margin: 0, color: '#4a5a6e', fontSize: '14px', fontWeight: 600 }}>Zewditu Memorial Hospital</p>
                  <p style={{ margin: 0, color: '#7a8a9e', fontSize: '13px' }}>{isAm ? 'ልደታ / ቂርቆስ፣ አዲስ አበባ' : 'Lideta / Kirkos Sub-City, Addis Ababa'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e67e22', flexShrink: 0, fontSize: '18px' }}><i className="fas fa-clock"></i></div>
                <div>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>{isAm ? 'የስራ ሰዓት' : 'Operational Hours'}</strong>
                  <p style={{ margin: 0, color: '#4a5a6e', fontSize: '14px' }}>{isAm ? 'ሰኞ - ቅዳሜ: 8:30 - 5:30' : 'Monday – Saturday: 8:30 AM – 5:30 PM'}</p>
                  <p style={{ margin: 0, color: '#078930', fontSize: '13px', fontWeight: 600 }}>{isAm ? 'ድንገተኛ: 24/7' : 'Emergency Triage: 24/7'}</p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: '#fff4f4', borderLeft: '4px solid #da121a', padding: '14px 18px', borderRadius: '12px' }}>
            <h4 style={{ color: '#da121a', margin: '0 0 4px 0', fontSize: '14.5px' }}><i className="fas fa-ambulance" style={{ marginRight: '6px' }}></i>{isAm ? 'ለአስቸኳይ ህክምና' : 'Medical Emergencies'}</h4>
            <p style={{ margin: 0, color: '#721c24', fontSize: '13px' }}>
              {isAm ? 'አስቸኳይ ከሆነ ወደ ቅርብ ሆስፒታል ድንገተኛ ክፍል ይሂዱ።' : 'For acute emergencies, please visit the emergency room of Zewditu Memorial Hospital immediately.'}
            </p>
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><h3><i className="fas fa-paper-plane" style={{ color: '#078930' }}></i> {isAm ? 'መልዕክት ይላኩልን' : 'Send us a Message'}</h3></div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#e7f5eb', color: '#28a745', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', marginBottom: '16px' }}><i className="fas fa-check"></i></div>
              <h3 style={{ color: '#0f3b5e', marginBottom: '8px' }}>{isAm ? 'መልዕክትዎ ደርሶናል!' : 'Message Sent Successfully!'}</h3>
              <p style={{ color: '#4a5a6e', fontSize: '14px', marginBottom: '20px' }}>{isAm ? 'ቡድናችን በ 24 ሰዓታት ምላሽ ይሰጥዎታል።' : 'Our support team will respond within 24 hours.'}</p>
              <button className="btn btn-primary" onClick={() => { setSubmitted(false); setFormData({ name: '', contact: '', subject: '', category: 'General Inquiry', message: '' }); }}>
                <i className="fas fa-plus-circle"></i> {isAm ? 'ሌላ ላክ' : 'Send Another Message'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && <div style={{ color: '#da121a', background: '#fff5f5', padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }}>{error}</div>}
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>{isAm ? 'ሙሉ ስም *' : 'Full Name *'}</label>
                <input type="text" placeholder={isAm ? 'ስምዎን ያስገቡ' : 'e.g. Abebe Bikila'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #d0dbe8', fontSize: '14.5px' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>{isAm ? 'ኢሜይል *' : 'Email Address *'}</label>
                <input type="email" placeholder="yourname@domain.com" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} required style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #d0dbe8', fontSize: '14.5px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>{isAm ? 'ዘርፍ' : 'Category'}</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #d0dbe8', fontSize: '14px', background: '#f8fafc' }}>
                    <option value="General Inquiry">{isAm ? 'አጠቃላይ ጥያቄ' : 'General Inquiry'}</option>
                    <option value="Medical File Verification">{isAm ? 'ፋይል ማረጋገጫ' : 'Medical File Verification'}</option>
                    <option value="Financial Assistance">{isAm ? 'የህክምና ፈንድ' : 'Financial Aid Inquiry'}</option>
                    <option value="Community Agent">{isAm ? 'ወኪል ጥያቄ' : 'Community Agent Request'}</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>{isAm ? 'ርዕስ (አማራጭ)' : 'Subject (Optional)'}</label>
                  <input type="text" placeholder={isAm ? 'አጭር ርዕስ' : 'Brief subject'} value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #d0dbe8', fontSize: '14px' }} />
                </div>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>{isAm ? 'መልዕክት *' : 'Detailed Message *'}</label>
                <textarea rows="4" placeholder={isAm ? 'እንዴት ልንረዳዎ እንደምንችል ያብራሩ...' : 'How can we help you?'} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #d0dbe8', fontSize: '14.5px', lineHeight: '1.5' }}></textarea>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '13px 28px', fontWeight: 600, fontSize: '15px' }}>
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                <span style={{ marginLeft: '8px' }}>{loading ? (isAm ? 'በመላክ ላይ...' : 'Sending...') : (isAm ? 'መልዕክቱን ላክ' : 'Send Message')}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
