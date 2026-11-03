---
name: Escuela Primaria Hugo César Piñeda Chacón
description: Un portal, una escuela. El Kárdex de acero esmaltado para el personal y un sitio escolar con fotografías, títulos azules y tarjetas de color para las familias.
colors:
  navy-950: "#0c1a33"
  navy-900: "#112140"
  navy-800: "#15284a"
  navy-700: "#1f3a66"
  navy-600: "#2c5aa0"
  navy-200: "#c9d4e6"
  navy-100: "#e2e8f2"
  navy-50: "#f1f4f9"
  ground: "#eef1f5"
  card: "#ffffff"
  rule: "#dde3eb"
  rule-mid: "#c3ccd8"
  rule-strong: "#8491a5"
  ink: "#13203a"
  ink-2: "#3c4a63"
  muted: "#56647b"
  placeholder: "#636f85"
  link: "#1f4f91"
  side-text-2: "#c3cfe3"
  side-text-3: "#9fb0cc"
  ok: "#1f8a55"
  ok-ink: "#17643f"
  ok-bg: "#e5f3eb"
  ok-line: "#bfe0cc"
  warn: "#e4a51e"
  warn-ink: "#7a5300"
  warn-bg: "#fcf1d8"
  warn-line: "#f0d9a3"
  alert: "#d64545"
  alert-ink: "#a12424"
  alert-bg: "#fbe9e9"
  alert-line: "#f0c4c4"
  info: "#3b6fb6"
  info-ink: "#1f4f91"
  info-bg: "#e7eefa"
  info-line: "#c9d9f2"
  off: "#a3adbb"
  off-ink: "#4f5d73"
  off-line: "#d5dce6"
  site-navy: "#25335f"
  site-navy-deep: "#1c2749"
  site-blue: "#3b67ad"
  site-blue-hover: "#2c4f8f"
  site-blue-dark: "#2c4f8f"
  site-blue-soft: "#e8eef8"
  tone-orange: "#b8530f"
  tone-teal: "#1b7d71"
  tone-red: "#c0474a"
  tone-violet: "#7c3aed"
  tone-purple: "#7c3aed"
  tone-green: "#1a7a4b"
  line-orange: "#f28c38"
  line-yellow: "#f5c518"
  site-bg: "#f8f8f8"
  site-text: "#1f2a44"
  site-text-2: "#4a5570"
  site-line: "#e3e7ee"
  footer-text: "#d6dcea"
  photo-pending: "#dfe5ef"
  photo-pending-ink: "#46577a"
typography:
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  body:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.45
  mono:
    fontFamily: "Atkinson Hyperlegible Mono, Cascadia Mono, Consolas, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    letterSpacing: "0.02em"
    fontFeature: "tnum"
  site-hero:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  site-page-title:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
  site-section-title:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.5rem)"
    fontWeight: 700
    lineHeight: 1.2
  site-card-title:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  site-body:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  site-label:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.6
  site-small:
    fontFamily: "Montserrat, Segoe UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  label: "4px"
  sm: "6px"
  md: "8px"
  lg: "10px"
  dialog: "14px"
  site-button: "6px"
  site-card: "12px"
  site-panel: "14px"
  site-gallery: "20px"
  site-frame: "22px"
  pill: "999px"
  circle: "50%"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  site-title-gap: "56px"
  site-section-sm: "64px"
  site-section: "88px"
