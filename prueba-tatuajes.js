/* Prueba de humo de tatuajes.html, sin navegador.

     npm i        (una vez)
     npm test

   La página no depende de esto: sigue siendo un archivo suelto. La prueba
   existe por lo mismo que la de las etiquetas: para que un despiste no suba
   una página muerta con la sintaxis perfecta. */

const fs = require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const html = fs.readFileSync(__dirname + '/tatuajes.html', 'utf8');

let fallos = 0, ok = 0;
function comprueba(nombre, cond, extra) {
  if (cond) ok++;
  else { fallos++; console.log('  ✗ ' + nombre + (extra !== undefined ? '  -> ' + extra : '')); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));

/* jsdom no trae canvas: se finge el trozo que usa la página. getImageData
   devuelve media imagen negra y media blanca, que es justo lo que hay que
   distinguir al quitar el fondo. */
function fingeCanvas(w) {
  const ctxs = new WeakMap();
  w.HTMLCanvasElement.prototype.getContext = function () {
    if (!ctxs.has(this)) {
      const lienzo = this;
      ctxs.set(this, {
        canvas: lienzo,
        fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
        fillRect() {}, clearRect() {}, drawImage() {}, strokeRect() {}, setLineDash() {},
        save() {}, restore() {}, translate() {}, rotate() {}, scale() {},
        getImageData(x, y, an, al) {
          const d = new Uint8ClampedArray(an * al * 4);
          const mitad = Math.floor((an * al) / 2) * 4;
          for (let i = 0; i < d.length; i += 4) {
            const tinta = i < mitad;
            d[i] = d[i + 1] = d[i + 2] = tinta ? 0 : 255;
            d[i + 3] = 255;
          }
          return { data: d, width: an, height: al };
        },
        putImageData(d) { lienzo.__pix = d; }
      });
    }
    return ctxs.get(this);
  };
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=';
  w.HTMLCanvasElement.prototype.toBlob = function (cb) {
    cb(new w.Blob([new Uint8Array(2048)], { type: 'image/jpeg' }));
  };
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  Object.defineProperty(w.Image.prototype, 'naturalWidth', { get: () => 1080, configurable: true });
  Object.defineProperty(w.Image.prototype, 'naturalHeight', { get: () => 2400, configurable: true });
  Object.defineProperty(w.HTMLImageElement.prototype, 'src', {
    configurable: true,
    get() { return this.getAttribute('src') || ''; },
    set(v) { this.setAttribute('src', v); const yo = this; setTimeout(() => { if (yo.onload) yo.onload(); }, 0); }
  });
}

function montaApp(opciones = {}) {
  const errores = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errores.push(e.message.split('\n')[0]));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://ejemplo.test/', virtualConsole: vc,
    pretendToBeVisual: true,
    beforeParse(w) {
      fingeCanvas(w);
      w.__urls = 0;
      w.URL.createObjectURL = () => { w.__urls++; return 'blob:fingido'; };
      w.URL.revokeObjectURL = () => {};
      const camara = opciones.camara;
      if (camara) {
        w.navigator.mediaDevices = {
          getUserMedia: peticion => {
            w.__pedidas = (w.__pedidas || []).concat([peticion.video.facingMode]);
            if (camara === 'no') { const e = new Error('nel'); e.name = 'NotAllowedError'; return Promise.reject(e); }
            return Promise.resolve({ parado: 0, getTracks() { const s = this; return [{ stop() { s.parado++; } }]; } });
          }
        };
      } else if (opciones.sinCamara) {
        w.navigator.mediaDevices = undefined;
      }
    }
  });
  const w = dom.window, d = w.document;
  return { w, d, errores, $: s => d.querySelector(s) };
}

/* Mete un archivo en un <input type=file> y avisa, como haría el usuario. */
function eligeArchivo(app, selector, nombre) {
  const inp = app.$(selector);
  const f = new app.w.File([new Uint8Array([1, 2, 3, 4])], nombre, { type: 'image/png' });
  Object.defineProperty(inp, 'files', { configurable: true, value: [f] });
  inp.dispatchEvent(new app.w.Event('change'));
}

