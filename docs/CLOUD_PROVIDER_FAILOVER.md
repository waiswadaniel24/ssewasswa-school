# Cloud provider failover

This project can be deployed to Vercel or Cloudflare Pages and can use Supabase or Neon as its browser backend.

## Provider selection

The client reads VITE_BACKEND_PROVIDER:

- auto (default): use Supabase when its public URL and publishable key exist; otherwise use Neon.
- supabase: prefer Supabase, falling back to Neon only when Supabase is not configured.
- neon: prefer Neon, falling back to Supabase only when Neon is not configured.

This is a controlled active/passive switch. It does not silently fail over a live request, because switching auth/database providers without synchronized data can create duplicate accounts or divergent school records.

## Neon configuration

The Neon SDK is declared in package.json. Configure either:

- VITE_NEON_URL with the Neon database URL, or
- VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL with the separate endpoints from Neon Console.

The Neon SDK uses its Supabase-compatible adapter so existing auth and from() calls can continue to work. Neon Managed Auth is currently beta, and existing Supabase password hashes cannot be copied directly to Neon; plan a re-registration or supported OAuth migration before switching existing users.

## Cloudflare Pages

The root wrangler.toml points Cloudflare Pages at the Vite dist output. Use:

1. Build command: npm run build
2. Output directory: dist
3. Add provider environment variables in the Cloudflare Pages dashboard.
4. Set VITE_BACKEND_PROVIDER=neon for the Neon standby deployment.

Vercel can keep VITE_BACKEND_PROVIDER=auto or supabase for the primary deployment.

## Cloudflare R2

R2 credentials must stay server-side. The browser should call an authenticated Cloudflare Worker or use short-lived presigned URLs through VITE_CLOUDFLARE_STORAGE_URL. Do not put the R2 access key, secret, API token, or S3 endpoint credentials in GitHub or any VITE_ variable.

Before enabling storage failover, configure the Worker, R2 bucket, CORS, object lifecycle, and authentication checks. Keep Supabase Storage and R2 synchronized before treating either as a standby.

## Secret rotation

The credentials previously pasted into chat should be revoked and replaced. Store replacements in the hosting provider secret manager and local development secrets; never commit them to this repository.
