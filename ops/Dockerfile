FROM alpine:3.22

RUN apk add --no-cache postgresql17-client rclone tar tzdata bash coreutils

COPY backup.sh restore.sh schedule.sh /ops/
RUN chmod +x /ops/*.sh

CMD ["/ops/schedule.sh"]
