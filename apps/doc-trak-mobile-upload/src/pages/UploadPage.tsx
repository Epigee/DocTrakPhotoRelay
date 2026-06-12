import { useEffect, useRef, useState } from 'react'
import { processImageFile, type ProcessedImage } from '../services/imageProcessor'
import { sendEnvelopeWithAlign } from '../services/wsClient'
import type { DocTrakImageMessage, DocTrakMessage, PowerFlexEnvelope } from '../types/contracts'
import { parseUploadUrlContext, type UploadUrlContext } from '../utils/urlContext'

type ScreenState = 'loading' | 'ready' | 'preview' | 'sending' | 'success' | 'error'

export function UploadPage() {
  const uploadFileInputRef = useRef<HTMLInputElement | null>(null)
  const [screen, setScreen] = useState<ScreenState>('loading')
  const [context, setContext] = useState<UploadUrlContext | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const params = Object.fromEntries(new URLSearchParams(window.location.search).entries())
      console.info('[UploadPage] Arrival URL context parameters', {
        href: window.location.href,
        params,
      })

      const parsed = parseUploadUrlContext()
      console.info('[UploadPage] Parsed upload context', parsed)
      setContext(parsed)
      setScreen('ready')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not parse upload context.')
      setScreen('error')
    }
  }, [])

  const onFileSelected = async (file: File | null) => {
    if (!file) {
      return
    }
    setErrorMessage(null)
    try {
      const processed = await processImageFile(file)
      setSelectedImage(processed)
      setPreviewDataUrl(`data:${processed.mimeType};base64,${processed.base64}`)
      setScreen('preview')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to process selected image.')
      setScreen('error')
    }
  }

  const onSend = async () => {
    if (!context || !selectedImage) {
      return
    }
    setErrorMessage(null)
    setSuccessMessage(null)
    setScreen('sending')

    try {
      const envelope = createEnvelope(context, selectedImage)
      console.info('[UploadPage] Envelope to send (image payload redacted)', redactImagePayload(envelope))
      const ack = await sendEnvelopeWithAlign(context, envelope)
      const detail = ack?.Message?.detail
      setSuccessMessage(detail ?? 'Image sent successfully.')
      setScreen('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send image.')
      setScreen('error')
    }
  }

  const onTest = async () => {
    if (!context) {
      return
    }
    setErrorMessage(null)
    setSuccessMessage(null)
    setScreen('sending')

    try {
      const envelope = createDocTrakTestEnvelope(context)
      console.info('[UploadPage] Test envelope to send', envelope)
      const ack = await sendEnvelopeWithAlign(context, envelope)
      const detail = ack?.Message?.detail
      setSuccessMessage(detail ?? 'Test message sent successfully.')
      setScreen('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send test message.')
      setScreen('error')
    }
  }

  return (
    <main className="upload-page">
      <section className="upload-card">
        <h1>Doc-Trak Photo Upload</h1>
        {screen === 'loading' && <p>Loading upload session...</p>}
        {screen === 'ready' && <p>Take a photo or choose an image to upload.</p>}
        {screen === 'sending' && <p>Sending image to PowerFlex...</p>}
        {screen === 'success' && <p className="status-success">{successMessage}</p>}
        {screen === 'error' && <p className="status-error">{errorMessage}</p>}

        {previewDataUrl && <img className="preview" src={previewDataUrl} alt="Upload preview" />}

        <div className="actions">
          <button
            type="button"
            className="upload-trigger"
            onClick={() => uploadFileInputRef.current?.click()}
            disabled={screen === 'sending'}
          >
            Upload
          </button>
          <button className="primary" onClick={() => void onSend()} disabled={!selectedImage || screen === 'sending'}>
            Send
          </button>
          <button type="button" onClick={() => void onTest()} disabled={screen === 'sending'}>
            Test
          </button>
        </div>
        <input
          ref={uploadFileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void onFileSelected(event.target.files?.[0] ?? null)
            event.currentTarget.value = ''
          }}
        />
      </section>
    </main>
  )
}

function createEnvelope(context: UploadUrlContext, image: ProcessedImage): PowerFlexEnvelope<DocTrakImageMessage> {
  const messageId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `msg-${Date.now()}`
  const to = createRoutingTarget(context)

  return {
    APP: context.app,
    UserID: context.userId,
    Configuration: context.configuration,
    Site: context.site,
    Context: context.context,
    FormGUID: context.formGuid,
    MongooseURL: context.mongooseUrl ?? '',
    TO: to,
    MessageType: context.messageType,
    Message: {
      messageId,
      timestampUtc: new Date().toISOString(),
      fileName: image.fileName,
      mimeType: image.mimeType,
      imageBase64: image.base64,
      imageBytes: image.bytes,
      imageWidth: image.width,
      imageHeight: image.height,
    },
  }
}

function createDocTrakTestEnvelope(context: UploadUrlContext): PowerFlexEnvelope<DocTrakMessage> {
  const formGuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `form-${Date.now()}`

  return {
    APP: context.app,
    UserID: context.userId,
    Configuration: context.configuration,
    Site: context.site,
    Context: context.context,
    FormGUID: formGuid,
    MongooseURL: context.mongooseUrl ?? '',
    TO: createRoutingTarget(context),
    MessageType: 'DocTrakMessage',
    Message: {
      FormGUID: formGuid,
      Module: 'Item',
      Value1: '30Q',
    },
  }
}

function createRoutingTarget(context: UploadUrlContext): Record<string, string> {
  return {
    APP: context.targetApp ?? 'DOCTRAK',
    UserID: context.targetUserId ?? context.userId,
    Configuration: context.targetConfiguration ?? context.configuration,
  }
}

function redactImagePayload(
  envelope: PowerFlexEnvelope<DocTrakImageMessage>,
): PowerFlexEnvelope<Omit<DocTrakImageMessage, 'imageBase64'> & { imageBase64: string; imageBase64Length: number }> {
  return {
    ...envelope,
    Message: {
      ...envelope.Message,
      imageBase64Length: envelope.Message.imageBase64.length,
      imageBase64: '[REDACTED]',
    },
  }
}
