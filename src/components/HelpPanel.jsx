import { useState } from 'react';
import { BookOpen, Terminal, Settings, Shield, Target, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { TOOLS } from '../constants/tools';

export default function HelpPanel() {
  const [installing, setInstalling] = useState(false);
  const [installMsg, setInstallMsg] = useState('');

  const handleInstallTools = async () => {
    setInstalling(true);
    setInstallMsg('Iniciando instalación en Kali... Esto puede tardar varios minutos.');
    try {
      const res = await fetch('/api/install-tools', { 
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setInstallMsg('¡Herramientas instaladas correctamente!');
      } else {
        setInstallMsg(`Error: ${data.error}`);
      }
    } catch (err) {
      setInstallMsg('Error de red. Asegúrate de estar conectado y de tener credenciales de administrador.');
    }
    setInstalling(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', color: 'var(--text-primary)' }}>
      <div className="glass-panel" style={{ padding: '32px' }}>
        <h2 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <BookOpen size={28} color="var(--accent-primary)" /> Guía Rápida de Uso
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', fontSize: '1.05rem', marginBottom: '24px' }}>
          Bienvenido a Red Team SOCweb. Esta herramienta actúa como un puente (frontend) hacia una máquina Kali Linux real. 
          En lugar de escribir comandos en una terminal oscura, puedes ejecutar las mejores herramientas ofensivas desde aquí.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #00b8ff', borderRadius: '0 8px 8px 0', gridColumn: '1 / -1' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00b8ff', marginTop: 0 }}>
              <Download size={20} /> 0. Preparar Kali Linux
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Para que Red Team SOCweb funcione correctamente, tu servidor Kali Linux debe tener el servicio SSH activo y las herramientas necesarias instaladas.
              <br/><br/>
              <strong>Preparación manual:</strong>
              <br/>
              1. En Kali, abre una terminal y arranca el servicio SSH: <code>sudo systemctl enable ssh --now</code>
              <br/>
              2. Asegúrate de conocer la IP de tu Kali (usa el comando <code>ip a</code>).
              <br/>
              3. Opcional (se puede automatizar con el botón de abajo): instala las herramientas: <code>sudo apt install nmap sipvicious whatweb nikto whois subfinder sqlmap enum4linux theharvester</code> y <code>pipx install netexec</code>.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
              <button 
                onClick={handleInstallTools}
                disabled={installing}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--accent-secondary)', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: installing ? 'not-allowed' : 'pointer' }}
              >
                <Terminal size={18} /> {installing ? 'Instalando en Kali...' : 'Automatizar Instalación de Herramientas'}
              </button>
              {installMsg && (
                <span style={{ fontSize: '0.9rem', color: installMsg.includes('Error') ? 'var(--accent-danger)' : 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {installMsg.includes('Error') ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                  {installMsg}
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>* Requiere ser Administrador y haber configurado la conexión SSH primero.</p>
          </div>

          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--accent-primary)', borderRadius: '0 8px 8px 0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', marginTop: 0 }}>
              <Settings size={20} /> 1. Configurar Conexión
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Ve a la pestaña <strong>Administración Central</strong> e ingresa la IP, el usuario y la contraseña de tu máquina virtual Kali Linux. 
              Red Team SOCweb se conectará automáticamente mediante SSH.
            </p>
          </div>

          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #ff3366', borderRadius: '0 8px 8px 0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff3366', marginTop: 0 }}>
              <Target size={20} /> 2. Registrar Objetivos
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              En <strong>Libreta de Objetivos</strong> puedes guardar IPs, dominios o rangos de red que vas a analizar con frecuencia.
              Esto evita que tengas que escribirlos cada vez.
            </p>
          </div>

          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #ffb800', borderRadius: '0 8px 8px 0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffb800', marginTop: 0 }}>
              <Terminal size={20} /> 3. Lanzar Escaneos
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Desde el <strong>Centro de Control</strong>, elige el módulo que necesites (ej. Nmap, SQLMap). 
              Ingresa el objetivo y presiona 'Iniciar'. La terminal te mostrará el proceso en vivo, tal cual como en Kali.
            </p>
          </div>

          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #9b59b6', borderRadius: '0 8px 8px 0' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9b59b6', marginTop: 0 }}>
              <Shield size={20} /> 4. Informes
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Una vez que la herramienta termine, se generará un informe técnico resumido en <strong>Informes Técnicos</strong>. 
              Puedes leerlo o descargarlo en PDF.
            </p>
          </div>

        </div>

        <h3 style={{ marginTop: '40px', marginBottom: '24px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          Diccionario de Herramientas Automatizadas
        </h3>
        <div style={{ display: 'grid', gap: '16px' }}>
          {TOOLS.map(tool => (
            <div key={tool.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 8px 0', color: tool.color || 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {tool.icon} {tool.name}
              </h4>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{tool.desc}</p>
              
              {tool.subTools ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  {tool.subTools.map(sub => (
                    <div key={sub.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', borderLeft: `2px solid ${tool.color}` }}>
                      <p style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>{sub.name}</p>
                      <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{sub.desc}</p>
                      <code style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'block' }}>
                        {sub.command}
                      </code>
                    </div>
                  ))}
                </div>
              ) : (
                <code style={{ background: 'rgba(0,0,0,0.5)', padding: '6px 10px', borderRadius: '4px', color: 'var(--accent-primary)', fontSize: '0.85rem', display: 'block' }}>
                  {tool.command}
                </code>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
