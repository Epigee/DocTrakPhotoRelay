import type { AlignMessage, DocTrakAckMessage, PowerFlexEnvelope } from '../types/contracts'
import type { UploadUrlContext } from '../utils/urlContext'

export async function sendEnvelopeWithAlign<TMessage>(
  context: UploadUrlContext,
  envelope: PowerFlexEnvelope<TMessage>,
): Promise<PowerFlexEnvelope<DocTrakAckMessage> | null> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(context.wsUrl)
    let completed = false

    const timeoutHandle = window.setTimeout(() => {
      if (completed) {
        return
      }
      completed = true
      socket.close()
      reject(new Error('Timed out waiting for PowerFlex response.'))
    }, context.ackTimeoutMs)

    socket.onerror = () => {
      if (completed) {
        return
      }
      completed = true
      window.clearTimeout(timeoutHandle)
      reject(new Error('WebSocket connection error.'))
    }

    socket.onopen = () => {
      const align: AlignMessage = {
        DIRECTION: 'ALIGN',
        APP: context.app,
        UserID: context.userId,
        CONFIGURATION: context.configuration,
      }
      socket.send(JSON.stringify(align))
      socket.send(JSON.stringify(envelope))
    }

    socket.onmessage = (event: MessageEvent<string>) => {
      if (completed) {
        return
      }
      completed = true
      window.clearTimeout(timeoutHandle)

      try {
        const message = JSON.parse(event.data) as PowerFlexEnvelope<DocTrakAckMessage>
        resolve(message)
      } catch {
        resolve(null)
      } finally {
        socket.close()
      }
    }

    socket.onclose = () => {
      if (completed) {
        return
      }
      completed = true
      window.clearTimeout(timeoutHandle)
      resolve(null)
    }
  })
}
