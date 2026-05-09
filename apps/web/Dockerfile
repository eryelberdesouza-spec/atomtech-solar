FROM node:20-alpine AS builder

WORKDIR /app

# Copia todo o monorepo para resolver dependencias locais
COPY ../../package.json ./
COPY ../../packages ./packages
COPY package.json ./apps/web/
COPY . ./apps/web/

WORKDIR /app/apps/web
RUN npm install
ENV VITE_API_URL=https://atomtech-solar-production.up.railway.app/trpc
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]