FROM node:22

WORKDIR /app/kakeibo

COPY package*.json ./

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]