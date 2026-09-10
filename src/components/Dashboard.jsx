import { useState, useEffect, useRef } from 'react';
import { Activity, AlertTriangle, Info, CheckCircle, Terminal } from 'lucide-react';
import { TOOLS } from '../constants/tools';

export default function Dashboard({ reports, isScanning, handleLaunchTool }) {
  const [openHelpId, setOpenHelpId] = useState(null);
  const [cveAlerts, setCveAlerts] = useState(() => {
    const saved = localStorage.getItem('dashboardCveAlerts');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const fetchCveAlerts = async () => {
      const savedTags = localStorage.getItem('cveRadarTags');
      const tags = savedTags ? JSON.parse(savedTags) : [];
      
      const alerts = {}; // Rebuild alerts from scratch based ONLY on current tags

      try {
        for (const tag of tags) {
          const res = await fetch(`/api/cve?keyword=${encodeURIComponent(tag)}`, { credentials: 'include' });
          const data = await res.json();
          if (data.success) {
            // Mostrar los 3 CVEs más recientes encontrados (sin borrar por año, solo guardar el último escaneo)
            const recentCves = data.results.sort((a, b) => new Date(b.published) - new Date(a.published));
            alerts[tag] = recentCves.slice(0, 3);
          }
        }
        setCveAlerts(alerts);
        localStorage.setItem('dashboardCveAlerts', JSON.stringify(alerts));
      } catch (e) {
        console.error("Fallo al obtener alertas CVE en vivo", e);
      }
    };

    // Ejecutar inmediatamente al abrir el panel
    fetchCveAlerts();

    // Actualización automatizada en segundo plano cada hora (1 hora = 3600000 ms)
    const intervalId = setInterval(fetchCveAlerts, 3600000);

    // Limpiar el intervalo para evitar fugas de memoria si se desmonta el componente
    return () => clearInterval(intervalId);
  }, []);

  const totalScans = reports.length;
  const criticalRisks = reports.filter(r => r.severity === 'high').length;
  const mediumRisks = reports.filter(r => r.severity === 'medium').length;
  const safeScans = reports.filter(r => r.severity === 'low').length;

  const criticalPercent = totalScans > 0 ? (criticalRisks / totalScans) * 100 : 0;
  const mediumPercent = totalScans > 0 ? (mediumRisks / totalScans) * 100 : 0;
  const safePercent = totalScans > 0 ? (safeScans / totalScans) * 100 : 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--accent-primary)"/> Distribución de Amenazas (Global)
          </h3>
          
          <div style={{ width: '100%', height: '24px', borderRadius: '12px', overflow: 'hidden', display: 'flex', backgroundColor: 'rgba(0,0,0,0.5)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)' }}>
             {criticalPercent > 0 && <div style={{ width: `${criticalPercent}%`, backgroundColor: '#ff3366', transition: 'width 1s ease' }} title={`Crítico: ${criticalPercent.toFixed(1)}%`}></div>}
             {mediumPercent > 0 && <div style={{ width: `${mediumPercent}%`, backgroundColor: '#ffb800', transition: 'width 1s ease' }} title={`Medio: ${mediumPercent.toFixed(1)}%`}></div>}
             {safePercent > 0 && <div style={{ width: `${safePercent}%`, backgroundColor: '#00ffaa', transition: 'width 1s ease' }} title={`Seguro: ${safePercent.toFixed(1)}%`}></div>}
             {totalScans === 0 && <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }}></div>}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff3366'}}></div> Riesgo Crítico ({criticalPercent.toFixed(1)}%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffb800'}}></div> Alertas Medias ({mediumPercent.toFixed(1)}%)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{width: 12, height: 12, borderRadius: '50%', backgroundColor: '#00ffaa'}}></div> Sistemas Seguros ({safePercent.toFixed(1)}%)</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderTop: '4px solid var(--accent-primary)' }}>
          <h3 style={{ fontSize: '3.5rem', margin: 0, color: '#fff', textShadow: '0 0 30px rgba(0,255,170,0.4)', lineHeight: '1' }}>{totalScans}</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 0 0', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>Auditorías Totales</p>
        </div>
      </div>

      {Object.keys(cveAlerts).length > 0 && (
        <div>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#f1c40f" /> Últimas Amenazas Detectadas (En Vivo)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
            {Object.entries(cveAlerts).map(([tag, cves]) => (
              <div key={tag} className="glass-panel" style={{ padding: '20px', borderTop: '3px solid #9b59b6', position: 'relative' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between' }}>
                  {tag}
                  {cves.length === 0 && <span style={{ fontSize: '0.8rem', color: '#00ffaa', padding: '2px 8px', background: 'rgba(0,255,170,0.1)', borderRadius: '4px' }}>SEGURO</span>}
                </h4>
                {cves.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No hay registros recientes para este equipo.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {cves.map(cve => {
                      const scoreNum = parseFloat(cve.score) || 0;
                      const boxColor = scoreNum >= 9.0 ? '#ff3366' : scoreNum >= 7.0 ? '#ffb800' : '#f1c40f';
                      const bgColor = scoreNum >= 9.0 ? 'rgba(255,51,102,0.05)' : scoreNum >= 7.0 ? 'rgba(255,184,0,0.05)' : 'rgba(241,196,15,0.05)';
                      const borderColor = scoreNum >= 9.0 ? 'rgba(255,51,102,0.3)' : scoreNum >= 7.0 ? 'rgba(255,184,0,0.3)' : 'rgba(241,196,15,0.3)';

                      return (
                        <a 
                          href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          key={cve.id} 
                          style={{ 
                            display: 'block', textDecoration: 'none', background: bgColor, 
                            border: `1px solid ${borderColor}`, padding: '12px', borderRadius: '6px', 
                            transition: 'all 0.2s ease', cursor: 'pointer', borderLeft: `3px solid ${boxColor}`
                          }}
                          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${bgColor}`; }}
                          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: boxColor, fontWeight: 'bold', fontSize: '0.95rem' }}>{cve.id}</span>
                            <span style={{ color: boxColor, fontSize: '0.85rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>CVSS {cve.score}</span>
                          </div>
                          <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.85rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                            {cve.description}
                          </p>
                          <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                            Publicado: {new Date(cve.published).toLocaleDateString()}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '16px' }}>Módulos de Análisis Activo</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {TOOLS.map((tool) => (
            <div className="glass-panel" key={tool.id} style={{ display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease', borderLeft: `4px solid ${tool.color}` }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg)'}>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ color: tool.color, opacity: 0.9 }}>{tool.icon}</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.5px' }}>{tool.name}</h3>
                      <button onClick={() => setOpenHelpId(openHelpId === tool.id ? null : tool.id)} style={{ background: 'transparent', border: 'none', color: openHelpId === tool.id ? tool.color : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} title="Ver instrucciones de uso">
                        <Info size={16} /> <span style={{ fontSize: '0.8rem', marginLeft: '4px' }}>{openHelpId === tool.id ? 'Ocultar' : 'Info'}</span>
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{tool.desc}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <span className={`badge ${isScanning[tool.id] ? 'badge-warning' : ''}`} style={{ background: 'transparent', border: `1px solid ${isScanning[tool.id] ? '#ffb800' : 'rgba(255,255,255,0.1)'}`, color: isScanning[tool.id] ? '#ffb800' : 'var(--text-secondary)' }}>
                    {isScanning[tool.id] ? 'Procesando Datos...' : 'En Espera'}
                  </span>
                  <button className="btn btn-primary" style={{ padding: '8px 24px', fontSize: '0.9rem', background: isScanning[tool.id] ? 'transparent' : `linear-gradient(135deg, ${tool.color}, rgba(0,0,0,0.8))`, border: `1px solid ${tool.color}`, minWidth: '140px' }} onClick={() => handleLaunchTool(tool)}>
                    <Terminal size={14} style={{ marginRight: '8px', display: 'inline' }} /> {isScanning[tool.id] ? 'Ver Consola' : 'Iniciar'}
                  </button>
                </div>
              </div>

              {openHelpId === tool.id && (
                <div className="animate-fade-in" style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                    <strong>¿Qué hace exactamente este módulo?</strong><br/>
                    <span style={{ color: 'var(--text-secondary)' }}>{tool.helpInfo.split('\n')[0]}</span>
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-secondary)' }}>
                    <strong>{tool.helpInfo.split('\n')[1].split(':')[0]}:</strong>{tool.helpInfo.split('\n')[1].split(':')[1]}
                  </p>
                </div>
              )}
              
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
