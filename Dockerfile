FROM node:20-alpine

# Install su-exec (Alpine's lightweight alternative to gosu)
RUN apk add --no-cache su-exec shadow
# node user defaults to 1000:1000 in alpine. Move it to 888:888 so as to not conflict with typical user ranges on ubuntu.
RUN groupmod -g 888 node
RUN usermod -u 888 node

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