components:
  button-primary:
    backgroundColor: "{colors.navy-800}"
    textColor: "{colors.card}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.navy-700}"
  button-primary-active:
    backgroundColor: "{colors.navy-900}"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.navy-800}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.navy-50}"
  button-quiet:
    textColor: "{colors.link}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.alert-ink}"
    textColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  badge:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.off-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "3px 10px 3px 8px"
  badge-success:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok-ink}"
  badge-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-ink}"
  badge-alert:
    backgroundColor: "{colors.alert-bg}"
    textColor: "{colors.alert-ink}"
  badge-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-ink}"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "24px"
  nav-item:
    textColor: "{colors.side-text-2}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.navy-800}"
  site-header:
    backgroundColor: "{colors.site-navy}"
    textColor: "{colors.card}"
    height: "64px"
  site-login:
    backgroundColor: "{colors.site-blue}"
    textColor: "{colors.card}"
    typography: "{typography.site-label}"
    rounded: "{rounded.site-button}"
    padding: "8px 16px"
  site-login-hover:
    backgroundColor: "{colors.site-blue-hover}"
  site-button:
    backgroundColor: "{colors.site-blue}"
    textColor: "{colors.card}"
    typography: "{typography.site-label}"
    rounded: "{rounded.site-button}"
    padding: "10px 22px"
  site-button-hover:
    backgroundColor: "{colors.site-blue-dark}"
  site-round-button:
    backgroundColor: "{colors.site-navy}"
    textColor: "{colors.card}"
    rounded: "{rounded.circle}"
    size: "44px"
  site-round-button-hover:
    backgroundColor: "{colors.site-blue}"
  site-label-band:
    backgroundColor: "{colors.tone-orange}"
    textColor: "{colors.card}"
    typography: "{typography.site-card-title}"
    padding: "12px"
  site-value-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.site-text}"
    padding: "26px 22px 22px"
  site-info-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.site-text}"
    rounded: "{rounded.site-card}"
    padding: "26px 22px"
  site-calendar-frame:
    backgroundColor: "{colors.site-blue}"
    rounded: "{rounded.site-frame}"
    padding: "28px"
  site-footer:
    backgroundColor: "{colors.site-navy}"
    textColor: "{colors.footer-text}"
    typography: "{typography.site-label}"
  photo-pending:
    backgroundColor: "{colors.photo-pending}"
    textColor: "{colors.photo-pending-ink}"
    typography: "{typography.site-small}"
---

# Design System: Escuela Primaria Hugo César Piñeda Chacón

## Overview

**Creative North Star: "El Kárdex y la escuela de puertas abiertas"**

Una sola escuela con dos superficies y dos mundos visuales. Adentro, para dirección y docentes, está el Kárdex de tarjetas visibles: gavetas de acero esmaltado en azul marino, tarjetas blancas sobre acero claro y señales de color que siempre van acompañadas de su palabra. Afuera, para las familias, está el sitio de la escuela tal como lo dibujó su comunidad: encabezado azul marino, fotografías reales del plantel a todo lo ancho, títulos azules centrados y tarjetas blancas que llevan cada una un tono propio (naranja, verde azulado, rojo, violeta, verde) en una banda, una barra o su relleno al pasar el cursor.

La densidad cambia según quién mira. El Panel es denso, tabular y sereno: Atkinson Hyperlegible Next a 700, sombras ambientales mínimas, todo en una escala de 4px. El sitio es abierto y fotográfico: Montserrat a 700 y 800, secciones de 88px de aire, sombras difusas que levantan tarjetas y marcos, y degradados azul marino a azul en los planos de marca (velo del héroe, banda de encabezado de las páginas interiores, franja de valores). Las dos superficies comparten el compromiso de objetivos táctiles de 44px y el anillo de foco visible.

Lo pendiente nunca se rellena con material inventado. Una foto que todavía no existe se muestra como el recuadro "Foto pendiente"; un texto institucional que falta se muestra como "Información por confirmar." en cursiva; un documento sin archivo dice "Próximamente".

**Key Characteristics:**
- Azul marino esmaltado (`navy-800`) como suelo del Panel; azul marino de sitio (`site-navy`) en encabezado, pie y botones redondos del sitio.
- Tarjetas blancas sobre acero claro (`ground`) en el Panel; tarjetas blancas sobre gris claro (`site-bg`) con un tono propio en el sitio.
- Señales con clip vertical de 7×14px más palabra; nunca solo color.
- Atkinson Hyperlegible Next en el Panel; Montserrat en el sitio; Atkinson Hyperlegible Mono solo para claves y códigos del Panel.
- Fotografías reales de la escuela o el recuadro "Foto pendiente"; nunca fotos de archivo.
- Cifras tabulares en tablas, fechas, contadores y ciclos del Panel.

## Colors

Dos paletas que comparten el azul institucional: el Panel usa un azul marino profundo con neutros de acero frío y señales de estado; el sitio usa un azul marino más claro, un azul de títulos y una familia de tonos cálidos y fríos que decoran tarjetas.

