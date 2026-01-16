FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN cd backend && npm ci

# Copy source code
COPY backend/ ./backend/

# Build the application
RUN cd backend && npm run build

# Remove dev dependencies to reduce image size
RUN cd backend && npm prune --production

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]