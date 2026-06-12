export type RecipientMap = Record<string, string>

export interface PowerFlexEnvelope<TMessage = unknown> {
  UserID: string
  Configuration: string
  APP: string
  Site?: string
  Context?: string
  TO: RecipientMap
  MessageType: string
  Message: TMessage
  MongooseURL?: string
  FormGUID?: string
}

export interface AlignMessage {
  DIRECTION: 'ALIGN'
  APP: string
  UserID: string
  CONFIGURATION: string
}

export interface DocTrakImageMessage {
  messageId: string
  timestampUtc: string
  fileName: string
  mimeType: string
  imageBase64: string
  imageBytes: number
  imageWidth: number
  imageHeight: number
}

export interface DocTrakAckMessage {
  success: boolean
  code?: string
  detail?: string
}
