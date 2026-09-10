import { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Shield } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Usuario creado exitosamente');
        setUsername('');
        setPassword('');
        fetchUsers();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error conectando al servidor');
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Error eliminando usuario');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '32px', marginTop: '32px' }}>
      <h3 style={{ color: 'var(--accent-secondary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.3rem' }}>
        <Users size={24} /> Gestión de Operadores SOC
      </h3>
      
      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 16px 0', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} /> Nuevo Operador
            </h4>
            
            {error && <div style={{ color: 'var(--accent-danger)' }}>{error}</div>}
            {success && <div style={{ color: 'var(--accent-primary)' }}>{success}</div>}

            <input 
              type="text" 
              className="input-field" 
              placeholder="Nombre de Usuario" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              className="input-field" 
              placeholder="Contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
            <select 
              className="input-field" 
              value={role} 
              onChange={e => setRole(e.target.value)}
              style={{ background: '#111', color: 'white' }}
            >
              <option value="user">Operador (Solo Herramientas)</option>
              <option value="admin">Administrador (Acceso Total)</option>
            </select>
            
            <button type="submit" className="btn btn-primary" style={{ background: 'var(--accent-secondary)', color: 'black', fontWeight: 'bold' }}>
              Crear Operador
            </button>
          </form>
        </div>

        <div style={{ flex: '2', minWidth: '400px' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 16px 0', color: 'white' }}>Lista de Operadores Activos</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>Usuario</th>
                  <th style={{ padding: '12px' }}>Rol</th>
                  <th style={{ padding: '12px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>#{u.id}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{u.username}</td>
                    <td style={{ padding: '12px' }}>
                      {u.role === 'admin' ? (
                        <span style={{ color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={14}/> Admin</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Operador</span>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => handleDelete(u.id)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }} title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
