### PocketBase — pinned, multi-arch-aware build
#
# We build from alpine + the upstream release zip rather than pulling a
# third-party image. PocketBase is a single static Go binary so this stays
# tiny (~30MB compressed).
#
# Migrations under /pb_migrations are executed automatically on boot when the
# data dir is empty -- this is how we provision the `guestbook_entries`
# collection on first run.

ARG ALPINE_VERSION=3.20
ARG PB_VERSION=0.38.1
ARG PB_SHA256_AMD64=aef37fd0dac37885aa5d2523ca246e50a6c8e2917156ad14a896531d3d50bd2c

FROM alpine:${ALPINE_VERSION} AS fetcher
ARG PB_VERSION
ARG PB_SHA256_AMD64
ARG TARGETARCH=amd64

RUN apk add --no-cache curl unzip ca-certificates

WORKDIR /tmp
# We only build for amd64 on this host -- if someone bakes an arm64 image
# later they'll need to swap the sha. Fail loudly if the arch mismatches.
RUN test "$TARGETARCH" = "amd64" || { echo "unsupported TARGETARCH=$TARGETARCH"; exit 1; }

RUN curl -fsSL -o pb.zip \
        "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
 && echo "${PB_SHA256_AMD64}  pb.zip" | sha256sum -c - \
 && unzip pb.zip pocketbase \
 && chmod +x pocketbase

FROM alpine:${ALPINE_VERSION}
RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S pb && adduser -S -G pb pb && \
    mkdir -p /pb/pb_data /pb/pb_migrations /pb/pb_public && \
    chown -R pb:pb /pb

COPY --from=fetcher --chown=root:root /tmp/pocketbase /usr/local/bin/pocketbase
COPY --chown=pb:pb pb_migrations/ /pb/pb_migrations/

USER pb
WORKDIR /pb
EXPOSE 8090

# `serve` binds 0.0.0.0:8090 by default. pb_data is a volume mount.
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--migrationsDir=/pb/pb_migrations"]
