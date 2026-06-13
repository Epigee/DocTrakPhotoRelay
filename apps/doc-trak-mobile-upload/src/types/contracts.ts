export type RecipientMap = Record<string, string>

export interface PowerFlexEnvelope<TMessage = unknown> {
  UserID: string
  Configuration: string
  APP: string
  Site?: string
  Context?: string | null
  TO: RecipientMap
  MessageType: string
  Message: TMessage
  MongooseURL?: string | null
  FormGUID?: string
}

export interface AlignMessage {
  DIRECTION: 'ALIGN'
  APP: string
  UserID: string
  CONFIGURATION: string
}

export interface DocTrakImageMessage {
  APPSESSIONID?: string | null
  FormGUID?: string | null
  FormCaption?: string | null
  Module: string
  Value1: string
  Value2?: string
  Value3?: string
  Value4?: string
  Value5?: string
  Value6?: string
  ResourceGroup?: string | null
  FormEvent?: string | null
  FormVariableName?: string | null
  FormVariableValue?: string | null
  ApplicationVariableName?: string | null
  ApplicationVariableValue?: string | null
  IsFormHeaderModule?: string | null
  IsReadOnlyForm?: string | null
  AlwaysShowModuleList?: string | null
  IsFilterInPlace?: string | null
  IsCurrentObjectNew?: string | null
  ForceRefresh?: string | null
  FormName?: string | null
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

export interface DocTrakMessage {
  APPSESSIONID?: string | null
  FormGUID?: string | null
  FormCaption?: string | null
  Module: string
  Value1: string
  Value2?: string
  Value3?: string
  Value4?: string
  Value5?: string
  Value6?: string
  ResourceGroup?: string | null
  FormEvent?: string | null
  FormVariableName?: string | null
  FormVariableValue?: string | null
  ApplicationVariableName?: string | null
  ApplicationVariableValue?: string | null
  IsFormHeaderModule?: string | null
  IsReadOnlyForm?: string | null
  AlwaysShowModuleList?: string | null
  IsFilterInPlace?: string | null
  IsCurrentObjectNew?: string | null
  ForceRefresh?: string | null
  FormName?: string | null
}