### Primary
- **Azul marino esmaltado** (`navy-800`): el suelo del Panel. Barra lateral, barra superior docente, banner de bienvenida y frente de gaveta. También es el botón primario, el anillo de acento y el texto de enlace activo del Panel.
- **Azul marino de fondo** (`navy-950`): la base de los velos y las sombras de diálogo del Panel.
- **Azul de banda** (`navy-700`): hover del botón primario del Panel.
- **Azul de foco** (`navy-600`): el anillo de foco de 3px y el borde de los campos enfocados, en las dos superficies.
- **Azul marino del sitio** (`site-navy`): encabezado pegajoso, pie de cuatro columnas, flechas del carrusel, botones redondos de la galería, inicio de la banda de encabezado interior y mitad derecha de la franja de valores. `site-navy-deep` cierra esa franja.
- **Azul de títulos** (`site-blue`): títulos de sección centrados, subtítulos, el botón "Login", los botones de acción, el marco del calendario, fechas de eventos y cifras de grado. `site-blue-hover` es el hover del Login; `site-blue-dark` el hover de los botones de acción y el texto del bloque Encuéntranos.
- **Azul tenue** (`site-blue-soft`): fondo de los iconos de documento y de las filas de archivo.

### Secondary: tonos del sitio
Cada tarjeta del sitio toma un tono y solo uno; el tono se aplica a la banda de etiqueta, a la barra superior de la tarjeta o al relleno de hover.
- **Naranja** (`tone-orange`): banda de Misión, título de Misión en Conócenos, tarjeta de Artes y valor Liderazgo.
- **Verde azulado** (`tone-teal`): tarjeta de Visión, en Inicio y en Conócenos.
- **Rojo** (`tone-red`): banda de Historia y su título en Conócenos.
- **Violeta** (`tone-violet`) y **lila** (`tone-purple`): valores Constancia y Calidad, tarjeta de Inglés.
- **Verde** (`tone-green`): valor Conocimiento y tarjeta de Educación Física.
- **Líneas de calendario** (`line-orange`, `line-yellow`): las dos rayas de 80×3px a los lados del ciclo escolar bajo "Calendario Escolar"; `line-orange` también marca la barra del tercer grado.

### Tertiary: señales del Kárdex (solo Panel)
Cada señal es una familia de seis valores (base, borde, tinta, fondo, línea, relleno); la frontmatter fija los cuatro que se usan en texto y superficie, y el sidecar guarda la familia completa.
- **Verde completo** (`ok`): capturado, abierto, al día.
- **Ámbar en curso** (`warn`): en progreso, falta un dato, en edición.
- **Rojo atrasado** (`alert`): atrasado, error, acción destructiva.
- **Azul informativo** (`info`): avisos neutros.
- **Gris sin dato** (`off`): sin registro, vacío, inactivo.

### Neutral
- **Acero claro** (`ground`): el fondo del Panel y el fondo de la gaveta.
- **Tarjeta blanca** (`card`): tarjetas, diálogos y campos del Panel; tarjetas, marcos de foto y texto sobre azul en el sitio.
- **Tinta** (`ink`), **tinta secundaria** (`ink-2`) y **apagado** (`muted`): texto principal, descripciones y metadatos del Panel. `placeholder` solo en marcadores de campo.
- **Reglas** (`rule`, `rule-mid`, `rule-strong`): divisores, bordes de tarjeta y borde de campo del Panel.
- **Texto sobre esmalte** (`side-text-2`, `side-text-3`): texto secundario y terciario sobre `navy-800`.
- **Azul pálido** (`navy-50`, `navy-100`, `navy-200`): cabeceras de tabla, hover, fondos de cifra y selección del Panel.
- **Gris del sitio** (`site-bg`): el fondo de todas las páginas públicas.
- **Tinta del sitio** (`site-text`, `site-text-2`): texto corrido y descripciones del sitio; `site-line` divide las filas de eventos.
- **Texto del pie** (`footer-text`): texto sobre `site-navy` en el pie; los enlaces van en blanco.
- **Foto pendiente** (`photo-pending`, `photo-pending-ink`): el recuadro que sustituye a una foto faltante.

### Named Rules
**La Regla de la Señal con Palabra.** Un color de estado nunca viaja solo: el clip de color va pegado a una palabra legible ("Completo", "Atrasado"). Si quitas el color y el estado ya no se entiende, el componente está mal.

**La Regla del Ámbar con Tinta.** Sobre `warn` el texto es `warn-ink`, nunca blanco. En el sitio, `line-yellow` solo traza líneas; nunca es fondo de texto.

