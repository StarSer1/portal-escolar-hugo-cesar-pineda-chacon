# Portal Escolar — Escuela Primaria Hugo César Piñeda Chacón

Plataforma institucional y académica desarrollada con React, TypeScript y Firebase.

## Requisitos

- Node.js 20 o superior
- Una cuenta y proyecto de Firebase

## Inicio rápido

1. Copia `.env.example` como `.env.local` y registra los valores de tu proyecto Firebase.
2. Instala las dependencias del frontend y Cloud Functions con un solo comando: `npm install`.
3. Inicia el sitio: `npm run dev`.

## Comandos principales

- `npm run dev`: servidor local.
- `npm run build`: valida TypeScript y genera la versión de producción.
- `npm run build:functions`: compila las Cloud Functions.
- `npm run lint`: revisa el código.
- `npm run emulators`: inicia emuladores de Firebase para desarrollo seguro.
- `npm run deploy:rules`: publica únicamente las reglas de seguridad.

Consulta `docs/arquitectura.md` para conocer la organización y el flujo del sistema.

## Trabajo en equipo

Las dependencias no se guardan en Git. Después de clonar el repositorio, ejecuta `npm ci`: instalará todas las versiones exactas indicadas en `package-lock.json`, incluido el paquete de Cloud Functions. Después crea tu archivo `.env.local` a partir de `.env.example`.

El archivo `.env.local` no se comparte por Git porque contiene la configuración de cada entorno. El administrador del proyecto debe dar acceso al colega tanto al repositorio de GitHub como al proyecto de Firebase cuando necesite administrar Authentication, Firestore, Storage o Functions.

