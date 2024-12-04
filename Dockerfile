# Gunakan image Node.js yang sesuai
FROM node:20.18.0

# Set working directory
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin seluruh kode sumber
COPY . .

# Expose port untuk Hapi.js
EXPOSE 8080

# Jalankan aplikasi
CMD ["npm", "start"]
