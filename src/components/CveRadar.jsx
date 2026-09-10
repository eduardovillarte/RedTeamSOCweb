import { useState, useEffect, useRef } from 'react';
import { Radar, Search, AlertTriangle, Shield, ShieldAlert, Zap, Server, Activity, Trash2, Eye, CheckCircle, Plus } from 'lucide-react';

export default function CveRadar() {
  const [keyword, setKeyword] = useState('');
  const [tags, setTags] = useState(() => {
    const saved = localStorage.getItem('cveRadarTags');
    return saved ? JSON.parse(saved) : ['Fortigate'];
  });
  
  const [allResults, setAllResults] = useState(() => {
    const saved = localStorage.getItem('cveRadarAllResults');
    return saved ? JSON.parse(saved) : {};
  });
  const [scanDates, setScanDates] = useState(() => {
    const saved = localStorage.getItem('cveRadarScanDates');
    return saved ? JSON.parse(saved) : {};
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTag, setActiveTag] = useState(() => {
    return localStorage.getItem('cveRadarActiveTag') || null;
  });
  const [sortBy, setSortBy] = useState('score'); // 'score' or 'date'

  const results = activeTag ? (allResults[activeTag] || []) : [];

  // Persistir configuración
  useEffect(() => {
    localStorage.setItem('cveRadarTags', JSON.stringify(tags));
  }, [tags]);

  useEffect(() => {
    localStorage.setItem('cveRadarAllResults', JSON.stringify(allResults));
  }, [allResults]);

  useEffect(() => {
    localStorage.setItem('cveRadarScanDates', JSON.stringify(scanDates));
  }, [scanDates]);

  const handleAddTag = (e) => {
    e.preventDefault();
    const newTag = keyword.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setKeyword('');
      handleSearch(newTag);
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
    
    setAllResults(prev => {
      const newResults = { ...prev };
      delete newResults[tagToRemove];
      return newResults;
    });

    setScanDates(prev => {
      const newDates = { ...prev };
      delete newDates[tagToRemove];
      return newDates;
    });

    if (activeTag === tagToRemove) {
      setActiveTag(null);
      localStorage.removeItem('cveRadarActiveTag');
    }
  };

  const handleSearch = async (tagToScan) => {
    setLoading(true);
    setError(null);
    setActiveTag(tagToScan);
    localStorage.setItem('cveRadarActiveTag', tagToScan);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 segundos máximo para compensar lentitud del NIST
      
      const res = await fetch(`/api/cve?keyword=${encodeURIComponent(tagToScan)}`, { 
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      
      if (data.success) {
        const cvesWithTag = data.results.map(c => ({ ...c, matchedTarget: tagToScan }));
        
        cvesWithTag.sort((a, b) => {
          const scoreA = parseFloat(a.score) || 0;
          const scoreB = parseFloat(b.score) || 0;
          return scoreB - scoreA;
        });
        
        setAllResults(prev => ({ ...prev, [tagToScan]: cvesWithTag }));
        setScanDates(prev => ({ ...prev, [tagToScan]: Date.now() }));
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError(`El escaneo de ${tagToScan} tomó demasiado tiempo. El servidor del NIST o el traductor están saturados.`);
      } else {
        setError(`Fallo de conexión al escanear ${tagToScan}. El backend no responde o NIST bloqueó la petición.`);
      }
    }
    
    setLoading(false);
  };

  const handleViewResults = async (tagToView) => {
    if (activeTag === tagToView) return; // Ya estamos viéndolos
    
    setError(null);
    setActiveTag(tagToView);
    localStorage.setItem('cveRadarActiveTag', tagToView);
    
    // Si ya los tenemos en memoria, no hace falta fetchear (se muestran al instante)
    if (allResults[tagToView] && allResults[tagToView].length > 0) return;
    
    try {
      const res = await fetch(`/api/cve?keyword=${encodeURIComponent(tagToView)}`, { credentials: 'include' });
      const data = await res.json();
      
      if (data.success) {
        const cvesWithTag = data.results.map(c => ({ ...c, matchedTarget: tagToView }));
        
        cvesWithTag.sort((a, b) => {
          const scoreA = parseFloat(a.score) || 0;
          const scoreB = parseFloat(b.score) || 0;
          return scoreB - scoreA;
        });
        
        setAllResults(prev => ({ ...prev, [tagToView]: cvesWithTag }));
        setScanDates(prev => ({ ...prev, [tagToView]: Date.now() }));
      }
    } catch (err) {
      setError(`Error al visualizar resultados de ${tagToView}.`);
    }
  };

  const getSeverityColor = (score) => {
    const num = parseFloat(score);
    if (isNaN(num)) return '#a0a0b0';
    if (num >= 9.0) return '#ff3366'; // Crítico
    if (num >= 7.0) return '#ffb800'; // Alto
    if (num >= 4.0) return '#f1c40f'; // Medio
    return '#00ffaa'; // Bajo
  };

  const currentYear = new Date().getFullYear();
  let displayedResults = [...results];
  
  if (sortBy === 'date') {
    // Filtrar estricto: Solo mostrar CVEs publicados en el año actual
    displayedResults = displayedResults.filter(cve => new Date(cve.published).getFullYear() === currentYear);
    displayedResults.sort((a, b) => new Date(b.published) - new Date(a.published));
  } else {
    // Modo Riesgo: Mostrar todos y ordenar por gravedad
    displayedResults.sort((a, b) => {
      const scoreA = parseFloat(a.score) || 0;
      const scoreB = parseFloat(b.score) || 0;
      return scoreB - scoreA;
    });
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', borderTop: '4px solid #00b8ff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ background: 'rgba(0, 184, 255, 0.1)', padding: '12px', borderRadius: '10px' }}>
            <Radar size={32} color="#00b8ff" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.5rem', letterSpacing: '-0.2px' }}>Radar CVE Interactivo</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Haz clic en un equipo de tu inventario para escanear sus vulnerabilidades publicadas en la base de datos oficial del NIST.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(20, 20, 25, 0.6)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#00ffaa', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} />
              Inventario Permanente de Infraestructura
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
              {tags.length} equipos
            </span>
          </div>
          
          <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ingresa el nombre del equipo o software (Ej. Windows 11, Fortigate 300f, Apache)..."
                style={{ 
                  width: '100%', boxSizing: 'border-box', 
                  padding: '14px 16px', paddingLeft: '44px',
                  background: 'rgba(0,0,0,0.5)', 
                  border: '1px solid rgba(0, 255, 170, 0.3)', 
                  borderRadius: '8px',
                  color: '#fff', fontSize: '1rem',
                  outline: 'none', transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#00ffaa'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(0, 255, 170, 0.3)'}
              />
              <Search size={18} color="#00ffaa" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
            <button 
              type="submit" 
              style={{ 
                background: 'linear-gradient(90deg, rgba(0,255,170,0.2) 0%, rgba(0,255,170,0.1) 100%)', 
                border: '1px solid #00ffaa', 
                color: '#00ffaa', 
                padding: '0 24px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,255,170,0.3)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0,255,170,0.2) 0%, rgba(0,255,170,0.1) 100%)'}
            >
              <Plus size={18} /> Añadir al Inventario
            </button>
          </form>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '60px', padding: tags.length === 0 ? '16px' : '0', background: tags.length === 0 ? 'rgba(0,0,0,0.3)' : 'transparent', borderRadius: '8px', border: tags.length === 0 ? '1px dashed rgba(255,255,255,0.1)' : 'none', alignItems: 'stretch' }}>
            {tags.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', width: '100%' }}>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>Tu inventario está vacío. Añade los equipos de tu empresa.</p>
              </div>
            )}
            {tags.map((tag, idx) => {
              const isCurrentlyActive = (activeTag === tag);
              const savedAlerts = JSON.parse(localStorage.getItem('dashboardCveAlerts') || '{}');
              const hasAlerts = savedAlerts[tag] && savedAlerts[tag].length > 0;
              const isScanned = savedAlerts[tag] !== undefined;

              let resText = "Ver Resultados";
              let resIcon = <Eye size={14} />;
              let resColor = '#fff';

              if (isCurrentlyActive) {
                resText = results.length > 0 ? "Viendo Resultados" : "Equipo Seguro";
                resIcon = results.length > 0 ? <Eye size={14} /> : <CheckCircle size={14} />;
                resColor = '#00b8ff';
              } else if (hasAlerts) {
                resText = "Ver Amenazas";
                resIcon = <AlertTriangle size={14} color="#ffb800" />;
                resColor = '#ffb800';
              } else if (isScanned) {
                resText = "Ver (Seguro)";
                resIcon = <CheckCircle size={14} color="#00ffaa" />;
                resColor = '#00ffaa';
              }
              const tagScanDate = scanDates[tag];
              const dateString = tagScanDate ? new Date(tagScanDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : null;

              return (
              <div key={idx} className={activeTag === tag ? 'pulse' : ''} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: `1px solid ${activeTag === tag ? '#00b8ff' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <div style={{ background: activeTag === tag ? 'rgba(0,184,255,0.1)' : 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '8px' }}>
                    {loading && activeTag === tag ? <Activity size={20} color="#00b8ff" className="blinking" /> : <Server size={20} color={activeTag === tag ? "#00b8ff" : "#9b59b6"} />}
                  </div>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: activeTag === tag ? '#00b8ff' : '#fff' }} title={tag}>
                    {tag}
                  </span>
                  
                  <span style={{ marginLeft: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px' }}>
                    {tagScanDate ? `Último escaneo: ${dateString}` : 'Sin escanear'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => handleSearch(tag)} 
                    disabled={loading && activeTag === tag}
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    title="Realizar Escaneo"
                  >
                    {loading && activeTag === tag ? <Activity size={16} className="blinking" /> : <Search size={16} />} 
                    {loading && activeTag === tag ? 'Escaneando...' : 'Escanear'}
                  </button>

                  {(isScanned || isCurrentlyActive) && (
                    <button 
                      onClick={() => handleViewResults(tag)} 
                      disabled={loading && activeTag === tag}
                      style={{ background: isCurrentlyActive ? 'rgba(0,184,255,0.15)' : 'rgba(255,255,255,0.05)', color: resColor, border: `1px solid ${isCurrentlyActive ? '#00b8ff' : 'rgba(255,255,255,0.2)'}`, padding: '8px 16px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseOver={(e) => { if(!(loading && activeTag === tag)) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                      onMouseOut={(e) => { if(!(loading && activeTag === tag)) e.currentTarget.style.background = isCurrentlyActive ? 'rgba(0,184,255,0.15)' : 'rgba(255,255,255,0.05)'; }}
                    >
                      {resIcon} {resText}
                    </button>
                  )}
                  
                  <button 
                    onClick={() => removeTag(tag)} 
                    style={{ background: 'transparent', border: '1px solid rgba(255,51,102,0.3)', color: '#ff3366', cursor: 'pointer', padding: '8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', marginLeft: '4px' }}
                    title="Eliminar del inventario"
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,51,102,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,51,102,0.1)', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #ff3366', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ShieldAlert size={32} color="#ff3366" />
          <p style={{ margin: 0, color: '#fff' }}>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#00b8ff' }}>
          <Radar size={48} className="blinking" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h3 className="blinking" style={{ margin: 0 }}>ESCANEANDO NIST PARA: {activeTag?.toUpperCase()}...</h3>
        </div>
      )}

      {!loading && activeTag && results.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', borderTop: '4px solid #f1c40f' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 24px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Zap size={24} color="#f1c40f" /> 
              Hallazgos de {activeTag} ({displayedResults.length} mostrados)
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setSortBy('score')}
                style={{ 
                  background: sortBy === 'score' ? 'rgba(241, 196, 15, 0.2)' : 'transparent',
                  border: `1px solid ${sortBy === 'score' ? '#f1c40f' : 'rgba(255,255,255,0.2)'}`,
                  color: sortBy === 'score' ? '#f1c40f' : 'var(--text-secondary)',
                  padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                Histórico (Riesgo Crítico)
              </button>
              <button 
                onClick={() => setSortBy('date')}
                style={{ 
                  background: sortBy === 'date' ? 'rgba(0, 184, 255, 0.2)' : 'transparent',
                  border: `1px solid ${sortBy === 'date' ? '#00b8ff' : 'rgba(255,255,255,0.2)'}`,
                  color: sortBy === 'date' ? '#00b8ff' : 'var(--text-secondary)',
                  padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}
              >
                Nuevos del Año Actual
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayedResults.length === 0 && sortBy === 'date' && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                No se han publicado vulnerabilidades para {activeTag} en el año actual ({currentYear}).
              </div>
            )}
            
            {displayedResults.map((cve, idx) => (
              <div key={idx} style={{ 
                background: '#0a0a0f', 
                border: `1px solid ${getSeverityColor(cve.score)}`, 
                borderRadius: '8px', 
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '4px', 
                  height: '100%', 
                  background: getSeverityColor(cve.score) 
                }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', paddingLeft: '8px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', color: getSeverityColor(cve.score), fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>{cve.id}</h4>
                    <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', color: '#fff', fontSize: '0.8rem', marginRight: '10px' }}>
                      Equipo: {cve.matchedTarget}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Publicado: {new Date(cve.published).toLocaleDateString()}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: getSeverityColor(cve.score), lineHeight: '1' }}>{cve.score}</div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '1px' }}>CVSS v3 SCORE</span>
                  </div>
                </div>
                
                <p style={{ margin: '0 0 0 8px', color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.5' }}>
                  {cve.description}
                </p>
                
                <div style={{ marginTop: '16px', paddingLeft: '8px' }}>
                  <a href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#00b8ff', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Ver Parche de Seguridad en NIST →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTag && results.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(0, 255, 170, 0.05)', borderRadius: '8px', border: '1px dashed #00ffaa' }}>
          <Shield size={48} color="#00ffaa" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#00ffaa' }}>EQUIPO TOTALMENTE SEGURO</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>El NIST no tiene registrada ninguna vulnerabilidad para {activeTag}.</p>
        </div>
      )}
    </div>
  );
}
