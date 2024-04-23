# Use an official Node runtime as the base image
FROM node:16

# Set the working directory in the container to /app
WORKDIR /app

# (i.e., copy everything from the current directory into /app in the container)
COPY . .

# Install any needed packages specified in package.json
RUN npm install

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Run the app when the container launches
CMD ["npm", "start"]