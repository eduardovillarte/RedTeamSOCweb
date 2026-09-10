# Etapa 1: Build
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine
WORKDIR /app

# sqlite3 requiere python y build-base en alpine a veces para reinstalar o compilar dependencias nativas
RUN apk add --no-cache python3 make g++ sqlite

COPY package*.json ./
RUN npm install --omit=dev

# Copiamos archivos del backend
COPY --from=build /app/server.js ./
COPY --from=build /app/db.js ./
COPY --from=build /app/start_panel.js ./
# Copiamos el frontend compilado
COPY --from=build /app/dist ./dist

# Variables de entorno
ENV HOST=0.0.0.0
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "server.js"]
