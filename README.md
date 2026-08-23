# Etiquetas Vinted

Etiquetas para los paquetes vendidos en Vinted: se apuntan las ventas, se
imprimen diez por hoja A4 y se cortan. Pensado para el móvil.

`index.html` es la interfaz entera: HTML, CSS y JS en el mismo archivo, sin
build ni framework. Lo único que hay detrás es una Netlify Function de 60 líneas
que guarda los datos en Netlify Blobs. Ni base de datos, ni servicio contratado
aparte: las dos cosas vienen incluidas en el plan gratuito de Netlify.

## Puesta en marcha (importante)

La función no deja pasar a nadie hasta que el sitio tenga un código. En Netlify:

**Site configuration → Environment variables → Add a variable**

| Clave | Valor |
|---|---|
| `key_netfilysoti` | una clave larga que te inventes |

Que sea larga y que no se parezca a nada: es lo único que separa tus ventas del
resto de internet, porque este repositorio es público y la dirección de la
función se ve en el código de la página. Sin esa variable la función responde
503 a todo el mundo, incluido tú — es a propósito: mejor quedarse fuera que
abrir la puerta por un despiste de configuración.

Después, la página te pide el código una vez y lo recuerda en ese navegador.

## Cómo se usa

Escribes el usuario de Vinted, el artículo (opcional), eliges transportista y,
si quieres, le enganchas una captura. **Añadir a la hoja** y se suma a la cola.
Cuando tengas las que quieras, **Imprimir A4**.

Los transportistas son cuatro: **InPost**, **Mondial Relay**, **Vinted Go** y
**Correos**, cada uno con su color. Las etiquetas que guardaste cuando existía
la opción «Otro» siguen ahí tal cual, con el nombre que les escribieras.

Se puede añadir con el teclado sin tocar el ratón: `Enter` en cualquiera de los
dos campos añade la etiqueta y vuelve el cursor a «Usuario».

### Ver solo un transportista

Encima de la cola hay unas pestañas: **Todos** y una por cada transportista que
haya ahora mismo en la lista, con su cuenta. Sirven para preparar la entrega de
un punto de recogida sin leer las demás.

Es solo una forma de mirar la lista. El número que lleva cada etiqueta sigue
siendo el sitio que ocupa **en la hoja**, no el de la lista filtrada, para que
valga para encontrarla en el papel. El medidor, el orden y lo que se imprime son
siempre la cola entera. Con un solo transportista en la cola las pestañas no
aparecen, porque no habría nada que filtrar.

## Las capturas

Cada etiqueta puede llevar **una** captura enganchada, y es opcional: si no la
tienes a mano, añades la etiqueta igual y ya se la pondrás. Sirve tanto para la
captura de la conversación como para el QR de recogida, que suele llegar después
de haber apuntado la venta.

Se engancha de dos maneras:

- **Al crearla**, con el botón que hay justo después del transportista.
- **Después**, tocando el hueco `+` de su fila. Funciona igual en la cola y
  dentro de una venta ya guardada, que es donde acaba el QR si el papel ya
  estaba impreso.

Tocando una miniatura se abre a pantalla completa, con **Cambiar** y **Quitar**.
Al cambiarla, la imagen anterior se borra del servidor en el momento.

Al engancharla se encoge en el navegador —lado mayor a 1100px, JPEG al 82%— y sube
al servidor antes de que la etiqueta exista siquiera. De paso se saca una
miniatura de 150px, que es la que se ve en la fila de la cola: así la lista
aparece al instante, sin una petición por etiqueta. La grande solo baja cuando
tocas la miniatura, y se abre a pantalla completa.

Las miniaturas viajan dentro del JSON de datos, unos 3 KB por etiqueta. Las
grandes van cada una a su propio blob, en el almacén `vinted-fotos`.

**En el papel no sale ninguna.** La hoja A4 lleva usuario, artículo y la banda
del transportista, y nada más: una captura de móvil no se lee en 95×53mm y solo
gastaría tinta. Hay dos comprobaciones en la prueba que lo fijan.

La captura vive mientras alguien la mencione. Al quitar una etiqueta de la cola
su imagen se borra, salvo que una venta guardada siga apuntando a ella. De eso
se encarga un barrido en el servidor en cada guardado: lo que no menciona nadie,
se va.

## Ventas guardadas

Cada tanda que imprimes queda archivada con su fecha y su hora: **Venta
23/08/2026 19:52**. Aparece en «Ventas guardadas», plegada; al tocarla se abre y
se ve quién iba dentro — usuario, artículo y transportista de cada etiqueta.

Una venta nace **solo al imprimir**, no antes. Hasta ese momento lo que tienes
es una selección en curso, que se guarda sola pero no es historia todavía.

- **Imprimir A4** — archiva la tanda y saca el papel. Después pregunta si la
  impresión ha salido bien: **Sí, vaciar la cola** la deja limpia para la
  siguiente, **No, dejarla** no toca nada, por si hay que repetir.
