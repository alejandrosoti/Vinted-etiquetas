/* Guarda la cola y el histórico en Netlify Blobs.
   Una sola clave para todo: aquí no hay usuarios, hay un dueño.

   Necesita la variable de entorno key_netfilysoti en Netlify.
   Sin ella la función no deja pasar a nadie, ni siquiera al dueño: es
   preferible quedarse fuera que abrir la puerta por un despiste de configuración. */

import { getStore } from '@netlify/blobs';

const CLAVE = 'datos';
const VACIO = { etiquetas: [], historico: [] };

export default async (req) => {
  const esperado = process.env.key_netfilysoti;
  if (!esperado) {
    return respuesta({ error: 'El sitio no tiene key_netfilysoti configurada.' }, 503);
  }
  if (!mismoTiempo(req.headers.get('x-codigo') || '', esperado)) {
    return respuesta({ error: 'Código incorrecto.' }, 401);
  }

  // Consistencia fuerte: por defecto un cambio tarda hasta un minuto en verse en
  // todas partes, y aquí se escribe y se relee en segundos desde el mismo móvil.
  const almacen = getStore({ name: 'vinted', consistency: 'strong' });

  if (req.method === 'GET') {
    const datos = await almacen.get(CLAVE, { type: 'json' });
    return respuesta(datos ? saneado(datos) : VACIO);
  }

  if (req.method === 'PUT') {
    let cuerpo;
    try { cuerpo = await req.json(); }
    catch { return respuesta({ error: 'El cuerpo no es JSON.' }, 400); }
    const limpio = saneado(cuerpo);
    await almacen.setJSON(CLAVE, limpio);
    return respuesta({ ok: true, etiquetas: limpio.etiquetas.length, ventas: limpio.historico.length });
  }

  return respuesta({ error: 'Método no permitido.' }, 405);
};

export const config = { path: '/api/datos' };

/* Se guarda lo que llega, pero solo con la forma esperada: si un día el cliente
   manda basura, que no acabe en el almacén y rompa la siguiente lectura. */
function saneado(d) {
  return {
    etiquetas: Array.isArray(d && d.etiquetas) ? d.etiquetas : [],
    historico: Array.isArray(d && d.historico) ? d.historico : []
  };
}

/* Comparar sin delatar cuántos caracteres se acertaron por el tiempo que tarda. */
function mismoTiempo(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function respuesta(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
