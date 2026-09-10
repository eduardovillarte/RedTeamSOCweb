import { useState, useEffect, useRef } from 'react';

import { FileText, Clock, Download } from 'lucide-react';
import { TOOLS } from '../constants/tools';
import html2pdf from 'html2pdf.js';

export default function ReportsPanel({ reports, selectedReport, setSelectedReport }) {
  const handleDownloadPDF = () => {
    // Generar una plantilla HTML inyectando las variables CSS del sistema para que los colores funcionen
    const printHtml = `
      <div style="
        --accent-primary: #00ffaa;
        --accent-secondary: #00b8ff;
        --accent-warning: #ffb800;
        --accent-danger: #ff3366;
        --text-primary: #ffffff;
        --text-secondary: #a0a0b0;
        --font-main: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        --font-mono: 'Courier New', Courier, monospace;
        font-family: var(--font-main); 
        background-color: #0a0a0f; 
        color: var(--text-primary); 
        padding: 30px; 
        font-size: 14px; 
        line-height: 1.6;
      ">
        <div style="border-bottom: 2px solid var(--accent-primary); padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #ffffff; font-size: 28px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Dictamen Pericial de Seguridad</h1>
          <h2 style="color: var(--accent-secondary); font-size: 18px; margin: 0; font-weight: 400;">Módulo Táctico: ${selectedReport.toolName}</h2>
        </div>
        
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse; color: #fff;">
          <tr>
            <td style="padding: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); width: 30%;"><strong>Objetivo Auditado:</strong></td>
            <td style="padding: 12px; border: 1px solid rgba(255,255,255,0.1); color: var(--accent-primary); font-weight: bold;">${selectedReport.target}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);"><strong>Fecha de Ejecución:</strong></td>
            <td style="padding: 12px; border: 1px solid rgba(255,255,255,0.1); color: var(--text-secondary);">${selectedReport.date}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);"><strong>Nivel de Riesgo:</strong></td>
            <td style="padding: 12px; border: 1px solid rgba(255,255,255,0.1); font-weight: bold; color: ${selectedReport.severity === 'high' ? 'var(--accent-danger)' : selectedReport.severity === 'medium' ? 'var(--accent-warning)' : 'var(--accent-primary)'}; background: ${selectedReport.severity === 'high' ? 'rgba(255,51,102,0.1)' : selectedReport.severity === 'medium' ? 'rgba(255,184,0,0.1)' : 'rgba(0,255,170,0.1)'};">
              ${selectedReport.severity === 'high' ? 'CRÍTICO' : selectedReport.severity === 'medium' ? 'MEDIO' : 'SEGURO'}
            </td>
          </tr>
        </table>

        <div style="margin-bottom: 40px;">
          <h3 style="color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 20px;">Detalles de la Herramienta</h3>
          <p style="color: var(--text-secondary); margin-bottom: 10px;"><strong>Descripción:</strong> ${selectedReport.toolDesc || 'Herramienta de auditoría de seguridad.'}</p>
          <p style="color: var(--text-secondary); margin-bottom: 20px;"><strong>Comando Ejecutado:</strong> <code style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); color: var(--accent-primary);">${(selectedReport.toolCommand || '').replace('<target>', selectedReport.target) || 'Comando no registrado'}</code></p>
          
          <h3 style="color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 20px;">Resumen Ejecutivo y Hallazgos</h3>
          <div>
            ${selectedReport.content}
          </div>
        </div>

        <!-- SALTO DE PÁGINA FORZADO A LA SIGUIENTE HOJA -->
        <div style="page-break-before: always; padding-top: 10px;">
          <h3 style="color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; margin-bottom: 20px;">Evidencia Técnica Log (Raw)</h3>
          <pre style="background: #000000; color: var(--accent-primary); padding: 20px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; white-space: pre-wrap; word-wrap: break-word; line-height: 1.4; border: 1px solid rgba(255,255,255,0.1); margin: 0;">${selectedReport.raw.replace(/\x1B\[[0-9;]*[mK]/g, '')}</pre>
        </div>
        
        <div style="text-align: center; color: #7f8c8d; font-size: 10px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
          Reporte generado automáticamente por Red Team SOCweb.<br/>
          Confidencial - Uso Exclusivo SOC
        </div>
      </div>
    `;

    // Convertimos el string HTML a un elemento temporal en memoria para html2pdf
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = printHtml;

    const opt = {
      margin:       [0.4, 0.4, 0.5, 0.4], // Margen inferior un poco mayor
      filename:     `Auditoria_${selectedReport.toolName.replace(/\s+/g, '_')}_${selectedReport.target.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0a0a0f' },
      pagebreak:    { mode: ['css', 'legacy'] }, // Activa el reconocimiento de saltos de página CSS
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(tempDiv).save();
  };

  if (selectedReport) {
    return (
      <div className="animate-fade-in glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <button className="btn btn-secondary" onClick={() => setSelectedReport(null)}>
            ← Cerrar Informe
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPDF} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--accent-primary)', color: '#000', fontWeight: 'bold' }}>
            <Download size={18} /> Descargar Informe en PDF
          </button>
        </div>

        {/* Zona imprimible en PDF */}
        <div id="report-printable-area" style={{ padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px', fontSize: '1.8rem' }}>Dictamen Pericial: {selectedReport.toolName}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Evaluación realizada sobre <strong style={{ color: 'var(--accent-primary)' }}>{selectedReport.target}</strong> el {selectedReport.date}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${selectedReport.severity === 'high' ? 'badge-offline' : selectedReport.severity === 'medium' ? 'badge-warning' : 'badge-active'}`} style={{ fontSize: '1.2rem', padding: '12px 24px', letterSpacing: '2px', background: selectedReport.severity === 'high' ? 'rgba(255,51,102,0.2)' : selectedReport.severity === 'medium' ? 'rgba(255,184,0,0.2)' : 'rgba(0,255,170,0.2)' }}>
                {selectedReport.severity === 'high' ? 'RIESGO CRÍTICO' : selectedReport.severity === 'medium' ? 'RIESGO MEDIO' : 'SISTEMA SEGURO'}
              </span>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-secondary)' }}>Detalles de la Herramienta</h4>
            <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}><strong>Descripción:</strong> {selectedReport.toolDesc || 'Herramienta de auditoría de seguridad.'}</p>
            <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <strong>Comando Ejecutado:</strong> 
              <code style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', marginLeft: '8px', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                {(selectedReport.toolCommand || '').replace('<target>', selectedReport.target) || 'Comando no registrado'}
              </code>
            </p>
          </div>
          
          <div className="report-content" style={{ lineHeight: '1.8', color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: selectedReport.content }} />
          
          <h4 style={{ marginTop: '40px', marginBottom: '16px', color: 'var(--accent-primary)', borderBottom: '1px solid rgba(0,255,170,0.2)', paddingBottom: '8px' }}>Evidencia Técnica (Log Criptográfico)</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>El siguiente bloque de texto representa la salida pura devuelta por la herramienta en Kali Linux. Se adjunta para efectos de auditoría manual.</p>
          <div className="terminal-window" style={{ marginTop: '0', background: '#050505', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="terminal-body" style={{ color: '#00cc88', overflow: 'visible' }}>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', margin: 0 }}>
                {selectedReport.raw}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Agrupar reportes por servicio (incluyendo submódulos anidados como OSINT y Active Directory)
  const groupedReports = TOOLS.map(tool => ({
     tool,
     items: reports.filter(r => r.toolId === tool.id || (tool.subTools && tool.subTools.some(st => st.id === r.toolId)))
  })).filter(g => g.items.length > 0);

  // Buscar reportes huérfanos (ej. escaneos de Nuclei o Amass antes de que se eliminaran del panel)
  const groupedIds = new Set();
  groupedReports.forEach(g => g.items.forEach(r => groupedIds.add(r.id)));
  
  const orphanReports = reports.filter(r => !groupedIds.has(r.id));
  if (orphanReports.length > 0) {
    groupedReports.push({
      tool: { id: 'legacy', name: 'Módulos Retirados (Archivados)', color: '#666666', icon: <FileText size={24} /> },
      items: orphanReports
    });
  }

  return (
    <div className="animate-fade-in">
      <h2 style={{ marginBottom: '24px', color: 'var(--text-primary)' }}>Archivo Histórico de Informes</h2>
      {reports.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <FileText size={64} style={{ opacity: 0.3, marginBottom: '24px', margin: '0 auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '8px' }}>Bóveda de Reportes Vacía</h3>
          <p>Aún no has completado ninguna auditoría. Ejecuta herramientas desde la Terminal para popular este archivo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {groupedReports.map(group => (
            <div key={group.tool.id}>
              <h3 style={{ color: group.tool.color, marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {group.tool.icon} Categoría: {group.tool.name}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {group.items.map(report => (
                  <div key={report.id} className="glass-panel" style={{ cursor: 'pointer', transition: 'all 0.2s ease', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setSelectedReport(report)} onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(5px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <span className={`badge ${report.severity === 'high' ? 'badge-offline' : report.severity === 'medium' ? 'badge-warning' : 'badge-active'}`} style={{ width: '100px', textAlign: 'center', padding: '6px 0' }}>
                        {report.severity === 'high' ? 'CRÍTICO' : report.severity === 'medium' ? 'MEDIO' : 'SEGURO'}
                      </span>
                      <div>
                        <p style={{ margin: '0 0 6px 0', color: 'var(--accent-secondary)', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.5px' }}>{report.target}</p>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} /> {report.date}
                        </p>
                      </div>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Abrir <span style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>→</span>
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
