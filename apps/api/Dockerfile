FROM node:20-alpine

# Chromium — usado pelo endpoint /pdf/render (puppeteer-core) para gerar os
# PDFs das propostas em vetor. Sem estes pacotes o Chrome headless não sobe.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# puppeteer-core não baixa Chromium; usamos o do sistema.
# (pdfRenderer.ts ainda testa caminhos alternativos caso este mude de nome.)
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
