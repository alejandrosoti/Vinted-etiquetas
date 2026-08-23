/* Prueba de humo de index.html + la función de servidor, sin navegador.

     npm i        (una vez)
     npm test

   La app no depende de esto: index.html sigue siendo un archivo suelto.
   Esta prueba existe porque una vez se subió con medio JavaScript borrado, la
   sintaxis era válida y la página estaba muerta sin que nadie se enterara. */

const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');

let fallos = 0, ok = 0;
function comprueba(nombre, cond, extra) {
  if (cond) ok++;
  else { fallos++; console.log('  ✗ ' + nombre + (extra !== undefined ? '  -> ' + extra : '')); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));

/* Servidor de mentira: guarda en memoria y anota lo que le piden, para poder
   comprobar que se manda el código y que no se sube más de la cuenta. */
function montaApp(datosIniciales, opciones = {}) {
  const codigoBueno = opciones.codigoBueno || 'abrete-sesamo';
  const servidor = { datos: datosIniciales || { etiquetas: [], historico: [] }, llamadas: [], fotos: new Map() };
  const errores = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errores.push(e.message.split('\n')[0]));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://ejemplo.test/', virtualConsole: vc,
    beforeParse(w) {
      // Se siembra ANTES de que corra el script, que es cuando la app lo lee.
      if (opciones.codigoGuardado) w.localStorage.setItem('vinted.codigo', opciones.codigoGuardado);
      if (opciones.cacheVieja) w.localStorage.setItem('vinted.etiquetas', JSON.stringify(opciones.cacheVieja));
      if (opciones.caido) servidor.caido = true;
      w.print = () => { w.__imprimio = (w.__imprimio || 0) + 1; };

      // jsdom no trae canvas ni carga imágenes: se fingen las tres piezas que
      // usa encoge(), para poder probar el flujo entero sin un navegador.
      w.HTMLCanvasElement.prototype.getContext = () => ({ fillStyle: '', fillRect() {}, drawImage() {} });
      w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/jpeg;base64,LzlqLzRBQQ==';
      w.HTMLCanvasElement.prototype.toBlob = function (cb) {
        cb(new w.Blob([new Uint8Array(4321)], { type: 'image/jpeg' }));
      };
      w.URL.createObjectURL = () => 'blob:fingido';
      w.URL.revokeObjectURL = () => {};
      Object.defineProperty(w.Image.prototype, 'naturalWidth', { get: () => 1080, configurable: true });
      Object.defineProperty(w.Image.prototype, 'naturalHeight', { get: () => 2400, configurable: true });
      Object.defineProperty(w.HTMLImageElement.prototype, 'src', {
        configurable: true,
        get() { return this.getAttribute('src') || ''; },
        set(v) { this.setAttribute('src', v); const yo = this; setTimeout(() => { if (yo.onload) yo.onload(); }, 0); }
      });
      w.fetch = (ruta, o = {}) => {
        const cod = (o.headers || {})['x-codigo'];
        servidor.llamadas.push({ metodo: o.method || 'GET', ruta, codigo: cod });
        const resp = (cuerpo, status) => Promise.resolve({
          ok: status < 400, status, json: () => Promise.resolve(cuerpo)
        });
        if (servidor.caido) return Promise.reject(new Error('Failed to fetch'));
        if (cod !== codigoBueno) return resp({ error: 'Código incorrecto.' }, 401);
        const metodo = o.method || 'GET';

        if (ruta.startsWith('/api/foto/')) {
          const clave = ruta.slice('/api/foto/'.length);
          if (metodo === 'PUT') { servidor.fotos.set(clave, o.body); return resp({ ok: true }, 200); }
          if (metodo === 'DELETE') { servidor.fotos.delete(clave); return resp({ ok: true }, 200); }
          if (!servidor.fotos.has(clave)) return resp({ error: 'Esa captura ya no está.' }, 404);
          return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(servidor.fotos.get(clave)) });
        }

        if (metodo === 'GET') return resp(servidor.datos, 200);
        servidor.datos = JSON.parse(o.body);
        // El barrido de capturas huérfanas, igual que en la función de verdad.
        const vivas = new Set();
        for (const e of servidor.datos.etiquetas) if (e && e.foto) vivas.add(e.foto);
        for (const v of servidor.datos.historico)
          for (const e of (v.etiquetas || [])) if (e && e.foto) vivas.add(e.foto);
        for (const k of [...servidor.fotos.keys()]) if (!vivas.has(k)) servidor.fotos.delete(k);
        return resp({ ok: true }, 200);
      };
    }
  });
  return { w: dom.window, d: dom.window.document, servidor, errores };
}