**La Regla de los Dos Trabajos.** Los tonos del sitio decoran tarjetas; las señales nombran estados del Kárdex. Una tarjeta verde de Educación Física no significa "completo", y una señal `ok` no decora una tarjeta.

**La Regla del Blanco Legible.** El texto blanco solo va sobre fondos con contraste de 4.5:1 o más: `site-navy`, `site-blue`, y los seis tonos de tarjeta, que se eligieron oscuros para cumplirlo.

## Typography

**Display Font:** Montserrat (con Segoe UI, system-ui) en el sitio; Atkinson Hyperlegible Next (con Segoe UI, system-ui) en el Panel
**Body Font:** Montserrat en el sitio; Atkinson Hyperlegible Next en el Panel
**Label/Mono Font:** Atkinson Hyperlegible Mono (con Cascadia Mono, Consolas), solo en el Panel

**Character:** Cada superficie tiene su familia. El Panel usa una tipografía de alta legibilidad hecha para lectores con baja visión, con formas abiertas, letras que no se confunden y un cero barrado; la usa a 700, sobria. El sitio usa Montserrat, geométrica y escolar, a 800 en titulares sobre foto y degradado, y a 700 en títulos de sección y tarjetas.

### Hierarchy
Panel:
- **Headline** (700, 1.75rem, 1.2): h1 de página en el Panel.
- **Title** (700, 1.375rem, 1.3): h2 y encabezados de diálogo; las cabeceras de tarjeta usan 1.25rem.
- **Title pequeño** (700, 1.125rem, 1.35): h3, bloques de historial y estados vacíos.
- **Body** (400, 1rem, 1.5; párrafos 1.6): todo el texto del Panel; las descripciones de página se limitan a 72ch.
- **Label** (600, 0.875rem): etiquetas de navegación, cabeceras de tabla, insignias, pistas de campo y metadatos.
- **Mono** (400 a 600, 0.9375rem, 0.02em): CURP, matrícula y claves de grupo.

Sitio:
- **Héroe** (800, `clamp(2.25rem, 5vw, 3.75rem)`, 1.1, -0.01em): título de cada diapositiva, hasta 14ch, con el subtítulo como segunda línea dentro del mismo h1.
- **Título de página** (800, `clamp(2.25rem, 5vw, 3rem)`, 1.1): h1 centrado en la banda de encabezado de las páginas interiores; su descripción va a 1.0625rem, hasta 60ch.
- **Título de sección** (700, `clamp(2rem, 4vw, 2.5rem)`, 1.2): h2 centrado en `site-blue`, con subtítulo en `site-blue` a 0.9375rem, hasta 640px de ancho.
- **Título de tarjeta** (700, 1.75rem, 1.2): bandas de Misión e Historia y título de Visión. Los bloques de Conócenos usan 2rem; los bloques de Encuéntranos 1.625rem; los documentos 1.25rem; las tarjetas informativas 1.0625rem; los valores 0.9375rem.
- **Body del sitio** (400, 1rem, 1.6): texto corrido; los párrafos de Conócenos suben a 1.0625rem.
- **Label del sitio** (600, 0.875rem a 0.9375rem): navegación (0.9375rem), botones y pie (0.875rem).
- **Pequeño** (400 a 600, 0.8125rem, 1.5): descripción de valores, recuadro de foto pendiente, "Próximamente" y la línea final del pie.

### Named Rules
**La Regla de la Familia por Superficie.** El Panel se escribe en Atkinson Hyperlegible Next; el sitio en Montserrat. No cruces una familia a la otra superficie.

**La Regla de las Cifras Tabulares.** Tablas, fechas, horas, ciclos, contadores y calificaciones del Panel usan `font-variant-numeric: tabular-nums`. Las cifras se alinean como en una boleta.

**La Regla de la Frase Única.** En el resumen del Panel una oración entera va a un solo tamaño (1.25rem); las cifras destacan con peso 800 y color `navy-800`, no con un salto de tamaño.

**La Regla del Título Azul Centrado.** Cada sección del sitio abre con su título en `site-blue`, centrado, y un subtítulo breve debajo. Nada va encima del título.

## Layout

