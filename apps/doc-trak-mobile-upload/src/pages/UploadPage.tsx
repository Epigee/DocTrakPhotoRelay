import { useEffect, useState } from 'react'
import { processImageFile, type ProcessedImage } from '../services/imageProcessor'
import { sendEnvelopeWithAlign } from '../services/wsClient'
import type { DocTrakImageMessage, PowerFlexEnvelope } from '../types/contracts'
import { parseUploadUrlContext, type UploadUrlContext } from '../utils/urlContext'

type ScreenState = 'loading' | 'ready' | 'preview' | 'sending' | 'success' | 'error'

export function UploadPage() {
  const [screen, setScreen] = useState<ScreenState>('loading')
  const [context, setContext] = useState<UploadUrlContext | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(null)
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const parsed = parseUploadUrlContext()
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
      const ack = await sendEnvelopeWithAlign(context, envelope)
      const detail = ack?.Message?.detail
      setSuccessMessage(detail ?? 'Image sent successfully.')
      setScreen('success')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send image.')
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
          <label>
            Choose Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                void onFileSelected(event.target.files?.[0] ?? null)
                event.currentTarget.value = ''
              }}
            />
          </label>
          <button className="primary" onClick={() => void onSend()} disabled={!selectedImage || screen === 'sending'}>
            Send
          </button>
        </div>
      </section>
    </main>
  )
}

function createEnvelope(context: UploadUrlContext, image: ProcessedImage): PowerFlexEnvelope<DocTrakImageMessage> {
  const messageId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `msg-${Date.now()}`
  const to: Record<string, string> = {}

  if (context.targetApp) {
    to.APP = context.targetApp
  }
  if (context.targetUserId) {
    to.UserID = context.targetUserId
  }
  if (Object.keys(to).length === 0) {
    to.APP = 'DOCTRAK'
  }

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
