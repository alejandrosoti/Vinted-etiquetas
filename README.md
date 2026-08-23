# Etiquetas Vinted

Etiquetas para los paquetes vendidos en Vinted: se apuntan las ventas, se
imprimen diez por hoja A4 y se cortan. Pensado para el móvil.

`index.html` es la aplicación entera: HTML, CSS y JS en el mismo archivo. No hay
build, ni npm, ni framework, ni API de pago, ni cuenta de nada. Lo único que se
pide fuera son las tipografías de Google Fonts.

## Cómo se usa

Escribes el usuario de Vinted, el artículo (opcional) y eliges transportista.
**Añadir a la hoja** y se suma a la cola. Cuando tengas las que quieras,
**Imprimir A4**.

Se puede añadir con el teclado sin tocar el ratón: `Enter` en cualquiera de los
dos campos añade la etiqueta y vuelve el cursor a «Usuario».

## Ventas guardadas

Cada tanda que imprimes queda archivada con su fecha y su hora: **Venta
23/08/2026 19:52**. Aparece en «Ventas guardadas», plegada; al tocarla se abre y
se ve quién iba dentro — usuario, artículo y transportista de cada etiqueta.

Se guarda una venta de dos maneras:

- **Imprimir A4** — archiva y saca el papel. Después pregunta si la impresión ha
  salido bien: **Sí, vaciar la cola** la deja limpia para la tanda siguiente,
  **No, dejarla** no toca nada, por si hay que repetir.
- **Guardar selección** — archiva sin imprimir, y la cola se queda como está.
  Para dejar constancia de una tanda a medias, o antes de vaciar.

**Devolver a la cola** recupera esas etiquetas y las añade **al final** de lo que
haya ahora, con identificadores nuevos. Sirve para reimprimir una venta o para
corregir un usuario mal escrito: la devuelves, la arreglas y vuelves a imprimir.
La venta archivada no se toca: es una copia, no una referencia.

Todavía **no hay forma de borrar una venta del histórico**.

## No hace falta terminar de una sentada

La cola se guarda sola en el navegador **en cuanto añades o quitas algo**. Puedes
cerrar la pestaña, apagar el móvil o volver dos días después: al abrir la página
sigue todo ahí, en el mismo orden, y sigues añadiendo donde lo dejaste.

Un par de detalles que conviene saber:

- Se guarda **por navegador y por dispositivo**. Lo que añadas en el móvil no
  aparece en el ordenador; no hay servidor que lo sincronice.
- **Imprimir no vacía la cola.** Si ya has impreso y no quieres volver a sacar
  las mismas, dale a **Vaciar** (pide confirmación: hay que tocarlo dos veces).
- Se pierde si borras los datos del sitio en el navegador, o si navegas de
  incógnito.

## Probar en local

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000`. Con `file://` también funciona —no hay ninguna
llamada de red que dependa del origen— pero el servidor va igual de bien.

## Dónde se guarda

Una sola clave de `localStorage`, sin servidor ni base de datos:

| Clave | Qué guarda |
|---|---|
| `vinted.etiquetas` | la cola actual: usuario, artículo, transportista y orden |
| `vinted.historico` | las ventas archivadas, la más reciente primero |

Cada entrada lleva un `id` propio, para poder quitar una del medio sin descolocar
las demás. Si el JSON guardado estuviera corrupto, `carga()` lo descarta y
arranca con la cola vacía en vez de romperse.

## La hoja

Diez etiquetas por hoja A4, dos columnas por cinco filas, de 95×53mm. A partir
de la undécima se añade otra hoja. El número por hoja es la constante `POR_HOJA`
del script; el tamaño sale solo de la rejilla de `.pagina`. Si cambias una,
cambia también la otra: `grid-template-rows` y `grid-template-columns` de
`.pagina` no se derivan de `POR_HOJA`, ni el `grid-template-columns` del
`.medidor`. Cada etiqueta lleva arriba una banda del
color de su transportista, que es lo que se mira en el punto de recogida sin
leer nada: InPost amarillo, Mondial Relay rojo, Vinted Go verde azulado.

Al imprimir no sale nada de la interfaz, solo las hojas.

Las filas de `.pagina` van en `minmax(0,1fr)`, no en `1fr`. `1fr` es
`minmax(auto,1fr)`: una etiqueta con el texto largo estira su fila, la hoja pasa
de 297mm y derrama una tira en blanco en el papel siguiente. Con ocho por hoja
no se notaba; con veinte salían tres hojas para veintiuna etiquetas. No lo
toques aunque parezca que da igual.

## La prueba

`index.html` no depende de nada, pero la prueba sí:

```bash
npm i        # una vez, instala jsdom
npm test
```

Carga la página en un DOM de mentira y comprueba 31 cosas: que arranca sin
errores, que añadir y quitar funciona, que 11 etiquetas dan 2 páginas, que se
guarda en `localStorage`, y todo el flujo de ventas guardadas.

Pásala siempre antes de un `push`. Existe porque una vez se subió el archivo con
medio JavaScript borrado: la sintaxis era válida, `node --check` daba el visto
bueno, y la página estaba muerta en producción sin que nadie se enterara hasta
abrirla en el navegador.

## Publicar solo en cada push

El `netlify.toml` deja el build vacío y publica la raíz, así que en Netlify basta
con **Add new site → Import from Git → Vinted-etiquetas** y cada `git push`
publica.
