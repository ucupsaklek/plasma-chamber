import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt';

export interface IPubsubClient {
  publish(
    topic: string,
    message: string
  ): boolean
}

export class WalletMQTTClient implements IPubsubClient {
  client: MqttClient

  constructor(endpoint: string) {
    this.client = mqtt.connect(endpoint)
  }
  publish(
    topic: string,
    message: string
  ): boolean {
    this.client.publish(topic, message)
    return true
  }
}
