# Private image uploads up to 25 MB

All image UI, validation, challenge evidence and private bucket accept JPG, PNG and WebP up to 25 × 1024 × 1024 bytes. `database/002_storage.sql` records the bucket's desired limit. The production bucket remains private, with the same MIME allowlist; only `file_size_limit` changed from 4194304 to 26214400. No table/schema migration is required.

New clients request a short-lived signed upload URL using a small authenticated, same-origin JSON request to `/api/upload`. The file is sent by PUT directly to Supabase Storage using the same multipart format as the installed Storage SDK. File bytes do not pass through a Vercel function request, avoiding its request-body limit.

A server-signed, owner-bound receipt expires after 30 minutes and binds the random object ID, declared MIME and exact file size. Finalization verifies that receipt, downloads the object metadata/body, checks actual size and magic-byte MIME, and only then inserts the upload record. Until then, media routes and content-creation APIs cannot reference the object because no upload row exists. A different account, edited receipt, over-limit file or invalid signature cannot register it. Storage upsert is disabled. Existing small multipart uploads are retained only for already-open older pages; reloading activates the new flow.

No service key is exposed to clients; only the one-object signed URL and receipt are returned. Challenge evidence still hashes the original file bytes on the server, and duplicate-proof rules remain unchanged. Screenshots in the gallery continue to use private, expiring read URLs.

Tests cover 25 MB direct upload without a large Vercel request body, >25 MB rejection, login, CSRF, ownership, edited/expired receipts, actual size, magic MIME and idempotent finalization. Integration tests mock the Storage boundary; a real signed upload from the browser remains an end-to-end check for the next user upload.
