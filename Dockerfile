FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY package*.json ./

# Install dependencies
RUN cd backend && npm ci --only=production

# Copy source code
COPY backend/ ./backend/

# Build the application
RUN cd backend && npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]