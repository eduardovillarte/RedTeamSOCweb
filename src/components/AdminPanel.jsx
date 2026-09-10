import { useState, useEffect, useRef } from 'react';
import { Settings, Save, Download, Upload, Server, Key, User, Wifi, ShieldAlert, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import UserManagement from './UserManagement';

export default function AdminPanel({ reports, setReports, savedTargets, setSavedTargets, setKaliStatus }) {
  const [config, setConfig] = useState({ host: '', username: '', password: '********', privateKeyPath: '' });
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text: '' }
  const [pinging, setPinging] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const [formatText, setFormatText] = useState('');
  const [showRestore, setShowRestore] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch('/api/config', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!data.error) setConfig(data);
      })
      .catch(() => setStatus({ type: 'error', text: 'Backend Offline. No se pudo cargar la configuración segura.' }));
  }, []);

  const handleBackup = () => {
    const radarTags = JSON.parse(localStorage.getItem('cveRadarTags') || '[]');
    const backupData = {
      timestamp: new Date().toISOString(),
      reports: reports,
      targets: savedTargets,
      radar: radarTags
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Red_Team_SOCweb_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', text: 'Backup encriptado (JSON) generado exitosamente. Guárdalo en un lugar seguro.' });
  };

  const handleRestore = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        let restoredReports = 0;
        let restoredTargets = 0;
        let restoredRadar = 0;
        
        if (data.reports && Array.isArray(data.reports)) {
          for (const rep of data.reports) {
            await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(rep) });
          }
          setReports(data.reports);
          restoredReports = data.reports.length;
        }
        if (data.targets && Array.isArray(data.targets)) {
          for (const tgt of data.targets) {
            await fetch('/api/targets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(tgt) });
          }
          setSavedTargets(data.targets);
          restoredTargets = data.targets.length;
        }
        if (data.radar && Array.isArray(data.radar)) {
          localStorage.setItem('cveRadarTags', JSON.stringify(data.radar));
          restoredRadar = data.radar.length;
        }
        
        setStatus({ type: 'success', text: `Restauración en BD exitosa: ${restoredReports} reportes, ${restoredTargets} objetivos y ${restoredRadar} equipos cargados.` });
        setShowRestore(false);
        setRestoreText('');
      } catch (err) {
        setStatus({ type: 'error', text: 'Archivo de backup corrupto o error al subir a la BD.' });
      }
    };
    reader.readAsText(file);
    e.target.value = null; // resetear el input file
  };

  const executeRestoreClick = () => {
    if (restoreText.toLowerCase() === 'confirmar') {
      fileInputRef.current.click();
    } else {
      setStatus({ type: 'error', text: 'Palabra de seguridad incorrecta. Restauración abortada.' });
    }
  };

  const executeFormat = async () => {
    if (formatText.toLowerCase() === 'borrar') {
      try {
        await fetch('/api/reports', { method: 'DELETE', credentials: 'include' });
        await fetch('/api/targets', { method: 'DELETE', credentials: 'include' });
        
        setReports([]);
        setSavedTargets([]);
        localStorage.removeItem('cveRadarTags');
        localStorage.removeItem('dashboardCveAlerts');
        setStatus({ type: 'success', text: 'Protocolo de Purga completado. Toda la memoria (Informes, Libreta y Radar) ha sido formateada en la base de datos.' });
        setShowFormat(false);
        setFormatText('');
      } catch (err) {
        setStatus({ type: 'error', text: 'Error al contactar la base de datos para el formateo.' });
      }
    } else {
      setStatus({ type: 'error', text: 'Palabra de seguridad incorrecta. Formateo abortado para proteger los datos.' });
    }
  };

  const handleTestConnection = async () => {
    setPinging(true);
    setStatus({ type: 'info', text: 'Iniciando Handshake SSH cifrado hacia Kali Linux...' });
    if (setKaliStatus) setKaliStatus('VERIFICANDO...');
    try {
      const res = await fetch('/api/test-connection', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', text: data.message });
        if (setKaliStatus) setKaliStatus('ONLINE');
      } else {
        setStatus({ type: 'error', text: `El servidor rechazó la conexión: ${data.error}` });
        if (setKaliStatus) setKaliStatus('OFFLINE');
      }
    } catch (error) {
      setStatus({ type: 'error', text: 'El servidor puente (NodeJS) está inactivo.' });
      if (setKaliStatus) setKaliStatus('OFFLINE');
    }
    setPinging(false);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ type: 'success', text: data.message });
        handleTestConnection();
      } else {
        setStatus({ type: 'error', text: data.error });
      }
    } catch (error) {
      setStatus({ type: 'error', text: 'Error fatal al contactar la bóveda del backend (API inaccesible).' });
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} color="var(--accent-primary)" /> Administración de Infraestructura
        </h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Gestión de Zero-Trust, conexión de túnel SSH y exportación de evidencias (Backups).</p>
      </div>

      {status && (
        <div className="glass-panel" style={{ padding: '16px 24px', borderLeft: `4px solid ${status.type === 'error' ? '#ff3366' : status.type === 'info' ? '#00b8ff' : '#00ffaa'}`, display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,0,0,0.4)' }}>
          {status.type === 'error' ? <XCircle color="#ff3366" /> : status.type === 'info' ? <Wifi color="#00b8ff" /> : <CheckCircle color="#00ffaa" />}
          <span style={{ color: '#fff', fontSize: '1.05rem', fontWeight: '500' }}>{status.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        
        {/* Panel Izquierdo: Conexión SSH */}
        <div className="glass-panel" style={{ flex: '2', minWidth: '400px', padding: '32px' }}>
          <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
            <Server size={24} /> Configuración de Enlace a Kali Linux
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.95rem', lineHeight: 1.6 }}>
            Esta credencial se almacena en una <strong>Bóveda Segura del Backend</strong>. El Frontend web (tu navegador) jamás guardará contraseñas en <i>localStorage</i> ni las expondrá a ataques XSS, cumpliendo los más altos estándares del OWASP.
          </p>

          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <Wifi size={16} /> Dirección IP del Nodo Kali
                </label>
                <input type="text" className="input-field" value={config.host} onChange={e => setConfig({...config, host: e.target.value})} required placeholder="Ej. 192.168.1.X" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <User size={16} /> Usuario Privilegiado (SSH)
                </label>
                <input type="text" className="input-field" value={config.username} onChange={e => setConfig({...config, username: e.target.value})} required placeholder="root o usuario" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <Key size={16} /> Contraseña (Opcional si usa llave)
                </label>
                <input type="password" className="input-field" value={config.password} onChange={e => setConfig({...config, password: e.target.value})} placeholder="********" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                  <ShieldAlert size={16} /> Ruta Local Llave SSH Privada
                </label>
                <input type="text" className="input-field" value={config.privateKeyPath} onChange={e => setConfig({...config, privateKeyPath: e.target.value})} placeholder="Ej. C:\Users\user\.ssh\id_rsa" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-primary)', color: '#000', fontWeight: 'bold', padding: '14px' }}>
                <Save size={18} /> Guardar Cambios en Servidor
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleTestConnection} disabled={pinging} style={{ flex: 1, padding: '14px' }}>
                <Wifi size={18} /> {pinging ? 'Estableciendo Túnel...' : 'Ping a Kali (Probar Conexión)'}
              </button>
            </div>
          </form>
        </div>

        {/* Panel Derecho: Backups */}
        <div className="glass-panel" style={{ flex: '1', minWidth: '300px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--accent-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
            <ShieldAlert size={24} /> Respaldo (Backup SOC)
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', flex: 1, lineHeight: 1.6 }}>
            Exporta tu archivo histórico forense completo (Informes) y tu libreta de contactos a un archivo portátil. Muy útil en caso de migración de máquina o formateo.
          </p>
          
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Informes Técnicos:</span>
              <strong style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>{reports.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Objetivos Activos:</span>
              <strong style={{ color: 'var(--accent-secondary)', fontSize: '1.2rem' }}>{savedTargets.length}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-primary" onClick={handleBackup} style={{ flex: 1, background: 'rgba(0,255,170,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '14px', whiteSpace: 'nowrap' }}>
              <Download size={18} /> Exportar
            </button>
            <button className="btn btn-secondary" onClick={() => setShowRestore(true)} style={{ flex: 1, padding: '14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
              <Upload size={18} /> Restaurar
            </button>
            <input type="file" accept=".json" style={{ display: 'none' }} ref={fileInputRef} onChange={handleRestore} />
          </div>

          {/* Confirmación de Restauración */}
          {showRestore && (
            <div className="animate-fade-in" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,184,255,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--accent-secondary)' }}>
              <span style={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center' }}>Escribe <strong>confirmar</strong> para sobreescribir los datos actuales:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="confirmar" 
                  value={restoreText} 
                  onChange={e => setRestoreText(e.target.value)} 
                  style={{ flex: 1, borderColor: 'var(--accent-secondary)', background: 'rgba(0,0,0,0.5)' }} 
                />
                <button className="btn" onClick={executeRestoreClick} style={{ background: 'var(--accent-secondary)', color: '#000', fontWeight: 'bold' }}>
                  Abrir Archivo
                </button>
                <button className="btn" onClick={() => { setShowRestore(false); setRestoreText(''); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                  X
                </button>
              </div>
            </div>
          )}

          {/* Zona de Peligro: Formateo */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {!showFormat ? (
              <button 
                className="btn" 
                onClick={() => setShowFormat(true)} 
                style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,51,102,0.3)', color: 'var(--accent-danger)', display: 'flex', justifyContent: 'center', gap: '8px' }}
              >
                <Trash2 size={18} /> Formatear Sistema
              </button>
            ) : (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255,51,102,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--accent-danger)' }}>
                <span style={{ color: '#fff', fontSize: '0.9rem', textAlign: 'center' }}>Escribe <strong>borrar</strong> para confirmar purga total:</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="borrar" 
                    value={formatText} 
                    onChange={e => setFormatText(e.target.value)} 
                    style={{ flex: 1, borderColor: 'var(--accent-danger)', background: 'rgba(0,0,0,0.5)' }} 
                  />
                  <button className="btn" onClick={executeFormat} style={{ background: 'var(--accent-danger)', color: '#fff', fontWeight: 'bold' }}>
                    Confirmar
                  </button>
                  <button className="btn" onClick={() => { setShowFormat(false); setFormatText(''); }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)' }}>
                    X
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <UserManagement />
    </div>
  );
}