function dedo(app, tipo, x, y) {
  const ev = new app.w.MouseEvent(tipo, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(ev, 'pointerId', { value: 1 });
  app.$('#lienzo').dispatchEvent(ev);
}

(async () => {
  console.log('Probador de tatuajes');

  /* ---------- Arranque ---------- */
  const app = montaApp();
  await espera(60);
  comprueba('la página arranca sin reventar', app.errores.length === 0, app.errores[0]);
  comprueba('empieza pidiendo la piel', app.$('#inicio').hidden === false && app.$('#editor').hidden === true);
  comprueba('y no hay ajustes que tocar todavía', app.$('#ajustes').classList.contains('sinCapa'));

  /* jsdom no aplica la hoja de estilos a fondo, así que esta va a ojo sobre el
     texto: la página pone display en media docena de reglas, y sin esto el
     hidden del navegador se lo comen y los botones escondidos se siguen viendo. */
  comprueba('el hidden gana a los display de la hoja',
            /\[hidden\]\{display:none!important\}/.test(html));

  /* ---------- Una foto de la galería ---------- */
  eligeArchivo(app, '#filBase', 'brazo.png');
  await espera(80);
  const est = app.w.__tat;
  comprueba('con la foto puesta se abre el editor', app.$('#editor').hidden === false && app.$('#inicio').hidden === true);
  comprueba('la foto se encoge a 1600 de lado largo',
            app.$('#lienzo').width === 720 && app.$('#lienzo').height === 1600,
            app.$('#lienzo').width + 'x' + app.$('#lienzo').height);
  comprueba('sin cámara abierta no salen sus botones',
            app.$('#btnCongelar').hidden === true && app.$('#btnGirarCam').hidden === true);

  /* ---------- Un diseño ---------- */
  eligeArchivo(app, '#filDisenyo', 'aguila.png');
  await espera(80);
  comprueba('el diseño entra en la tira', app.d.querySelectorAll('#tira .hueco').length === 1);
  comprueba('y se puede ajustar', !app.$('#ajustes').classList.contains('sinCapa'));
  comprueba('la miniatura tiene imagen', !!app.d.querySelector('#tira .mini img').getAttribute('src'));

  const capa = est.capas[0];
  comprueba('como la imagen es opaca, le quita el fondo solo', capa.quitarFondo === true);
  const pix = capa.lienzo.__pix.data;
  comprueba('la tinta se queda opaca', pix[3] === 255 && pix[0] === 0, [pix[0], pix[3]].join(','));
  const ultimo = pix.length - 4;
  comprueba('y el blanco del papel desaparece', pix[ultimo + 3] === 0, pix[ultimo + 3]);

  /* ---------- Los mandos ---------- */
  const tam = app.$('#ctlTam');
  tam.value = '90';
  tam.dispatchEvent(new app.w.Event('input'));
  comprueba('el tamaño se mueve', Math.round(capa.frac * 100) === 90 && app.$('#vTam').textContent === '90%');

  const giro = app.$('#ctlGiro');
  giro.value = '-90';
  giro.dispatchEvent(new app.w.Event('input'));
  comprueba('el giro también', Math.round(capa.rot * 180 / Math.PI) === -90);

  app.$('#btnEspejo').click();
  comprueba('el espejo se queda marcado',
            capa.espejo === true && app.$('#btnEspejo').getAttribute('aria-pressed') === 'true');

  app.$('#chkTinta').click();
  comprueba('la tinta se puede cambiar de color', capa.tinta === '#1a1a1a');

  app.$('#chkFondo').click();
  comprueba('quitando el recorte se esconde su mando',
            capa.quitarFondo === false && app.$('#ctlUmbWrap').hidden === true);
  app.$('#chkFondo').click();
  comprueba('y vuelve al ponerlo', capa.quitarFondo === true && app.$('#ctlUmbWrap').hidden === false);

  /* ---------- Arrastrar ---------- */
  const antes = capa.nx;
  dedo(app, 'pointerdown', 100, 100);
  dedo(app, 'pointermove', 172, 100);
  dedo(app, 'pointerup', 172, 100);
  comprueba('arrastrar mueve el diseño',
            Math.abs(capa.nx - (antes + 72 / app.$('#lienzo').width)) < 1e-9, capa.nx);
  comprueba('y no se escapa del lienzo', capa.nx <= 1.2 && capa.ny >= -0.2);

  /* ---------- Guardar ---------- */
  let bajada = null;
  app.d.addEventListener('click', ev => { if (ev.target.id === 'descarga') bajada = ev.target.download; }, true);
  app.$('#btnGuardar').click();
  await espera(80);
  comprueba('guardar saca un archivo', !!bajada && /^tatuaje-\d+\.jpg$/.test(bajada), bajada);
  comprueba('y avisa de dónde ha ido', app.$('#aviso').hidden === false);

  /* ---------- Comparar y quitar ---------- */
  app.$('#btnComparar').click();
  comprueba('se puede ver la piel sin tatuaje',
            est.comparando === true && app.$('#btnComparar').textContent === 'Ver con tatuaje');
  app.$('#btnComparar').click();
  comprueba('y volver', est.comparando === false);

  app.d.querySelector('#tira .quita').click();
  comprueba('el diseño se quita',
            est.capas.length === 0 && app.d.querySelectorAll('#tira .hueco').length === 0);
  comprueba('y los ajustes se van con él',
            app.$('#ajustes').classList.contains('sinCapa') && app.$('#sinDisenyos').hidden === false);

  /* ---------- La cámara ---------- */
  const sinPermiso = montaApp({ camara: 'no' });
  await espera(40);
  sinPermiso.$('#btnCamara').click();
  await espera(60);
  comprueba('si no hay permiso lo dice y no se queda a medias',
            sinPermiso.$('#aviso').hidden === false &&
            sinPermiso.$('#aviso').className.indexOf('mal') >= 0 &&
            sinPermiso.$('#editor').hidden === true,
            sinPermiso.$('#aviso').textContent);

  const nada = montaApp({ sinCamara: true });
  await espera(40);
  nada.$('#btnCamara').click();
  await espera(40);
  comprueba('sin cámara en el aparato manda a la galería',
            nada.$('#aviso').hidden === false && nada.$('#aviso').textContent.indexOf('galería') > 0);

  const cam = montaApp({ camara: 'si' });
  await espera(40);
  cam.$('#btnCamara').click();
  await espera(80);
  comprueba('con permiso se abre la cámara de atrás',
            cam.w.__tat.tipo === 'camara' && cam.w.__pedidas[0] === 'environment');
  comprueba('y salen sus botones',
            cam.$('#btnCongelar').hidden === false && cam.$('#btnGirarCam').hidden === false);

  cam.$('#btnGirarCam').click();
  await espera(80);
  comprueba('la otra cámara es la de delante', cam.w.__pedidas[1] === 'user');

  const vivo = cam.w.__tat.stream;
  cam.$('#btnCongelar').click();
  await espera(40);
  comprueba('congelar deja una foto quieta', cam.w.__tat.tipo === 'foto' && !!cam.w.__tat.base);
  comprueba('y apaga la cámara', cam.w.__tat.stream === null && vivo.parado === 1);
  comprueba('los botones de cámara se esconden', cam.$('#btnCongelar').hidden === true);

  cam.$('#btnOtraBase').click();
  comprueba('cambiar la foto vuelve al principio',
            cam.$('#inicio').hidden === false && cam.$('#editor').hidden === true);

  console.log('');
  console.log(fallos === 0 ? `TODO EN VERDE — ${ok} comprobaciones` : `${fallos} FALLOS de ${ok + fallos}`);
  process.exit(fallos ? 1 : 0);
})();
