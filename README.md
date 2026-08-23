# Etiquetas Vinted

Etiquetas para los paquetes vendidos en Vinted: se apuntan las ventas, se
imprimen diez por hoja A4 y se cortan. Pensado para el móvil.

`index.html` es la aplicación entera: HTML, CSS y JS en el mismo archivo. No hay
build, ni npm, ni framework. Lo único que se pide fuera son las tipografías de
Google Fonts.

## Las dos formas de añadir

La pantalla principal tiene dos pestañas, y las dos van a la misma cola:

- **Desde captura** — la principal. Eliges una o varias capturas de la
  conversación de Vinted; se redimensionan a 1200px en el navegador y se mandan
  a la API de Claude, que saca el usuario y el artículo. Antes de entrar en la
  hoja pasan por una pantalla de revisión donde corriges lo que haya leído mal.
  Si una captura falla, su tarjeta va vacía para rellenarla a mano.
- **A mano** — para lo que no venga de una captura. Usuario, artículo opcional y
  transportista.

La pestaña en la que estabas se recuerda al recargar.

## Probar en local

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000`. **No vale abrirlo con `file://`**: el origen es
`null` y la llamada a la API de Claude se cae.

## Publicar

```bash
npx netlify-cli deploy --dir=. --prod
```

## La API key

No está en el código y no debe estarlo. Se pide en **Ajustes** y se queda en el
`localStorage` de ese navegador; si se entra desde otro móvil, hay que volver a
ponerla. Se usa solo para leer las capturas con la API de Anthropic.

## Cómo se guarda

Todo vive en `localStorage`, no hay servidor ni base de datos:

| Clave | Qué guarda |
|---|---|
| `vinted.etiquetas` | la cola de etiquetas |
| `vinted.apikey` | la API key |
| `vinted.modelo` | el modelo elegido |
| `vinted.tab` | la pestaña en la que estabas |

Vaciar los datos del sitio en el navegador se lo lleva todo por delante.

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

## Publicar solo en cada push

El `netlify.toml` deja el build vacío y publica la raíz, así que en Netlify basta
con **Add new site → Import from Git → Vinted-etiquetas** y cada `git push`
publica.
