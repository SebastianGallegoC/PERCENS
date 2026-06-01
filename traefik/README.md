# Traefik y Survey en el mismo VPS

Survey **no** se publica por los puertos `8081` / `8001` del host. Esos puertos son solo para depuración local en el servidor (`127.0.0.1`).

En producción el tráfico entra así:

```
Internet → Traefik (:443, red nosignal-network) → nosignal-survey-frontend / nosignal-survey-backend
```

## Requisitos en el servidor

1. **Misma red Docker que Huertas/Traefik**  
   Los contenedores Survey deben estar en `nosignal-network` (ya configurado en `docker-compose.yml`).

2. **Traefik debe cargar `dynamic.survey.yml`**  
   En el repo `NoSignal_Huertas`, Traefik monta este archivo:

   `../NoSignal_Survey/traefik/dynamic.survey.yml` → `/etc/traefik/dynamic/survey.yml`

   Tras cambiar rutas Traefik:

   ```bash
   cd ~/NoSignal_Huertas
   git pull
   docker compose up -d traefik
   ```

3. **Recrear Survey** (para unirse a `nosignal-network`):

   ```bash
   cd ~/NoSignal_Survey
   git pull
   docker compose up -d --force-recreate frontend backend
   ```

4. **Usar HTTPS**  
   Abrí `https://survey.nosignal.site`, no `http://` a secas.

## Conflicto con puerto 80 (otra app, p. ej. finanzas)

Si otro stack publica `0.0.0.0:80->80` (como `finanzas_frontend`), las peticiones **HTTP** al IP del VPS van a esa app, no a Survey.

Opciones:

- Quitar el mapeo `80:80` de esa otra app y dejar solo Traefik en el puerto 80 (recomendado, con redirección HTTP→HTTPS).
- O acceder siempre por `https://survey.nosignal.site`.

## Comprobación

```bash
docker network inspect nosignal-network --format '{{range .Containers}}{{.Name}} {{end}}'
```

Deben aparecer al menos: `nosignal-traefik`, `nosignal-survey-frontend`, `nosignal-survey-backend`.

```bash
curl -sI https://survey.nosignal.site | head -5
```
