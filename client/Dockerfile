FROM node:22-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

RUN npm i -g serve

EXPOSE 80

CMD [ "serve", "-s", "dist", "-p", "80" ]