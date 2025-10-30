FROM node:20-alpine

# Install su-exec (Alpine's lightweight alternative to gosu)
RUN apk add --no-cache su-exec shadow
# node user defaults to 1000:1000 in alpine. Move it to 888:888 so as to not conflict with typical user ranges on ubuntu.
RUN groupmod -g 888 node
RUN usermod -u 888 node

WORKDIR /app
COPY package*.json ./
# OpenHands-compatible permission handling
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
RUN adduser -D -u 1001 mcpuser
RUN chown -R mcpuser:mcpuser /app
RUN su-exec mcpuser npm install
RUN ls -al /app
COPY --chown=mcpuser:mcpuser . .

ENV SANDBOX_USER_ID=1001

RUN echo "before entrypoint"
ENTRYPOINT ["/entrypoint.sh"]
RUN echo "before npm run dev"
CMD ["npm", "run", "dev"]
