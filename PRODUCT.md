# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Familias y tutores** de la Escuela Primaria Hugo César Piñeda Chacón: consultan información institucional, fechas del ciclo, documentos y datos de contacto, a menudo desde el teléfono.
- **Alumnos de primaria** (6 a 12 años), casi siempre acompañados de un adulto.
- **Personal de la escuela** (dirección y docentes): entra desde el portal público al sistema académico (Kárdex) en `/iniciar-sesion`.

## Product Purpose

Portal institucional de la escuela con dos partes: un sitio público informativo y el sistema académico interno (panel de dirección `/panel` y panel docente `/docente`). El sitio público presenta a la escuela, orienta a las familias y da acceso al Kárdex al personal autorizado.

## Operating Context

- Sitio público con páginas separadas: Inicio, Conócenos, Estudiantes, Calendario, Documentos y Contáctanos, más un acceso de inicio de sesión al Kárdex.
- React 19 + TypeScript + Vite + React Router, alojado en Firebase Hosting; Firestore y Authentication para el sistema académico.

## Capabilities and Constraints

- Hoy el sitio público no tiene contenido administrable: avisos, noticias, eventos, documentos y galería están modelados como entidades futuras (`docs/analisis-base-datos-v1.md`) pero no implementados.
- No hay cuentas para familias ni alumnos; el inicio de sesión es solo para personal.
- No hay emisión de documentos oficiales (constancias, boletas) ni integración SEP en esta entrega.

## Brand Commitments

- Nombre: Escuela Primaria Hugo César Piñeda Chacón.
- Sitio público: sigue la maqueta de referencia del usuario (2026-10-29), un sitio escolar institucional convencional y sobrio: encabezado azul marino, carrusel de fotos, tarjetas de Misión/Visión/Historia, galería, franja de valores, calendario escolar en imagen, mapa "Encuéntranos" y pie azul marino. Tipografía Montserrat. El usuario rechazó explícitamente un enfoque conceptual o extravagante.
- Kárdex (panel): azul marino institucional de `src/styles/globals.css` y Atkinson Hyperlegible Next.
- El escudo oficial aún no se entrega; `SchoolEmblem` usa una marca provisional "HC".

## Evidence on Hand

- Datos confirmados por el usuario (maqueta): dirección Del Mesón S/N, Camino Real, 23088 La Paz, B.C.S.; teléfono +52 612 114 3049; turno matutino 7:00–13:00 y vespertino 13:00–18:00, de lunes a viernes; texto de la visión; evento "Festival 2026, marzo–junio".
- Fotografías reales de la escuela existen (aparecen en la maqueta) pero los archivos aún no están en el repositorio. Mientras tanto `public/img/` tiene imágenes de ejemplo de Unsplash, documentadas en `docs/imagenes-de-ejemplo.md`, que deben reemplazarse por las reales con el mismo nombre.
- Pendientes: misión, historia, correo, calendario oficial del ciclo vigente, documentos y escudo. Se muestran como "Información por confirmar" o "Foto pendiente"; no se inventan datos.

## Product Principles

1. Decir solo lo verdadero: lo que no está confirmado se marca como pendiente, nunca se inventa.
2. Las familias primero: la información práctica (fechas, trámites, contacto) se encuentra en segundos desde un teléfono.
3. Sobrio y reconocible: el sitio público se parece a lo que una familia espera de una escuela, sin conceptos extravagantes.
4. Cercano sin ser infantil: profesional para las familias y amable para los niños.

## Accessibility & Inclusion

Público amplio con distintos niveles de alfabetización digital: alto contraste, textos claros, objetivos táctiles grandes y navegación por teclado (el sistema ya sigue WCAG AA y usa una tipografía de alta legibilidad).
