FROM alekzonder/puppeteer:latest

WORKDIR /app

USER pptruser

COPY package*.json ./

RUN yarn install --frozen-lockfile

COPY . /app

EXPOSE 8080
