import { useState, useEffect, useRef } from 'react';
import { Play, Activity } from 'lucide-react';
import { TOOLS } from '../constants/tools';

export default function TerminalPanel({ 
  activeToolId, setActiveToolId, targets, handleTargetChange, 
  executeCommand, isScanning, logs, savedTargets 
}) {
  const terminalRef = useRef(null);
  const activeTool = TOOLS.find(t => t.id === activeToolId);
  const compatibleTargets = savedTargets ? savedTargets.filter(t => activeTool?.allowedTypes?.includes(t.type)) : [];
  
  // Estado para manejar submódulos (ej. OSINT -> whois, subfinder, etc)
  const [selectedSubTool, setSelectedSubTool] = useState('');

  useEffect(() => {
    if (activeTool?.subTools) {
      setSelectedSubTool(activeTool.subTools[0].id);
    } else {
      setSelectedSubTool('');
    }
  }, [activeToolId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, activeToolId]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          {TOOLS.map(t => (
            <button 
              key={t.id}
              onClick={() => {
                setActiveToolId(t.id);
                handleTargetChange(t.id, ''); // Limpiar el input al cambiar de módulo
              }}
              className={`btn ${activeToolId === t.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: activeToolId === t.id ? `linear-gradient(135deg, ${t.color}, rgba(255,255,255,0.1))` : '' }}
            >
              {t.icon} {t.name}
              {isScanning[t.id] && <div className="status-dot" style={{marginLeft: '8px'}}></div>}
            </button>
          ))}
        </div>

        <h3 style={{ marginBottom: '16px', color: activeTool?.color }}>
          {activeTool ? `Consola Segura Aislada: [${activeTool.name}]` : 'Selecciona un módulo de la barra superior'}
        </h3>
        
        {activeTool && (() => {
          const sub = activeTool.subTools?.find(s => s.id === selectedSubTool);
          return (
            <div className="animate-fade-in" style={{ marginBottom: '24px', padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderLeft: `4px solid ${activeTool.color}`, borderRadius: '0 8px 8px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', color: '#fff', fontWeight: '600', fontSize: '1.05rem' }}>
                <div style={{ color: activeTool.color }}>{activeTool.icon}</div> 
                {activeTool.desc}
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                {activeTool.helpInfo}
              </p>
              {sub && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--accent-secondary)' }}><strong>Variante Seleccionada: {sub.name}</strong></p>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{sub.desc}</p>
                  <code style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>{sub.command}</code>
                </div>
              )}
            </div>
          );
        })()}

        <form onSubmit={(e) => executeCommand(e, selectedSubTool)} style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', flex: 1, gap: '8px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder={activeTool ? activeTool.placeholder : "Selecciona un módulo para comenzar..."}
              value={targets[activeToolId] || ''}
              onChange={(e) => handleTargetChange(activeToolId, e.target.value)}
              disabled={!activeTool || isScanning[activeToolId]}
              style={{ flex: 2, minWidth: '200px' }}
            />
            
            {activeTool?.subTools && (
              <select 
                className="input-field" 
                style={{ flex: 1, minWidth: '200px', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.5)', color: activeTool.color, fontWeight: 'bold' }} 
                value={selectedSubTool}
                onChange={(e) => setSelectedSubTool(e.target.value)}
                disabled={isScanning[activeToolId]}
              >
                {activeTool.subTools.map(st => (
                  <option key={st.id} value={st.id}>🎯 {st.name}</option>
                ))}
              </select>
            )}

            {compatibleTargets.length > 0 && (
              <select 
                className="input-field" 
                style={{ flex: 1, minWidth: '150px', cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.5)', color: 'var(--text-primary)' }} 
                value=""
                onChange={(e) => {
                  handleTargetChange(activeToolId, e.target.value);
                }}
                disabled={!activeTool || isScanning[activeToolId]}
                title="Seleccionar objetivo compatible guardado"
              >
                <option value="" disabled hidden>📁 Elegir guardado...</option>
                {compatibleTargets.map(t => (
                  <option key={t.id} value={t.value}>{t.name} ({t.value})</option>
                ))}
              </select>
            )}
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={!activeTool || !targets[activeToolId] || isScanning[activeToolId]}
            style={{ minWidth: '160px', background: activeTool?.color, color: '#000', fontWeight: 'bold', height: 'fit-content' }}
          >
            {isScanning[activeToolId] ? (
              <><Activity className="brand-icon" size={16} color="#000" /> Atacando...</>
            ) : (
              <><Play size={16} /> Iniciar Auditoría</>
            )}
          </button>
        </form>
      </div>

      <div className="terminal-window">
        <div className="terminal-header">
          <div className="terminal-dot dot-close"></div>
          <div className="terminal-dot dot-min"></div>
          <div className="terminal-dot dot-max"></div>
          <span className="terminal-title">root@redteam-soc:~/{activeToolId || ''}</span>
        </div>
        <div className="terminal-body" ref={terminalRef}>
          {!activeToolId && <div style={{ color: 'var(--text-secondary)' }}>No hay consola activa. Por favor selecciona un módulo.</div>}
          {activeToolId && logs[activeToolId]?.map((log, index) => (
            <div key={index} className="terminal-line" style={{ 
              color: log.type === 'prompt' ? '#00b8ff' : 
                     log.type === 'error' ? '#ff3366' : 
                     log.type === 'warning' ? '#ffb800' : 
                     log.type === 'success' ? '#00ffaa' : '#a0a0a5'
            }}>
              {log.type !== 'prompt' && <span style={{ opacity: 0.5, marginRight: '8px' }}>[{log.time}]</span>}
              <span style={{ wordBreak: 'break-all' }}>{log.text}</span>
            </div>
          ))}
          {activeToolId && isScanning[activeToolId] && (
            <div className="terminal-line">
              <span style={{ opacity: 0.5, marginRight: '8px' }}>[{new Date().toLocaleTimeString()}]</span>
              <span className="text-accent" style={{ animation: 'pulse-glow 2s infinite' }}>Ejecutando túnel SSH. Esperando respuesta de Kali Linux...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
