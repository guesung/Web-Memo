echo OPENAI_API_KEY=${{ secrets.OPENAI_API_KEY }} >> packages/shared/.env
echo SENTRY_AUTH_TOKEN=${{ secrets.SENTRY_AUTH_TOKEN }} >> packages/shared/.env
echo SENTRY_DSN=${{ secrets.SENTRY_DSN }} >> packages/shared/.env
echo SUPABASE_URL=${{ secrets.SUPABASE_URL }} >> packages/shared/.env
echo SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }} >> packages/shared/.env
echo NODE_ENV=${{ secrets.NODE_ENV }} >> packages/shared/.env
echo MAKE_WEBHOOK_NOTION_API=${{ secrets.MAKE_WEBHOOK_NOTION_API }} >> packages/shared/.env
echo WEB_URL=${{ secrets.WEB_URL }} >> packages/shared/.env

echo NEXT_PUBLIC_SUPABASE_URL=${{ secrets.NEXT_PUBLIC_SUPABASE_URL }} >> packages/web/.env
echo NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }} >> packages/web/.env