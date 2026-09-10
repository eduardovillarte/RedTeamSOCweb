export function generateSpanishReport(toolId, target, rawOutput) {
  let severity = 'low'; 
  
  // Sanitización de XSS para evitar inyección de código en el panel
  const escapeHTML = (str) => String(str).replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
  const safeTarget = escapeHTML(target);

  // Limpiamos los códigos ANSI de color que inyectan herramientas de Linux como enum4linux
  // para que no ensucien el motor de parseo ni se vean mal en la UI
  const cleanRawOutput = rawOutput.replace(/\x1B\[[0-9;]*[mK]/g, '');
  const lines = cleanRawOutput.split('\n');
  const lowerOutput = cleanRawOutput.toLowerCase();
  
  // Plantilla base del reporte (Estilo Pentesting)
  let reportHTML = `
    <div style="font-family: var(--font-main); padding: 10px;">
      <div style="border-left: 4px solid var(--accent-primary); padding-left: 16px; margin-bottom: 30px;">
        <h3 style="color: var(--text-primary); margin-bottom: 8px; font-size: 1.5rem;">Documento Oficial de Auditoría Técnica</h3>
        <p style="color: var(--text-secondary); margin: 0;">Objetivo Analizado: <strong style="color: #fff;">${safeTarget}</strong> | Vector de Análisis: <strong style="color: #fff;">${toolId.toUpperCase()}</strong></p>
      </div>
  `;

  // --- LÓGICA DE NMAP ---
  if (toolId === 'nmap') {
    const ports = lines.filter(l => l.includes('/tcp') && l.includes('open'));
    
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Resumen Ejecutivo</h4>`;
    if (ports.length > 0) {
      reportHTML += `<p>Durante el escaneo de superficie, se descubrió que el objetivo mantiene <strong>${ports.length} servicio(s) expuestos</strong> directamente a la red. La exposición de puertos incrementa la superficie de ataque disponible para posibles actores maliciosos.</p>`;
      
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">2. Hallazgos Técnicos (Puertos y Servicios)</h4>`;
      reportHTML += `<ul style="list-style-type: none; padding-left: 0;">`;
      ports.forEach(p => {
        const parts = p.trim().split(/\s+/);
        const portNum = parts[0];
        const service = parts[2];
        const extra = parts.slice(3).join(' ');
        
        let riesgo = 'Bajo';
        let rec = 'Mantener actualizado el servicio.';
        
        if(portNum.includes('22')) { riesgo = 'Medio'; rec = 'Evitar exposición pública de SSH. Utilizar VPN o Fail2Ban.'; severity = 'medium'; }
        else if(portNum.includes('3389') || portNum.includes('445')) { riesgo = 'Crítico'; rec = 'Cerrar SMB o RDP público inmediatamente para evitar Ransomware.'; severity = 'high'; }
        else if(portNum.includes('80')) { riesgo = 'Informativo'; rec = 'Asegurar redirección a HTTPS (Puerto 443).'; }
        else if(portNum.includes('3306') || portNum.includes('5432')) { riesgo = 'Alto'; rec = 'Bases de datos no deben ser públicas. Bloquear mediante Firewall.'; severity = 'high'; }

        reportHTML += `<li style="margin-bottom: 16px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          <span style="color: var(--accent-primary); font-family: var(--font-mono);">[${portNum}]</span> 
          <strong style="color: #fff;">Servicio: ${service.toUpperCase()}</strong> <em>(${extra})</em><br/>
          <span style="color: ${riesgo === 'Crítico' || riesgo === 'Alto' ? 'var(--accent-danger)' : 'var(--text-secondary)'}">
            Nivel de Riesgo del Puerto: ${riesgo}
          </span><br/>
          <span style="color: var(--accent-secondary); font-size: 0.9em;">Recomendación: ${rec}</span>
        </li>`;
      });
      reportHTML += `</ul>`;
    } else {
      reportHTML += `<p>El escaneo ha sido exitoso pero <strong>no se han hallado puertos abiertos</strong>. El servidor parece estar detrás de un Firewall estricto que bloquea peticiones externas.</p>`;
      severity = 'low';
    }
  } 
  
  // --- LÓGICA DE OSINT (WHOIS) ---
  else if (toolId === 'whois') {
    const registrar = lines.find(l => l.toLowerCase().includes('registrar:'));
    const creation = lines.find(l => l.toLowerCase().includes('creation date:'));
    const expiry = lines.find(l => l.toLowerCase().includes('expiry date:'));
    const nameservers = lines.filter(l => l.toLowerCase().includes('name server:'));
    
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Inteligencia de Fuentes Abiertas (OSINT)</h4>`;
    reportHTML += `<p>Se ha realizado un perfilamiento de inteligencia registral sobre el dominio <strong>${target}</strong>.</p>`;
    
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">2. Huella Digital Extraída</h4>`;
    reportHTML += `<div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;">`;
    if (registrar) reportHTML += `<p style="margin: 5px 0;"><strong>Entidad Registradora:</strong> <span style="color: var(--accent-primary);">${registrar.split(':')[1].trim()}</span></p>`;
    if (creation) reportHTML += `<p style="margin: 5px 0;"><strong>Antigüedad del Dominio:</strong> <span style="color: var(--text-secondary);">${creation.replace(/.*:/, '').trim()}</span></p>`;
    if (expiry) reportHTML += `<p style="margin: 5px 0;"><strong>Vencimiento del Dominio:</strong> <span style="color: var(--accent-warning);">${expiry.replace(/.*:/, '').trim()}</span></p>`;
    
    if (nameservers.length > 0) {
      reportHTML += `<p style="margin: 5px 0; margin-top: 15px;"><strong>Infraestructura DNS (Name Servers):</strong></p><ul style="margin-top: 5px; color: var(--accent-secondary);">`;
      nameservers.slice(0, 4).forEach(n => {
        reportHTML += `<li>${n.split(':')[1].trim()}</li>`;
      });
      reportHTML += `</ul>`;
    }
    reportHTML += `</div>`;
    severity = 'low';
  }

  // --- LÓGICA DE SUBFINDER (SUBDOMINIOS) ---
  else if (toolId === 'subfinder') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Enumeración de Superficie de Ataque</h4>`;
    reportHTML += `<p>Se mapeó pasivamente la infraestructura oculta de <strong>${target}</strong> utilizando el motor de recolección de subdominios.</p>`;
    
    const subdomains = lines.filter(l => l.includes(target) && l.length > target.length);
    
    if (subdomains.length > 0) {
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Servidores Ocultos Descubiertos</h4>`;
      reportHTML += `<ul style="background: rgba(255,255,255,0.05); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px; padding-left: 32px; color: var(--accent-primary);">`;
      subdomains.slice(0, 20).forEach(sub => {
        reportHTML += `<li style="margin-bottom: 4px;">${sub.trim()}</li>`;
      });
      if(subdomains.length > 20) { reportHTML += `<li style="color: #fff;">...y ${subdomains.length - 20} subdominios más en el log crudo.</li>`; }
      reportHTML += `</ul>`;
      reportHTML += `<p style="color: var(--text-secondary); margin-top: 15px;"><strong>Nota táctica:</strong> Cada uno de estos subdominios puede alojar paneles de administración, APIs sin documentar o versiones de software de desarrollo propensas a ser vulnerables.</p>`;
      severity = 'medium';
    } else {
      reportHTML += `<p>No se descubrió infraestructura adicional o subdominios expuestos vinculados a este activo principal.</p>`;
      severity = 'low';
    }
  }

  // --- LÓGICA DE SIPVICIOUS ---
  else if (toolId === 'sipvicious') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Resumen Ejecutivo (Telecomunicaciones)</h4>`;
    if (lowerOutput.includes('found nothing')) {
      reportHTML += `<p>El análisis ofensivo VoIP finalizó con éxito en la red <strong>${target}</strong>. Tras sondear el espectro mediante el escáner SIPVicious, <strong>NO se detectaron centralitas PBX ni terminales IP desprotegidas</strong> en el puerto estándar (5060).</p>`;
      reportHTML += `<p><strong>Evaluación de Riesgo:</strong> La red es invulnerable a ataques automatizados de Toll Fraud (Fraude de peaje telefónico) desde el vector escaneado.</p>`;
      severity = 'low';
    } else {
      reportHTML += `<p style="color: var(--accent-danger); font-weight: bold;">¡ALERTA CRÍTICA DE SEGURIDAD!</p>`;
      reportHTML += `<p>El sistema ha detectado infraestructura de telefonía IP (SIP) viva respondiendo en la red. Esto significa que existen centralitas telefónicas exponiendo su ubicación.</p>`;
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px;">2. Riesgos e Implicaciones</h4>`;
      reportHTML += `<p style="color: var(--text-secondary);">Las centralitas expuestas son el objetivo #1 para ataques de <em>Fuerza Bruta de Extensiones</em>. Un atacante podría secuestrar las líneas telefónicas de la empresa para realizar llamadas internacionales ilimitadas (Toll Fraud).</p>`;
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px;">3. Plan de Mitigación Recomendado</h4>`;
      reportHTML += `<ul style="color: var(--text-secondary);"><li>Aislar los teléfonos IP en una VLAN de voz dedicada (VLAN segmentada).</li><li>Restringir el tráfico del puerto UDP 5060 únicamente a los proveedores SIP Troncales autorizados.</li><li>Aplicar contraseñas criptográficas fuertes (alfanuméricas largas) a todas las extensiones SIP.</li></ul>`;
      severity = 'high';
    }
  }
  
  // --- LÓGICA DE VULNERABILIDADES (OPENVAS/VULN) ---
  else if (toolId === 'openvas') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Análisis Dinámico de Vulnerabilidades</h4>`;
    
    // Buscar bloques de CVE o reportes VULNERABLE
    const vulns = lines.filter(l => l.includes('VULNERABLE') || l.includes('CVE-') || l.includes('State: VULNERABLE') || l.includes('vuln:'));
    
    if (vulns.length > 0 || lowerOutput.includes('vulnerable')) {
      reportHTML += `<p>Se ha detectado software obsoleto o mal configurado que expone al sistema a fallos de seguridad catalogados a nivel mundial (CVEs).</p>`;
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Detalles de Brechas Detectadas</h4>`;
      reportHTML += `<ul style="background: rgba(255,51,102,0.1); border: 1px solid var(--accent-danger); border-radius: 8px; padding: 16px; padding-left: 32px; color: #fff;">`;
      vulns.slice(0, 10).forEach(v => {
        reportHTML += `<li style="margin-bottom: 8px;">${v.replace(/\|_/, '').trim()}</li>`;
      });
      reportHTML += `</ul>`;
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px;">3. Recomendaciones Críticas</h4>`;
      reportHTML += `<p style="color: var(--text-secondary);">Es mandatorio aplicar parches de seguridad (updates) a los servicios listados en la parte superior. Si se listan CVEs (Common Vulnerabilities and Exposures), busque la documentación oficial del parche inmediatamente, el servidor podría ser comprometido de forma remota.</p>`;
      severity = 'high';
    } else {
      reportHTML += `<p>El motor de vulnerabilidades interrogó exhaustivamente los puertos abiertos en <strong>${target}</strong> en búsqueda de fallos como XSS (Cross-Site Scripting), CSRF, SQL Injection, y CVEs públicos obsoletos.</p>`;
      reportHTML += `<div style="background: rgba(0,255,170,0.1); padding: 16px; border-left: 4px solid var(--accent-primary); border-radius: 4px; margin-top: 20px;">
        <h4 style="color: var(--accent-primary); margin: 0 0 8px 0;">Certificación de Saneamiento Inicial</h4>
        <p style="margin: 0; color: #fff;"><strong>No se descubrieron vulnerabilidades explotables automatizadas</strong> en los servicios inspeccionados. Las defensas perimetrales y las versiones del software parecen estar correctamente actualizadas y parcheadas.</p>
      </div>`;
      severity = 'low';
    }
  }
  
  // --- LÓGICA DE AUDITORÍA WEB (BURP/NIKTO/WHATWEB) ---
  else if (toolId === 'burp') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Resumen de Auditoría Web</h4>`;
    reportHTML += `<p>Se ha ejecutado un perfilamiento de tecnologías web y escaneo de vulnerabilidades mediante WhatWeb y Nikto.</p>`;
    
    // Parse WhatWeb (Usually first non-empty line)
    const whatwebLine = lines.find(l => l.includes('200 OK') || l.includes('301 Moved') || l.includes('HTTPServer'));
    
    let ip = '', title = '', server = '', email = '', headers = '';
    if (whatwebLine) {
      const extractField = (field) => {
        const regex = new RegExp(`${field}\\[(.*?)\\]`);
        const match = whatwebLine.match(regex);
        return match ? match[1] : null;
      };
      ip = extractField('IP');
      title = extractField('Title');
      server = extractField('HTTPServer');
      email = extractField('Email');
      headers = extractField('UncommonHeaders');
    }

    reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Huella Tecnológica (Fingerprinting)</h4>`;
    reportHTML += `<div style="background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; font-size: 0.95rem;">`;
    if (title) reportHTML += `<p style="margin: 5px 0;"><strong>Título del Sitio:</strong> <span style="color: #fff;">${title}</span></p>`;
    if (ip) reportHTML += `<p style="margin: 5px 0;"><strong>IP Principal Detectada:</strong> <span style="color: var(--accent-secondary);">${ip}</span></p>`;
    if (server) reportHTML += `<p style="margin: 5px 0;"><strong>Servidor Web:</strong> <span style="color: var(--accent-primary);">${server}</span></p>`;
    if (email) reportHTML += `<p style="margin: 5px 0;"><strong>Email Expuesto:</strong> <span style="color: var(--accent-warning);">${email}</span> <em style="font-size:0.85em;">(Precaución: Riesgo de Phishing / Spam)</em></p>`;
    if (headers) reportHTML += `<p style="margin: 5px 0;"><strong>Cabeceras de Seguridad:</strong> <span style="color: var(--text-secondary);">${headers}</span></p>`;
    
    const isWaf = lowerOutput.includes('cloudflare') || lowerOutput.includes('waf') || lowerOutput.includes('firewall');
    if (isWaf) {
      reportHTML += `<p style="margin: 15px 0 0 0; color: var(--accent-danger);"><strong>[!] Escudo Activo Detectado:</strong> La plataforma está protegida por un Firewall WAF (ej. Cloudflare), lo cual está mitigando el escaneo profundo.</p>`;
    }
    reportHTML += `</div>`;

    // Parse Nikto
    const niktoStart = lines.findIndex(l => l.includes('Nikto v'));
    if (niktoStart !== -1) {
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">3. Certificados SSL e Infraestructura</h4>`;
      
      const sslIssuer = lines.find(l => l.includes('Issuer:'));
      const sslCipher = lines.find(l => l.includes('Ciphers:'));
      
      reportHTML += `<ul style="color: var(--text-secondary); margin-bottom: 20px;">`;
      if (sslIssuer) reportHTML += `<li><strong>Autoridad Emisora SSL:</strong> <span style="color: #fff;">${sslIssuer.replace('Issuer:', '').trim()}</span></li>`;
      if (sslCipher) reportHTML += `<li><strong>Cifrado SSL/TLS:</strong> <span style="color: #fff;">${sslCipher.replace('Ciphers:', '').trim()}</span></li>`;
      reportHTML += `</ul>`;

      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">4. Hallazgos del Escáner (Crawling)</h4>`;
      
      const findings = lines.filter(l => l.startsWith('+ ') && !l.includes('Target') && !l.includes('Start Time') && !l.includes('End Time') && !l.includes('Scan terminated') && !l.includes('host(s) tested') && !l.includes('SSL Info:') && !l.includes('Server:') && !l.includes('Multiple IPs') && !l.includes('Platform:'));
      
      if (findings.length > 0) {
        reportHTML += `<ul style="background: rgba(255,184,0,0.1); border: 1px solid var(--accent-warning); border-radius: 8px; padding: 16px; padding-left: 32px; color: #fff;">`;
        findings.forEach(f => {
           const cleanF = f.replace('+', '').trim();
           // Si el hallazgo es un error limit de nikto o un bloqueo
           if(cleanF.includes('ERROR: *** Error limit') || cleanF.includes('ssl connect failed')) {
              reportHTML += `<li style="margin-bottom: 12px; color: var(--accent-danger);"><strong>BLOQUEO DEFENSIVO:</strong> El servidor remoto (Firewall) detectó el escaneo como ataque y cortó la conexión (TLS Fingerprint Block).</li>`;
           } else {
              reportHTML += `<li style="margin-bottom: 12px;">${cleanF}</li>`;
           }
        });
        reportHTML += `</ul>`;
        severity = isWaf ? 'medium' : 'high';
      } else {
         reportHTML += `<p style="color: var(--text-secondary);">No se detectaron directorios ocultos ni vulnerabilidades web evidentes durante la fase de escaneo.</p>`;
      }
    }
  }

  // --- LÓGICA DE SQLMAP (INYECCIÓN SQL) ---
  else if (toolId === 'sqlmap') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Auditoría de Base de Datos (Inyección SQL)</h4>`;
    
    if (lowerOutput.includes('is vulnerable') || lowerOutput.includes('payload:')) {
      reportHTML += `<p style="color: var(--accent-danger); font-weight: bold;">¡ALERTA CRÍTICA: EXFILTRACIÓN POSIBLE!</p>`;
      reportHTML += `<p>El escáner SQLmap ha logrado forzar con éxito una vulnerabilidad de inyección SQL en los parámetros proporcionados de <strong>${target}</strong>.</p>`;
      
      const payloads = lines.filter(l => l.includes('Payload:'));
      if (payloads.length > 0) {
        reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Payloads Efectivos</h4>`;
        reportHTML += `<ul style="background: rgba(255,51,102,0.1); border: 1px solid var(--accent-danger); border-radius: 8px; padding: 16px; padding-left: 32px; color: #fff;">`;
        payloads.slice(0, 5).forEach(p => {
          reportHTML += `<li style="margin-bottom: 8px; font-family: var(--font-mono); font-size: 0.9em;">${p.replace('Payload:', '').trim()}</li>`;
        });
        reportHTML += `</ul>`;
      }
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px;">3. Recomendación Urgente</h4>`;
      reportHTML += `<p style="color: var(--text-secondary); margin-top: 15px;">Sanitice inmediatamente las consultas a la base de datos (utilice Prepared Statements / Consultas Parametrizadas o un ORM seguro). Un atacante tiene actualmente el poder de robar, modificar o borrar tablas enteras (como usuarios y contraseñas).</p>`;
      severity = 'high';
    } else {
      reportHTML += `<p>El análisis heurístico y de inyección profunda finalizó sin detectar fallos graves. Los parámetros interrogados en <strong>${target}</strong> parecen estar correctamente sanitizados o mitigados por un WAF y no son susceptibles a técnicas automáticas de SQLi.</p>`;
      severity = 'low';
    }
  }

  // --- LÓGICA DE ENUM4LINUX (ACTIVE DIRECTORY / SMB) ---
  else if (toolId === 'enum4linux') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Enumeración de Dominio y Sistemas Windows</h4>`;
    
    const users = lines.filter(l => l.includes('user:[') || l.includes('Local User'));
    
    if (lowerOutput.includes('connection refused') || lowerOutput.includes('access denied') || lowerOutput.includes('session setup failed') || lowerOutput.includes("doesn't allow session") || lowerOutput.includes('aborting remainder')) {
      reportHTML += `<p>El análisis perimetral a <strong>${target}</strong> se ha completado.</p>`;
      reportHTML += `<div style="background: rgba(0,255,170,0.1); padding: 16px; border-left: 4px solid var(--accent-primary); border-radius: 4px; margin-top: 20px;">`;
      reportHTML += `<h4 style="color: var(--accent-primary); margin: 0 0 8px 0;">Defensa Activa Comprobada</h4>`;
      reportHTML += `<p style="margin: 0; color: #fff;">El servidor bloqueó exitosamente el intento de acceso nulo (Null Session). Las políticas de red y el protocolo SMB se encuentran correctamente protegidos y no exponen información confidencial.</p>`;
      reportHTML += `</div>`;
      severity = 'low';
    } else {
      reportHTML += `<p>Se extrajo exitosamente información del protocolo SMB y políticas de red de <strong>${target}</strong> mediante Null Sessions.</p>`;
      if (users.length > 0) {
        reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Fuga de Usuarios y Grupos</h4>`;
        reportHTML += `<p>Se logró exfiltrar listas de cuentas de usuario válidas sin necesidad de autenticación previa:</p>`;
        reportHTML += `<ul style="background: rgba(255,184,0,0.1); border: 1px solid var(--accent-warning); border-radius: 8px; padding: 16px; padding-left: 32px; color: #fff;">`;
        users.slice(0, 10).forEach(u => {
          reportHTML += `<li style="margin-bottom: 4px;">${u.trim()}</li>`;
        });
        reportHTML += `</ul>`;
      } else {
        reportHTML += `<p style="color: var(--accent-warning); margin-top: 15px;">Se accedió al servicio mediante sesión nula, pero no se hallaron usuarios específicos en la memoria caché.</p>`;
      }
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px;">3. Recomendación Urgente</h4>`;
      reportHTML += `<p style="margin-top: 10px; color: var(--text-secondary);">Deshabilite las sesiones SMB anónimas (Null Sessions) en el servidor Windows y asegúrese de que el puerto 445 no sea accesible desde redes públicas.</p>`;
      severity = 'medium';
    }
  }

  // --- LÓGICA DE NETEXEC (ACTIVE DIRECTORY AVANZADO) ---
  else if (toolId === 'netexec') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Escaneo Moderno SMB / Directorio Activo</h4>`;
    
    // NetExec devuelve sus éxitos con "[+]" y fallos con "[-]"
    const successes = lines.filter(l => l.includes('[+]'));
    const info = lines.filter(l => l.includes('[*]'));
    
    if (successes.length > 0) {
      reportHTML += `<p>El análisis avanzado confirmó vulnerabilidades en las políticas de compartición SMB del objetivo <strong>${target}</strong> mediante NetExec.</p>`;
      
      if (info.length > 0) {
        reportHTML += `<p style="margin-bottom: 5px;"><strong>Huella de Sistema Operativo:</strong></p>`;
        reportHTML += `<div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; color: var(--text-secondary); margin-bottom: 15px;">${info[0].split('[*]')[1] || info[0]}</div>`;
      }

      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Hallazgos Confirmados</h4>`;
      reportHTML += `<ul style="background: rgba(0,255,170,0.1); border: 1px solid var(--accent-primary); border-radius: 8px; padding: 16px; padding-left: 32px; color: #fff;">`;
      successes.forEach(s => {
        reportHTML += `<li style="margin-bottom: 4px;">${s.split('[+]')[1] || s}</li>`;
      });
      reportHTML += `</ul>`;
      
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px;">3. Evaluación de Riesgo</h4>`;
      reportHTML += `<p style="color: var(--accent-warning); margin-top: 10px;">NetExec logró exfiltrar información sin necesidad de credenciales válidas. Revise inmediatamente los permisos de "Everyone" en los recursos compartidos y las políticas de Null Session.</p>`;
      severity = 'high';
    } else {
      reportHTML += `<p>El análisis perimetral avanzado a <strong>${target}</strong> se ha completado.</p>`;
      reportHTML += `<div style="background: rgba(0,255,170,0.1); padding: 16px; border-left: 4px solid var(--accent-primary); border-radius: 4px; margin-top: 20px;">`;
      reportHTML += `<h4 style="color: var(--accent-primary); margin: 0 0 8px 0;">Defensa Activa Comprobada</h4>`;
      reportHTML += `<p style="margin: 0; color: #fff;">NetExec fue bloqueado por el servidor. Las políticas SMB y WMI están correctamente endurecidas, impidiendo el movimiento lateral y la enumeración anónima de usuarios.</p>`;
      reportHTML += `</div>`;
      severity = 'low';
    }
  }

  // --- LÓGICA DE THEHARVESTER (OSINT) ---
  else if (toolId === 'theharvester') {
    reportHTML += `<h4 style="color: var(--accent-secondary); margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">1. Inteligencia OSINT Profunda</h4>`;
    reportHTML += `<p>Análisis de presencia expuesta en internet y motores de búsqueda sobre el dominio <strong>${target}</strong>.</p>`;
    
    const emailsStart = lines.findIndex(l => l.includes('[*] Emails found:'));
    
    let emails = [];
    if (emailsStart !== -1) {
      for(let i = emailsStart + 1; i < lines.length; i++) {
        if (lines[i].trim() === '' || lines[i].includes('[*]')) break;
        emails.push(lines[i].trim());
      }
    }
    
    if (emails.length > 0) {
      reportHTML += `<h4 style="color: var(--accent-secondary); margin-top: 24px; margin-bottom: 12px;">2. Correos Corporativos Expuestos</h4>`;
      reportHTML += `<p style="color: var(--accent-warning);">Los siguientes buzones fueron recolectados masivamente desde fuentes públicas, lo que los convierte en objetivos primarios para campañas de Spear-Phishing:</p>`;
      reportHTML += `<ul style="background: rgba(255,184,0,0.1); border: 1px solid var(--accent-warning); border-radius: 8px; padding: 16px; padding-left: 32px; color: #fff;">`;
      emails.slice(0, 15).forEach(e => {
        reportHTML += `<li style="margin-bottom: 4px;">${e}</li>`;
      });
      if(emails.length > 15) { reportHTML += `<li>...y ${emails.length - 15} correos más.</li>`; }
      reportHTML += `</ul>`;
      severity = 'medium';
    } else {
      reportHTML += `<p style="color: var(--text-secondary);">No se detectaron correos electrónicos corporativos de forma masiva en esta pasada con las fuentes habilitadas.</p>`;
      severity = 'low';
    }
  }

  reportHTML += `</div>`;
  
  return { html: reportHTML, severity };
}