(async () => {
  // ================= la puerta =================
  let { w, d, servidor, errores } = montaApp();
  let $ = s => d.querySelector(s);

  comprueba('la página arranca sin errores de JS', errores.length === 0, errores.join(' | '));
  comprueba('sin código, pide el código', $('#tarjetaCodigo').hidden === false);
  comprueba('sin código, la app está tapada', $('#contenido').hidden === true);

  $('#mCodigo').value = 'me-lo-invento';
  $('#btnEntrar').click();
  await espera(20);
  comprueba('un código malo no deja pasar', $('#contenido').hidden === true);
  comprueba('y lo dice', /Ese código no es/.test($('#cError').textContent), $('#cError').textContent);

  $('#mCodigo').value = 'abrete-sesamo';
  $('#btnEntrar').click();
  await espera(20);
  comprueba('el código bueno abre', $('#contenido').hidden === false);
  comprueba('y guarda el código para la próxima', w.localStorage.getItem('vinted.codigo') === 'abrete-sesamo');
  comprueba('manda el código en la cabecera', servidor.llamadas.every(l => 'codigo' in l));

  // ================= añadir =================
  const elige = t => d.querySelector('#mTrans button[data-t="' + t + '"]').click();
  // El botón mira lo escrito, y lo que se escribe a mano no avisa a nadie.
  const escribe = (sel, v) => {
    const c = d.querySelector(sel);
    c.value = v;
    c.dispatchEvent(new w.Event('input'));
  };

  comprueba('ningún transportista viene elegido de fábrica',
            [...d.querySelectorAll('#mTrans button')].every(b => b.getAttribute('aria-pressed') === 'false'));
  comprueba('con la página en blanco no se puede añadir', $('#btnAñadir').disabled === true);

  elige('inpost');
  comprueba('con transportista pero sin usuario, sigue apagado', $('#btnAñadir').disabled === true);

  escribe('#mUsuario', 'alejandroe910');
  comprueba('con usuario y transportista se enciende', $('#btnAñadir').disabled === false);
  escribe('#mArticulo', 'Chaqueta H&M');
  comprueba('el artículo no hace falta para encender', $('#btnAñadir').disabled === false);

  // Enter se salta el botón, así que ahí sí hay que decir qué falta.
  const conEnter = montaApp(null, { codigoGuardado: 'abrete-sesamo' });
  await espera(60);
  conEnter.d.querySelector('#mUsuario').value = 'quien-sea';
  conEnter.d.querySelector('#mUsuario')
    .dispatchEvent(new conEnter.w.KeyboardEvent('keydown', { key: 'Enter' }));
  comprueba('con Enter y sin transportista no añade',
            conEnter.d.querySelectorAll('#colaWrap ul.cola li').length === 0);
  comprueba('y dice qué falta',
            /Falta elegir el transportista/.test(conEnter.d.querySelector('#mError').textContent),
            conEnter.d.querySelector('#mError').textContent);
  comprueba('sin perder lo escrito', conEnter.d.querySelector('#mUsuario').value === 'quien-sea');
  $('#btnAñadir').click();
  comprueba('añade una etiqueta a la cola', d.querySelectorAll('#colaWrap ul.cola li').length === 1);
  comprueba('el transportista elegido se queda puesto para la siguiente',
            d.querySelector('#mTrans button[data-t="inpost"]').getAttribute('aria-pressed') === 'true');
  comprueba('pero el botón se apaga solo al vaciarse el usuario', $('#btnAñadir').disabled === true);
  comprueba('el selector ofrece Correos',
            [...d.querySelectorAll('#mTrans button')].some(b => b.getAttribute('data-t') === 'correos'));
  comprueba('y ya no ofrece "Otro"',
            ![...d.querySelectorAll('#mTrans button')].some(b => b.getAttribute('data-t') === 'otro'));
  comprueba('con un solo transportista no hay pestañas que tocar', $('#filtro').hidden === true);
  comprueba('el medidor pinta 10 huecos', d.querySelectorAll('.hueco-m').length === 10);
  comprueba('un hueco relleno', d.querySelectorAll('.hueco-m.lleno').length === 1);
  comprueba('la hoja tiene 1 página', d.querySelectorAll('.pagina').length === 1);

  await espera(700);
  comprueba('sube la etiqueta al servidor', servidor.datos.etiquetas.length === 1, JSON.stringify(servidor.datos.etiquetas.length));
  comprueba('con el usuario correcto', servidor.datos.etiquetas[0].usuario === 'alejandroe910');
  comprueba('y con su transportista', servidor.datos.etiquetas[0].transportista === 'inpost');

  for (let i = 2; i <= 11; i++) { escribe('#mUsuario', 'usuario' + i); $('#btnAñadir').click(); }
  comprueba('11 etiquetas -> 2 páginas', d.querySelectorAll('.pagina').length === 2, d.querySelectorAll('.pagina').length);
  comprueba('el subtítulo dice 2 hojas', /11 etiquetas · 2 hojas/.test($('#sub').textContent), $('#sub').textContent);

  const antes = servidor.llamadas.filter(l => l.metodo === 'PUT').length;
  await espera(700);
  const despues = servidor.llamadas.filter(l => l.metodo === 'PUT').length;
  comprueba('diez altas seguidas son una sola subida', despues - antes === 1, despues - antes);
  comprueba('el servidor tiene las 11', servidor.datos.etiquetas.length === 11);

  // ================= capturas =================
  const eligeUna = (dom, nombre = 'captura.jpg', tipo = 'image/jpeg') => {
    const inp = dom.d.querySelector('#ficheroFoto');
    Object.defineProperty(inp, 'files', {
      configurable: true,
      value: [new dom.w.File([new Uint8Array(900000)], nombre, { type: tipo })]
    });
    inp.dispatchEvent(new dom.w.Event('change'));
  };

  const antesFotos = servidor.fotos.size;
  eligeUna({ d, w });
  await espera(40);
  comprueba('la captura elegida sube al servidor', servidor.fotos.size === antesFotos + 1, servidor.fotos.size);
  comprueba('y se enseña la previa', $('#previa').hidden === false);
  comprueba('diciendo lo que pesa ya encogida', /KB/.test($('#previaTx').textContent), $('#previaTx').textContent);

  escribe('#mUsuario', 'con-captura');
  $('#btnAñadir').click();
  await espera(700);
  const conFoto = servidor.datos.etiquetas.filter(e => e.usuario === 'con-captura')[0];
  comprueba('la etiqueta se queda con su captura', !!(conFoto && conFoto.foto), JSON.stringify(conFoto));
  comprueba('la previa se limpia para la siguiente', $('#previa').hidden === true);
  comprueba('sale la miniatura en su fila', d.querySelectorAll('#colaWrap .mini-et:not(.pon)').length === 1);
  comprueba('las demás filas ofrecen ponerle una', d.querySelectorAll('#colaWrap .mini-et.pon').length === 11);
  comprueba('y solo en la suya', d.querySelectorAll('#colaWrap ul.cola > li').length === 12);

  // el orden del formulario y la hoja limpia
  const campos = [...d.querySelectorAll('#tpManual, .card')]
    .map(c => c.textContent).join(' ');
  const tras = d.querySelector('#btnCaptura').compareDocumentPosition(d.querySelector('#mTrans'));
  comprueba('la captura va DESPUÉS del transportista', (tras & 2) !== 0);
  comprueba('y ANTES de "Añadir a la hoja"',
            (d.querySelector('#btnCaptura').compareDocumentPosition(d.querySelector('#btnAñadir')) & 4) !== 0);
  comprueba('la hoja de impresión no lleva ni una imagen',
            d.querySelectorAll('#hoja img').length === 0, d.querySelectorAll('#hoja img').length);
  comprueba('ni miniaturas coladas en la hoja',
            d.querySelectorAll('#hoja .mini-et').length === 0);

  // tocar la etiqueta enseña la captura
  d.querySelector('#colaWrap .mini-et:not(.pon)').click();
  comprueba('al tocarla se abre el visor', $('#visor').hidden === false);
  comprueba('con el usuario en la barra', $('#visorQuien').textContent === 'con-captura');
  await espera(40);
  comprueba('y trae la imagen', !!$('#visorLienzo img'), $('#visorLienzo').textContent);
  $('#visorCerrar').click();
  comprueba('se cierra', $('#visor').hidden === true);

  // quitar la etiqueta se lleva su captura
  const clavesAntes = servidor.fotos.size;
  const quitar = [...d.querySelectorAll('#colaWrap ul.cola > li')]
    .filter(li => li.textContent.includes('con-captura'))[0].querySelector('.quitar');
  quitar.click();
  await espera(700);
  comprueba('quitar la etiqueta borra su captura', servidor.fotos.size === clavesAntes - 1, servidor.fotos.size);
  comprueba('y la fila desaparece', d.querySelectorAll('#colaWrap ul.cola > li').length === 11);

  // una captura que sigue viva porque la referencia una venta
  eligeUna({ d, w });
  await espera(40);
  escribe('#mUsuario', 'va-al-historico');
  $('#btnAñadir').click();
  await espera(700);
  const laClave = servidor.datos.etiquetas.filter(e => e.usuario === 'va-al-historico')[0].foto;
  comprueba('la captura está guardada', servidor.fotos.has(laClave));

  // ================= enganchar una captura después =================
  const sinFoto = [...d.querySelectorAll('#colaWrap ul.cola > li')]
    .filter(li => li.querySelector('.mini-et.pon'))[0];
  const quien = sinFoto.querySelector('.u').textContent;
  const fotosAntes = servidor.fotos.size;
  sinFoto.querySelector('.mini-et.pon').click();     // deja el destino apuntado
  eligeUna({ d, w });
  await espera(700);                                 // la subida se agrupa medio segundo
  const yaConFoto = servidor.datos.etiquetas.filter(e => e.usuario === quien)[0];
  comprueba('se le puede enganchar una captura después', !!(yaConFoto && yaConFoto.foto), JSON.stringify(yaConFoto));
  comprueba('y sube al servidor', servidor.fotos.size === fotosAntes + 1);
  comprueba('la fila cambia el hueco por la miniatura',
            [...d.querySelectorAll('#colaWrap ul.cola > li')]
              .filter(li => li.querySelector('.u').textContent === quien)[0]
              .querySelector('.mini-et:not(.pon)') !== null);
  comprueba('no toca la previa del formulario', $('#previa').hidden === true);

  // cambiarla por otra: la vieja se va
  const claveVieja = yaConFoto.foto;
  [...d.querySelectorAll('#colaWrap ul.cola > li')]
    .filter(li => li.querySelector('.u').textContent === quien)[0]
    .querySelector('.mini-et:not(.pon)').click();
  comprueba('el visor ofrece Cambiar y Quitar', $('#visorCambiar').hidden === false && $('#visorQuitar').hidden === false);
  $('#visorCambiar').click();
  eligeUna({ d, w });
  await espera(700);
  const cambiada = servidor.datos.etiquetas.filter(e => e.usuario === quien)[0];
  comprueba('cambiar deja otra clave', cambiada.foto !== claveVieja, cambiada.foto);
  comprueba('y borra la que sustituye', !servidor.fotos.has(claveVieja));

  // quitarla del todo
  [...d.querySelectorAll('#colaWrap ul.cola > li')]
    .filter(li => li.querySelector('.u').textContent === quien)[0]
    .querySelector('.mini-et:not(.pon)').click();
  $('#visorQuitar').click();
  await espera(700);
  const desnuda = servidor.datos.etiquetas.filter(e => e.usuario === quien)[0];
  comprueba('quitar la deja sin captura', !desnuda.foto && !desnuda.mini);
  comprueba('y la borra del servidor', !servidor.fotos.has(cambiada.foto));
  comprueba('la fila vuelve a ofrecer el hueco',
            [...d.querySelectorAll('#colaWrap ul.cola > li')]
              .filter(li => li.querySelector('.u').textContent === quien)[0]
              .querySelector('.mini-et.pon') !== null);

  // ================= guardar selección NO archiva =================
  $('#btnGuardar').click();
  await espera(700);
  comprueba('guardar selección NO crea una venta', servidor.datos.historico.length === 0);
  comprueba('guardar selección NO vacía la cola', d.querySelectorAll('#colaWrap ul.cola > li').length === 12);
  comprueba('el histórico sigue vacío en pantalla', d.querySelectorAll('ul.hist > li').length === 0);

  // ================= el histórico solo nace al imprimir =================
  $('#btnImprimir').click();
  comprueba('imprimir llama a window.print()', w.__imprimio === 1);
  await espera(700);
  comprueba('imprimir sí crea la venta', servidor.datos.historico.length === 1, servidor.datos.historico.length);
  comprueba('con las 12 etiquetas dentro', servidor.datos.historico[0].etiquetas.length === 12);
  comprueba('nombre "Venta dd/mm/aaaa hh:mm"', /^Venta \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(servidor.datos.historico[0].nombre), servidor.datos.historico[0].nombre);
  comprueba('pregunta si ha salido bien', /salido bien la impresión/.test($('#parte').textContent));
  comprueba('ofrece las dos salidas', !!$('#siVaciar') && !!$('#noVaciar'));

  comprueba('la captura sobrevive dentro de la venta', servidor.fotos.has(laClave));
  $('#noVaciar').click();
  comprueba('"No, dejarla" conserva la cola', d.querySelectorAll('#colaWrap ul.cola > li').length === 12);
  comprueba('y cierra el aviso', $('#parte').hidden === true);

  $('#btnImprimir').click();
  $('#siVaciar').click();
  comprueba('"Sí, vaciar" deja la cola a 0', d.querySelectorAll('#colaWrap ul.cola > li').length === 0);
  await espera(700);
  comprueba('el servidor también la vacía', servidor.datos.etiquetas.length === 0);
  comprueba('pero conserva las 2 ventas', servidor.datos.historico.length === 2);
  comprueba('y la captura archivada NO se barre', servidor.fotos.has(laClave));

  // ================= desplegar y devolver =================
  const cab = $('ul.hist .cab');
  comprueba('la venta empieza plegada', $('ul.hist .cuerpo').hidden === true);
  cab.click();
  comprueba('se despliega al tocarla', $('ul.hist .cuerpo').hidden === false);
  comprueba('enseña quién iba dentro', $('ul.hist .cuerpo').querySelectorAll('li').length === 12);
  comprueba('con su miniatura en el histórico', $('ul.hist .cuerpo').querySelectorAll('.mini-et:not(.pon)').length === 1);

  $('ul.hist .devolver').click();
  comprueba('devuelve las etiquetas a la cola', d.querySelectorAll('#colaWrap ul.cola > li').length === 12);
  $('ul.hist .devolver').click();
  comprueba('devolver dos veces suma, no pisa', d.querySelectorAll('#colaWrap ul.cola > li').length === 24);
  await espera(700);
  const ids = servidor.datos.etiquetas.map(e => e.id);
  comprueba('con ids nuevos y sin repetir', new Set(ids).size === 24, new Set(ids).size);
  comprueba('la captura viaja con la etiqueta devuelta',
            servidor.datos.etiquetas.filter(e => e.foto === laClave).length === 2);

  // ================= olvidar el código =================
  $('#btnSalir').click();
  comprueba('olvidar el código vuelve a tapar la app', $('#contenido').hidden === true);
  comprueba('y lo borra de este navegador', w.localStorage.getItem('vinted.codigo') === null);
  comprueba('el servidor NO se toca al olvidar', servidor.datos.etiquetas.length === 24);

  // ================= volver con el código ya guardado =================
  const guardado = servidor.datos;
  const vuelta = montaApp(guardado, { codigoGuardado: 'abrete-sesamo',
    cacheVieja: [{ id: 'x', usuario: 'copia-vieja', transportista: 'inpost' }] });
  await espera(60);
  comprueba('con el código guardado entra sola', vuelta.d.querySelector('#contenido').hidden === false);
  comprueba('sin volver a pedirlo', vuelta.d.querySelector('#tarjetaCodigo').hidden === true);
  comprueba('manda el que tenía guardado', vuelta.servidor.llamadas[0].codigo === 'abrete-sesamo');

  // El servidor manda: la copia vieja del navegador no debe ganar.
  const enPantalla = [...vuelta.d.querySelectorAll('#colaWrap ul.cola .u')].map(e => e.textContent);
  comprueba('lo del servidor pisa la copia local', enPantalla.length === 24, enPantalla.length);
  comprueba('y la copia vieja desaparece', !enPantalla.includes('copia-vieja'));
  comprueba('el histórico también baja', vuelta.d.querySelectorAll('ul.hist > li').length === 2);
  comprueba('dice que está guardado', /Guardado en el servidor/.test(vuelta.d.querySelector('#estado').textContent),
            vuelta.d.querySelector('#estado').textContent);

  // ================= la primera vez no se pierde nada =================
  const migra = montaApp({ etiquetas: [], historico: [] }, {
    codigoGuardado: 'abrete-sesamo',
    cacheVieja: [{ id: 'a', usuario: 'de-antes-del-servidor', transportista: 'inpost' }]
  });
  await espera(80);
  comprueba('servidor vacío + trabajo local = se sube, no se borra',
            migra.servidor.datos.etiquetas.length === 1, migra.servidor.datos.etiquetas.length);
  comprueba('con el usuario intacto',
            (migra.servidor.datos.etiquetas[0] || {}).usuario === 'de-antes-del-servidor');
  comprueba('y sigue en pantalla',
            migra.d.querySelectorAll('#colaWrap ul.cola > li').length === 1);

  // ================= sin conexión =================
  const caido = montaApp(guardado, { caido: true });
  caido.d.querySelector('#mCodigo').value = 'abrete-sesamo';
  caido.d.querySelector('#btnEntrar').click();
  await espera(30);
  comprueba('si el servidor no responde, lo dice', /No se ha podido conectar/.test(caido.d.querySelector('#cError').textContent),
            caido.d.querySelector('#cError').textContent);
  comprueba('y no deja entrar a ciegas', caido.d.querySelector('#contenido').hidden === true);

  // Con el código ya guardado y sin red, sí se entra: se enseña la última copia.
  const sinRed = montaApp(guardado, { codigoGuardado: 'abrete-sesamo', caido: true,
    cacheVieja: [{ id: 'x', usuario: 'copia-vieja', transportista: 'inpost' }] });
  await espera(60);
  comprueba('sin red se sigue trabajando con la copia local', sinRed.d.querySelector('#contenido').hidden === false);
  comprueba('y avisa de que no hay servidor', /Sin conexión/.test(sinRed.d.querySelector('#estado').textContent),
            sinRed.d.querySelector('#estado').textContent);
  comprueba('enseñando lo último que se vio aquí',
            [...sinRed.d.querySelectorAll('#colaWrap ul.cola .u')].map(e => e.textContent).includes('copia-vieja'));

  // ================= el filtro de la cola =================
  const filtra = montaApp({ etiquetas: [
    { id: 'f1', usuario: 'uno',    transportista: 'inpost' },
    { id: 'f2', usuario: 'dos',    transportista: 'mondial' },
    { id: 'f3', usuario: 'tres',   transportista: 'inpost' },
    { id: 'f4', usuario: 'cuatro', transportista: 'correos' }
  ], historico: [] }, { codigoGuardado: 'abrete-sesamo' });
  await espera(60);
  const fd = filtra.d, f$ = s => fd.querySelector(s);
  comprueba('con varios transportistas salen las pestañas', f$('#filtro').hidden === false);
  comprueba('una por transportista de la cola, más "Todos"',
            fd.querySelectorAll('#filtro button').length === 4, fd.querySelectorAll('#filtro button').length);
  comprueba('no cuela pestañas de los que no hay',
            !f$('#filtro button[data-f="vintedgo"]'));
  comprueba('empieza en "Todos"', f$('#filtro button[data-f="todos"]').getAttribute('aria-pressed') === 'true');
  comprueba('y se ven las cuatro', fd.querySelectorAll('#colaWrap ul.cola > li').length === 4);

  f$('#filtro button[data-f="inpost"]').click();
  comprueba('al elegir InPost quedan solo las suyas',
            fd.querySelectorAll('#colaWrap ul.cola > li').length === 2, fd.querySelectorAll('#colaWrap ul.cola > li').length);
  comprueba('con el número que tienen en la hoja, no renumeradas',
            [...fd.querySelectorAll('#colaWrap .n')].map(e => e.textContent).join(',') === '01,03',
            [...fd.querySelectorAll('#colaWrap .n')].map(e => e.textContent).join(','));
  comprueba('el medidor sigue contando la cola entera', fd.querySelectorAll('.hueco-m.lleno').length === 4);
  comprueba('y la hoja se imprime entera', fd.querySelectorAll('.pagina .et').length === 4);

  f$('#filtro button[data-f="todos"]').click();
  comprueba('"Todos" las trae de vuelta', fd.querySelectorAll('#colaWrap ul.cola > li').length === 4);

  f$('#filtro button[data-f="correos"]').click();
  comprueba('el filtro de Correos deja una', fd.querySelectorAll('#colaWrap ul.cola > li').length === 1);
  fd.querySelector('#colaWrap ul.cola > li .quitar').click();
  comprueba('si se acaba el transportista filtrado, vuelve a todos y no se queda en blanco',
            fd.querySelectorAll('#colaWrap ul.cola > li').length === 3,
            fd.querySelectorAll('#colaWrap ul.cola > li').length);

  // ================= lo guardado con «Otro» no se rompe =================
  const legado = montaApp({ etiquetas: [
    { id: 'v1', usuario: 'de-antes', transportista: 'otro', otroNombre: 'Seur' }
  ], historico: [] }, { codigoGuardado: 'abrete-sesamo' });
  await espera(60);
  comprueba('las etiquetas viejas de "Otro" conservan su nombre',
            /SEUR/.test(legado.d.querySelector('#colaWrap .t').textContent),
            legado.d.querySelector('#colaWrap .t').textContent);

  // ================= eliminar una venta guardada =================
  const borra = montaApp({ etiquetas: [], historico: [
    { id: 'v1', nombre: 'Venta 01/01/2026 10:00', cuando: 1,
      etiquetas: [{ id: 'a', usuario: 'uno', transportista: 'inpost' }] },
    { id: 'v2', nombre: 'Venta 02/01/2026 10:00', cuando: 2,
      etiquetas: [{ id: 'b', usuario: 'dos', transportista: 'inpost' }] }
  ] }, { codigoGuardado: 'abrete-sesamo' });
  await espera(60);
  const bd = borra.d;
  comprueba('parte de dos ventas guardadas', bd.querySelectorAll('ul.hist > li').length === 2);
  bd.querySelector('ul.hist .cab').click();
  const boton = bd.querySelector('ul.hist .borrar');
  boton.click();
  comprueba('un toque no borra, pregunta',
            bd.querySelectorAll('ul.hist > li').length === 2 && /Seguro/.test(boton.textContent), boton.textContent);
  boton.click();
  comprueba('el segundo toque la elimina', bd.querySelectorAll('ul.hist > li').length === 1);
  comprueba('y respeta la otra', /02\/01\/2026/.test(bd.querySelector('ul.hist .nom').textContent),
            bd.querySelector('ul.hist .nom').textContent);
  await espera(700);
  comprueba('el servidor se entera', borra.servidor.datos.historico.length === 1, borra.servidor.datos.historico.length);
  comprueba('y la cola no se toca', borra.servidor.datos.etiquetas.length === 0);

  console.log('');
  console.log(fallos === 0 ? `TODO EN VERDE — ${ok} comprobaciones` : `${fallos} FALLOS de ${ok + fallos}`);
  process.exit(fallos ? 1 : 0);
})();
