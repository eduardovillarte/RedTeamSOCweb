import { useState, useEffect, useRef } from 'react';
import { Target, Plus, Trash2, Globe, Monitor, Search, Server } from 'lucide-react';

export default function TargetsManager({ savedTargets, setSavedTargets }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState('IP'); // IP, URL, Dominio, Red

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !value) return;
    
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, value, type })
      });
      const data = await res.json();
      
      if (data.success) {
        setSavedTargets(prev => [...prev, data.target]);
        setName('');
        setValue('');
        setIsFormOpen(false); // Cierra el formulario tras guardar
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Error de conexión al servidor al intentar guardar el objetivo.');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/targets/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSavedTargets(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('Error eliminando objetivo', err);
    }
  };

  const getTypeConfig = (tType) => {
    switch(tType) {
      case 'URL': return { icon: <Globe size={20} />, color: 'var(--accent-primary)', title: 'Aplicaciones Web (URL)' };
      case 'IP': return { icon: <Monitor size={20} />, color: 'var(--accent-secondary)', title: 'Servidores e IPs (IPv4)' };
      case 'Dominio': return { icon: <Search size={20} />, color: 'var(--accent-warning)', title: 'Nombres de Dominio' };
      case 'Red': return { icon: <Target size={20} />, color: 'var(--accent-danger)', title: 'Subredes y Rangos' };
      default: return { icon: <Target size={20} />, color: '#fff', title: 'Otros' };
    }
  };

  const groups = ['IP', 'URL', 'Dominio', 'Red'].map(tType => ({
    type: tType,
    items: savedTargets.filter(t => t.type === tType),
    config: getTypeConfig(tType)
  })).filter(g => g.items.length > 0);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header Superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Server size={28} color="var(--accent-secondary)" /> Gestión de Activos
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Directorio centralizado de servidores, dominios y redes objetivo para uso rápido.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: isFormOpen ? 'rgba(255,51,102,0.2)' : 'var(--accent-primary)', border: isFormOpen ? '1px solid var(--accent-danger)' : 'none', color: isFormOpen ? 'var(--accent-danger)' : '#000', fontWeight: 'bold' }} onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus size={18} style={{ transform: isFormOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} /> {isFormOpen ? 'Cancelar' : 'Añadir Nuevo Activo'}
        </button>
      </div>

      {/* Formulario Expandible */}
      {isFormOpen && (
        <div className="glass-panel animate-fade-in" style={{ padding: '32px', borderLeft: '4px solid var(--accent-primary)' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '24px', fontSize: '1.2rem' }}>Registrar Nuevo Objetivo en Base de Datos</h3>
          <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '20px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Nombre Identificativo</label>
              <input type="text" className="input-field" placeholder="Ej. Windows Edu" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Dirección (IP/URL/Dominio)</label>
              <input type="text" className="input-field" placeholder="Ej. 192.168.1.85" value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '8px' }}>Categoría de Red</label>
              <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="IP">Dirección IP (Servidor)</option>
                <option value="URL">Aplicación Web (URL)</option>
                <option value="Dominio">Nombre de Dominio</option>
                <option value="Red">Rango de Red (Subred)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '14px 24px', background: 'rgba(0,255,170,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
              Guardar Objetivo
            </button>
          </form>
        </div>
      )}

      {/* Lista Agrupada por Categoría */}
      {savedTargets.length === 0 ? (
        <div className="glass-panel animate-fade-in" style={{ padding: '80px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Target size={64} style={{ opacity: 0.2, marginBottom: '24px', margin: '0 auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '8px', fontSize: '1.4rem' }}>Tu Directorio está Vacío</h3>
          <p style={{ fontSize: '1.1rem' }}>Haz clic en "Añadir Nuevo Activo" arriba a la derecha para empezar a registrar servidores.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {groups.map(group => (
            <div key={group.type} className="animate-fade-in">
              <h3 style={{ color: group.config.color, marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.2rem' }}>
                {group.config.icon} {group.config.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.items.map(target => (
                  <div key={target.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', transition: 'all 0.2s ease', borderLeft: `3px solid ${group.config.color}` }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--glass-bg)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ color: group.config.color, opacity: 0.9 }}>
                        {group.config.icon}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '1.1rem', letterSpacing: '0.5px' }}>{target.name}</h4>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{target.value}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <span className="badge" style={{ background: 'transparent', border: `1px solid ${group.config.color}40`, color: 'var(--text-secondary)' }}>
                        {target.type}
                      </span>
                      <button className="btn" style={{ padding: '8px', color: '#ff3366', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => handleDelete(target.id)} title="Eliminar Objetivo" onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
