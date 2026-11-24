// Entrega al navegador los datos públicos de Supabase (la clave "anon" está hecha para ser pública).
export const config = { runtime: 'edge' };
export default function handler() {
  return new Response(JSON.stringify({ url: process.env.SUPABASE_URL || '', anonKey: process.env.SUPABASE_ANON_KEY || '' }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
