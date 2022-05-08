FROM busybox:latest

RUN echo "for i in \`seq 1 10000\`; do echo \"hello world v2\" & sleep 1; done" > /loop.sh

ENTRYPOINT ["sh", "/loop.sh"]