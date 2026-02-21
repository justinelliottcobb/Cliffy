# Cliffy Signaling Server Docker Image
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy source and build
COPY . .
RUN npm run build

# Expose the default port
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Run the server
CMD ["npm", "start"]
