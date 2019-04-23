FROM node:8-stretch-slim as puppeteer-runner

RUN apt-get -y update \
    && apt-get install -y --no-install-recommends \
        gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
        libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
        libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
        libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
        fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst ttf-freefont \
        ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget \
        xvfb xauth \
        procps \
    \
    && wget https://github.com/Yelp/dumb-init/releases/download/v1.2.1/dumb-init_1.2.1_amd64.deb \
    && dpkg -i dumb-init_*.deb \
    && rm -f dumb-init_*.deb \
    \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

RUN yarn global add puppeteer@1.14.0 \
    && yarn cache clean

ENV NODE_PATH="/usr/local/share/.config/yarn/global/node_modules:${NODE_PATH}"

RUN groupadd -r pptruser \
    && useradd -r -g pptruser -G audio,video pptruser

# Set language to UTF8
ENV LANG="C.UTF-8"

WORKDIR /app

# Add user so we don't need --no-sandbox.
RUN mkdir /screenshots \
	&& mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /usr/local/share/.config/yarn/global/node_modules \
    && chown -R pptruser:pptruser /screenshots \
    && chown -R pptruser:pptruser /app

# Run everything after as non-privileged user.
# FIXME:
# USER pptruser

ENTRYPOINT ["dumb-init", "--"]
# CMD ["xvfb-run", "-a", "--server-args=\"-screen 0 1600x1200x32\""","node", "index.js"]
# CMD ["node", "index.js"]

FROM puppeteer-runner as puppeteer-server
WORKDIR /app
COPY . ./
RUN yarn install --production --frozen-lockfile && \
    yarn cache clean
# RUN chmod +x /app/src/pwouet.sh
EXPOSE 8080
ENV HTTP_SERVER_PORT="8080"
ENV SCREENSHOT_API_ENDPOINT="http://0.0.0.0:3000"
ENV DEBUG="true"
HEALTHCHECK CMD curl --fail http://localhost:8080/health || exit 1

CMD ["xvfb-run", "-a", "--server-args=\"-screen 0 1600x1200x32\"", "node", "index.js"]
