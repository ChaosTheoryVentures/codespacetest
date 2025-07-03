FROM node:18

WORKDIR /app

# Create non-root user
RUN groupadd -r nodejs && useradd -r -g nodejs nodeuser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads public/uploads && \
    chown -R nodeuser:nodejs /app

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]
