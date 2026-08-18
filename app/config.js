// =====================================================================
// CONEXIÓN A SUPABASE
//
// Estos dos valores salen de: Supabase > Project Settings > Data API
//   SUPABASE_URL      -> "Project URL"
//   SUPABASE_ANON_KEY -> "anon public" (también figura como "publishable")
//
// La anon key está pensada para vivir en el navegador: no es un secreto.
// Lo que protege los datos es el RLS de sql/01_schema.sql, que exige sesión
// iniciada. NUNCA pongas acá la "service_role" key: esa sí se saltea el RLS.
// =====================================================================

export const SUPABASE_URL = 'PEGAR_AQUI_TU_PROJECT_URL';
export const SUPABASE_ANON_KEY = 'PEGAR_AQUI_TU_ANON_KEY';

export const configurado =
  !SUPABASE_URL.startsWith('PEGAR') && !SUPABASE_ANON_KEY.startsWith('PEGAR');
