FROM alekzonder/puppeteer:latest

WORKDIR /app

USER pptruser

COPY package*.json ./

RUN yarn install

COPY . /app

EXPOSE 8080
