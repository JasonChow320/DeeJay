# syntax=docker/dockerfile:1

FROM rust:1.67

WORKDIR /deejay/server
COPY . .

RUN cargo install --path .

CMD ["cargo", "run"]

EXPOSE 1337
