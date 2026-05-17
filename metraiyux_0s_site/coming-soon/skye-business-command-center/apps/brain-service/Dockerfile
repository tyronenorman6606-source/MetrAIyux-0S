FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
COPY data ./data
EXPOSE 8099
CMD ["npm","start"]
