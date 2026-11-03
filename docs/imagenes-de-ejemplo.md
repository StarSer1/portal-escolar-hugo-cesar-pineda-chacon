# Imágenes de ejemplo del sitio público

Las fotografías en `public/img/` son **imágenes de ejemplo** de [Unsplash](https://unsplash.com) (licencia Unsplash: uso gratuito, sin atribución obligatoria). No son fotos de la escuela. Reemplázalas por fotografías reales guardando cada archivo con el mismo nombre; no hace falta cambiar código.

| Archivo | Uso | Origen |
|---|---|---|
| `inicio/festival.jpg` | Carrusel: Festival | https://unsplash.com/photos/photo-1780844824566-2fb198a6b93c |
| `inicio/escuela.jpg` | Carrusel: Bienvenidos; encabezado de Contáctanos | https://unsplash.com/photos/photo-1509062522246-3755977927d7 |
| `inicio/calendario.jpg` | Carrusel: Calendario; encabezado de Calendario | https://unsplash.com/photos/photo-1503676260728-1c00da094a0b |
| `conocenos/mision.jpg` | Tarjeta Misión | https://unsplash.com/photos/photo-1588072432836-e10032774350 |
| `conocenos/historia.jpg` | Tarjeta Historia; encabezado de Conócenos | https://unsplash.com/photos/photo-1777056491418-d4ff81a4ad92 |
| `galeria/1.jpg` | Galería; encabezado de Documentos | https://unsplash.com/photos/photo-1786667395513-1d0804488602 |
| `galeria/2.jpg` | Galería | https://unsplash.com/photos/photo-1588075592446-265fd1e6e76f |
| `galeria/3.jpg` | Galería | https://unsplash.com/photos/photo-1786926274349-fa4c39495064 |
| `galeria/4.jpg` | Galería | https://unsplash.com/photos/photo-1613950190144-4f2a84c75e8c |
| `galeria/5.jpg` | Galería; encabezado de Estudiantes | https://unsplash.com/photos/photo-1771765767087-ce71e4a7916a |
| `galeria/6.jpg` | Galería | https://unsplash.com/photos/photo-1577896851231-70ef18881754 |

Los archivos se descargaron de `images.unsplash.com/<id>` con ancho de 1000 a 1920 px. El sitio dibuja su propio calendario interactivo del ciclo; el calendario oficial puede ofrecerse además como PDF descargable con `calendarPdf`.

## Fechas de ejemplo del calendario

`schoolEvents` en `src/features/public/school.ts` contiene fechas de ejemplo (feriados oficiales, Consejo Técnico el último viernes de cada mes, vacaciones y festejos típicos) para mostrar el calendario interactivo. No son el calendario oficial de la SEP ni de la escuela. Reemplázalas por las oficiales y cambia `eventsAreExamples` a `false` para quitar el aviso "Fechas de ejemplo".

También se agregó `public/img/docentes/educacion-fisica.jpg` (https://unsplash.com/photos/photo-1761039807514-292d7d33059f) para la tarjeta de Educación Física.
