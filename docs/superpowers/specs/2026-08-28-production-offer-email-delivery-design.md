# Production Offer Email Delivery Design

## Problem

The production offer-letter endpoint generates the PDF successfully but times out while connecting from Render to Gmail SMTP on port 587. The API then returns a generic provider failure to the HR portal. The existing 20-second timeout bounds the request but does not restore delivery.

## Decision

Send production email through Resend's HTTPS API, using the already-installed `httpx` dependency. HTTPS avoids the SMTP connection path that is timing out on Render. Keep the current SMTP implementation as a fallback for local development and deployments that have only SMTP configured.

Provider selection is configuration-driven:

- Use Resend when `RESEND_API_KEY` is set.
- Otherwise use SMTP when its required settings are present.
- Otherwise fail before network access with the existing safe configuration error.

`EMAIL_FROM_ADDRESS` supplies the verified sender for Resend. Existing SMTP settings remain unchanged.

## Components and Data Flow

`send_email_with_pdf` remains the single interface used by the offer-letter endpoint. It prepares the message inputs and delegates to one private provider function:

1. Encode the generated PDF attachment as Base64 for the Resend request.
2. POST the message, HTML body, recipients, CC list, and attachment to Resend over HTTPS.
3. Treat only a successful provider response as sent.
4. Preserve the current endpoint behavior: communication and activity records are written only after email delivery succeeds.
5. Continue WhatsApp intimation only in the normal candidate workflow, after email succeeds.

No frontend change is required.

## Error Handling and Logging

Provider timeouts, network failures, authentication failures, and rejected messages are logged server-side with the provider name, response status, and a bounded provider error. API keys, authorization headers, and message attachments are never logged.

The HR-facing API response remains concise and safe. Configuration errors remain distinct from delivery errors.

## Production Test

Add a small backend script that calls the same email service with an in-memory one-page PDF and no candidate record. Run it in the production service environment with recipient `krishnanandgeetheswaran@gmail.com`. This proves the deployed provider configuration without changing candidate data, creating communication records, or triggering WhatsApp.

## Verification

- Unit test Resend payload construction, attachment encoding, CC handling, and success.
- Unit test Resend rejection and network failure mapping.
- Update the SMTP test double to accept the configured timeout.
- Run the focused communication tests and the full backend test suite.
- Push the implementation commit to `dev`, wait for the production deployment, and run the isolated production test send.

## Deployment Configuration

Render must receive `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS`. The sender domain used by `EMAIL_FROM_ADDRESS` must be verified in Resend before real candidate delivery. Secrets remain in Render and are not committed.

## Scope

This change fixes email transport only. It does not redesign offer-letter content, candidate workflow, WhatsApp behavior, or the HR interface.
