# Use Node.js 18 as the base image
FROM node:18-alpine

# Create the working directory
WORKDIR /app

# Copy package.json and package-lock.json first for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Compile TypeScript (assuming tsc is installed as a dev dependency)
RUN npm run tsc

# Expose the port for your application (replace 3000 with the correct port)
EXPOSE 21000

# Set environment variables
ENV LND_ADDRESS=127.0.0.1:10009
ENV LND_CERT_PATH=/root/.lnd/tls.cert
ENV LND_MACAROON_PATH=/root/.lnd/data/chain/bitcoin/mainnet/admin.macaroon
ENV DATABASE_FILE=db.sqlite

# Start the application
CMD ["node", "build/src/index.js"]
