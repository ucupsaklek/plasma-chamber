import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt';

export interface IPubsubClient {
  publish(
    topic: string,
    message: string
  ): boolean
  subscribe(
    topic: string,
    event: (e: string) => void
  ): void
  unsubscribe(
    topic: string
  ): void
}

type SubscribeHandler = (message: string) => void

export class WalletMQTTClient implements IPubsubClient {
  client: MqttClient
  handlers: Map<string, SubscribeHandler>

  constructor(endpoint: string) {
    this.client = mqtt.connect(endpoint)
    this.handlers = new Map<string, SubscribeHandler>()
    this.client.on('message', (_topic, message) => {
      const handler = this.handlers.get(_topic)
      if(handler) {
        handler(message.toString())        
      }
    })
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
    handler: SubscribeHandler
  ): void {
    this.client.subscribe(topic)
    this.handlers.set(topic, handler)
  }

  unsubscribe(
    topic: string
  ): void {
    this.client.unsubscribe(topic)
    this.handlers.delete(topic)
  }

}
