FROM node:20-slim

WORKDIR /app

# Copy root and package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm run install:all

# Copy all source code and data
COPY . .

# Build React client into client/dist
RUN npm run build

# Hugging Face Spaces listens on port 7860 by default
ENV PORT=7860
EXPOSE 7860

# Start server
CMD ["npm", "start"]
