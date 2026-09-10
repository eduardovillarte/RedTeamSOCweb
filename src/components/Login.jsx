import React, { useState } from 'react';
import { ShieldAlert, Lock, User, LogIn } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError(data.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor central');
    }
    setLoading(false);
  };

  return (
    <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '32px', textAlign: 'center' }}>
        <ShieldAlert size={64} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
        <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Control de Acceso</h2>
        <p className="text-secondary" style={{ marginBottom: '24px' }}>Bóveda Central de Inteligencia</p>
        
        {error && (
          <div style={{ backgroundColor: 'rgba(255, 51, 102, 0.1)', color: 'var(--accent-danger)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(255, 51, 102, 0.2)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ position: 'relative' }}>
            <User size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Usuario" 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', background: 'var(--accent-primary)', color: 'black', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
            <LogIn size={20} />
          </button>
        </form>

        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(255,184,0,0.1)', border: '1px dashed rgba(255,184,0,0.3)', borderRadius: '8px', textAlign: 'left', fontSize: '0.9rem' }}>
          <p style={{ margin: '0 0 8px 0', color: 'var(--accent-warning)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} /> Credenciales Iniciales
          </p>
          <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li>Usuario: <strong>admin</strong></li>
            <li>Contraseña: <strong>admin123</strong></li>
          </ul>
          <p style={{ margin: 0, color: '#ff3366', fontSize: '0.85rem' }}>
            <strong>Importante:</strong> Entra con estas credenciales, dirígete a Administración Central, crea tu propio usuario Administrador personal, y luego borra este usuario inicial por seguridad.
          </p>
        </div>
      </div>
    </div>
  );
}
