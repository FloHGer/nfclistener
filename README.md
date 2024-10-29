docker build -t nfclistener .
docker run -d -it --name nfclistener --device=/dev/bus/usb/005/002 --privileged -v /home/floh/Documents/logs:/src/logs nfclistener:latest


docker run -d -it --name nfclistener --device=/dev/bus/usb/005/002 --privileged --restart always -v /home/cdemy/timetracking_logs:/src/logs nfclistener:latest

