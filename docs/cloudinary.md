# Archivos del sitio público con Cloudinary

Los documentos y fotos que el director sube desde **Panel → Sitio web** se guardan en [Cloudinary](https://cloudinary.com) (plan gratuito, sin tarjeta). Firestore solo guarda la dirección de cada archivo.

Hay dos modos de subida:

| Modo | Variable | Requiere | Seguridad |
|---|---|---|---|
| **Sin firma** (etapa de pruebas) | `VITE_UPLOAD_SIGNING=unsigned` o vacía | Solo Cloudinary | El nombre del preset va en el código del sitio: alguien con conocimientos técnicos podría subir archivos a la cuenta (no modificar el sitio). Los límites del preset acotan el abuso. |
| **Firmada** (producción) | `VITE_UPLOAD_SIGNING=signed` | Plan Blaze + Cloud Function `signCloudinaryUpload` | Solo un director con sesión activa obtiene una firma válida por una hora. El API secret nunca sale del servidor. |

## 1. Configuración común

1. En **Dashboard**, copia el **Cloud name**.
2. Ve a **Settings → Security**, activa **Allow delivery of PDF and ZIP files** y pulsa **Save**. Sin esto, los PDF subidos no se pueden abrir (Cloudinary responde 401).
3. Si el API secret se compartió alguna vez por chat o correo, genera uno nuevo en **Settings → API Keys** y desactiva el anterior.

## 2. Modo sin firma (pruebas)

1. En **Settings → Upload → Upload presets**, crea o edita el preset:
   - **Signing mode:** `Unsigned`.
   - **Asset folder:** `portal-escolar`.
   - **Allowed formats:** `jpg,jpeg,png,webp,gif,pdf,doc,docx,xls,xlsx,ppt,pptx`.
   - **Max file size:** `26214400` (25 MB).
   - **Overwrite:** desactivado.
   - Opcional: en **Incoming transformation**, `c_limit,w_2400` para reducir fotos enormes.
2. En `.env.local`:

   ```
   VITE_CLOUDINARY_CLOUD_NAME=tu-cloud-name
   VITE_CLOUDINARY_UPLOAD_PRESET=nombre-del-preset
   ```

3. Reinicia `npm run dev` (o vuelve a compilar con `npm run build`).

## 3. Modo firmado (producción, con Blaze)

1. Crea un **segundo preset** en modo `Signed`, con los mismos límites del paso 2.1.
2. Configura la Cloud Function, desde la raíz del proyecto:

   ```powershell
   npx firebase functions:secrets:set CLOUDINARY_API_SECRET
   ```

   Pega el API secret cuando lo pida (no queda en ningún archivo). Después crea `functions/.env.portal-escolar-hugo-pineda` con:

   ```
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_SIGNED_PRESET=nombre-del-preset-firmado
   ```

   Ese archivo no contiene secretos, pero tampoco se sube a Git (está en `.gitignore`).
3. Despliega las funciones: `npm run deploy:functions`.
4. En `.env.local` (o en el entorno donde se compila el sitio), agrega `VITE_UPLOAD_SIGNING=signed` y vuelve a desplegar el sitio con `npm run deploy`.
5. Cuando todo funcione, borra o desactiva el preset sin firma en Cloudinary.

## Qué conviene saber

- **Los archivos que se quitan del sitio permanecen en Cloudinary.** Borrar requiere la clave secreta. Para liberar espacio, bórralos a mano en **Media Library → portal-escolar**.
- **Las fotos se entregan optimizadas.** El sitio pide a Cloudinary el ancho que necesita cada pantalla y formato y calidad automáticos (`f_auto,q_auto`).
- **Siempre se puede escribir la dirección de un archivo** (por ejemplo, un enlace de Google Drive compartido) en lugar de subirlo. Solo se aceptan direcciones `https://` o rutas del sitio que empiecen con `/`.
- **Límite del plan gratuito:** unos 25 créditos al mes (almacenamiento + transferencia + transformaciones). Revisa el uso en **Dashboard**; para una escuela suele sobrar.