**Panel.** Barra lateral fija de 268px (244px por debajo de 1280px), barra superior pegajosa de 68px y contenido de hasta 1400px con 32px de margen interior (24px por debajo de 1280px, 16px por debajo de 860px). El panel docente cambia la barra lateral por una barra superior azul marino y limita el contenido a 1200px. Todo el espaciado sale de la escala de 4px (`2xs` a `2xl`). Las rejillas de formulario son de dos columnas y bajan a una en 640px; resumen, calificaciones y organización pasan a una columna en 1100px. Por debajo de 860px la barra lateral se vuelve un cajón deslizable con velo. Por debajo de 640px cada fila de tabla se convierte en un bloque con etiqueta, sin perder la semántica de tabla.

**Sitio.** Ancho máximo de 1160px con un margen lateral fluido `clamp(16px, 4vw, 40px)`. El héroe, la franja de valores, la banda de encabezado interior y el pie llegan al borde; su contenido se centra. Cada sección respira 88px en vertical (64px por debajo de 600px) y deja 56px entre su título y su contenido (36px en móvil). Inicio sigue un orden fijo: carrusel, Conócenos, Galería, Valores, Calendario Escolar y Encuéntranos.

Las composiciones son centradas y de anchos contenidos: tarjetas de Conócenos en dos columnas escalonadas hasta 900px, galería de tres fotos hasta 860px con la central 1.25 veces más ancha, valores en cuatro columnas hasta 980px con las tarjetas pares bajadas 36px, marco del calendario hasta 620px, Encuéntranos en mapa y datos (1:1.25) hasta 960px. Las páginas interiores alternan foto y texto (1:1.1) hasta 980px; los grados van en seis columnas, las tarjetas de docentes en cuatro y los documentos en dos.

En 960px el menú se vuelve desplegable, Conócenos y Encuéntranos pasan a una columna, los valores y las tarjetas de docentes a dos, los grados a tres y el pie a dos columnas. En 600px el contenido del héroe baja al pie de la foto, la galería muestra solo la foto central, los valores, documentos y pie quedan en una columna y las fechas de eventos se apilan sobre su descripción.

**Objetivos táctiles.** Botones, enlaces de navegación y campos miden al menos 44px (48px en el menú móvil del Panel y en los archivos de documentos).

## Elevation & Depth

Es un sistema híbrido que cambia según la superficie. El Panel es casi plano: la profundidad viene de la capa tonal (tarjeta blanca sobre `ground`, tarjetas de gaveta sobre acero) con sombras ambientales muy tenues. El sitio es levantado: tarjetas, marcos y mapa flotan sobre `site-bg` con una sombra difusa de dos capas, crecen a una sombra mayor al pasar el cursor, y la foto central de la galería brilla en azul. Las sombras son siempre difusas y teñidas de azul; no hay sombras duras desplazadas.

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 1px 2px rgb(19 32 58 / .05), 0 2px 6px rgb(19 32 58 / .04)`): tarjetas del Panel en reposo, sesión y segmento activo.
- **Levantada** (`box-shadow: 0 2px 4px rgb(19 32 58 / .08), 0 10px 24px rgb(19 32 58 / .10)`): enlace de salto enfocado.
- **Diálogo** (`box-shadow: 0 2px 8px rgb(12 26 51 / .12), 0 24px 64px rgb(12 26 51 / .28)`): modales, sobre un velo `rgb(12 26 51 / .55)`.
- **Tarjeta del sitio** (`box-shadow: 0 2px 6px rgb(31 42 68 / .06), 0 12px 28px rgb(31 42 68 / .10)`): tarjetas de Conócenos, valores, grados, docentes, documentos, eventos, mapa y fotos de la galería.
- **Levantada del sitio** (`box-shadow: 0 4px 10px rgb(31 42 68 / .08), 0 20px 40px rgb(31 42 68 / .16)`): hover de las tarjetas de Conócenos y el marco del calendario.
- **Brillo central** (`box-shadow: 0 0 0 1px rgb(59 103 173 / .12), 0 0 44px rgb(59 103 173 / .45)`): solo la foto central de la galería.

### Named Rules
**La Regla del Brillo Único.** En la galería solo la foto central brilla; las laterales llevan la sombra de tarjeta del sitio.

**La Regla de la Sombra de Desplazamiento.** Las tablas anchas del Panel muestran sombras laterales solo mientras todavía pueden desplazarse de lado.

## Shapes

Esquinas suaves y escalonadas por jerarquía de objeto. En el Panel: etiqueta 4px, controles pequeños e insignias 6px, botones y campos 8px, tarjetas 10px, diálogos 14px. El clip de señal es siempre un rectángulo vertical de 7×14px con 2px de radio y un borde interior de 1px en el tono `-edge`. Las píldoras de 999px se reservan para contadores.

En el sitio conviven dos familias de forma. Las piezas que imitan una foto impresa son de esquina recta: las tarjetas de Conócenos son marcos blancos de 10px de borde, estilo polaroid, con la banda de color pegada al pie de la foto; las fotos de Conócenos llevan un borde blanco de 10px; los valores y el mapa también son rectos. Las piezas de interfaz son redondeadas: botones 6px, tarjetas de grado y de docente 12px, documentos y lista de eventos 14px, fotos de la galería 20px, marco del calendario 22px (16px en móvil). Las flechas del carrusel y los botones de la galería son círculos de 44px. Las barras de tono de 36 a 44px por 4px con 2px de radio coronan grados y tarjetas de docente; "Próximamente" es una píldora de 999px.

## Components

### Buttons
Panel: firmes, compactos, de color plano.
- **Shape:** esquinas suaves (8px), altura mínima de 44px (36px en la variante pequeña).
- **Primary:** fondo `navy-800`, texto blanco, 600, padding 10px 18px, sombra de 1px; hover `navy-700`, presionado `navy-900`.
- **Secondary:** blanco con borde `#b6c0ce` y texto `navy-800`; hover `navy-50` con borde `navy-600`. Sobre el esmalte se vuelve transparente con borde blanco al 35%.
- **Quiet:** sin fondo, texto `link`; hover `navy-50`.
- **Danger:** fondo `alert-ink`, texto blanco.
- **Hover / Focus:** transición de color de 0.15s; foco con anillo de 3px `navy-600` desplazado 2px (`#9cc0ff` sobre esmalte). Deshabilitado al 50% de opacidad.

