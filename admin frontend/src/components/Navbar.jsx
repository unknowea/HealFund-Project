import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../api.js';

export default function Navbar({
  activeModule,
  setActiveModule,
  currentLang,
  setLanguage,
  currentUser,
  onLogout,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const dropdownRef = useRef(null);

  const isAm = currentLang === 'am';

  // Fetch admin stats for live badges
  useEffect(() => {
    if (!currentUser) return;
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('healfund_token');
        if (!token) return;
        const res = await fetch(apiUrl('/api/admin/stats'), {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch admin stats in navbar:', err);
      }
    };
    fetchStats();
  }, [currentUser, isProfileMenuOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavClick = (module) => {
    setActiveModule(module);
    setIsProfileMenuOpen(false);
  };

  // Nav menu items in the exact order requested
  const navMenuItems = [
    {
      id: 'inbox',
      icon: 'fas fa-inbox',
      label: isAm ? 'የመልዕክት ሳጥን (Inbox)' : 'Inbox',
      badge: null,
    },
    {
      id: 'queue',
      icon: 'fas fa-stream',
      label: isAm ? 'የታካሚ ተራ (Patient Queue)' : 'Patient Queue',
      badge: null,
    },
    {
      id: 'dashboard',
      icon: 'fas fa-tachometer-alt',
      label: isAm ? 'ዳሽቦርድ (Dashboard)' : 'Dashboard',
      badge: null,
    },
    {
      id: 'appointments',
      icon: 'fas fa-calendar-check',
      label: isAm ? 'ቀጠሮዎች (Appointments)' : 'Appointments',
      badge: stats?.totalAppointments || null,
    },
    {
      id: 'documents',
      icon: 'fas fa-file-medical',
      label: isAm ? 'ሰነዶች (Documents)' : 'Documents',
      badge: stats ? stats.pendingDocuments : null,
      badgeColor: '#da121a',
    },
    {
      id: 'users',
      icon: 'fas fa-users',
      label: isAm ? 'ተጠቃሚዎች (Users)' : 'Users',
      badge: stats?.totalUsers || null,
    },
    {
      id: 'financial',
      icon: 'fas fa-hand-holding-heart',
      label: isAm ? 'የገንዘብ እርዳታዎች (Financials)' : 'Financials',
      badge: stats?.totalFinancialCases || null,
    },
    {
      id: 'hospitals',
      icon: 'fas fa-hospital',
      label: isAm ? 'ሆስፒታሎች (Hospitals)' : 'Hospitals',
      badge: stats?.totalHospitals || null,
    },
  ];

  return (
  <nav className="navbar" style={{ position: 'relative' }}>
      <div className="logo" onClick={() => setActiveModule('dashboard')} style={{ cursor: 'pointer' }}>
        <i className="fas fa-shield-alt"></i>
        <span>{isAm ? 'ሂል ፈንድ — አስተዳዳሪ' : 'HealFund Admin'}</span>
      </div>

      <div className="module-tabs">
      </div>

      {/* Right Controls: Language Toggle & Clickable Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        <div className="lang-toggle">
          <button className={currentLang === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>
            EN
          </button>
          <button className={currentLang === 'am' ? 'active' : ''} onClick={() => setLanguage('am')}>
            አማ
          </button>
        </div>

        {currentUser && (
          <div className="admin-profile-wrapper" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className={`user-profile-btn ${isProfileMenuOpen ? 'open' : ''}`}
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-expanded={isProfileMenuOpen}
              style={{
                background: isProfileMenuOpen ? '#e8f4ec' : '#ffffff',
                border: '1.5px solid ' + (isProfileMenuOpen ? '#078930' : '#cce5d6'),
                borderRadius: '30px',
                padding: '5px 16px 5px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: isProfileMenuOpen
                  ? '0 0 0 3px rgba(7, 137, 48, 0.15)'
                  : '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                className="avatar-circle"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #078930, #0d5a3d)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '16px',
                }}
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ textAlign: 'left', lineHeight: '1.2' }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: '14px', color: '#0d5a3d' }}>
                  {currentUser.name ? currentUser.name.split(' ')[0] : 'Admin'}
                </span>
                <span style={{ fontSize: '11px', color: '#5e6f82', textTransform: 'capitalize' }}>
                  {currentUser.role || 'Administrator'}
                </span>
              </div>
              <i
                className="fas fa-chevron-down"
                style={{
                  fontSize: '11px',
                  color: '#078930',
                  marginLeft: '4px',
                  transform: isProfileMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.25s ease',
                }}
              ></i>
            </button>

            {/* Profile Dropdown Menu with all Navigation items */}
            {isProfileMenuOpen && (
              <div
                className="admin-dropdown-menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 'calc(100% + 12px)',
                  width: '290px',
                  background: '#ffffff',
                  borderRadius: '18px',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
                  border: '1px solid #d4ebd9',
                  zIndex: 1000,
                  overflow: 'hidden',
                  animation: 'adminDropdownFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Header User Card */}
                <div
                  style={{
                    padding: '16px 18px',
                    background: 'linear-gradient(135deg, #f4faf6 0%, #eaf5ee 100%)',
                    borderBottom: '1px solid #e0eee6',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: '#078930',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '18px',
                        boxShadow: '0 3px 8px rgba(7, 137, 48, 0.25)',
                      }}
                    >
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0d5a3d', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {currentUser.name || 'Admin User'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5e6f82', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {currentUser.email || 'admin@healfund.org'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: '#078930',
                        color: '#ffffff',
                        padding: '2px 9px',
                        borderRadius: '12px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}
                    >
                      {currentUser.role || 'Staff'}
                    </span>
                    {currentUser.hospitalName && (
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: '#0d5a3d',
                          fontWeight: 500,
                          background: '#dcf2e3',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '160px',
                        }}
                        title={currentUser.hospitalName}
                      >
                        {currentUser.hospitalName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Navigation Items List */}
                <div style={{ padding: '8px 6px', maxHeight: '340px', overflowY: 'auto' }}>
                  <div style={{ padding: '4px 10px 6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#7a8a9e', letterSpacing: '0.5px' }}>
                    {isAm ? 'አስተዳዳሪ ሞጁሎች' : 'Navigation Menu'}
                  </div>

                  {navMenuItems.map((item) => {
                    const isActive = activeModule === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        style={{
                          width: '100%',
                          padding: '9.5px 14px',
                          borderRadius: '10px',
                          background: isActive ? '#078930' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          fontSize: '13.5px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#ffffff' : '#2c3e50',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          marginBottom: '2px',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = '#f0f9f3';
                            e.currentTarget.style.color = '#078930';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#2c3e50';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                          <i
                            className={item.icon}
                            style={{
                              width: '18px',
                              textAlign: 'center',
                              fontSize: '14px',
                              color: isActive ? '#ffffff' : '#078930',
                            }}
                          ></i>
                          <span>{item.label}</span>
                        </div>

                        {item.badge !== null && item.badge !== undefined && (
                          <span
                            style={{
                              background: isActive ? 'rgba(255, 255, 255, 0.25)' : (item.badgeColor || '#e8f4ec'),
                              color: isActive ? '#ffffff' : (item.badgeColor ? '#ffffff' : '#078930'),
                              padding: '2px 8px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 700,
                              minWidth: '18px',
                              textAlign: 'center',
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Logout Button */}
                <div style={{ borderTop: '1px solid #e0eee6', padding: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '11px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: '#da121a',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fff5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <i className="fas fa-sign-out-alt" style={{ width: '18px', textAlign: 'center', color: '#da121a' }}></i>
                    <span>{isAm ? 'ውጣ (Sign Out)' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
