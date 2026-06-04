FROM node:18-alpine as build
WORKDIR /app
COPY client/package*.json ./
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

FROM nginx:stable-alpine
COPY --from=build /app/client/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
