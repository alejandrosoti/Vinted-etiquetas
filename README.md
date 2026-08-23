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

Ocho etiquetas por hoja A4, dos columnas por cuatro filas, de unos 95×68mm. A
partir de la novena se añade otra hoja. Cada etiqueta lleva arriba una banda del
color de su transportista, que es lo que se mira en el punto de recogida sin
leer nada: InPost amarillo, Mondial Relay rojo, Vinted Go verde azulado.

Al imprimir no sale nada de la interfaz, solo las hojas.
