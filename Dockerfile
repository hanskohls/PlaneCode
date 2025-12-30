FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (leveraging Docker layer cache)
COPY package*.json ./
RUN npm install

# Copy the rest of the source and build the Vite app
COPY . .
RUN npm run build

# Final image: static file server
FROM pierrezemb/gostatic

# Copy only the built static assets into the server directory
COPY --from=build /app/dist/ /srv/http/
CMD ["-port","8080","-https-promote", "-enable-logging"]