Sitio: azules, con flecha cuando llevan a otro lugar.
- **Login:** en el encabezado, fondo `site-blue`, texto blanco a 700, 0.875rem, 8px de radio, 44px de alto y candado de 16px; hover blanco con texto `site-navy`.
- **Acción:** fondo `site-blue`, texto blanco a 700, 8px de radio, 44px de alto, padding 0 24px; hover `site-blue-dark`, sube 2px y la flecha avanza 4px. La variante clara del héroe es blanca con hover amarillo `#ffd36b`. En Encuéntranos ("Ver ubicación") el fondo es `site-navy` con hover `site-blue`.
- **Redondo:** círculo de 44px en `site-navy` con chevron blanco y sombra `0 2px 8px rgb(0 0 0 / .2)`; hover `site-blue`. Lo usan las flechas del carrusel y de la galería.
- **Hover / Focus:** transición de color de 0.15s; foco con el anillo de 3px, blanco sobre el encabezado, el héroe, la banda interior y el pie.

### Chips (insignias de señal)
- **Style:** fondo, borde y tinta de la familia de señal, radio de 6px, label 600, con el clip de 7×14px a la izquierda.
- **State:** `success`, `warn`, `alert`, `info` y la neutra `off`. La variante de conteo omite el clip y usa `navy-50`.
- **Chip de ciclo:** píldora `navy-50` en la barra superior con clip verde; pasa a ámbar cuando falta el ciclo.

### Cards / Containers
- **Corner Style:** 10px en el Panel; en el sitio, rectas para las piezas fotográficas y de 12 a 22px para las de interfaz (ver Shapes).
- **Background:** `card` sobre `ground` en el Panel; `card` sobre `site-bg` en el sitio.
- **Shadow Strategy:** sombra de tarjeta en el Panel; sombra de tarjeta del sitio y levantada del sitio en hover (ver Elevation & Depth).
- **Border:** 1px `rule` en el Panel; en el sitio sin borde, salvo el marco blanco de 10px de las fotos.
- **Internal Padding:** 24px (16px en móvil) en el Panel; 22 a 28px en las tarjetas del sitio.

### Inputs / Fields
- **Style:** fondo blanco, borde de 1px `rule-strong`, radio de 8px, altura de 44px; etiqueta encima a 600.
- **Focus:** borde `navy-600` con un halo de 3px `rgb(44 90 160 / .28)`.
- **Error / Disabled:** borde `alert-ink` con mensaje `alert-ink` a 600; deshabilitado sobre `ground`. Solo lectura sobre `navy-50`.

