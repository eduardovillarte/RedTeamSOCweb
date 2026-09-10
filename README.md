# Red Team SOCweb (Kali Web Panel)

Una interfaz web moderna y segura para administrar herramientas de Kali Linux desde un navegador. 

Este proyecto utiliza un frontend en React (Vite) y un backend en Node.js que se conecta vía SSH a una máquina Kali Linux para ejecutar escaneos y herramientas de seguridad (Nmap, SQLMap, OpenVAS, BurpSuite, etc.) mostrando los resultados en vivo.

## Requisitos Previos

- **Docker y Docker Compose** (Recomendado para producción)
- **Node.js** (v18 o superior) si deseas correrlo en modo desarrollo.
- **Máquina con Kali Linux** con el servicio SSH activo y accesible desde la red.
- Las siguientes herramientas deben estar instaladas en Kali Linux: `nmap`, `sqlmap`, `svmap` (sipvicious), `nikto`, `whatweb`, `whois`, `subfinder`, `enum4linux`, `nxc` (netexec), `theHarvester`.

---

## 🚀 Instalación y Uso con Docker (Recomendado)

La forma más fácil de desplegar este proyecto en producción (tanto en Windows como en Linux) es mediante Docker.

1. Clona o descarga este repositorio.
2. Abre una terminal en la carpeta del proyecto.
3. Levanta el contenedor con un solo comando:
   ```bash
   docker-compose up -d --build
   ```
4. Accede al panel web abriendo tu navegador en:
   👉 **http://localhost:3001** (o usando la IP local del equipo servidor, ej. `http://192.168.1.X:3001`)

**Para apagar el servicio:**
```bash
docker-compose down
```
*(Tus datos, contraseñas y base de datos se guardan de forma segura y persistente en la carpeta `data/` del proyecto).*

---

## 💻 Instalación y Uso (Modo Desarrollo / Manual)

Si prefieres ejecutar el código manualmente sin Docker:

1. Instala las dependencias ejecutando:
   ```bash
   npm install
   ```
2. Inicia los servidores de frontend y backend:
   ```bash
   npm start
   ```
   *(Esto ejecutará `start_panel.js`, el cual abrirá los servidores y tratará de lanzar la web automáticamente).*
3. El frontend de desarrollo estará disponible en **http://localhost:5173** y el backend en el puerto `3001`.

---

## ⚙️ Configuración Inicial

1. Al acceder por primera vez, utiliza las credenciales por defecto que se imprimirán en la consola de tu servidor (usuario: `admin`).
2. Dirígete a la pestaña **Administración Central**.
3. Ingresa los datos de conexión SSH de tu servidor Kali Linux (IP, Usuario y Contraseña). Estas credenciales se encriptarán y guardarán localmente de forma segura.

## 🛡️ Notas de Seguridad

- La configuración SSH y la base de datos se almacenan encriptadas de forma local en la carpeta `data/`.
- Nunca expongas este panel web directamente a Internet sin antes añadir autenticación robusta y una conexión cifrada (ej. HTTPS, proxy inverso o VPN).
