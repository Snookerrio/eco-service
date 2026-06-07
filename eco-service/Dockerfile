FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS test
RUN npm ci
COPY . .
CMD ["npm", "run", "test:ci"]
