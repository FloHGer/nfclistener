FROM node:20

WORKDIR /src

RUN apt-get update && apt-get install -y \
  libpcsclite-dev \
  pcscd \
  pcsc-tools \
  build-essential \
  python3 \
  udev \
  usbutils \
  libusb-1.0-0-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install

COPY . .

RUN usermod -aG plugdev $(whoami)

CMD service pcscd start && npm start
