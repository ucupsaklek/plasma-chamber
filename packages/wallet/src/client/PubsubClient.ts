import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt';

export interface IPubsubClient {
  publish(
    topic: string,
    message: string
  ): boolean
  subscribe(
    topic: string,
    event: (e: any) => void
  ): void
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

  subscribe(
    topic: string,
    event: (e: any) => void
  ): void {
    this.client.subscribe(topic, event)
  }

}