### Navigation
- **Panel:** barra lateral `navy-800`; los elementos son filas de 44px con texto `side-text-2` e icono `side-text-3`, hover blanco al 8%. El elemento activo es una tarjeta blanca con texto `navy-800` a 700, como una ficha sacada de la gaveta.
- **Sitio:** encabezado pegajoso de 68px en `site-navy`: escudo de 40px (con el nombre de la escuela desde 1240px y en móvil) a la izquierda, menú centrado y Login a la derecha. Al desplazarse se vuelve translúcido al 93% con desenfoque y sombra. Los enlaces son blancos a 600 y 0.9375rem, al 85% de opacidad en reposo; una línea de 2px en `#7fd3c7` crece bajo el texto en hover y queda fija en el activo. Por debajo de 960px el menú se despliega bajo el encabezado en `site-navy`, en columna, con la línea activa de 32px a la izquierda; Escape lo cierra.
- **Pie:** `site-navy` en cuatro columnas (1.3, 1, 1.4, 1): escudo con el nombre de la escuela, Secciones, Contacto con iconos `#9fb6e0` y Personal con el acceso al Kárdex. Títulos blancos a 700, 0.9375rem; enlaces blancos subrayados en hover; una línea final centrada en `#aab4cc` sobre un borde blanco al 12%.

### Carrusel de portada (firma del sitio)
Fotografía a todo lo ancho de `clamp(480px, 78vh, 680px)` de alto con un velo izquierdo de azul marino y otro inferior. El contenido va a la izquierda en blanco: etiqueta en píldora translúcida, título de héroe con el subtítulo en amarillo `#ffd36b`, texto de hasta 46ch y botón blanco (hover amarillo). Al entrar, la foto se acerca lentamente (escala 1.12 → 1 en 9s) y el texto sube escalonado (0.12s entre líneas). Las diapositivas cambian por fundido de 0.9s cada 7s; el punto activo se llena como barra de progreso del tiempo restante. El avance se detiene con el cursor o el foco encima y no corre con `prefers-reduced-motion`. Flechas de vidrio translúcido a los lados; en móvil el velo pasa a vertical y el contenido baja al pie.

### Accesos rápidos
Una sola barra blanca de 10px de radio montada 60px sobre el borde inferior del carrusel, dividida en cuatro accesos por líneas de 1px: icono de línea en su tono, título y descripción. En hover el fondo se aclara y una línea de 3px de su tono crece al pie. En móvil queda en 2×2.

### Tarjetas de Conócenos
Misión, Visión e Historia en dos columnas escalonadas: Misión arriba a la izquierda, Visión a la derecha centrada entre las dos filas, Historia abajo desplazada 48px. Misión e Historia son marcos blancos de foto con una banda de su tono al pie y el nombre en blanco a 1.75rem; Visión es un bloque `tone-teal` con borde blanco de 10px y "Leer más". Toda la tarjeta es un enlace a su apartado; en hover sube 6px con un giro de -0.4°, y la foto se acerca dentro de su marco.

### Galería
Carrusel en abanico: la foto central (3:4, 22px de radio) al frente con brillo azul, las vecinas a los lados al 80% de escala y las demás ocultas. Las fotos se deslizan a su nueva posición en 0.8s, avanzan solas cada 4.5s (pausa con cursor o foco) y se controlan con botones redondos y puntos debajo. Una foto lateral la trae al centro; la central abre el visor.

### Visor de fotos
`<dialog>` modal sobre un velo `rgb(10 16 35 / .88)` con la foto a 80vh, 14px de radio, pie con descripción y contador, botón de cerrar y flechas de vidrio translúcido; flechas del teclado y Escape funcionan.

### Aparición al hacer scroll
Los títulos, tarjetas y bloques marcados suben 32px y aparecen en 0.9s al entrar en pantalla, con retrasos escalonados de 70 a 120ms en las listas. El contenido solo se oculta después de que el script está listo y nunca con `prefers-reduced-motion`.

### Volver arriba
Botón circular de 48px `site-blue` fijo abajo a la derecha que aparece al desplazarse.

### Franja de valores
Cuatro tarjetas blancas rectas sobre una banda de 96px que cruza el centro con un corte diagonal: azul (`#4f7fca` a `site-blue`) a la izquierda y `site-navy` a `site-navy-deep` a la derecha. Cada valor lleva su icono de 40px en su tono, el nombre a 700, una raya de 44×2px en `#e5484d` y la descripción en `site-text-2`. Al pasar el cursor la tarjeta se rellena con su tono, sube 4px y todo su texto pasa a blanco (0.25s).

