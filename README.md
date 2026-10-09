# Ketzara · Pedidos

Aplicación web sencilla para registrar pedidos, consultarlos y seguir su estado.

- **Backend:** FastAPI + SQLAlchemy 2 + Alembic (`backend/`)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **Base de datos:** PostgreSQL 16 en Docker (`docker-compose.yml`)

| Enlace | Para quién |
|---|---|
| `/` | Clientes: hacer un pedido (también responde en `/pedir`, el enlace anterior) |
| `/seguimiento/<código>` | Clientes: ver el estado de su pedido |
| `/admin` | Administración: requiere usuario y contraseña (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) |

## Puesta en marcha

Requisitos: Docker, Python 3.11+ y Node 20+.

```powershell
# 1. Base de datos
copy .env.example .env              # y cambia POSTGRES_PASSWORD
docker compose up -d

# 2. Backend (http://localhost:8000, documentación en /api/docs)
cd backend
copy .env.example .env              # usa la misma contraseña de PostgreSQL
python -m venv .venv
.\.venv\Scripts\pip install -r requirements-dev.txt
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\uvicorn app.main:app --reload --port 8000

# 3. Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Pruebas del backend (usan la base `ketzara_test`): `.\.venv\Scripts\python -m pytest -q`

## Publicar (Supabase + Render + Vercel)

| Parte | Servicio | Configuración en el repo |
|---|---|---|
| Base de datos | Supabase | migraciones de Alembic |
| Backend | Render | `render.yaml` |
| Frontend | Vercel | `frontend/vercel.json` |

1. **Subir el código a GitHub** (Render y Vercel publican desde ahí).
2. **Supabase:** crea un proyecto y copia la conexión del **Session pooler** (Connect → Session pooler,
   puerto 5432). Agrega `?sslmode=require` al final. Las tablas se crean solas cuando arranca Render
   (`alembic upgrade head`). La migración de RLS evita que la API REST automática de Supabase exponga las tablas.
3. **Render:** New → Blueprint → elige el repositorio. Render lee `render.yaml` y pide:
   - `DATABASE_URL`: la conexión de Supabase del paso 2.
   - `CORS_ORIGINS`: la URL de Vercel (paso 4), por ejemplo `https://ketzara.vercel.app`.
     Puedes poner un valor temporal y corregirlo después.
   - `ADMIN_USERNAME` y `ADMIN_PASSWORD`: el usuario y la contraseña para entrar a la administración.
     `AUTH_SECRET` lo genera Render. Al cambiar la contraseña se cierran todas las sesiones abiertas.
   Al terminar, comprueba `https://<servicio>.onrender.com/api/health` → `{"status":"ok"}`.
4. **Vercel:** Add New → Project → elige el repositorio, **Root Directory = `frontend`**, y agrega la variable
   `VITE_API_URL=https://<servicio>.onrender.com/api`. Despliega.
5. Vuelve a Render y deja `CORS_ORIGINS` con la URL final de Vercel (Render se reinicia solo).

Notas:
- El plan gratuito de Render se apaga tras 15 minutos sin uso; la primera visita después tarda ~1 minuto.
- Si cambias `VITE_API_URL` en Vercel, hay que volver a desplegar (Redeploy) para que tome efecto.
- Los enlaces de seguimiento usan el dominio de Vercel: `https://<tu-app>.vercel.app/seguimiento/<código>`.

## Estructura

```
backend/app/
  core/       configuración, catálogos (métodos de pago y estados), manejo de errores
  db/         conexión y clase base de SQLAlchemy
  models/     tablas: customers, products, orders, order_items
  schemas/    validación de entrada/salida (Pydantic)
  services/   lógica de negocio (creación de pedidos, búsquedas, dashboard)
  api/routes/ endpoints REST bajo /api
backend/alembic/  migraciones
frontend/src/
  api/        cliente HTTP y endpoints
  components/ layout, formulario de pedido, tablas, UI básica
  pages/      Dashboard, Nuevo pedido, Pedidos, Detalle, Consultar pedido, Productos
```

## Decisiones importantes

- **Número de pedido:** lo genera el backend con una secuencia de PostgreSQL (`order_number_seq`) y la columna
  `order_number` es `UNIQUE`. Es seguro con pedidos simultáneos. Si una creación falla puede quedar un número sin usar.
- **Histórico:** `order_items` guarda nombre y precio del producto, y el pedido guarda la dirección de envío,
  así que editar un producto o un cliente no altera pedidos anteriores.
- **Clientes:** se identifican por celular. Al crear un pedido con un celular existente se reutiliza el cliente.
- **Enlace para el cliente:** cada pedido tiene un `tracking_code` aleatorio. El enlace
  `/seguimiento/<código>` muestra solo el estado, los productos y el total de ese pedido (sin teléfono ni dirección),
  y usa el endpoint público `GET /api/public/orders/{código}`.
- **Acceso:** un único usuario administrador definido en variables de entorno. El inicio de sesión entrega un token
  firmado (válido 7 días) que el frontend envía en `Authorization: Bearer`. Tras 10 intentos fallidos desde la misma IP
  se bloquea el inicio de sesión durante 15 minutos.
- **Cancelación:** los pedidos nunca se borran; se marcan como `Cancelado` y dejan de contar en las ventas.
- **Fechas:** "hoy" y "este mes" se calculan con `APP_TIMEZONE` (por defecto `America/Bogota`).
- **Agregar un método de pago o estado:** editar `backend/app/core/constants.py`. El frontend los obtiene de `GET /api/meta`.
