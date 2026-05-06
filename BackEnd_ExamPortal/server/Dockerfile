# Use an official Node.js runtime as a parent image.
# Using 'slim' makes the image smaller and the build faster.
FROM node:20-slim

# Set the working directory inside the container to /usr/src/app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first. This is a best practice that
# leverages Docker's layer caching. If you don't change your dependencies,
# Docker won't need to re-run 'npm install' every time.
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of your application's source code from your local machine
# into the container's working directory.
COPY . .

# Expose port 8080. This tells Docker that the container will listen on this
# port at runtime. This is the port Cloud Run will send traffic to.
EXPOSE 8080

# Define the command to run your app when the container starts.
# 'npm start' is a standard way to run a Node.js application.
# Make sure your package.json has a "start" script, e.g., "start": "node index.js"
CMD [ "npm", "start" ]
