FROM node:20-slim

RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY main.sh script.js ./

RUN chmod +x main.sh script.js

ENTRYPOINT ["/home/app/main.sh"]