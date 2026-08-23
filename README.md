# Etiquetas Vinted

Etiquetas para los paquetes vendidos en Vinted: se apuntan las ventas, se
imprimen ocho por hoja A4 y se cortan. Pensado para el móvil.

`index.html` es la aplicación entera: HTML, CSS y JS en el mismo archivo. No hay
build, ni npm, ni framework. Lo único que se pide fuera son las tipografías de
Google Fonts.

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

Vaciar los datos del sitio en el navegador se lo lleva todo por delante.

## La hoja

Veinte etiquetas por hoja A4, cuatro columnas por cinco filas, de 45,5×53mm. A
partir de la veintiuna se añade otra hoja. El número por hoja es la constante
`POR_HOJA` del script; el tamaño sale solo de la rejilla de `.pagina`. Cada etiqueta lleva arriba una banda del
color de su transportista, que es lo que se mira en el punto de recogida sin
leer nada: InPost amarillo, Mondial Relay rojo, Vinted Go verde azulado.

Al imprimir no sale nada de la interfaz, solo las hojas.
