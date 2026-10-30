FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginx:alpine AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80