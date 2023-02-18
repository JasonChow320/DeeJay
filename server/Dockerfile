# syntax=docker/dockerfile:1

FROM rust:1.67

WORKDIR /deejay/server/src
COPY . .

RUN cargo install --path .

CMD ["cargo", "run"]
