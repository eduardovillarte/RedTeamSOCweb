import { spawn } from 'child_process';
import os from 'os';

console.log("\x1b[36m%s\x1b[0m", "========================================");
console.log("\x1b[32m%s\x1b[0m", " Iniciando Red Team SOCweb (Modo Seguro)");
console.log("\x1b[36m%s\x1b[0m", "========================================");
console.log("Iniciando servidores backend y frontend...\n");

const backend = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });
const frontend = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

setTimeout(() => {
    console.log("\n\x1b[32m%s\x1b[0m", "Servidores iniciados. Abriendo la interfaz web...");
    
    // Abre Edge o el navegador predeterminado en modo aplicación (ventana sin pestañas)
    if (os.platform() === 'win32') {
        // Intentar con Edge que siempre está instalado en Windows 11
        const browser = spawn('cmd', ['/c', 'start', 'msedge', '--app=http://localhost:5173'], { detached: true });
        browser.on('error', () => {
            // Si falla, abrir normalmente
            spawn('cmd', ['/c', 'start', 'http://localhost:5173']);
        });
    }
}, 2500);

// Cerrar procesos hijos al cerrar este script
process.on('SIGINT', () => {
    console.log("\nApagando servidores...");
    backend.kill();
    frontend.kill();
    process.exit();
});
