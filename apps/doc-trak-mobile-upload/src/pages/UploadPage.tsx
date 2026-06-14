import { useEffect, useRef, useState } from 'react'
import { processImageFile, type ProcessedImage } from '../services/imageProcessor'
import { sendEnvelopeWithAlign, sendEnvelopesWithAlign } from '../services/wsClient'
import type { DocTrakImageMessage, DocTrakMessage, PowerFlexEnvelope } from '../types/contracts'
import { parseUploadUrlContext, type UploadUrlContext } from '../utils/urlContext'

type ScreenState = 'loading' | 'ready' | 'preview' | 'sending' | 'success' | 'error'
const MAX_SEND_MESSAGE_BYTES = 24 * 1024

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
      const parsed = parseUploadUrlContext()
      setContext(parsed)
      setScreen('ready')
    } catch (error) {
      console.error('[UploadPage] Failed to parse upload context', error)
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
      console.error('[UploadPage] Image processing failed', error)
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
      const envelopes = createChunkedSendEnvelopes(context, selectedImage)
      for (const envelope of envelopes) {
        console.log('[UploadPage] SEND message JSON', JSON.stringify(envelope))
      }
      await sendEnvelopesWithAlign(context, envelopes, { waitForResponse: false })
      setSuccessMessage('Message sent')
      setScreen('success')
    } catch (error) {
      console.error('[UploadPage] SEND failed', error)
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
      console.log('[UploadPage] TEST message JSON', JSON.stringify(envelope))
      await sendEnvelopeWithAlign(context, envelope, { waitForResponse: false })
      setSuccessMessage('Message sent')
      setScreen('success')
    } catch (error) {
      console.error('[UploadPage] TEST failed', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send test message.')
      setScreen('error')
    }
  }

  const onSendWithoutImageData = async () => {
    if (!context || !selectedImage) {
      return
    }
    setErrorMessage(null)
    setSuccessMessage(null)
    setScreen('sending')

    try {
      const envelope = createEnvelopeWithoutImageData(context, selectedImage)
      console.log('[UploadPage] SEND (NO IMAGE DATA) message JSON', JSON.stringify(envelope))
      await sendEnvelopeWithAlign(context, envelope, { waitForResponse: false })
      setSuccessMessage('Message sent')
      setScreen('success')
    } catch (error) {
      console.error('[UploadPage] SEND (NO IMAGE DATA) failed', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send image metadata.')
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
          <button type="button" onClick={() => void onSendWithoutImageData()} disabled={!selectedImage || screen === 'sending'}>
            Send (No Image Data)
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
  const appSessionId = context.appSessionId
  if (!appSessionId) {
    throw new Error('Missing required appSessionId URL parameter.')
  }

  const messageId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `msg-${Date.now()}`
  const formGuid = context.formGuid ?? (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `form-${Date.now()}`)
  const normalizedConfiguration = toDocTrakExampleConfiguration(context.configuration)

  return {
    APP: 'DTRemoteUpload',
    UserID: context.userId,
    Configuration: normalizedConfiguration,
    Site: context.site,
    Context: null,
    FormGUID: formGuid,
    MongooseURL: '',
    TO: createTestRoutingTarget(context),
    MessageType: 'DocTrakRemoteUpload',
    Message: {
      APPSESSIONID: appSessionId,
      FormGUID: formGuid,
      FormCaption: 'Photo Upload',
      Module: 'Item',
      Value1: '30Q',
      Value2: '',
      Value3: '',
      Value4: '',
      Value5: '',
      Value6: '',
      ResourceGroup: null,
      FormEvent: null,
      FormVariableName: null,
      FormVariableValue: null,
      ApplicationVariableName: null,
      ApplicationVariableValue: null,
      IsFormHeaderModule: null,
      IsReadOnlyForm: null,
      AlwaysShowModuleList: null,
      IsFilterInPlace: null,
      IsCurrentObjectNew: null,
      ForceRefresh: null,
      FormName: null,
      messageId,
      timestampUtc: new Date().toISOString(),
      fileName: image.fileName,
      mimeType: image.mimeType,
      imageBase64: '',
      imageBytes: image.bytes,
      imageWidth: image.width,
      imageHeight: image.height,
    },
  }
}

function createEnvelopeWithoutImageData(
  context: UploadUrlContext,
  image: ProcessedImage,
): PowerFlexEnvelope<Omit<DocTrakImageMessage, 'imageBase64'>> {
  const envelope = createEnvelope(context, image)
  const { imageBase64, ChunkID, TotalChunks, ...messageWithoutImageData } = envelope.Message
  void imageBase64
  void ChunkID
  void TotalChunks

  return {
    ...envelope,
    Message: messageWithoutImageData,
  }
}

function createChunkedSendEnvelopes(
  context: UploadUrlContext,
  image: ProcessedImage,
): PowerFlexEnvelope<DocTrakImageMessage>[] {
  const baseEnvelope = createEnvelope(context, image)
  const base64 = image.base64

  if (!base64) {
    throw new Error('Image payload is empty.')
  }

  const chunkSize = calculateChunkSize(baseEnvelope, base64, MAX_SEND_MESSAGE_BYTES)
  const totalChunks = Math.ceil(base64.length / chunkSize)
  const envelopes: PowerFlexEnvelope<DocTrakImageMessage>[] = []

  for (let index = 0; index < totalChunks; index += 1) {
    const chunkId = index + 1
    const start = index * chunkSize
    const end = Math.min(base64.length, start + chunkSize)
    const chunkBase64 = base64.slice(start, end)
    const envelope: PowerFlexEnvelope<DocTrakImageMessage> = {
      ...baseEnvelope,
      Message: {
        ...baseEnvelope.Message,
        imageBase64: chunkBase64,
        ChunkID: chunkId,
        TotalChunks: totalChunks,
      },
    }

    const serialized = JSON.stringify(envelope)
    const serializedBytes = getUtf8Bytes(serialized)
    if (serializedBytes > MAX_SEND_MESSAGE_BYTES) {
      throw new Error(`Chunk ${chunkId} exceeds ${MAX_SEND_MESSAGE_BYTES} bytes.`)
    }

    envelopes.push(envelope)
  }

  return envelopes
}

function calculateChunkSize(
  baseEnvelope: PowerFlexEnvelope<DocTrakImageMessage>,
  base64: string,
  maxMessageBytes: number,
): number {
  let totalChunks = 1
  let chunkSize = 0

  for (let i = 0; i < 10; i += 1) {
    const probeEnvelope: PowerFlexEnvelope<DocTrakImageMessage> = {
      ...baseEnvelope,
      Message: {
        ...baseEnvelope.Message,
        imageBase64: '',
        ChunkID: totalChunks,
        TotalChunks: totalChunks,
      },
    }
    const overheadBytes = getUtf8Bytes(JSON.stringify(probeEnvelope))
    chunkSize = maxMessageBytes - overheadBytes
    if (chunkSize <= 0) {
      throw new Error(`Message overhead exceeds ${maxMessageBytes} bytes; unable to chunk image payload.`)
    }

    const recalculatedTotal = Math.ceil(base64.length / chunkSize)
    if (recalculatedTotal === totalChunks) {
      return chunkSize
    }
    totalChunks = recalculatedTotal
  }

  return chunkSize
}

function getUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length
}

function createDocTrakTestEnvelope(context: UploadUrlContext): PowerFlexEnvelope<DocTrakMessage> {
  const formGuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `form-${Date.now()}`
  const testConfiguration = toDocTrakExampleConfiguration(context.configuration)
  const appSessionId = context.appSessionId

  if (!appSessionId) {
    throw new Error('Missing required appSessionId URL parameter for Test message.')
  }

  return {
    APP: 'DTRemoteUpload',
    UserID: context.userId,
    Configuration: testConfiguration,
    Site: context.site,
    Context: null,
    FormGUID: formGuid,
    MongooseURL: '',
    TO: createTestRoutingTarget(context),
    MessageType: 'DocTrakMessage',
    Message: {
      APPSESSIONID: appSessionId,
      FormGUID: formGuid,
      FormCaption: 'Test Form',
      Module: 'Item',
      Value1: '30Q',
      Value2: '',
      Value3: '',
      Value4: '',
      Value5: '',
      Value6: '',
      ResourceGroup: null,
      FormEvent: null,
      FormVariableName: null,
      FormVariableValue: null,
      ApplicationVariableName: null,
      ApplicationVariableValue: null,
      IsFormHeaderModule: null,
      IsReadOnlyForm: null,
      AlwaysShowModuleList: null,
      IsFilterInPlace: null,
      IsCurrentObjectNew: null,
      ForceRefresh: null,
      FormName: null,
    },
  }
}

function createTestRoutingTarget(context: UploadUrlContext): Record<string, string> {
  return {
    APP: 'DT',
    UserID: context.targetUserId ?? context.userId,
  }
}

function toDocTrakExampleConfiguration(configuration: string): string {
  return configuration.replace(/_DALS$/i, '_LA')
}
