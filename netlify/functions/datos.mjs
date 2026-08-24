/* Guarda la cola, el histórico y las capturas en Netlify Blobs.
   Una sola clave para los datos; cada captura, su propio blob.
   Aquí no hay usuarios, hay un dueño.

   Necesita la variable de entorno key_netfilysoti en Netlify.
   Sin ella la función no deja pasar a nadie, ni siquiera al dueño: es
   preferible quedarse fuera que abrir la puerta por un despiste de configuración. */

import { getStore } from '@netlify/blobs';

const CLAVE = 'datos';
const VACIO = { etiquetas: [], historico: [] };
const TOPE_FOTO = 3 * 1024 * 1024;   // ya llegan encogidas del navegador

export default async (req, context) => {
  const esperado = process.env.key_netfilysoti;
  if (!esperado) {
    return json({ error: 'El sitio no tiene key_netfilysoti configurada.' }, 503);
  }
  if (!mismoTiempo(req.headers.get('x-codigo') || '', esperado)) {
    return json({ error: 'Código incorrecto.' }, 401);
  }

  const foto = context.params && context.params.clave;
  return foto ? capturas(req, foto) : datos(req);
};

export const config = { path: ['/api/datos', '/api/foto/:clave'] };

/* ---------- La cola y el histórico ---------- */
async function datos(req) {
  // Consistencia fuerte: por defecto un cambio tarda hasta un minuto en verse en
  // todas partes, y aquí se escribe y se relee en segundos desde el mismo móvil.
  const almacen = getStore({ name: 'vinted', consistency: 'strong' });

  if (req.method === 'GET') {
    const guardado = await almacen.get(CLAVE, { type: 'json' });
    return json(guardado ? saneado(guardado) : VACIO);
  }

  if (req.method === 'PUT') {
    let cuerpo;
    try { cuerpo = await req.json(); }
    catch { return json({ error: 'El cuerpo no es JSON.' }, 400); }
    const limpio = saneado(cuerpo);
    await almacen.setJSON(CLAVE, limpio);
    const sueltas = await barreCapturas(limpio);
    return json({ ok: true, etiquetas: limpio.etiquetas.length,
                  ventas: limpio.historico.length, capturasBorradas: sueltas });
  }

  return json({ error: 'Método no permitido.' }, 405);
}

/* ---------- Las capturas ---------- */
async function capturas(req, clave) {
  if (!/^[a-z0-9]{4,40}$/.test(clave)) return json({ error: 'Clave rara.' }, 400);
  const almacen = getStore({ name: 'vinted-fotos', consistency: 'strong' });

  if (req.method === 'GET') {
    const datos = await almacen.get(clave, { type: 'arrayBuffer' });
    if (!datos) return json({ error: 'Esa captura ya no está.' }, 404);
    return new Response(datos, {
      headers: { 'content-type': 'image/jpeg', 'cache-control': 'private, max-age=31536000' }
    });
  }

  if (req.method === 'PUT') {
    const datos = await req.arrayBuffer();
    if (!datos.byteLength) return json({ error: 'Llegó vacía.' }, 400);
    if (datos.byteLength > TOPE_FOTO) return json({ error: 'Demasiado grande.' }, 413);
    await almacen.set(clave, datos);
    return json({ ok: true, bytes: datos.byteLength });
  }

  if (req.method === 'DELETE') {
    await almacen.delete(clave);
    return json({ ok: true });
  }

  return json({ error: 'Método no permitido.' }, 405);
}

/* Las capturas que ya no menciona nadie se van. Sin esto, quitar una etiqueta
   dejaría su imagen ocupando sitio para siempre y sin forma de llegar a ella. */
async function barreCapturas(datos) {
  const vivas = new Set();
  for (const e of datos.etiquetas) if (e && e.foto) vivas.add(e.foto);
  for (const v of datos.historico) {
    // La venta tiene su propia imagen, la del envío. Sin esta línea el barrido
    // la daría por huérfana y la borraría en el primer guardado.
    if (v && v.foto) vivas.add(v.foto);
    for (const e of (v.etiquetas || [])) if (e && e.foto) vivas.add(e.foto);
  }

  const almacen = getStore({ name: 'vinted-fotos', consistency: 'strong' });
  const { blobs } = await almacen.list();
  const sobran = blobs.filter(b => !vivas.has(b.key));
  await Promise.all(sobran.map(b => almacen.delete(b.key)));
  return sobran.length;
}

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

function json(cuerpo, estado = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
