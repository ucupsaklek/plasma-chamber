const mosca = require("mosca");

function setup() {
  console.log('mqtt:Mosca server is up and running');
}

module.exports = function() {

  const server = new mosca.Server({
    port: process.env.MQTT_PORT || 1883
  });
    
  server.on('clientConnected', function(client) {
      console.log('mqtt:client connected', client.id);
  });
  
  server.on('published', function(packet, client) {
    console.log('mqtt:published', packet.payload);
  });
  
  server.on('ready', setup);
  

}
