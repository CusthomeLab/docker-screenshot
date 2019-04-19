# FROM debian:jessie as swiftshader-builder
# USER root
# # TODO: `libgles2-mesa` or `libgles2-mesa-dev`
# RUN apt-get -qq update && \
#     apt-get -y install libgles2-mesa-dev && \
#     apt-get clean autoclean && \
#     apt-get autoremove --yes && \
#     rm -rf /var/lib/{apt,dpkg,cache,log} && \
#     find /usr/lib -name libGLESv2.so

FROM alekzonder/puppeteer:1.8.0-0 as puppeteer-runner
WORKDIR /app
USER pptruser

FROM puppeteer-runner as puppeteer-server
WORKDIR /app
COPY . ./
RUN yarn install --production --frozen-lockfile && \
    yarn cache clean
EXPOSE 8080
ENV HTTP_SERVER_PORT="8080"
ENV SCREENSHOT_API_ENDPOINT="http://0.0.0.0:3000"
ENV DEBUG="true"
HEALTHCHECK CMD curl --fail http://localhost:8080/health || exit 1

# CMD ["node", "--inspect-brk" , "index.js"]
