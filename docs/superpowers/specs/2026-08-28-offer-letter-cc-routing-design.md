# Offer Letter CC Routing Design

## Goal

Every offer-letter email must copy:

- `jerry@nippontoyota.com`
- `naveen@nippontoyota.com`
- the local HR user who sent the candidate to Head Office

For candidates from Kalamassery, the local HR recipient must be
`hrkly@nippontoyota.com`.

## Design

The offer-letter endpoint will build its CC list in one backend helper. The
helper will use the recorded workflow activity to identify the local HR user
who moved the candidate to Head Office. It will use that user's current email
address.

Kalamassery is an explicit business rule: its local HR CC address is always
`hrkly@nippontoyota.com`, regardless of aliases associated with the branch.

If an older candidate has no usable workflow-sender record, the helper will
fall back to the active local HR account for the candidate's branch. This
keeps historical candidates sendable without a data migration.

Jerry and Naveen are required recipients and will be defined by the
application rather than optional environment settings. All addresses will be
trimmed and deduplicated case-insensitively before the existing email service
is called.

## Data Flow

1. Head Office sends an offer letter from the existing candidate endpoint.
2. The endpoint resolves the candidate's originating local HR.
3. The endpoint adds Jerry, Naveen, and the resolved local HR to CC.
4. The existing email service sends the candidate's PDF offer letter with the
   resolved CC list.
5. Existing communication, activity, and WhatsApp behavior continues
   unchanged.

## Error Handling

Failure to resolve a local HR from both workflow history and branch fallback
will not block the offer email. Jerry and Naveen will still be copied. Email
provider failures retain the endpoint's existing error behavior.

## Verification

Backend tests will prove that:

- Jerry and Naveen are always included.
- The local HR who sent an ordinary-branch candidate to Head Office is
  included.
- Kalamassery uses `hrkly@nippontoyota.com`.
- Historical candidates fall back to the active HR for their branch.
- Duplicate or differently cased addresses appear only once.

No frontend or database-schema change is required.
