# Doc-Trak Mobile Upload Webpage — Implementation Guide

## 1. Objective
Build a mobile-friendly webpage that opens from a Doc-Trak QR code, lets a user take/upload a photo, and sends that image over WebSocket to PowerFlex so it routes back to the user’s active Doc-Trak session.

Doc-Trak and PowerFlex already exist. This guide covers only the new webpage.

## 2. End-to-End Flow
1. Doc-Trak displays QR code.
2. User scans QR with phone.
3. Phone opens new upload webpage URL.
4. Webpage reads connection context from URL (or signed token payload).
5. User captures photo or selects file.
6. Webpage opens WebSocket to PowerFlex.
7. Webpage sends image payload + metadata.
8. PowerFlex routes image to correct Doc-Trak session.
9. Webpage shows success or error to user.

## 3. Recommended Prototype Architecture
### App location (where to write it)
- Create a standalone frontend app in this repo at: `apps/doc-trak-mobile-upload/`
- Keep it isolated from Doc-Trak and PowerFlex codebases so prototype changes do not affect existing systems.

### Language and framework
- **Language:** TypeScript
- **Framework/build:** React + Vite
- **Reasoning:** fast scaffolding, strong typing for WebSocket payload contracts, easy static hosting.

### Suggested project structure
- `apps/doc-trak-mobile-upload/src/pages/UploadPage.tsx` (main flow)
- `apps/doc-trak-mobile-upload/src/services/wsClient.ts` (WebSocket lifecycle/send/ack)
- `apps/doc-trak-mobile-upload/src/services/imageProcessor.ts` (resize/compress/validate)
- `apps/doc-trak-mobile-upload/src/utils/urlContext.ts` (token/query parse + validation)
- `apps/doc-trak-mobile-upload/src/types/contracts.ts` (PowerFlex message/ack types)

## 4. Phase Plan

### Phase 0 — Integration Contract (must complete first)
Define and lock:
- QR URL format and parameters.
- Preferred security model: short-lived signed token in URL.
- PowerFlex WebSocket endpoint expectations.
- Message schema for upload payload and response/ack.
- Max image size, allowed MIME types, timeout/retry behavior.

Deliverable: written contract for request/response and auth context.

---

### Phase 1 — App Scaffold
Create frontend project (recommended: React + Vite + TypeScript).

Implement base screen states:
- Loading configuration
- Ready to capture/upload
- Preview selected image
- Sending
- Success / Error

Design for mobile first.

Deliverable: app runs locally, UI states wired with placeholder actions.

---

### Phase 2 — Image Capture/Upload
Implement file input supporting:
- Camera capture on phone
- Photo library/file picker fallback

Technical requirements:
- `accept="image/*"` and camera hint/capture behavior
- Validate type and file size
- Client-side image resize/compression before send

Deliverable: selected/captured image preview + normalized output ready for transport.

---

### Phase 3 — WebSocket Transport to PowerFlex
Implement:
- Parse/validate URL token/params
- WebSocket connect lifecycle
- Structured payload send (connection/user metadata + image + MIME + message ID + timestamp)
- Ack handling from PowerFlex
- User-visible error states and retry handling

Deliverable: browser can connect and send image payloads successfully to PowerFlex.

---

### Phase 4 — Reliability and UX Hardening
Add:
- Required parameter validation before upload UI
- Clear error messages for invalid token, timeout, disconnect
- Duplicate submission prevention
- Single retry policy (or contract-defined retry)
- Loading state lock during send

Deliverable: robust user flow under common failure cases.

## 5. Hosting Plan (Webpage Portion)
HTTPS is required for reliable camera behavior on mobile browsers.

Prototype hosting (free):
1. **Cloudflare Pages (recommended for prototype/free)** — free static hosting, HTTPS by default, easy Git deploy.
2. Netlify Free plan.
3. Vercel Hobby plan.

Production-oriented hosting:
1. Azure Static Web Apps
2. Netlify
3. Vercel

Production requirements:
- Custom domain + TLS
- CI/CD pipeline from repository
- Environment-specific configuration for endpoints and token settings

Local/mobile QR testing:
- Expose local dev server via `ngrok` (or Cloudflare Tunnel) to get temporary HTTPS URL.
- Generate QR from that HTTPS URL for real-device testing.

## 6. Test-as-You-Go Plan
Run these checkpoints incrementally at each phase:

### Checkpoint A — Contract Validation
- Confirm URL parsing and required fields.
- Validate token expiry/invalid token behavior.

### Checkpoint B — Image Input
- Test camera capture and file upload on iPhone + Android.
- Test oversized/invalid file rejection.

### Checkpoint C — Transport Integration
- Connect to mocked or test PowerFlex endpoint.
- Verify payload structure and ack parsing.
- Validate timeout and reconnect behavior.

### Checkpoint D — End-to-End
- Scan Doc-Trak QR on phone.
- Upload/capture image.
- Confirm PowerFlex routes image to intended Doc-Trak session.

### Regression Checklist (run each release)
- Camera permission prompt handling
- Network drop during send
- Duplicate tap/send prevention
- Invalid/expired token
- Large image performance

## 7. Technical Decisions to Finalize Before Coding
1. Final QR payload format (raw params vs signed token).
2. PowerFlex upload message schema.
3. Max image size and client compression target.
4. WebSocket ack/error contract.
5. Prototype host choice (Cloudflare Pages recommended).
6. Production host choice (Azure Static Web Apps recommended).

## 8. Suggested Initial Milestones
1. **Milestone 1:** Contract signed off.
2. **Milestone 2:** Basic mobile UI + image capture works locally.
3. **Milestone 3:** WebSocket send/ack works against test endpoint.
4. **Milestone 4:** Full Doc-Trak QR -> phone -> PowerFlex -> Doc-Trak E2E success.
5. **Milestone 5:** Production deploy with monitoring and rollback plan.
