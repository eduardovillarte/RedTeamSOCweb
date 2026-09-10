import { useState, useEffect, useRef } from 'react';
import { Server, LogOut } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import TerminalPanel from './components/TerminalPanel';
import ReportsPanel from './components/ReportsPanel';
import TargetsManager from './components/TargetsManager';
import AdminPanel from './components/AdminPanel';
import CveRadar from './components/CveRadar';
import HelpPanel from './components/HelpPanel';
import Login from './components/Login';
import { TOOLS, INITIAL_LOGS } from './constants/tools';
import { generateSpanishReport } from './utils/reportGenerator';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeToolId, setActiveToolId] = useState(null);
  const [targets, setTargets] = useState({});
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [isScanning, setIsScanning] = useState({});
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [kaliStatus, setKaliStatus] = useState('VERIFICANDO...');
  
  // Verificación silenciosa inicial al cargar el panel
  useEffect(() => {
    // Check session
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
        setIsAuthChecking(false);
      })
      .catch(() => setIsAuthChecking(false));

    fetch('/api/test-connection', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success) setKaliStatus('ONLINE');
        else setKaliStatus('OFFLINE');
      }).catch(() => setKaliStatus('OFFLINE'));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const [savedTargets, setSavedTargets] = useState([]);

  // Fetch Reports and Targets from backend
  const fetchReportsAndTargets = async () => {
    try {
      const reportsRes = await fetch('/api/reports', { credentials: 'include' });
      const reportsData = await reportsRes.json();
      if (reportsData.success) setReports(reportsData.reports);

      const targetsRes = await fetch('/api/targets', { credentials: 'include' });
      const targetsData = await targetsRes.json();
      if (targetsData.success) setSavedTargets(targetsData.targets);
    } catch (err) {
      console.error('Error fetching data', err);
    }
  };

  const pollTaskStatus = (taskId, toolId, backendToolId, target, toolConf) => {
    const pollInterval = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/scan/status/${taskId}`, { credentials: 'include' });
        const data = await pollRes.json();

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setIsScanning(prev => ({ ...prev, [toolId]: false }));
          
          const outputLines = data.result.output.split('\n');
          outputLines.forEach(line => {
            if (line.trim()) addLog(toolId, line, 'success');
          });
          addLog(toolId, `[+] Análisis técnico completado exitosamente. Generando Informe Ejecutivo Profesional...`, 'info');
          
          const reportData = generateSpanishReport(backendToolId, target, data.result.output);
          
          let finalToolName = toolConf.name;
          let finalToolDesc = toolConf.desc;
          let finalToolCommand = toolConf.command;
          if (toolConf.subTools) {
            const sub = toolConf.subTools.find(s => s.id === backendToolId);
            if (sub) {
              finalToolName = sub.name;
              finalToolCommand = sub.command;
            }
          }

          const newReport = {
            id: Date.now().toString(),
            toolId: backendToolId,
            toolName: finalToolName,
            toolDesc: finalToolDesc,
            toolCommand: finalToolCommand,
            target: target,
            date: new Date().toLocaleString(),
            content: reportData.html,
            severity: reportData.severity,
            raw: data.result.output
          };
          
          try {
            await fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(newReport)
            });
          } catch (err) {
            console.error("Error guardando reporte en DB", err);
          }

          setReports(prev => [newReport, ...prev]);
          addLog(toolId, `[✓] INFORME GENERADO CORRECTAMENTE. Abriendo reporte...`, 'success');
          
          setTimeout(() => {
            setSelectedReport(newReport);
            setActiveTab('reports');
            setLogs(prev => ({
              ...prev,
              [toolId]: [{ text: `[Sistema] Consola reiniciada. El escaneo anterior fue archivado en Informes Técnicos.`, type: 'info' }]
            }));
          }, 1200);

        } else if (data.status === 'error') {
          clearInterval(pollInterval);
          setIsScanning(prev => ({ ...prev, [toolId]: false }));
          addLog(toolId, `[Error Kali] ${data.error}`, 'error');
        }
      } catch (err) {
        // ignore network errors during polling
      }
    }, 5000);
  };

  useEffect(() => {
    if (user) {
      fetchReportsAndTargets();
      
      // Restaurar tareas en segundo plano que sigan activas en el servidor
      fetch('/api/scan/active', { credentials: 'include' })
        .then(res => res.json())
        .then(tasks => {
          Object.keys(tasks).forEach(taskId => {
            const task = tasks[taskId];
            if (task.status === 'running' && task.mainToolId) {
              const { mainToolId, backendToolId, target } = task;
              const toolConf = TOOLS.find(t => t.id === mainToolId);
              if (toolConf) {
                setIsScanning(prev => ({ ...prev, [mainToolId]: true }));
                addLog(mainToolId, `[Sistema] Restaurando sesión en segundo plano... Tarea ID: ${taskId}`, 'info');
                pollTaskStatus(taskId, mainToolId, backendToolId, target, toolConf);
              }
            }
          });
        })
        .catch(err => console.error('Error restaurando tareas:', err));
    }
  }, [user]);

  const addLog = (toolId, text, type = 'info') => {
    setLogs(prev => ({
      ...prev,
      [toolId]: [...(prev[toolId] || []), { text, type, time: new Date().toLocaleTimeString() }]
    }));
  };

  const handleTargetChange = (toolId, value) => {
    setTargets(prev => ({ ...prev, [toolId]: value }));
  };

  const handleLaunchTool = (tool) => {
    setActiveTab('terminal');
    setActiveToolId(tool.id);
  };

  const executeCommand = async (e, selectedSubTool) => {
    e.preventDefault();
    const toolId = activeToolId;
    const target = targets[toolId];
    if (!toolId || !target) return;
    
    const toolConf = TOOLS.find(t => t.id === toolId);
    const backendToolId = selectedSubTool || toolId;
    
    setIsScanning(prev => ({ ...prev, [toolId]: true }));
    addLog(toolId, `root@redteam:~# iniciando motor [${backendToolId}] contra ${target}`, 'prompt');
    addLog(toolId, `[Conectando vía puente seguro al servidor de herramientas...]`, 'info');
    
    try {
      const response = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tool: backendToolId, mainToolId: toolId, target: target }),
      });

      const startData = await response.json();
      
      if (!startData.success) {
        addLog(toolId, `[Error Kali] ${startData.error}`, 'error');
        setIsScanning(prev => ({ ...prev, [toolId]: false }));
        return;
      }

      const taskId = startData.taskId;
      addLog(toolId, `[Tarea en Segundo Plano Iniciada - ID: ${taskId}] Esperando resultados...`, 'info');

      pollTaskStatus(taskId, toolId, backendToolId, target, toolConf);

    } catch (error) {
      addLog(toolId, `[Error Crítico] Sin conexión con el puente de comando NodeJS.`, 'error');
      setIsScanning(prev => ({ ...prev, [toolId]: false }));
    }
  };

  if (isAuthChecking) return <div className="app-container" style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>Verificando sesión...</div>;
  
  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        reportsCount={reports.length} 
        setActiveToolId={setActiveToolId}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <header className="header animate-fade-in" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <h1 className="text-gradient" style={{ fontSize: '1.6rem', margin: '0 0 4px 0', letterSpacing: '0' }}>Arquitectura de Ciberdefensa</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Orquestación de infraestructura ofensiva vía SSH.
            </p>
          </div>
          
          <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', gap: '10px', alignItems: 'center', background: kaliStatus === 'ONLINE' ? 'rgba(0, 255, 170, 0.05)' : 'rgba(255, 51, 102, 0.05)', border: `1px solid ${kaliStatus === 'ONLINE' ? 'rgba(0, 255, 170, 0.2)' : 'rgba(255, 51, 102, 0.2)'}`, borderRadius: '20px' }}>
            <div className="status-dot" style={{ width: '6px', height: '6px', backgroundColor: kaliStatus === 'ONLINE' ? 'var(--accent-primary)' : kaliStatus === 'VERIFICANDO...' ? 'var(--accent-warning)' : 'var(--accent-danger)' }}></div>
            <Server size={14} color={kaliStatus === 'ONLINE' ? "var(--accent-primary)" : "var(--accent-danger)"} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Enlace SSH: <strong style={{ color: kaliStatus === 'ONLINE' ? 'var(--accent-primary)' : kaliStatus === 'VERIFICANDO...' ? 'var(--accent-warning)' : 'var(--accent-danger)' }}>{kaliStatus}</strong></span>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <Dashboard 
            reports={reports} 
            isScanning={isScanning} 
            handleLaunchTool={handleLaunchTool} 
          />
        )}

        {activeTab === 'cve' && (
          <CveRadar />
        )}

        {activeTab === 'targets' && (
          <TargetsManager 
            savedTargets={savedTargets} 
            setSavedTargets={setSavedTargets} 
          />
        )}
        
        {activeTab === 'terminal' && (
          <TerminalPanel 
            activeToolId={activeToolId} 
            setActiveToolId={setActiveToolId} 
            targets={targets} 
            handleTargetChange={handleTargetChange} 
            executeCommand={executeCommand} 
            isScanning={isScanning} 
            logs={logs} 
            savedTargets={savedTargets}
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsPanel 
            reports={reports} 
            selectedReport={selectedReport} 
            setSelectedReport={setSelectedReport} 
          />
        )}

        {activeTab === 'help' && (
          <HelpPanel />
        )}

        {activeTab === 'admin' && (
          <AdminPanel 
            reports={reports} 
            setReports={setReports}
            savedTargets={savedTargets} 
            setSavedTargets={setSavedTargets}
            setKaliStatus={setKaliStatus}
          />
        )}
      </main>
    </div>
  );
}

export default App;
