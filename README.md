### setup tutorial for dstat monitoring api

OS SYSTEM: ubuntu / any version
SYSTEM REQS: 2 CORES, 4 GIG RAM

### (APT PACKAGES) 
1. apt-get update 
2. apt install npm (to run the server)
3. apt install nodejs
4. apt install net-tools
5. apt install vnstat
6. apt install golang-go
7. apt install git
8. git clone https://github.com/tcpfailed/SERVER-DSTAT
9. cd SERVER-DSTAT
10. go mod init server
11. go mod init github.com/gorilla/mux
12. go mod tidy

### (NPM / NODE PACKAGES) 
3. npm install express 
4. npm install cors
5. npm install fs
6. npm install axios (for discord hooks)
7. npm install systeminformation

your done with packages now run the .js file (read additional notes below)

- run the actual api script via command >> node server.js or screen node server.js then ctrl a+d
- now run the script to auto update stats if you dont want to manually reload >> go run server.go

### Additional / Help: 

> Contact @tcpfailed On Tele or @tcpfailed On Instagram For Help 

> install screen by apt install screen (runs your server 24/7 via screen node server.js)

> localhost is just your server ip for example 
if your server ip is 127.0.0.1 you would visit http://127.0.0.1:3000/APIENDPOINT

> Replace In The Discord Webhook With Your Webhook URL

### API ENDPOINTS: 

http://localhost:3000/check-iptables

http://localhost:3000/get-traffic-data 

http://localhost:3000/get-maintraffic-data 

http://localhost:3000/get-connection-count 

http://localhost:3000/mitigation-status 

