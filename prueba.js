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
  const servidor = { datos: datosIniciales || { etiquetas: [], historico: [] }, llamadas: [] };
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
      w.fetch = (ruta, o = {}) => {
        const cod = (o.headers || {})['x-codigo'];
        servidor.llamadas.push({ metodo: o.method || 'GET', ruta, codigo: cod });
        const resp = (cuerpo, status) => Promise.resolve({
          ok: status < 400, status, json: () => Promise.resolve(cuerpo)
        });
        if (servidor.caido) return Promise.reject(new Error('Failed to fetch'));
        if (cod !== codigoBueno) return resp({ error: 'Código incorrecto.' }, 401);
        if ((o.method || 'GET') === 'GET') return resp(servidor.datos, 200);
        servidor.datos = JSON.parse(o.body);
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
  $('#mUsuario').value = 'alejandroe910';
  $('#mArticulo').value = 'Chaqueta H&M';
  $('#btnAñadir').click();
  comprueba('añade una etiqueta a la cola', d.querySelectorAll('#colaWrap ul.cola li').length === 1);
  comprueba('el medidor pinta 10 huecos', d.querySelectorAll('.hueco-m').length === 10);
  comprueba('un hueco relleno', d.querySelectorAll('.hueco-m.lleno').length === 1);
  comprueba('la hoja tiene 1 página', d.querySelectorAll('.pagina').length === 1);

  await espera(700);
  comprueba('sube la etiqueta al servidor', servidor.datos.etiquetas.length === 1, JSON.stringify(servidor.datos.etiquetas.length));
  comprueba('con el usuario correcto', servidor.datos.etiquetas[0].usuario === 'alejandroe910');

  for (let i = 2; i <= 11; i++) { $('#mUsuario').value = 'usuario' + i; $('#btnAñadir').click(); }
  comprueba('11 etiquetas -> 2 páginas', d.querySelectorAll('.pagina').length === 2, d.querySelectorAll('.pagina').length);
  comprueba('el subtítulo dice 2 hojas', /11 etiquetas · 2 hojas/.test($('#sub').textContent), $('#sub').textContent);

  const antes = servidor.llamadas.filter(l => l.metodo === 'PUT').length;
  await espera(700);
  const despues = servidor.llamadas.filter(l => l.metodo === 'PUT').length;
  comprueba('diez altas seguidas son una sola subida', despues - antes === 1, despues - antes);
  comprueba('el servidor tiene las 11', servidor.datos.etiquetas.length === 11);

  // ================= guardar selección NO archiva =================
  $('#btnGuardar').click();
  await espera(700);
  comprueba('guardar selección NO crea una venta', servidor.datos.historico.length === 0);
  comprueba('guardar selección NO vacía la cola', d.querySelectorAll('#colaWrap ul.cola > li').length === 11);
  comprueba('el histórico sigue vacío en pantalla', d.querySelectorAll('ul.hist > li').length === 0);

  // ================= el histórico solo nace al imprimir =================
  $('#btnImprimir').click();
  comprueba('imprimir llama a window.print()', w.__imprimio === 1);
  await espera(700);
  comprueba('imprimir sí crea la venta', servidor.datos.historico.length === 1, servidor.datos.historico.length);
  comprueba('con las 11 etiquetas dentro', servidor.datos.historico[0].etiquetas.length === 11);
  comprueba('nombre "Venta dd/mm/aaaa hh:mm"', /^Venta \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(servidor.datos.historico[0].nombre), servidor.datos.historico[0].nombre);
  comprueba('pregunta si ha salido bien', /salido bien la impresión/.test($('#parte').textContent));
  comprueba('ofrece las dos salidas', !!$('#siVaciar') && !!$('#noVaciar'));

  $('#noVaciar').click();
  comprueba('"No, dejarla" conserva la cola', d.querySelectorAll('#colaWrap ul.cola > li').length === 11);
  comprueba('y cierra el aviso', $('#parte').hidden === true);

  $('#btnImprimir').click();
  $('#siVaciar').click();
  comprueba('"Sí, vaciar" deja la cola a 0', d.querySelectorAll('#colaWrap ul.cola > li').length === 0);
  await espera(700);
  comprueba('el servidor también la vacía', servidor.datos.etiquetas.length === 0);
  comprueba('pero conserva las 2 ventas', servidor.datos.historico.length === 2);

  // ================= desplegar y devolver =================
  const cab = $('ul.hist .cab');
  comprueba('la venta empieza plegada', $('ul.hist .cuerpo').hidden === true);
  cab.click();
  comprueba('se despliega al tocarla', $('ul.hist .cuerpo').hidden === false);
  comprueba('enseña quién iba dentro', $('ul.hist .cuerpo').querySelectorAll('li').length === 11);

  $('ul.hist .devolver').click();
  comprueba('devuelve las etiquetas a la cola', d.querySelectorAll('#colaWrap ul.cola > li').length === 11);
  $('ul.hist .devolver').click();
  comprueba('devolver dos veces suma, no pisa', d.querySelectorAll('#colaWrap ul.cola > li').length === 22);
  await espera(700);
  const ids = servidor.datos.etiquetas.map(e => e.id);
  comprueba('con ids nuevos y sin repetir', new Set(ids).size === 22, new Set(ids).size);

  // ================= olvidar el código =================
  $('#btnSalir').click();
  comprueba('olvidar el código vuelve a tapar la app', $('#contenido').hidden === true);
  comprueba('y lo borra de este navegador', w.localStorage.getItem('vinted.codigo') === null);
  comprueba('el servidor NO se toca al olvidar', servidor.datos.etiquetas.length === 22);

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
  comprueba('lo del servidor pisa la copia local', enPantalla.length === 22, enPantalla.length);
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

  console.log('');
  console.log(fallos === 0 ? `TODO EN VERDE — ${ok} comprobaciones` : `${fallos} FALLOS de ${ok + fallos}`);
  process.exit(fallos ? 1 : 0);
})();
