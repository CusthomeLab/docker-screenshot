# Dockerfile inspired by https://github.com/GoogleChromeLabs/lighthousebot/blob/master/builder/Dockerfile
FROM node:10-stretch-slim as puppeteer-runner

RUN apt-get -y update \
    && apt-get install -y --no-install-recommends wget xvfb xauth \
    \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get -y update \
    && apt-get install -y google-chrome-unstable --no-install-recommends \
    \
    && apt-get clean \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /src/*.deb

ADD https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64 /usr/local/bin/dumb-init
RUN chmod +x /usr/local/bin/dumb-init

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH='/usr/bin/google-chrome'

RUN groupadd --system chrome \
    && useradd --system --create-home --gid chrome --groups audio,video chrome \
    && mkdir --parents /home/chrome \
    && chown --recursive chrome:chrome /home/chrome \
    \
    && mkdir /app \
    && chown -R chrome:chrome /app

# Set language to UTF8
ENV LANG="C.UTF-8"
USER chrome
WORKDIR /app

ENTRYPOINT ["dumb-init", "--", "xvfb-run", "-a", "--server-args=\"-screen 0 1600x1200x32\""]

FROM puppeteer-runner as screenshot-server
COPY --chown=chrome:chrome . ./
RUN yarn install --production --frozen-lockfile \
    && yarn cache clean
EXPOSE 8080
ENV HTTP_SERVER_PORT="8080"
ENV SCREENSHOT_API_ENDPOINT="http://0.0.0.0:3000"
ENV DEBUG="true"
HEALTHCHECK CMD curl --fail http://localhost:8080/health || exit 1

CMD ["yarn", "--silent", "start"]
