FROM node:18-alpine

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create a non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S auto-engineer -u 1001

# Change ownership of the app directory
RUN chown -R auto-engineer:nodejs /app
USER auto-engineer

# Set the entrypoint
ENTRYPOINT ["node", "dist/index.js"]

# Default command
CMD ["--help"] 