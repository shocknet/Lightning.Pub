# Use the official Node.js 14 image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install project dependencies
RUN npm install --production

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port your application is listening on (if applicable)
EXPOSE 8090

# Start the application
CMD [ "npm", "start" ]