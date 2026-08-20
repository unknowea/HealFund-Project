import React from 'react';

export default function AboutUs({ currentLang }) {
  const isAm = currentLang === 'am';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #0f3b5e 0%, #078930 100%)', color: '#fff' }}>
        <h2 style={{ fontSize: '26px', marginBottom: '8px', color: '#fff' }}>
          <i className="fas fa-info-circle"></i> {isAm ? 'ስለ ሂል ፈንድ (HealFund)' : 'About HealFund'}
        </h2>
        <p style={{ color: '#e0f2fe', fontSize: '15px', maxWidth: '800px', lineHeight: '1.7' }}>
          {isAm
            ? 'ሂል ፈንድ በኢትዮጵያ ውስጥ ያሉ ተጋላጭ ታካሚዎችን፣ የመጀመሪያ ደረጃ ጤና ተቋማትን እና ስፔሻላይዝድ ሆስፒታሎችን በማገናኘት ፈጣን፣ አስተማማኝና ፍትሃዊ የጤና አገልግሎት የሚያረጋግጥ ፈር ቀዳጅ ዲጂታል መድረክ ነው።'
            : 'HealFund is a pioneering healthcare access and verification platform in Ethiopia designed to connect vulnerable patients, primary health centers, and hospitals with transparent verification, live queue tracking, and emergency financial support.'}
        </p>
      </div>

      {/* Mission & Vision Cards */}
      <div className="grid-2">
        <div className="card" style={{ borderLeft: '4px solid #078930' }}>
          <div className="card-header">
            <h3><i className="fas fa-bullseye" style={{ color: '#078930' }}></i> {isAm ? 'ተልዕኳችን' : 'Our Mission'}</h3>
          </div>
          <p style={{ color: '#4a5a6e', fontSize: '15px', lineHeight: '1.7' }}>
            {isAm
              ? 'የህክምና ሰነዶችን በቅድሚያ በማረጋገጥ፣ የቀጠሮ ሂደቶችን በማቀላጠፍ እና የገንዘብ እጥረት ያለባቸውን ወገኖች ከህክምና ፈንድ ጋር በማስተሳሰር የጤና አገልግሎት ክፍተትን መዝጋት።'
              : 'To eliminate systemic healthcare delays by streamlining medical file verification, digitizing appointment scheduling, and facilitating transparent clinical crowdfunding for patients in urgent need.'}
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #0f3b5e' }}>
          <div className="card-header">
            <h3><i className="fas fa-eye" style={{ color: '#0f3b5e' }}></i> {isAm ? 'ራዕያችን' : 'Our Vision'}</h3>
          </div>
          <p style={{ color: '#4a5a6e', fontSize: '15px', lineHeight: '1.7' }}>
            {isAm
              ? 'ማንኛውም ኢትዮጵያዊ የኢኮኖሚ ደረጃው ወይም መልክዓ ምድራዊ አቀማመጡ ሳይገድበው በወቅቱ ጥራት ያለው እና የተረጋገጠ ህክምና የሚያገኝበትን ማህበረሰብ መገንባት።'
              : 'A healthier Ethiopia where no individual is denied life-saving medical care due to lack of verification, geographical isolation, or financial limitations.'}
          </p>
        </div>
      </div>

      {/* Core Platform Pillars */}
      <div className="card">
        <div className="card-header">
          <h3><i className="fas fa-cubes"></i> {isAm ? 'ዋና ዋና ምሰሶዎቻችን' : 'Core Platform Pillars'}</h3>
        </div>
        <div className="features-grid" style={{ marginTop: '16px' }}>
          <div className="feature-card">
            <i className="fas fa-qrcode" style={{ fontSize: '32px', color: '#078930', marginBottom: '12px' }}></i>
            <h4>{isAm ? 'ዲጂታል የታካሚ መታወቂያ እና QR' : 'Digital Patient ID & QR'}</h4>
            <p style={{ fontSize: '13.5px', color: '#4a5a6e' }}>
              {isAm
                ? 'እያንዳንዱ ታካሚ ፈጣን የህክምና ታሪክ መዳረሻ የሚሰጥ ልዩ የQR ኮድ እና ዲጂታል መታወቂያ ይሰጠዋል።'
                : 'Every registered patient receives a unique HealFund QR card containing verified medical summaries and registration records.'}
            </p>
          </div>

          <div className="feature-card">
            <i className="fas fa-stream" style={{ fontSize: '32px', color: '#0f3b5e', marginBottom: '12px' }}></i>
            <h4>{isAm ? 'ቀጥታ ተራ እና ቀጠሮ' : 'Live Queue & Appointments'}</h4>
            <p style={{ fontSize: '13.5px', color: '#4a5a6e' }}>
              {isAm
                ? 'ታካሚዎች የZewditu Memorial Hospital ተራን እና የቀጠሮ ሁኔታቸውን በቀጥታ ይከታተላሉ።'
                : 'Patients track live queue status and appointment schedules at Zewditu Memorial Hospital in real time.'}
            </p>
          </div>

          <div className="feature-card">
            <i className="fas fa-hand-holding-heart" style={{ fontSize: '32px', color: '#da121a', marginBottom: '12px' }}></i>
            <h4>{isAm ? 'የተረጋገጠ የህክምና ድጋፍ ፈንድ' : 'Verified Financial Assistance'}</h4>
            <p style={{ fontSize: '13.5px', color: '#4a5a6e' }}>
              {isAm
                ? 'በክሊኒካል ኮሚቴ የተረጋገጡ አስቸኳይ የህክምና ጉዳዮች በቀጥታ በቴሌብር እና በባንክ ይደገፋሉ።'
                : 'Clinically audited financial support cases allowing donors to fund verified surgeries and procedures via Telebirr & CBE.'}
            </p>
          </div>

          <div className="feature-card">
            <i className="fas fa-phone-volume" style={{ fontSize: '32px', color: '#078930', marginBottom: '12px' }}></i>
            <h4>{isAm ? 'ሁሉን አቀፍ ተደራሽነት (USSD / ስልክ)' : 'Inclusive Access (USSD & Voice)'}</h4>
            <p style={{ fontSize: '13.5px', color: '#4a5a6e' }}>
              {isAm
                ? 'ስማርትፎን እና ኢንተርኔት ለሌላቸው ታካሚዎች በ *677# እና በመስክ ወኪሎች በኩል አገልግሎት ይሰጣል።'
                : 'Accessible even without a smartphone through USSD (*677#), voice hotlines, and localized community health agents.'}
            </p>
          </div>
        </div>
      </div>

      {/* Hospital Partnership */}
      <div className="card" style={{ background: '#f8fbfd', border: '1px solid #dce8f5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#e7f5eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            color: '#078930'
          }}>
            <i className="fas fa-hospital"></i>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#0f3b5e', fontSize: '18px', marginBottom: '4px' }}>
              {isAm ? 'ብቸኛ ክሊኒካዊ አጋር፦ ዘውዲቱ መታሰቢያ ሆስፒታል' : 'Exclusive Clinical Partner: Zewditu Memorial Hospital'}
            </h3>
            <p style={{ color: '#4a5a6e', fontSize: '14px', margin: 0 }}>
              {isAm
                ? 'ሂል ፈንድ የታካሚዎችን የሕክምና ሰነዶች፣ የቀዶ ጥገና ሪፈራሎች እና የድጋፍ ጉዳዮች የሚቀበለው እና የሚያረጋግጠው በልዩ ሁኔታ ከአዲስ አበባው ዘውዲቱ መታሰቢያ ሆስፒታል ክሊኒካዊ ቦርድ ጋር ብቻ ነው።'
                : 'HealFund operates exclusively with Zewditu Memorial Hospital in Addis Ababa for all medical document intake, appointment scheduling, live queue management, and clinical verifications.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
