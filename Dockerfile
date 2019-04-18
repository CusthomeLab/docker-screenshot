FROM alekzonder/puppeteer:1.8.0-0

WORKDIR /app

USER pptruser

COPY package.json yarn.lock ./

RUN yarn install --production --frozen-lockfile && \
    yarn cache clean

COPY . /app

EXPOSE 8080

ENV HTTP_SERVER_PORT="8080"
ENV SCREENSHOT_API_ENDPOINT="http://0.0.0.0:3000"
ENV DEBUG="true"

HEALTHCHECK CMD curl --fail http://localhost:8080/health || exit 1
