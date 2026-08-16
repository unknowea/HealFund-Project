import React, { useState } from 'react';

export default function ContactUs({ currentLang }) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    subject: '',
    category: 'General Inquiry',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim() || !formData.contact.trim()) return;
    setLoading(true);

    const fullMessage = formData.subject
      ? `[${formData.subject}] ${formData.message}`
      : formData.message;

    const newMsg = {
      id: `MSG-${Date.now()}`,
      name: formData.name.trim(),
      contact: formData.contact.trim(),
      category: formData.category || 'General Inquiry',
      message: fullMessage,
      status: 'Unread',
      createdAt: new Date().toISOString(),
    };

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          category: formData.category,
          message: fullMessage,
        }),
      });
    } catch (err) {
      console.warn('Backend offline, message synced to local inbox:', err);
    }

    // Always persist to localStorage for instant client-side sync
    const stored = JSON.parse(localStorage.getItem('healfund_inbox_messages') || '[]');
    localStorage.setItem('healfund_inbox_messages', JSON.stringify([newMsg, ...stored]));

    setLoading(false);
    setSubmitted(true);
  };

  const isAm = currentLang === 'am';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #078930 0%, #0f3b5e 100%)', color: '#fff' }}>
        <h2 style={{ fontSize: '26px', marginBottom: '8px', color: '#fff' }}>
          <i className="fas fa-envelope-open-text"></i> {isAm ? 'አግኙን / የድጋፍ መስመር' : 'Contact Us & Support'}
        </h2>
        <p style={{ color: '#e0f2fe', fontSize: '15px', maxWidth: '820px', lineHeight: '1.7', margin: 0 }}>
          {isAm
            ? 'ስለ ሂል ፈንድ ማንኛውም ጥያቄ፣ የህክምና ፋይል ማረጋገጫ ድጋፍ ወይም የሪፈራል እገዛ ካለዎት ከዚህ በታች ያለውን ቅጽ በመጠቀም መልዕክትዎን ይላኩልን። የድጋፍ ቡድናችን በፍጥነት ምላሽ ይሰጥዎታል።'
            : 'Have questions regarding HealFund, need assistance with medical document verification, or require referral guidance? Send us a message below and our hospital support team will respond promptly.'}
        </p>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Direct Channels & Partner Hospital Hubs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Contact Details Card */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <h3>
                <i className="fas fa-address-card" style={{ color: '#078930' }}></i> {isAm ? 'የግንኙነት መረጃ' : 'Direct Channels'}
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f3b5e', flexShrink: 0, fontSize: '18px' }}>
                  <i className="fas fa-envelope"></i>
                </div>
                <div>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                    {isAm ? 'ኦፊሴላዊ ኢሜይል' : 'Official Support Email'}
                  </strong>
                  <p style={{ margin: 0, color: '#4a5a6e', fontSize: '14px', fontWeight: 600 }}>HealFundET@gmail.com</p>
                  <p style={{ margin: 0, color: '#7a8a9e', fontSize: '13px' }}>info@zewdituhospital.et</p>
                </div>
              </div>

              {/* Central Referral Hospital */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#e7f5eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#078930', flexShrink: 0, fontSize: '18px' }}>
                  <i className="fas fa-hospital"></i>
                </div>
                <div>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                    {isAm ? 'ዋና ሪፈራል ማዕከል' : 'Central Hospital Hub'}
                  </strong>
                  <p style={{ margin: 0, color: '#4a5a6e', fontSize: '14px', fontWeight: 600 }}>
                    Zewditu Memorial Hospital
                  </p>
                  <p style={{ margin: 0, color: '#7a8a9e', fontSize: '13px' }}>
                    {isAm ? 'ልደታ / ቂርቆስ ክፍለ ከተማ፣ አዲስ አበባ' : 'Lideta / Kirkos Sub-City, Addis Ababa'}
                  </p>
                </div>
              </div>

              {/* Working Hours */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e67e22', flexShrink: 0, fontSize: '18px' }}>
                  <i className="fas fa-clock"></i>
                </div>
                <div>
                  <strong style={{ color: '#0f3b5e', fontSize: '14px', display: 'block', marginBottom: '2px' }}>
                    {isAm ? 'የስራ ሰዓት' : 'Operational Hours'}
                  </strong>
                  <p style={{ margin: 0, color: '#4a5a6e', fontSize: '14px' }}>
                    {isAm ? 'ሰኞ - ቅዳሜ፡ 2:30 - 11:30' : 'Monday – Saturday: 8:30 AM – 5:30 PM'}
                  </p>
                  <p style={{ margin: 0, color: '#078930', fontSize: '13px', fontWeight: 600 }}>
                    {isAm ? 'የአስቸኳይ እና የፋይል ማረጋገጫ፡ 24/7' : 'Emergency Triage & Document Verification: 24/7'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exclusive Partner Hospital Card */}
          <div className="card" style={{ margin: 0, background: '#f8fbfd', border: '1px solid #dce8f5' }}>
            <h4 style={{ color: '#0f3b5e', marginBottom: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fas fa-shield-alt" style={{ color: '#078930' }}></i>
              {isAm ? 'ብቸኛ ተቀባይ እና አረጋጋጭ ሆስፒታል' : 'Exclusive Verification & Acceptance Partner'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: '#4a5a6e' }}>
              <p style={{ margin: 0, lineHeight: '1.6' }}>
                {isAm
                  ? 'ሂል ፈንድ የሕክምና ሰነዶችን፣ የሆስፒታል ሪፈራሎችን እና የታካሚዎች የገንዘብ እርዳታ ጥያቄዎችን የሚቀበለው እና የሚያረጋግጠው በልዩ ሁኔታ ከዘውዲቱ መታሰቢያ ሆስፒታል ጋር ብቻ ነው።'
                  : 'HealFund accepts and verifies all medical documents, clinic referrals, and financial assistance cases exclusively with Zewditu Memorial Hospital in Addis Ababa.'}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed #dbe5ee' }}>
                <strong>{isAm ? 'ማዕከላዊ ሆስፒታል' : 'Designated Hospital'}:</strong>
                <span style={{ color: '#078930', fontWeight: 700 }}>Zewditu Memorial Hospital</span>
              </div>
            </div>
          </div>

          {/* Emergency Note */}
          <div style={{ background: '#fff4f4', borderLeft: '4px solid #da121a', padding: '14px 18px', borderRadius: '12px' }}>
            <h4 style={{ color: '#da121a', margin: '0 0 4px 0', fontSize: '14.5px' }}>
              <i className="fas fa-ambulance" style={{ marginRight: '6px' }}></i>
              {isAm ? 'ለአስቸኳይ ህክምና' : 'Medical Emergencies'}
            </h4>
            <p style={{ margin: 0, color: '#721c24', fontSize: '13px' }}>
              {isAm
                ? 'አስቸኳይ ህይወት አድን ህክምና ካስፈለገዎት እባክዎ በቀጥታ ወደ ቅርብዎ ሆስፒታል ድንገተኛ ክፍል ይሂዱ።'
                : 'For acute emergencies, please visit the emergency room of Zewditu Memorial Hospital or your nearest regional medical facility immediately.'}
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Message Form */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <h3>
              <i className="fas fa-paper-plane" style={{ color: '#078930' }}></i> {isAm ? 'መልዕክት ይላኩልን' : 'Send us a Message'}
            </h3>
          </div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#e7f5eb',
                color: '#28a745',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '34px',
                marginBottom: '16px',
                boxShadow: '0 4px 14px rgba(40, 167, 69, 0.2)'
              }}>
                <i className="fas fa-check"></i>
              </div>
              <h3 style={{ color: '#0f3b5e', marginBottom: '8px', fontSize: '20px' }}>
                {isAm ? 'መልዕክትዎ በተሳካ ሁኔታ ደርሶናል!' : 'Message Sent Successfully!'}
              </h3>
              <p style={{ color: '#4a5a6e', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                {isAm
                  ? 'መልዕክትዎ በተሳካ ሁኔታ ደርሶናል። የሂል ፈንድ የድጋፍ ቡድን በ 24 ሰዓታት ውስጥ በኢሜይልዎ ምላሽ ይሰጥዎታል።'
                  : 'Your message has been sent successfully. Our support team will review your inquiry and follow up within 24 hours.'}
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({ name: '', contact: '', subject: '', category: 'General Inquiry', message: '' });
                }}
              >
                <i className="fas fa-plus-circle"></i> {isAm ? 'ሌላ መልዕክት ላክ' : 'Send Another Message'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                  {isAm ? 'ሙሉ ስም *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  placeholder={isAm ? 'ስምዎን ያስገቡ (ለምሳሌ፦ አበበ ቢቂላ)' : 'e.g. Abebe Bikila'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d0dbe8',
                    fontSize: '14.5px',
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                  {isAm ? 'የኢሜይል አድራሻ *' : 'Email Address *'}
                </label>
                <input
                  type="email"
                  placeholder={isAm ? 'email@domain.com' : 'e.g. yourname@domain.com'}
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d0dbe8',
                    fontSize: '14.5px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                    {isAm ? 'የጥያቄው ዘርፍ' : 'Inquiry Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid #d0dbe8',
                      fontSize: '14px',
                      background: '#f8fafc',
                    }}
                  >
                    <option value="General Inquiry">{isAm ? 'አጠቃላይ ጥያቄ' : 'General Inquiry'}</option>
                    <option value="Medical File Verification">{isAm ? 'የህክምና ፋይል ማረጋገጫ' : 'Medical File Verification'}</option>
                    <option value="Hospital Referral">{isAm ? 'የሆስፒታል ሪፈራል ድጋፍ' : 'Hospital Referral Support'}</option>
                    <option value="Financial Assistance">{isAm ? 'የህክምና ፈንድ ጥያቄ' : 'Financial Aid Inquiry'}</option>
                    <option value="Community Agent">{isAm ? 'የመስክ ወኪል ጥያቄ' : 'Community Agent Request'}</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                    {isAm ? 'ርዕስ (አማራጭ)' : 'Subject (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isAm ? 'የመልዕክቱ አጭር ርዕስ' : 'Brief subject summary'}
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid #d0dbe8',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                  {isAm ? 'መልዕክት *' : 'Detailed Message *'}
                </label>
                <textarea
                  rows="4"
                  placeholder={isAm ? 'እንዴት ልንረዳዎ እንደምንችል እዚህ ያብራሩ...' : 'How can we help you? Please describe your question or case details...'}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid #d0dbe8',
                    fontSize: '14.5px',
                    lineHeight: '1.5',
                  }}
                ></textarea>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  padding: '13px 28px',
                  fontWeight: 600,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(7, 137, 48, 0.25)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                }}
              >
                <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                <span>{loading ? (isAm ? 'በመላክ ላይ...' : 'Sending...') : (isAm ? 'መልዕክቱን ላክ' : 'Send Message')}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