- **Guardar selección** — *no* archiva nada. Solo fuerza el guardado de la cola
  y te lo confirma. La cola ya se guarda sola en cada alta y cada baja; el botón
  está para verlo por escrito antes de cerrar.

**Devolver a la cola** recupera esas etiquetas y las añade **al final** de lo que
haya ahora, con identificadores nuevos. Sirve para reimprimir una venta o para
corregir un usuario mal escrito: la devuelves, la arreglas y vuelves a imprimir.
La venta archivada no se toca: es una copia, no una referencia.

**Eliminar venta** la borra del histórico, en dos toques: el primero pregunta y
el segundo borra. No hay vuelta atrás — se van también sus capturas, que el
servidor barre en cuanto ve que ya no las menciona nadie. Si querías quedarte
con las etiquetas, devuélvelas a la cola antes de eliminar la venta.

## No hace falta terminar de una sentada

Todo se guarda en el servidor **en cuanto añades o quitas algo**, sin botón que
se te pueda olvidar. Cierras la pestaña, cambias de móvil, entras de incógnito:
escribes el código y está todo ahí, en el mismo orden.

- **El servidor manda.** Al abrir se baja lo que haya guardado y eso es lo que
  ves. El navegador conserva una copia, pero solo para enseñarte algo mientras
  baja y para que puedas seguir trabajando si te quedas sin cobertura — en ese
  caso te avisa abajo de que no está guardando.
- **La primera vez no se pierde nada.** Si el servidor está vacío y este
  navegador traía etiquetas de antes, se suben en vez de borrarse.
- **Imprimir no vacía la cola**: te pregunta. Y **Vaciar** pide confirmación,
  hay que tocarlo dos veces.
- **Olvidar código** solo deja de recordarlo en ese navegador. No borra nada del
  servidor.

## Probar en local

```bash
python3 -m http.server 8000
```

Y abrir `http://localhost:8000`. Con `file://` también funciona —no hay ninguna
llamada de red que dependa del origen— pero el servidor va igual de bien.

## Dónde se guarda

En **Netlify Blobs**, bajo una única clave del almacén `vinted`, con la forma
`{ etiquetas: [...], historico: [...] }`. Se lee y se escribe con consistencia
fuerte: por defecto un cambio tarda hasta un minuto en verse en todas partes, y
aquí se escribe y se relee en segundos desde el mismo móvil.

La función está en `netlify/functions/datos.mjs` y atiende dos rutas:

| Ruta | Qué hace |
|---|---|
| `/api/datos` | `GET` devuelve todo, `PUT` lo reemplaza y barre capturas huérfanas |
| `/api/foto/:clave` | `GET` baja una captura, `PUT` la sube, `DELETE` la borra |

Todas exigen la cabecera `x-codigo`, que se compara en tiempo constante para no
delatar por el retardo cuántos caracteres se han acertado. Ese es el motivo de
que las miniaturas vayan dentro del JSON en vez de como `<img src>` normales: una
etiqueta `img` no puede mandar cabeceras, así que cada fila necesitaría una
llamada con `fetch`.

El navegador guarda además una copia de solo lectura, que es lo que ves mientras
carga o si te quedas sin red:

| Clave de `localStorage` | Qué guarda |
|---|---|
| `vinted.etiquetas` | copia de la selección en curso, miniaturas incluidas |
| `vinted.historico` | copia de las ventas impresas |
| `vinted.codigo` | el código, para no pedírtelo cada vez |

Las subidas se agrupan: escribir diez etiquetas seguidas es **una** llamada al
servidor, no diez. Si el JSON estuviera corrupto, se descarta y se arranca vacío
en vez de romperse — tanto en el navegador como en la función.

**Un solo dueño.** No hay usuarios: hay un código y unos datos. Quien tenga el
código lo ve todo, y si dos pestañas escriben a la vez gana la última.

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

Carga la página en un DOM de mentira, con un servidor fingido —y con canvas e
imágenes fingidos, que jsdom no los trae—, y comprueba 89 cosas: que arranca sin
errores, que la puerta del código no se abre con la clave mala, que 11 etiquetas
dan 2 páginas, que diez altas seguidas son una sola subida, que lo del servidor
pisa la copia local, que sin red se sigue trabajando, que la captura se borra al
quitar su etiqueta pero sobrevive si una venta la menciona, que se puede
enganchar y cambiar después dejando limpia la anterior, que en la hoja de
impresión no se cuela ninguna imagen, y todo el flujo de ventas guardadas.

Pásala siempre antes de un `push`. Existe porque una vez se subió el archivo con
medio JavaScript borrado: la sintaxis era válida, `node --check` daba el visto
bueno, y la página estaba muerta en producción sin que nadie se enterara hasta
abrirla en el navegador.

## Publicar solo en cada push

El `netlify.toml` deja el build vacío y publica la raíz, así que en Netlify basta
con **Add new site → Import from Git → Vinted-etiquetas** y cada `git push`
publica.
