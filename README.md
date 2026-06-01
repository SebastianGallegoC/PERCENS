# NoSignal Survey

Aplicación PWA offline-first para diligenciar encuestas de visita con GPS, fotos, sincronización a API y descarga Excel basada en `PlantillaSurvey.xlsx`.

## Arquitectura

- `frontend/`: React + Vite + TypeScript + PWA + Dexie.
- `backend/`: FastAPI + SQLAlchemy async + Alembic.
- `db`: PostgreSQL/PostGIS independiente para Survey.
- `traefik/`: reglas dinámicas para publicar Survey con la instancia Traefik compartida del servidor.

Survey replica la arquitectura de `NoSignal_Huertas`, pero usa un formulario distinto y no incluye importación Excel.

## Aislamiento frente a Huertas

Aunque Survey puede correr en el mismo VPS y bajo el mismo dominio raíz, sus datos no se comparten con Huertas:

- Frontend: `https://survey.nosignal.site`
- API: `https://api.survey.nosignal.site`
- BD: `nosignal_survey`
- Contenedores: `nosignal-survey-*`
- Volúmenes: `nosignal_survey_db`, `nosignal_survey_uploads`
- JWT, usuarios y `.env`: independientes

Lo único compartido en producción es Traefik en el puerto `443`.

## Formulario Survey

La plantilla `PlantillaSurvey.xlsx` define 29 columnas visibles en Excel y una clave interna `id_formulario` que no se muestra al usuario ni se exporta. Ese ID se conserva en IndexedDB, API, base de datos, historial y precargas para editar y sincronizar sin duplicados.

Secciones:

- Coordenadas WGS84
- Tratamiento de datos
- Fecha de la visita
- Ubicación
- Encuestado
- Vivienda
- Validación
- Desplazamiento
- Encuestador

El único campo obligatorio para guardar/enviar es `nombres_apellidos_encuestado`.

## Excel

La plantilla debe estar disponible en:

- raíz del proyecto: `PlantillaSurvey.xlsx`
- frontend público: `frontend/public/PLANTILLA.xlsx`

La descarga Excel escribe datos desde la fila 7 de la hoja `Plantilla`. La aplicación no implementa importación Excel.

## Configuración

Copiar `.env.example` a `.env` y reemplazar secretos:

```bash
cp .env.example .env
```

Variables clave:

- `VITE_API_URL=https://api.survey.nosignal.site`
- `CORS_ORIGINS=https://survey.nosignal.site`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `NOSIGNAL_AUTH_USERS`

## Desarrollo local

El compose expone puertos locales para pruebas:

- Frontend: `http://localhost:8081`
- Backend: `http://localhost:8001`
- Postgres: `localhost:5434`

Antes de levantar el stack, crear la red compartida si no existe:

```bash
docker network create traefik-public
docker compose build
docker compose up -d
```

Para ejecutar frontend fuera de Docker:

```bash
cd frontend
npm install
npm run dev
```

Para ejecutar backend fuera de Docker, usar `backend/.env.example` como base y apuntar `DATABASE_URL` a `localhost:5434`.

## Producción en el mismo VPS que Huertas

1. Crear registros DNS A:
   - `survey.nosignal.site` → IP pública del VPS
   - `api.survey.nosignal.site` → IP pública del VPS
2. Crear o verificar la red Docker (la misma que usa Traefik/Huertas):
   ```bash
   docker network create nosignal-network
   ```
3. Levantar Survey:
   ```bash
   docker compose build
   docker compose up -d
   ```
4. Tras `git pull` que cambie código o migraciones Alembic, **reconstruir el backend** (las migraciones van copiadas en la imagen, no se leen del host):
   ```bash
   docker compose build backend
   docker compose up -d backend
   docker compose exec backend python -m alembic upgrade head
   ```
5. En `NoSignal_Huertas`, Traefik debe cargar `traefik/dynamic.survey.yml` de este repo (ver `traefik/README.md`). Tras `git pull` en Huertas: `docker compose up -d traefik`.

**Importante:** Survey se sirve por dominio vía Traefik (`https://survey.nosignal.site`), no por el puerto 8081 del host. Si al abrir el dominio ves otra aplicación, revisá conflicto en puerto 80 y la red `nosignal-network`.

## Verificación

```bash
cd frontend
npm run typecheck
npm run test
npm run build
```

```bash
cd backend
pytest
```
