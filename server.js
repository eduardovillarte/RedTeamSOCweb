import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db, { initDb } from './db.js';

const app = express();

app.use(helmet());
app.use(cookieParser());

initDb();
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString('hex');
  console.warn("WARNING: No JWT_SECRET found in environment. Generated a temporary random secret. Users will be logged out upon server restart.");
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Demasiadas peticiones desde esta IP. Por favor, espera unos minutos.' }
});
app.use(limiter);

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'],
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Auth Middleware
function authenticateToken(req, res, next) {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requieren privilegios de administrador.' });
  }
  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Límite de 5 intentos
  message: { error: 'Demasiados intentos fallidos. Tu IP ha sido bloqueada por 15 minutos por seguridad.' }
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Error de servidor' });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 8 * 3600000 });
    res.json({ success: true, user: { id: user.id, username: user.username, role: user.role }, token });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

// Admin User Management Routes
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all(`SELECT id, username, role FROM users`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error fetching users' });
    res.json({ success: true, users: rows });
  });
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username y password son requeridos' });
  
  const hash = await bcrypt.hash(password, 10);
  const userRole = role === 'admin' ? 'admin' : 'user';

  db.run(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`, [username, hash, userRole], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El usuario ya existe' });
      return res.status(500).json({ error: 'Error creando usuario' });
    }
    res.json({ success: true, id: this.lastID });
  });
});

app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: 'No puedes borrar tu propio usuario admin' });
  db.run(`DELETE FROM users WHERE id = ?`, [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Error al borrar usuario' });
    res.json({ success: true });
  });
});

// Target Management Routes
app.get('/api/targets', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM targets`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error fetching targets' });
    res.json({ success: true, targets: rows });
  });
});

app.post('/api/targets', authenticateToken, (req, res) => {
  const { name, type, value } = req.body;
  if (!name || !type || !value) return res.status(400).json({ error: 'Datos incompletos' });
  
  db.run(`INSERT INTO targets (name, type, value) VALUES (?, ?, ?)`, [name, type, value], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'El objetivo ya existe' });
      return res.status(500).json({ error: 'Error creando objetivo' });
    }
    res.json({ success: true, target: { id: this.lastID, name, type, value } });
  });
});

app.delete('/api/targets/:id', authenticateToken, (req, res) => {
  db.run(`DELETE FROM targets WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Error eliminando objetivo' });
    res.json({ success: true });
  });
});

app.delete('/api/targets', authenticateToken, requireAdmin, (req, res) => {
  db.run(`DELETE FROM targets`, [], (err) => {
    if (err) return res.status(500).json({ error: 'Error purgando objetivos' });
    res.json({ success: true });
  });
});

// Reports Management Routes
app.get('/api/reports', authenticateToken, (req, res) => {
  db.all(`SELECT * FROM reports ORDER BY date DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error fetching reports' });
    res.json({ success: true, reports: rows });
  });
});

