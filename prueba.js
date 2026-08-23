/* Prueba de humo de index.html, sin navegador.
   Sirve para lo de siempre: que la página arranque sin petar y que lo básico
   siga funcionando después de tocar el archivo.

     npm i jsdom     (una vez)
     node prueba.js

   La app NO depende de esto: index.html sigue sin build ni dependencias.
   Esta prueba existe porque una vez se subió el archivo con medio JS borrado,
   la sintaxis era válida y nadie se enteró hasta abrirlo. */
const fs=require('fs'), {JSDOM}=require('jsdom');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
let fallos=0, ok=0;
function comprueba(nombre, cond, extra){
  if(cond){ ok++; } else { fallos++; console.log('  ✗ '+nombre+(extra?'  -> '+extra:'')); }
}
const errores=[];
const dom=new JSDOM(html,{runScripts:'dangerously', url:'https://ejemplo.test/',
  virtualConsole:new (require('jsdom').VirtualConsole)()
    .on('jsdomError',e=>errores.push(e.message)).on('error',e=>errores.push(String(e)))});
const w=dom.window, d=w.document;
w.print=function(){ w.__imprimio=(w.__imprimio||0)+1; };

comprueba('la página arranca sin errores de JS', errores.length===0, errores.join(' | '));
const $=s=>d.querySelector(s);

// --- añadir a mano ---
$('#mUsuario').value='alejandroe910';
$('#mArticulo').value='Chaqueta H&M';
$('#btnAñadir').click();
comprueba('añade una etiqueta a la cola', d.querySelectorAll('#colaWrap ul.cola li').length===1);
comprueba('la guarda en localStorage', JSON.parse(w.localStorage.getItem('vinted.etiquetas')).length===1);
comprueba('el medidor pinta 10 huecos', d.querySelectorAll('.hueco-m').length===10);
comprueba('un hueco relleno', d.querySelectorAll('.hueco-m.lleno').length===1);
comprueba('la hoja tiene 1 página', d.querySelectorAll('.pagina').length===1);

for(let i=2;i<=11;i++){ $('#mUsuario').value='usuario'+i; $('#btnAñadir').click(); }
comprueba('11 etiquetas -> 2 páginas', d.querySelectorAll('.pagina').length===2, d.querySelectorAll('.pagina').length);
comprueba('el subtítulo dice 2 hojas', /11 etiquetas · 2 hojas/.test($('#sub').textContent), $('#sub').textContent);

// --- histórico: guardar selección ---
comprueba('el botón Guardar selección existe', !!$('#btnGuardar'));
$('#btnGuardar').click();
let hist=JSON.parse(w.localStorage.getItem('vinted.historico'));
comprueba('guarda la venta en el histórico', hist.length===1, JSON.stringify(hist&&hist.length));
comprueba('con las 11 etiquetas dentro', hist[0].etiquetas.length===11);
comprueba('el nombre es "Venta dd/mm/aaaa hh:mm"', /^Venta \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(hist[0].nombre), hist[0].nombre);
comprueba('guardar NO vacía la cola', d.querySelectorAll('#colaWrap ul.cola > li').length===11);
comprueba('sale en la lista de ventas', d.querySelectorAll('ul.hist > li').length===1);

// --- desplegar ---
const cab=$('ul.hist .cab');
comprueba('empieza plegada', $('ul.hist .cuerpo').hidden===true);
cab.click();
comprueba('se despliega al tocarla', $('ul.hist .cuerpo').hidden===false);
comprueba('enseña quién iba dentro', $('ul.hist .cuerpo').querySelectorAll('li').length===11);
cab.click();
comprueba('se vuelve a plegar', $('ul.hist .cuerpo').hidden===true);

// --- imprimir ---
$('#btnImprimir').click();
comprueba('imprimir llama a window.print()', w.__imprimio===1);
hist=JSON.parse(w.localStorage.getItem('vinted.historico'));
comprueba('imprimir archiva otra venta', hist.length===2);
comprueba('la más nueva va primero', hist[0].cuando>=hist[1].cuando);
comprueba('pregunta si ha salido bien', /salido bien la impresión/.test($('#parte').textContent), $('#parte').textContent.slice(0,60));
comprueba('ofrece vaciar', !!$('#siVaciar') && !!$('#noVaciar'));

$('#noVaciar').click();
comprueba('"No, dejarla" conserva la cola', d.querySelectorAll('#colaWrap ul.cola > li').length===11);
comprueba('y cierra el aviso', $('#parte').hidden===true);

$('#btnImprimir').click();
$('#siVaciar').click();
comprueba('"Sí, vaciar" deja la cola a 0', d.querySelectorAll('#colaWrap ul.cola > li').length===0);
comprueba('y lo guarda vacío', JSON.parse(w.localStorage.getItem('vinted.etiquetas')).length===0);
comprueba('el histórico sigue intacto', JSON.parse(w.localStorage.getItem('vinted.historico')).length===3);

// --- devolver a la cola ---
$('ul.hist .cab').click();
$('ul.hist .devolver').click();
comprueba('devuelve las etiquetas a la cola', d.querySelectorAll('#colaWrap ul.cola > li').length===11);
const ids=JSON.parse(w.localStorage.getItem('vinted.etiquetas')).map(e=>e.id);
comprueba('con ids nuevos y sin repetir', new Set(ids).size===11);
$('ul.hist .devolver').click();
comprueba('devolver dos veces suma, no pisa', d.querySelectorAll('#colaWrap ul.cola > li').length===22);

console.log('');
console.log(fallos===0 ? `TODO EN VERDE — ${ok} comprobaciones` : `${fallos} FALLOS de ${ok+fallos}`);
process.exit(fallos?1:0);
