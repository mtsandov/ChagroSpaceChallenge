# Guía de contribución

## Flujo de trabajo

1. Parte de `main` actualizado y crea una rama:
   - `feat/<tema>` para funcionalidades (`feat/sar-tiles`)
   - `fix/<tema>` para correcciones
   - `data/<tema>` para cambios del pipeline NASA o de los JSON
   - `style/<tema>` para ajustes visuales
2. Haz commits pequeños con mensajes en presente: `feat(mapa): agrega capa NDVI`.
3. **Agrega tu línea al `CHANGELOG.md`** en `[Unreleased]`.
4. Antes de abrir el PR, revisa que pasen los tests y el build:
   ```bash
   npm test
   npm run build
   ```
5. Abre el PR contra `main` y pide revisión a otra persona del equipo.

## Áreas y responsables sugeridos

| Área | Carpeta | Notas |
|---|---|---|
| Mapa y estilos | `src/components/map`, `tailwind.config.js`, `src/index.css` | Los colores de las capas están en `mapStyles.ts` y la paleta global en `tailwind.config.js`. |
| Copiloto | `src/components/copilot`, `api/chat.ts`, `api/_lib/copilot.ts` | El prompt de sistema está en `api/_lib/copilot.ts`. |
| Motor de riego | `src/lib/agro` | Funciones puras; cada cambio va con su test en `tests/`. |
| Datos NASA | `pipeline/`, `public/data`, `api/_lib/data.ts` | Respetar `docs/DATA_CONTRACT.md`. |
| Base de datos | `supabase/` | Cada cambio de esquema va en una migración nueva; no edites las ya aplicadas. |

## Reglas

- **Nunca** subas claves: usa `.env.local` (ignorado por git) y documenta las variables nuevas en `.env.example`.
- Las variables con prefijo `VITE_` llegan al navegador. La key de Gemini y la service role de Supabase **no** llevan ese prefijo.
- El rol del usuario se decide en el servidor a partir del token. No confíes en un `role` enviado en el body.
- El LLM no calcula: los números salen de `src/lib/agro` y Gemini solo los explica.
- Los módulos que también usa `/api` (`src/lib/agro`, `src/lib/summary.ts`, `src/data`, `src/types`) se importan con rutas **relativas**, no con el alias `@/`.
