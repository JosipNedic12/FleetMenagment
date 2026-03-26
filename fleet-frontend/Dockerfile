FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build:all
# build:all runs: ng build --configuration=production,en && ng build --configuration=production,hr

FROM nginx:alpine
COPY --from=build /app/dist/fleet-frontend/browser/en /usr/share/nginx/html/en
COPY --from=build /app/dist/fleet-frontend/browser/hr /usr/share/nginx/html/hr
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
