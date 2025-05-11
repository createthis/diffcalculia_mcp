FROM node:20-alpine

# Install su-exec (Alpine's lightweight alternative to gosu)
RUN apk add --no-cache su-exec

WORKDIR /app
COPY package*.json ./
RUN npm install && \
    adduser -D -u 1001 mcpuser && \
    chown -R mcpuser:mcpuser /app
COPY --chown=mcpuser:mcpuser . .

# OpenHands-compatible permission handling
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV SANDBOX_USER_ID=1001

ENTRYPOINT ["/entrypoint.sh"]
CMD ["npm", "run", "dev"]
