// =====================================================================
// CONEXIÓN A SUPABASE
//
// Proyecto: JAF-COMPRAS · organización JAF · región São Paulo (sa-east-1)
// Estos valores salen de: Supabase > Project Settings > API Keys
//
// La publishable key está pensada para vivir en el navegador: no es un
// secreto. Lo que protege los datos es el RLS que crean las migraciones y
// que exige sesión iniciada: sin login, la API devuelve una lista vacía
// aunque la tabla tenga datos.
//
// NUNCA pongas acá una "secret key" ni la "service_role": esas saltean el RLS.
// =====================================================================

export const SUPABASE_URL = 'https://odvdsnapmguprdihuxie.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_wnF5MsqxdLh7kZdeo3Y0ZQ_fspVr62W';

export const configurado =
  !SUPABASE_URL.startsWith('PEGAR') && !SUPABASE_ANON_KEY.startsWith('PEGAR');
