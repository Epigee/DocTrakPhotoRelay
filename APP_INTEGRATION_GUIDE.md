# DocTrak Photo Relay App Integration Guide

This guide explains how another app should call the hosted relay page and what each URL parameter does.

## Hosted Page

- Base URL: `https://epigee.github.io/DocTrakPhotoRelay/`

Your app should open this URL with query parameters.

## Required URL Parameters

1. `wsUrl`
   - PowerFlex WebSocket endpoint the browser should connect to.
   - Example: `wss://cloudapps01.lakeco.com/PowerFlexConnectWCFService/CONNECTSERVICE.SVC`
2. `userId`
   - Current user identity for top-level envelope and ALIGN message.
3. `configuration`
   - Configuration value for top-level envelope and ALIGN message.

If any required parameter is missing, the page enters an error state.

## Optional URL Parameters

1. `app`
   - APP value used by normal image upload messages and ALIGN.
   - Default: `DTEXTERNALAPP`
2. `targetApp` / `toApp` / `TOAPP`
   - Routing destination app for normal image upload message `TO.APP`.
   - Default: `DOCTRAK`
3. `targetUserId` / `toUserId` / `TOUSERID`
   - Routing destination user for `TO.UserID`.
   - Default: `userId`
4. `targetConfiguration` / `toConfiguration` / `toConfig` / `TOCONFIGURATION`
   - Routing destination configuration for normal image upload `TO.Configuration`.
   - Default: `configuration`
5. `site`
   - Envelope `Site` value.
6. `context`
   - Envelope `Context` value for normal image upload.
7. `formGuid` / `FormGUID`
   - Envelope `FormGUID` for normal upload.
8. `mongooseUrl` / `MongooseURL`
   - Envelope `MongooseURL` for normal upload.
9. `messageType`
   - Normal upload message type.
   - Default: `DocTrakMobileImageUpload`
10. `ackTimeoutMs`
    - Timeout used only when wait-for-response mode is enabled.
    - Current app behavior is fire-and-forget for Send/Test.
11. `appSessionId` / `appsessionid` / `APPSESSIONID`
    - Required for Test button payload as `Message.APPSESSIONID`.

## URL Token Option

You can also pass a base64url-encoded JSON object in `ctx`.

- Query values override token values when both are present.

## Message Behavior

### Upload button flow

The page sends:
1. ALIGN message
2. One or more `DocTrakRemoteUpload` envelopes where image data is chunked into multiple payloads.
   - Each SEND payload includes `Message.ChunkID` and `Message.TotalChunks`.
   - Chunks are sent in order and each serialized message is capped below 60KB.
   - Reassembly should concatenate `Message.imageBase64` by `ChunkID` order (1..`TotalChunks`) before decoding back to binary.

Success text shown to user: `Message sent`.

### Test button flow

The page sends:
1. ALIGN message
2. DocTrak test envelope with these fixed rules:
   - Top-level `APP`: `DTRemoteUpload`
   - Top-level `UserID`: from `userId`
   - Top-level `Configuration`: from `configuration`, with `_DALS` normalized to `_LA`
   - Top-level `Context`: `null`
   - Top-level `MongooseURL`: `""` (blank string)
   - `TO.APP`: `DT`
   - `TO.UserID`: `targetUserId` or `userId`
   - `MessageType`: `DocTrakMessage`
   - `Message.APPSESSIONID`: from URL `appSessionId`
   - `Message.FormGUID`: newly generated GUID per click
   - `Message.Module`: `Item`
   - `Message.Value1`: `30Q`
   - Remaining DocTrak fields are sent as empty string or null to match expected shape.

If `appSessionId` is missing, Test fails with an explicit error.

## Example Integration URL

```text
https://epigee.github.io/DocTrakPhotoRelay/?wsUrl=wss%3A%2F%2Fcloudapps01.lakeco.com%2FPowerFlexConnectWCFService%2FCONNECTSERVICE.SVC&userId=zjudkins%40lakeco.com&configuration=LAKECO1_DEM_LA&site=LA&context=SyteLine%20zjudkins%40lakeco.com%20LAKECO1_DEM_LA%20WEB%20ERPSLDBWEBFC2RD&mongooseUrl=https%3A%2F%2Fcloudapps01.lakeco.com&targetUserId=zjudkins%40lakeco.com&appSessionId=5f4d43b0-a988-46ce-aad0-21148fc6741d
```
