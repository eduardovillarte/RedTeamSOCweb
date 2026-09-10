import { useState, useEffect, useRef } from 'react';

import { Activity, Search, PhoneCall, Shield, Bug, Database, Monitor, Radio } from 'lucide-react';

export const TOOLS = [
  {
    id: 'nmap',
    name: 'Nmap Scanner',
    icon: <Activity size={24} />,
    desc: 'Escaneo de red profundo para descubrimiento de puertos y servicios.',
    command: 'multi-engine',
    color: '#00ffaa',
    helpInfo: 'Realiza un mapeo completo de la red enviando paquetes controlados.\nObjetivo Requerido: Dirección IP o rango de red.',
    allowedTypes: ['IP', 'Red'],
    placeholder: 'Ingresa Dirección IP o Subred (ej. 192.168.1.85)',
    subTools: [
      { id: 'nmap_full', name: 'Escaneo Completo', command: 'nmap -sV -p- -T4 <target>', desc: 'Descubre todos los puertos abiertos (1-65535) y detecta servicios/versiones.' },
      { id: 'nmap_fast', name: 'Escaneo Rápido (Top 100)', command: 'nmap -F -T4 <target>', desc: 'Revisa solo los 100 puertos más comunes para resultados rápidos.' },
      { id: 'nmap_stealth', name: 'Escaneo Sigiloso (Stealth)', command: 'nmap -sS -T2 <target>', desc: 'Escaneo TCP SYN lento para evadir detección de firewalls e IDS.' },
      { id: 'nmap_udp', name: 'Escaneo UDP (Top 100)', command: 'nmap -sU --top-ports 100 <target>', desc: 'Busca servicios ocultos en puertos UDP (DNS, SNMP, etc).' }
    ]
  },
  {
    id: 'osint',
    name: 'Centro OSINT',
    icon: <Search size={24} />,
    desc: 'Suite avanzada de inteligencia: correos, subdominios y registros públicos.',
    command: 'multi-engine',
    color: '#f1c40f',
    helpInfo: 'Selecciona el motor de escaneo:\n- Whois: Extrae dueños legales del dominio. (Comando: whois <objetivo> | head -n 30)\n- theHarvester: Busca correos corporativos. (Comando: theHarvester -d <objetivo> -b all -l 50)\n- Subfinder: Descubre subdominios rápido. (Comando: subfinder -d <objetivo> -silent -timeout 10 | head -n 30)\nObjetivo Requerido: Nombre de Dominio.',
    allowedTypes: ['Dominio'],
    placeholder: 'Ingresa Nombre de Dominio (ej. google.com)',
    subTools: [
      { id: 'whois', name: 'Mapeo Registral (Whois)', command: 'whois <target> | head -n 30', desc: 'Extrae información del propietario y servidores DNS del dominio.' },
      { id: 'theharvester', name: 'Correos / Empleados (theHarvester)', command: 'theHarvester -d <target> -b all -l 50', desc: 'Busca direcciones de email y nombres en fuentes públicas.' },
      { id: 'subfinder', name: 'Subdominios Rápido (Subfinder)', command: 'subfinder -d <target> -silent -timeout 10 | head -n 30', desc: 'Encuentra subdominios indexados en internet de manera pasiva.' }
    ]
  },
  {
    id: 'sipvicious',
    name: 'SIPVicious',
    icon: <PhoneCall size={24} />,
    desc: 'Auditoría VoIP. Localiza PBX ocultas en la red.',
    command: 'multi-engine',
    color: '#ffffff',
    helpInfo: 'Suite diseñada para atacar redes de telefonía IP. Buscará centralitas telefónicas (PBX).\nObjetivo Requerido: Rango de red o IP.',
    allowedTypes: ['IP', 'Red'],
    placeholder: 'Ingresa IP o Rango de Telefonía (ej. 10.0.0.0/24)',
    subTools: [
      { id: 'sipvicious_scan', name: 'Escaneo SIP (svmap)', command: 'svmap <target>', desc: 'Escanea la red buscando dispositivos VoIP y centralitas SIP.' },
      { id: 'sipvicious_brute', name: 'Fuerza Bruta Extensiones', command: 'svwar -e100-200 <target>', desc: 'Intenta adivinar extensiones válidas probando del 100 al 200.' }
    ]
  },
  {
    id: 'openvas',
    name: 'Nmap Vuln (CVEs)',
    icon: <Shield size={24} />,
    desc: 'Barrido automatizado para detectar vulnerabilidades críticas públicas.',
    command: 'multi-engine',
    color: '#9b59b6',
    helpInfo: 'Motor destructivo (seguro) que cruza los puertos abiertos con una base de datos mundial de vulnerabilidades conocidas (CVEs).\nObjetivo Requerido: Dirección IP del servidor.',
    allowedTypes: ['IP'],
    placeholder: 'Ingresa Dirección IP del Servidor (ej. 192.168.1.85)',
    subTools: [
      { id: 'openvas_vuln', name: 'Auditoría CVE (Vuln)', command: 'nmap -sV --script vuln <target>', desc: 'Cruza las versiones detectadas con vulnerabilidades conocidas y realiza ataques seguros.' },
      { id: 'openvas_auth', name: 'Auditoría Credenciales Default', command: 'nmap -sV --script auth,default <target>', desc: 'Verifica si hay accesos anónimos, cuentas por defecto o servicios sin contraseña.' }
    ]
  },
  {
    id: 'burp',
    name: 'Auditoría Web',
    icon: <Bug size={24} />,
    desc: 'Inspecciona servidores web y busca directorios ocultos o fallos (Nikto/WhatWeb).',
    command: 'multi-engine',
    color: '#00b8ff',
    helpInfo: 'Audita aplicaciones web mediante peticiones HTTP(S).\nObjetivo Requerido: URL completa.',
    allowedTypes: ['URL'],
    placeholder: 'Ingresa URL completa (ej. https://sitioweb.com)',
    subTools: [
      { id: 'burp_full', name: 'Auditoría Completa (WhatWeb+Nikto)', command: 'whatweb <target> && nikto -h <target> -maxtime 45s', desc: 'Identifica la tecnología web e intenta encontrar configuraciones inseguras y vulnerabilidades conocidas.' },
      { id: 'burp_recon', name: 'Reconocimiento (WhatWeb Agresivo)', command: 'whatweb -a 3 --color=NEVER <target>', desc: 'Fuerza el análisis para identificar el CMS, plugins, headers HTTP y versiones de software.' }
    ]
  },
  {
    id: 'sqlmap',
    name: 'SQLmap (Inyección DB)',
    icon: <Database size={24} />,
    desc: 'Herramienta para detectar y explotar vulnerabilidades de inyección SQL (SQLi).',
    command: 'multi-engine',
    color: '#ff3366',
    helpInfo: 'Fuerza parámetros de una página web para extraer el contenido de la base de datos.\nObjetivo Requerido: URL con parámetros GET.',
    allowedTypes: ['URL'],
    placeholder: 'Ingresa URL vulnerable (ej. http://sitio.com/?id=1)',
    subTools: [
      { id: 'sqlmap_fast', name: 'Escaneo Rápido', command: 'sqlmap -u <target> --batch --level=1 --risk=1', desc: 'Realiza pruebas de inyección SQL seguras en parámetros básicos sin riesgo de corromper la BD.' },
      { id: 'sqlmap_agressive', name: 'Ataque Agresivo (Deep)', command: 'sqlmap -u <target> --batch --level=3 --risk=3', desc: 'Ataque exhaustivo. Incluye inyecciones complejas, cabeceras HTTP y vectores de riesgo alto.' },
      { id: 'sqlmap_tables', name: 'Extraer Tablas', command: 'sqlmap -u <target> --batch --tables', desc: 'Si el objetivo es vulnerable, intentará extraer la lista de tablas de la base de datos.' }
    ]
  },
  {
    id: 'activedirectory',
    name: 'Active Directory',
    icon: <Monitor size={24} />,
    desc: 'Auditoría de entornos Windows, SMB y políticas de dominio.',
    command: 'multi-engine',
    color: '#ff7f50',
    helpInfo: 'Herramientas enfocadas en comprometer infraestructura Windows.\nObjetivo Requerido: Dirección IP de una máquina Windows.',
    allowedTypes: ['IP'],
    placeholder: 'Ingresa IP de Servidor Windows (ej. 192.168.1.100)',
    subTools: [
      { id: 'enum4linux', name: 'Reconocimiento Básico (Enum4Linux)', command: 'enum4linux -a <target>', desc: 'Extrae información vía Null Sessions como políticas de contraseñas, SIDs y recursos compartidos.' },
      { id: 'netexec_shares', name: 'Explorar Recursos SMB (NetExec)', command: 'nxc smb <target> -u "guest" -p "" --shares', desc: 'Intenta acceder a carpetas compartidas usando la cuenta Guest.' },
      { id: 'netexec_users', name: 'Listar Usuarios SMB (NetExec)', command: 'nxc smb <target> -u "guest" -p "" --users', desc: 'Enumera la lista de usuarios del dominio desde el servicio SMB.' }
    ]
  }
];

export const INITIAL_LOGS = TOOLS.reduce((acc, tool) => {
  acc[tool.id] = [{ text: `[Sistema] Consola dedicada para ${tool.name} inicializada. Esperando objetivo...`, type: 'info' }];
  return acc;
}, {});
