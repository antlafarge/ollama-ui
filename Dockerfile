FROM node:22 AS builder
WORKDIR /app/
COPY --exclude=./.next --exclude=./node_modules --exclude=./ollama ./ ./
RUN npm install
RUN npm run build


FROM nginx:alpine
WORKDIR /usr/share/nginx/html/
RUN rm -f -r /usr/share/nginx/html/*
COPY --from=builder /app/out/ ./
COPY nginx.conf /etc/nginx/conf.d/
ARG PORT=7365
EXPOSE $PORT