### Calendario escolar
Tarjeta blanca con una leyenda de tipos de fecha en píldoras (Ciclo escolar, Sin clases, Consejo Técnico, Vacaciones, Festejo escolar y Hoy) y los doce meses del ciclo en cuatro columnas (tres en tableta, dos en móvil). Cada fecha importante es un día relleno con el color de su tipo; al pasar el cursor, enfocar o tocarla crece y abre una tarjeta flotante con la fecha, el tipo, el título y el resumen (fija al hacer clic, se cierra con Escape o clic fuera). Pasar el cursor o pulsar una píldora de la leyenda atenúa los demás tipos. A la derecha, un panel `site-navy` "Próximas fechas" con la fecha en un cuadro de su color; al elegir una se muestra en el calendario. Las fechas de ejemplo llevan un aviso.

### Encuéntranos
Mapa de Google Maps en un recuadro recto 4:5 (máximo 440px; 4:3 en móvil) junto a los bloques Dirección, Contacto y Horarios, con títulos `site-blue` a 1.625rem y datos a 600 en `site-blue-dark`; cierra con el botón "Ver ubicación".

### Banda de encabezado interior
Foto de la escuela a todo lo ancho (340px de alto, 280px en móvil) con el mismo acercamiento lento del héroe y un velo azul marino de izquierda a derecha; encima, alineados a la izquierda, ruta de navegación, título de página en blanco a 800 y descripción.

### Foto pendiente
Cuando un archivo de foto no existe, su lugar lo ocupa un recuadro `photo-pending` con un icono de imagen de 28px y "Foto pendiente" en `photo-pending-ink`, 600, 0.8125rem, que conserva la proporción de la foto. Su nombre accesible es el texto alternativo de la foto más "(foto pendiente)". En el héroe el recuadro es el degradado de `site-navy` a `site-blue` con el aviso en blanco al 55%, en la esquina inferior derecha.

### La gaveta del Kárdex (firma del Panel)
Frente `navy-800` con una etiqueta de papel blanca enmarcada; dentro, un fondo `ground` con filas-tarjeta blancas. Cada fila lleva un índice, una regla graduada de 10 divisiones y un clip de señal que se desliza hasta su porcentaje (0.3s, `ease-out`).

## Do's and Don'ts

### Do:
- **Do** usa `navy-800` como suelo del Panel y `site-navy` como marco del sitio (encabezado, pie y botones redondos).
- **Do** acompaña cada color de estado del Panel con su palabra y su clip de 7×14px.
- **Do** da a cada tarjeta del sitio un solo tono y aplícalo en su banda, su barra o su relleno de hover.
- **Do** abre cada sección del sitio con su título `site-blue` centrado y un subtítulo breve.
- **Do** usa fotografías reales de la escuela; mientras falten, muestra el recuadro "Foto pendiente".
- **Do** muestra cada texto institucional pendiente como "Información por confirmar." en cursiva y cada documento sin archivo como "Próximamente".
- **Do** mantén los objetivos táctiles en 44px o más y el anillo de foco de 3px visible en cada fondo (blanco sobre azul marino y degradados).
- **Do** usa cifras tabulares en fechas, horas, conteos y calificaciones del Panel.
- **Do** limita las respuestas de estado a 0.15 a 0.3s y respeta `prefers-reduced-motion`; el fundido de 0.7s es exclusivo del carrusel.

### Don't:
- **Don't** inventes datos, fotos de archivo ni un escudo: lo que falta se muestra como pendiente.
- **Don't** uses un tono del sitio como señal de estado, ni una señal como tono de tarjeta.
- **Don't** pongas texto blanco sobre un tono más claro que los del sistema, ni sobre `warn`.
- **Don't** cruces las familias: nada de Montserrat en el Panel ni de Atkinson en el sitio.
- **Don't** pongas sombras duras desplazadas; las sombras son difusas y teñidas de azul.
- **Don't** coloques etiquetas en mayúsculas espaciadas encima de los títulos.
- **Don't** hagas brillar más de una foto en la galería.
- **Don't** uses la mono para texto corrido; es solo para claves y códigos del Panel.
