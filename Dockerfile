ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Pass the NODE_VERSION argument between stages
ARG NODE_VERSION
ENV NODE_VERSION=${NODE_VERSION}

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the application
RUN yarn build

# Generate Swagger documentation
RUN yarn generate:swagger

# Production stage
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine

WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/openapi.json ./openapi.json

# Copy necessary files for database migrations
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Expose API port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run database migrations and start the application
CMD yarn db:migrate && yarn start:prod