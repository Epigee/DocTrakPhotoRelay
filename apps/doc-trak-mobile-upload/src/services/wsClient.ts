import type { AlignMessage, DocTrakAckMessage, PowerFlexEnvelope } from '../types/contracts'
import type { UploadUrlContext } from '../utils/urlContext'

interface SendOptions {
  waitForResponse?: boolean
}

export async function sendEnvelopesWithAlign<TMessage>(
  context: UploadUrlContext,
  envelopes: PowerFlexEnvelope<TMessage>[],
  options: SendOptions = {},
): Promise<PowerFlexEnvelope<DocTrakAckMessage> | null> {
  if (envelopes.length === 0) {
    return null
  }

  const waitForResponse = options.waitForResponse ?? true

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(context.wsUrl)
    let completed = false

    const timeoutHandle = window.setTimeout(() => {
      if (completed) {
        return
      }
      if (!waitForResponse) {
        return
      }
      completed = true
      console.error('[wsClient] Timed out waiting for WebSocket response', { timeoutMs: context.ackTimeoutMs })
      socket.close()
      reject(new Error('Timed out waiting for PowerFlex response.'))
    }, context.ackTimeoutMs)

    socket.onerror = (event) => {
      if (completed) {
        return
      }
      completed = true
      window.clearTimeout(timeoutHandle)
      console.error('[wsClient] WebSocket connection error', event)
      reject(new Error('WebSocket connection error.'))
    }

    socket.onopen = () => {
      const firstEnvelope = envelopes[0]
      const align: AlignMessage = {
        DIRECTION: 'ALIGN',
        APP: firstEnvelope.APP,
        UserID: firstEnvelope.UserID,
        CONFIGURATION: firstEnvelope.Configuration,
      }
      socket.send(JSON.stringify(align))

      for (const envelope of envelopes) {
        socket.send(JSON.stringify(envelope))
      }

      if (!waitForResponse) {
        completed = true
        window.clearTimeout(timeoutHandle)
        socket.close()
        resolve(null)
      }
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

export async function sendEnvelopeWithAlign<TMessage>(
  context: UploadUrlContext,
  envelope: PowerFlexEnvelope<TMessage>,
  options: SendOptions = {},
): Promise<PowerFlexEnvelope<DocTrakAckMessage> | null> {
  return sendEnvelopesWithAlign(context, [envelope], options)
}
