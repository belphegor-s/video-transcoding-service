FROM node:20-slim

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

COPY package*.json ./
RUN npm install --production

COPY main.sh script.js ./

RUN chmod +x main.sh script.js

ENTRYPOINT ["/home/app/main.sh"]
