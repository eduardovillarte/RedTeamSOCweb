import { useState, useEffect, useRef } from 'react';

import { Shield, Activity, Terminal, FileText, Settings, Target, Radar, LogOut, User } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, reportsCount, setActiveToolId, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="brand" style={{ marginBottom: '50px' }}>
        <Shield className="brand-icon" size={36} color="var(--accent-primary)" />
        <h2 style={{ fontSize: '1.5rem', letterSpacing: '1px' }}>Red Team SOCweb</h2>
      </div>
      
      <nav>
        <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Activity size={20} />
          <span>Centro de Control</span>
        </div>
        <div className={`nav-item ${activeTab === 'cve' ? 'active' : ''}`} onClick={() => setActiveTab('cve')}>
          <Radar size={20} />
          <span>Radar CVE (NIST)</span>
        </div>
        <div className={`nav-item ${activeTab === 'terminal' ? 'active' : ''}`} onClick={() => { setActiveTab('terminal'); setActiveToolId(prev => prev ? prev : 'nmap'); }}>
          <Terminal size={20} />
          <span>Herramientas red team</span>
        </div>
        <div className={`nav-item ${activeTab === 'targets' ? 'active' : ''}`} onClick={() => setActiveTab('targets')}>
          <Target size={20} />
          <span>Libreta de Objetivos</span>
        </div>
        <div className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
          <FileText size={20} />
          <span>Informes Técnicos</span>
          {reportsCount > 0 && <span className="badge badge-active" style={{ marginLeft: 'auto', background: 'var(--accent-primary)', color: '#000' }}>{reportsCount}</span>}
        </div>
        <div className="nav-divider" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '12px 0' }}></div>
        <div className={`nav-item ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}>
          <Shield size={20} />
          <span>Instrucciones de Uso</span>
        </div>
        {user?.role === 'admin' && (
          <div className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => setActiveTab('admin')}>
            <Settings size={20} />
            <span>Administración Central</span>
          </div>
        )}
      </nav>

      <div style={{ marginTop: 'auto', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
          <User size={16} />
          <span style={{ fontSize: '0.9rem' }}>{user?.username} ({user?.role})</span>
        </div>
        <div className="nav-item" onClick={onLogout} style={{ color: 'var(--accent-danger)' }}>
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </div>
      </div>
    </aside>
  );
}