app.post('/api/reports', authenticateToken, (req, res) => {
  const { id, toolId, toolName, toolDesc, toolCommand, target, date, content, severity, raw } = req.body;
  
  db.run(`INSERT INTO reports (id, toolId, toolName, toolDesc, toolCommand, target, date, content, severity, raw) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [id, toolId, toolName, toolDesc, toolCommand, target, date, content, severity, raw], function(err) {
    if (err) return res.status(500).json({ error: 'Error guardando reporte' });
    res.json({ success: true });
  });
});

app.delete('/api/reports/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run(`DELETE FROM reports WHERE id = ?`, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: 'Error eliminando reporte' });
    res.json({ success: true });
  });
});

app.delete('/api/reports', authenticateToken, requireAdmin, (req, res) => {
  db.run(`DELETE FROM reports`, [], (err) => {
    if (err) return res.status(500).json({ error: 'Error purgando reportes' });
    res.json({ success: true });
  });
});

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const CONFIG_FILE = path.join(dataDir, 'kali_config.json');
const MACHINE_ID_FILE = path.join(dataDir, '.machine_id');

function getEncryptionKey() {
  if (!fs.existsSync(MACHINE_ID_FILE)) {
    fs.writeFileSync(MACHINE_ID_FILE, crypto.randomBytes(32).toString('hex'));
  }
  return Buffer.from(fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim(), 'hex');
}

const ALGORITHM = 'aes-256-gcm';

function encryptData(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (e) { return text; }
}

function decryptData(text) {
  if (!text || !text.includes(':')) return text;
  try {
    const [ivHex, authTagHex, encrypted] = text.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return ''; 
  }
}

function getKaliConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return { 
        host: data.host, 
        port: data.port || 22, 
        username: data.username, 
        password: decryptData(data.password),
        privateKeyPath: data.privateKeyPath || ''
      };
    } catch(e) {}
  }
  return { host: '192.168.1.X', port: 22, username: 'kali_user', password: '', privateKeyPath: '' };
}

function saveKaliConfig(config) {
  const saveObj = {
    host: config.host,
    port: config.port || 22,
    username: config.username,
    password: encryptData(config.password),
    privateKeyPath: config.privateKeyPath || ''
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(saveObj, null, 2));
}

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (req.path.startsWith('/api/config') && !ip.includes('127.0.0.1') && !ip.includes('::1') && !ip.includes('::ffff:127.0.0.1')) {
    console.error(`[ALERTA DE SEGURIDAD] Intento de acceso administrativo bloqueado desde IP: ${ip}`);
    return res.status(403).json({ error: 'Acceso Denegado. La administración del nodo maestro está restringida a localhost.' });
  }
  next();
});

app.get('/api/config', authenticateToken, requireAdmin, (req, res) => {
  const config = getKaliConfig();
  res.json({ host: config.host, username: config.username, password: config.password ? '********' : '', privateKeyPath: config.privateKeyPath });
});

app.post('/api/config', authenticateToken, requireAdmin, (req, res) => {
  const { host, username, password, privateKeyPath } = req.body;
  const currentConfig = getKaliConfig();
  
  const newConfig = {
    ...currentConfig,
    host: host || currentConfig.host,
    username: username || currentConfig.username,
    password: password === '********' ? currentConfig.password : (password || currentConfig.password),
    privateKeyPath: privateKeyPath !== undefined ? privateKeyPath : currentConfig.privateKeyPath
  };
  
  saveKaliConfig(newConfig);
  res.json({ success: true, message: 'Credenciales encriptadas y guardadas en bóveda segura.' });
});

function getSSHOptions(config) {
  const options = {
    host: config.host,
    port: config.port,
    username: config.username,
    readyTimeout: 5000
  };
  if (config.privateKeyPath && fs.existsSync(config.privateKeyPath)) {
    options.privateKey = fs.readFileSync(config.privateKeyPath);
  } else if (config.password) {
    options.password = config.password;
  }
  return options;
}

app.get('/api/test-connection', authenticateToken, (req, res) => {
  const config = getKaliConfig();
  const conn = new Client();
  conn.on('ready', () => {
    conn.end();
    res.json({ success: true, message: 'Ping SSH Exitoso: Puente establecido con Kali Linux.' });
  }).on('error', (err) => {
    res.json({ success: false, error: err.message });
  }).connect(getSSHOptions(config));
});

function executeKaliCommand(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const config = getKaliConfig();
    let output = '';
    
    conn.on('ready', () => {
      console.log(`Ejecutando en Kali: ${command}`);
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return reject(err);
        }
        
        let isTimedOut = false;
        // Límite de tiempo: 10 minutos (600,000 ms)
        const timeoutTimer = setTimeout(() => {
          isTimedOut = true;
          output += '\n\n[!] ERROR DE SEGURIDAD: Tiempo de ejecución máximo excedido (10 minutos). Proceso abortado.';
          console.error('[!] Timeout alcanzado. Abortando proceso SSH.');
          stream.close();
          conn.end();
          resolve({ code: 124, output });
        }, 10 * 60 * 1000);
        
        stream.on('close', (code, signal) => {
          if (!isTimedOut) {
            clearTimeout(timeoutTimer);
            conn.end();
            resolve({ code, output });
          }
        }).on('data', (data) => {
          const text = data.toString();
          console.log(text);
          output += text;
        }).stderr.on('data', (data) => {
          const text = data.toString();
          console.error(text);
          output += text;
        });
      });
    }).on('error', (err) => {
      reject(err);
    }).connect(getSSHOptions(config));
  });
}

app.post('/api/install-tools', authenticateToken, requireAdmin, async (req, res) => {
  // Command to non-interactively install missing tools using apt and pipx if needed.
  const command = `
    export DEBIAN_FRONTEND=noninteractive
    sudo apt-get update -y
    sudo apt-get install -y nmap sipvicious whatweb nikto whois subfinder sqlmap enum4linux theharvester pipx python3-pip
    pipx ensurepath || true
    pipx install netexec || true
    echo "Instalación completada exitosamente."
  `;
  try {
    const result = await executeKaliCommand(command);
    res.json({ success: true, result: result.output });
  } catch (error) {
    console.error('Error SSH:', error);
    res.status(500).json({ success: false, error: 'Error ejecutando la instalación en Kali.' });
  }
});

const tasks = {};

app.post('/api/scan/start', authenticateToken, async (req, res) => {
  const { tool, target, mainToolId } = req.body;
  
  if (!tool || !target) {
    return res.status(400).json({ error: 'Herramienta y objetivo son requeridos.' });
  }

  if (target.length < 3 || target.length > 255) {
    return res.status(400).json({ error: 'El objetivo debe tener entre 3 y 255 caracteres por seguridad.' });
  }

  if (/[^a-zA-Z0-9.\-_:/=?&]/.test(target)) {
    return res.status(403).json({ error: 'ALERTA DE SEGURIDAD: Caracteres inválidos detectados. No se permiten espacios ni operadores de consola (; | & $).' });
  }

  let safeTarget = target.replace(/^-+/, '');

  let command;
  switch (tool) {
    case 'nmap': 
    case 'nmap_full': command = `nmap -sV -p- -T4 '${safeTarget}'`; break;
    case 'nmap_fast': command = `nmap -F -T4 '${safeTarget}'`; break;
    case 'nmap_stealth': command = `nmap -sS -T2 '${safeTarget}'`; break;
    case 'nmap_udp': command = `nmap -sU --top-ports 100 '${safeTarget}'`; break;
    // OSINT Variants
    case 'osint':
    case 'whois': command = `whois '${safeTarget}' | head -n 30`; break;
    case 'theharvester': command = `theHarvester -d '${safeTarget}' -b all -l 50`; break;
    case 'subfinder': command = `subfinder -d '${safeTarget}' -silent -timeout 10 | head -n 30`; break;
    // SIPVicious Variants
    case 'sipvicious':
    case 'sipvicious_scan': command = `svmap '${safeTarget}'`; break;
    case 'sipvicious_brute': command = `svwar -e100-200 '${safeTarget}'`; break;
    // OpenVAS/Vuln Variants
    case 'openvas':
    case 'openvas_vuln': command = `nmap -sV --script vuln '${safeTarget}'`; break;
    case 'openvas_auth': command = `nmap -sV --script auth,default '${safeTarget}'`; break;
    // Burp/Web Variants
    case 'burp':
    case 'burp_full': command = `whatweb '${safeTarget}' && nikto -h '${safeTarget}' -maxtime 45s`; break;
    case 'burp_recon': command = `whatweb -a 3 --color=NEVER '${safeTarget}'`; break;
    // SQLmap Variants
    case 'sqlmap':
    case 'sqlmap_fast': command = `sqlmap -u '${safeTarget}' --batch --level=1 --risk=1`; break;
    case 'sqlmap_agressive': command = `sqlmap -u '${safeTarget}' --batch --level=3 --risk=3`; break;
    case 'sqlmap_tables': command = `sqlmap -u '${safeTarget}' --batch --tables`; break;
    // Active Directory Variants
    case 'activedirectory':
    case 'enum4linux': command = `enum4linux -a '${safeTarget}'`; break;
    case 'netexec':
    case 'netexec_shares': command = `nxc smb '${safeTarget}' -u "guest" -p "" --shares`; break;
    case 'netexec_users': command = `nxc smb '${safeTarget}' -u "guest" -p "" --users`; break;
    default: return res.status(400).json({ error: 'Herramienta no reconocida.' });
  }

  const taskId = crypto.randomUUID();
  tasks[taskId] = { status: 'running', result: null, error: null, mainToolId, backendToolId: tool, target };

  // Ejecución en background
  executeKaliCommand(command).then(result => {
    tasks[taskId] = { ...tasks[taskId], status: 'completed', result: result };
  }).catch(err => {
    console.error('Error SSH:', err);
    tasks[taskId] = { ...tasks[taskId], status: 'error', error: 'Fallo al ejecutar el comando. Verifica conexión SSH.' };
  });

  res.json({ success: true, taskId });
});

app.get('/api/scan/active', authenticateToken, (req, res) => {
  res.json(tasks);
});

app.get('/api/scan/status/:taskId', authenticateToken, (req, res) => {
  const task = tasks[req.params.taskId];
  if (!task) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(task);
});

const PORT = process.env.PORT || 3001;

async function translateToSpanish(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(item => item[0]).join('');
  } catch (error) {
    return text;
  }
}

const cveCache = {};

app.get('/api/cve', authenticateToken, async (req, res) => {
  const keyword = req.query.keyword;
  if (!keyword) return res.status(400).json({ error: 'Palabra clave requerida' });

  // Retornar desde cache si existe y es menor a 24 hrs
  if (cveCache[keyword] && Date.now() - cveCache[keyword].timestamp < 86400000) {
    return res.json({ success: true, results: cveCache[keyword].data });
  }

  try {
    // Paso 1: Averiguar el total de resultados para buscar los más recientes
    const initRes = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=1`);
    if (!initRes.ok) throw new Error('Error al conectar con la NVD API del gobierno de EE.UU.');
    const initData = await initRes.json();
    
    const totalResults = initData.totalResults || 0;
    if (totalResults === 0) {
      return res.json({ success: true, results: [] });
    }
    
    // Paso 2: Calcular el índice de inicio para obtener la última página (los CVE más nuevos)
    const startIndex = Math.max(0, totalResults - 50);
    const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=50&startIndex=${startIndex}`);
    if (!response.ok) throw new Error('Error al extraer datos finales de la NVD API.');
    const data = await response.json();
    let cves = (data.vulnerabilities || []).map(v => {
      const cve = v.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0]?.cvssData || cve.metrics?.cvssMetricV30?.[0]?.cvssData || cve.metrics?.cvssMetricV2?.[0]?.cvssData || {};
      return {
        id: cve.id, published: cve.published,
        description: cve.descriptions.find(d => d.lang === 'en')?.value || 'Sin descripción',
        score: metrics.baseScore || 'N/A', severity: metrics.baseSeverity || 'UNKNOWN'
      };
    });
    cves.sort((a, b) => new Date(b.published) - new Date(a.published));
    const topRecent = cves.slice(0, 15);
    
    // Procesar en paralelo para no demorar la respuesta (limitado a 15 para evitar bloqueo)
    const translatedRecent = await Promise.all(topRecent.map(async (cve) => {
      const descEnEspanol = await translateToSpanish(cve.description);
      return { ...cve, description: descEnEspanol };
    }));
    
    // Guardar en cache los resultados traducidos
    cveCache[keyword] = { timestamp: Date.now(), data: translatedRecent };

    res.json({ success: true, results: translatedRecent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Servir archivos estáticos del frontend en producción
app.use(express.static(path.join(process.cwd(), 'dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Bóveda Central de Inteligencia (API) corriendo en http://${HOST}:${PORT}`);
});
