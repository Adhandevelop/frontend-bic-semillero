# Buses Universal — Frontend

Aplicación académica de gestión de transporte desarrollada con Angular 18 y TypeScript. Consume una API de Django REST Framework y reúne un panel administrativo y un portal de pasajeros basado en diseños de Stitch.

## Estado del proyecto

| Área | Disponible | Pendiente |
| --- | --- | --- |
| Administración | Acceso con JWT y verificación de rol administrador; dashboards de flota y viajes | Integraciones operativas adicionales |
| Buses | Consulta, búsqueda, filtros, creación, edición y eliminación | Guardar fotos y equipamiento; telemetría real |
| Conductores | Consulta, ficha, búsqueda, paginación, exportación CSV y gestión de registros | Guardar fotos, certificaciones y datos complementarios; verificaciones oficiales |
| Rutas y viajes | Gestión con la API; asignación de recursos, horarios y cambios de estado de viajes | Validación de conflictos y disponibilidad horaria en el backend |
| Clientes | Directorio, filtros, ficha, CSV y formulario administrativo de registro | Corregir validadores de registro en el backend; historial y fidelización |
| Portal de pasajeros | Inicio, formularios de acceso y registro, perfil y compra de demostración | Autenticación y registro reales de pasajeros, reservas, ventas y pagos |
| Ubicación | Mapa Leaflet/OpenStreetMap con tres buses estáticos en GeoJSON | Recepción de lecturas del dispositivo GPS y actualización en vivo |

**Generar venta** abre la venta administrativa conectada a la API. Registra un recaudo ya realizado; no procesa cobros electrónicos. La compra pública permanece como demostración. Los datos del perfil de pasajero, las promociones y el monedero son de ejemplo.

## Requisitos e instalación

- Node.js 20 y npm.
- Backend accesible para utilizar los módulos administrativos.
- Cuenta de administrador existente en el backend.

Desde la carpeta que contiene `package.json`:

```bash
npm ci
npm start
```

Abrir [http://localhost:4200](http://localhost:4200). Angular CLI se instala con las dependencias; no se necesita una instalación global.

## Configuración de la API

La configuración está en [api.config.ts](src/app/core/config/api.config.ts):

```ts
export const API_BASE_URL = '/api';
```

Las peticiones usan el mismo origen que el frontend. En producción, el servidor web debe dirigir `/api/` a Django y servir las rutas de Angular mediante su `index.html`.

En desarrollo, este repositorio no incluye un proxy configurado para `ng serve`. Para conectar un Django local se debe configurar un proxy de Angular o cambiar la URL base, por ejemplo a `http://127.0.0.1:8000/api`, y permitir el origen del frontend en la configuración CORS del backend. Sin ese ajuste, las peticiones relativas a `/api` llegarán al servidor de Angular.

### Recursos utilizados

| Recurso | Endpoint |
| --- | --- |
| Inicio de sesión | `/api/token/` |
| Renovación de token configurada | `/api/token/refresh/` |
| Usuarios y perfil del administrador | `/api/accounts/users/` y `/api/accounts/users/:id/` |
| Buses | `/api/fleet/buses/` |
| Conductores | `/api/fleet/drivers/` |
| Rutas | `/api/routes/routes/` |
| Lugares de origen y destino | `/api/geography/places/` |
| Viajes | `/api/trips/trips/` |

El login administrativo envía `username` y `password`, verifica el perfil y almacena los tokens cuando el rol es `admin`. El guard protege el layout y sus rutas hijas; los permisos definitivos corresponden al backend. La existencia de una URL de renovación no implica renovación automática de sesión.

### Contratos de rutas y viajes

Los servicios adaptan los nombres del backend a los usados por las vistas:

- Rutas: `origin`, `destination` y `distance_km`. Origen y destino son IDs de lugares registrados; los nombres se consultan en el catálogo de lugares. Si las etiquetas no cargan, se muestra `Ubicación #ID`.
- Viajes: `bus`, `driver`, `route`, `date_time_start`, `date_time_end` y `trip_state`.
- Estados de viaje: `scheduled` → programado, `in_progress` → en curso, `completed` → finalizado y `cancelled` → cancelado. Los cambios de estado usan `PATCH` sobre el viaje.
- Las consultas de catálogos admiten arrays o paginación DRF. [api-pagination.ts](src/app/core/services/api-pagination.ts) reúne las páginas mediante el parámetro `page`.

Al guardar una ruta, origen y destino deben corresponder a lugares existentes y no ambiguos. El backend actual no tiene estado de ruta: `activa` es un valor de compatibilidad de la interfaz, no una validación operativa persistida.

## Navegación

### Portal público

| Ruta | Vista |
| --- | --- |
| `/` | Inicio, consulta de viajes y búsqueda de rutas de demostración |
| `/clientes/login` | Formulario de acceso de pasajeros; autenticación pendiente |
| `/registro` | Formulario de registro; creación de cuentas pendiente |
| `/clientes/panel` | Vista previa del perfil de pasajero con datos ficticios |
| `/clientes/comprar` | Simulación de compra y selección de asiento |
| `/ubicacion` | Mapa de buses estáticos de ejemplo |
| `/login` | Acceso administrativo |

### Panel administrativo

| Ruta | Función |
| --- | --- |
| `/dashboard` | Resumen de operación |
| `/clientes` | Directorio de clientes reales, filtros, ficha y exportación |
| `/ventas/nueva` | Venta administrativa, selección de silla y emisión por API |
| `/buses` | Gestión de buses |
| `/conductores` | Gestión de conductores |
| `/rutas` | Gestión de rutas |
| `/viajes` | Dashboard, filtros, próximas salidas y gestión de viajes |

Formularios de creación: `/buses/nuevo`, `/conductores/nuevo`, `/rutas/nueva` y `/viajes/nuevo`. La edición usa `/<módulo>/editar/:id`.

La navegación está definida en [app.routes.ts](src/app/app.routes.ts). El acceso **Generar venta** del menú administrativo lleva a `/ventas/nueva`; programar servicios sigue disponible en Viajes.

## Comportamientos importantes

### Gestión administrativa

- Los formularios de buses guardan placa, modelo, capacidad y estado. Los de conductores guardan nombre completo, usuario asociado, licencia, dirección y teléfono. El usuario asociado debe existir previamente.
- Fotos PNG, JPG y WEBP de hasta 5 MB se previsualizan localmente. Fotos, equipamiento y datos complementarios de conductor no se envían a la API.
- El formulario de viajes selecciona una ruta existente, bus y conductor. Intercambiar origen y destino requiere una ruta inversa registrada. La salida es obligatoria y el fin, opcional, debe ser posterior.
- Horarios y filtros de fecha de viajes usan `America/Bogota` (UTC−05:00); los formularios envían fechas ISO UTC.
- Las exportaciones CSV incluyen los resultados filtrados, no solo la página visible. No generan manifiestos oficiales ni PDF.
- Los catálogos secundarios que fallen se identifican en pantalla; el listado de viajes puede conservar los registros mostrando sus referencias por ID.

### Dashboard de rutas

`/rutas` muestra el catalogo real con busqueda por ID/origen/destino, filtros de origen y distancia, nueve registros por pagina, exportacion CSV, actualizacion, edicion y eliminacion confirmada. PDF permanece pendiente.

Los indicadores cuentan rutas, suman distancias validas y deduplican terminales por ID. La suma de tramos no equivale a longitud vial unica. Estado operativo, regiones, duraciones y reportes de Invias/DITRA no estan conectados; la tabla indica **Registrada**, sin presentar el estado de compatibilidad como disponibilidad real.

**Ver mapa** usa los GeoJSON `place_point` de las terminales de la ruta seleccionada. Muestra los puntos validos y una conexion recta entre ambos, no un trazado de carretera ni GPS en vivo. Si faltan coordenadas o el mapa base no carga, muestra un aviso. Leaflet se carga al iniciar el visor.

Archivos: `src/app/pages/rutas/ruta-list.component.*` y `ruta-map.component.ts`. El servicio conserva las coordenadas en `origen_punto` y `destino_punto`.

### Dashboard de clientes

El directorio de `/clientes` sigue el diseño de Stitch y consulta cuentas con rol `client` de todas las páginas de la API. Incluye indicadores de registros y clientes con contacto, búsqueda por nombre/usuario/documento/correo/teléfono, filtros de contacto, paginación de seis registros, ficha de consulta y exportación CSV de todos los resultados filtrados.

Historial, reservas, categorías VIP y puntos permanecen pendientes y se identifican en pantalla. La referencia de silletería enlaza a la compra de demostración; no representa inventario real. No se asumen tipo de documento, verificación de WhatsApp ni estado de cuenta.

### Venta administrativa de tiquetes

`/ventas/nueva` implementa el diseño de venta en ventanilla bajo el guard administrativo. Se abre desde **Generar venta**, desde **Tiquete** en el directorio (cliente preseleccionado por ID) y después de registrar un cliente. La compra pública `/clientes/comprar` conserva su demostración independiente.

Consulta viajes futuros programados, terminales, clientes, tarifas (`/api/trips/fares/`), sillas (`/api/fleet/seats/`) y tiquetes (`/api/sales/tickets/`), incluyendo todas las páginas. Ordena las sillas por fila/columna sin inventar pisos, categorías o un plano físico. Las sillas con tiquetes `issued` quedan bloqueadas; no hay reserva temporal ni seguimiento en vivo.

Para emitir exige cliente con documento/correo/teléfono, viaje, silla, tarifa positiva y confirmación de recaudo. Reconsulta tiquetes antes del POST a `/api/sales/admin-sales/`. Envía IDs de viaje/silla, datos del pasajero y método `cash`, `card` o `transfer`; el servidor calcula el importe y registra la venta pagada. No envía precios calculados en el navegador ni procesa PSE/Nequi. Muestra el número de venta y códigos de tiquete devueltos por el servidor.

Bloquea envíos simultáneos y nuevas emisiones después del éxito. Ante un resultado ambiguo (red/error del servidor), bloquea el reintento para evitar duplicados e indica verificar la operación en el servidor. La facturación Factus depende del backend; un fallo posterior al registro requiere conciliación. No se ejecutaron ventas reales durante las comprobaciones. Concurrencia y unicidad deben garantizarse también en el backend.

### Facturación Factus

El backend existente solicita un token con `POST /oauth/token` (formulario `grant_type=password`, credenciales de aplicación y cuenta) y envía la factura con Bearer a `/v2/bills/validate`. Angular no solicita ni guarda credenciales o tokens de Factus.

El resultado de venta muestra `factus_invoice`: estado pendiente/emitida/error, número, CUFE, enlace público HTTPS y notificaciones recibidas en `raw_response.data.errors`. **Actualizar estado de factura** consulta `GET /api/sales/sales/:id/`, sin emitir otra venta ni reintentar la factura. Un error fiscal no implica que el tiquete no se haya emitido.

Para probar la integración, configurar en el servidor `FACTUS_BASE_URL`, `FACTUS_USERNAME`, `FACTUS_PASSWORD`, `FACTUS_CLIENT_ID`, `FACTUS_CLIENT_SECRET` y las variables fiscales existentes `FACTUS_NUMBERING_RANGE_ID`, `FACTUS_MUNICIPALITY_CODE`, `FACTUS_PRODUCT_CODE`, `FACTUS_PRODUCT_NAME`, `FACTUS_UNIT_MEASURE_CODE`, `FACTUS_STANDARD_CODE`, `FACTUS_TAX_CODE`, `FACTUS_TAX_RATE`, `FACTUS_TAX_EXCLUDED`, según la cuenta y el servicio. No copiar credenciales al frontend ni al repositorio. No se verificaron credenciales, configuración del servidor ni emisión real de sandbox desde esta sesión.

Queda pendiente almacenar y mapear el tipo de documento: el backend actual fija `identification_document_code` en `13`. También requiere revisar los datos fiscales y la relación entre tarifa, impuestos y total; no se debe copiar el IVA o los productos del ejemplo como regla del transporte. El cliente OAuth actual no envía explícitamente `Accept: application/json`; conviene añadirlo al revisar el backend.

### Registro rápido desde ventas

**Cliente existente** consulta una coincidencia exacta por documento, rellena nombre, correo y celular y muestra el tipo de documento si la API lo devuelve. Mientras no exista el filtro del backend, `ClienteService.buscarPorDocumento` consulta todas las páginas del catálogo y filtra por documento completo; no presupone que el servidor aplique `?identification_number=`. El filtro independiente de API queda pendiente. El directorio se carga mediante una suscripción independiente de viajes/sillas/rutas/tarifas: un fallo de esos catálogos no descarta una respuesta 200 de clientes. Muestra conteo, selección directa de los primeros 20 clientes, búsqueda exacta para el resto y su propio estado de carga/error/reintento. La búsqueda y el formulario de pasajero funcionan independientemente de la carga de viajes/sillas. El botón ejecuta explícitamente la búsqueda y Enter también la envía; la consulta tiene un límite de 15 segundos para evitar un bloqueo indefinido. Se compara el documento completo como texto, tolerando espacios externos y valores numéricos del catálogo. Si se preparan datos con un documento ya cargado, se selecciona automáticamente la cuenta existente. Una búsqueda sin resultados ofrece **Añadir cliente** y precarga su documento; un error de consulta no se interpreta como cliente inexistente. Cambiar el documento elimina la selección anterior y bloquea emitir mientras se busca.

**Cliente nuevo / Añadir cliente** abre los cinco campos dentro de la venta. **Usar estos datos en la venta** valida y prepara al pasajero en memoria, conservando viaje y silla; no crea una cuenta todavía. Al confirmar la venta, un único POST a `/api/sales/admin-sales/` envía `identification_number`, `name`, `email`, `telephone`, `trip`, `seat` y `payment_method`. El backend busca o crea al cliente y emite el tiquete. Este flujo no utiliza el POST separado de cuentas ni genera credenciales desde Angular.

El precio es de solo lectura y `amount_cents` no se envía. El tipo de documento sigue sin formar parte del contrato de venta y no se persiste. Cancelar conserva el pasajero previo; elegir un cliente registrado descarta el pasajero preparado. Mientras se edita el formulario no se permite emitir. La creación del cliente no se anuncia como exitosa antes de recibir la venta.

### Registrar cliente

`/clientes/nuevo` es una ruta administrativa protegida, accesible desde el dashboard de clientes. El formulario basado en Stitch envía documento, nombres, apellidos, teléfono, correo, usuario y contraseña mediante POST a `/api/accounts/users/`; el backend fija el rol `client`. Valida campos obligatorios, longitudes, formatos y confirmación de contraseña, bloquea envíos duplicados y muestra errores de validación del servidor. No guarda contraseñas en almacenamiento local.

Tipo de documento, nacimiento, género, residencia, preferencias, emergencia y consentimiento persistido aún requieren soporte de API. Se identifican como pendientes. Guardar vuelve al directorio; la acción alternativa abre la venta administrativa con el cliente preseleccionado únicamente después de una creación exitosa.

El registro administrativo distingue errores de conexión, sesión, permisos, validación, conflicto, servicio inexistente y errores internos HTTP 5xx. Los fallos conservan el formulario y no muestran una creación exitosa. Para diagnosticar un caso real, revisar el código HTTP y la respuesta de `POST /api/accounts/users/` en la pestaña Red del navegador, sin copiar contraseñas ni tokens.

**Impedimento detectado en el backend local:** `UserSerializer.validate_username` llama `value.get("username")` cuando `value` es un string; `validate_password` también trata su argumento como diccionario. Estos validadores necesitan corrección en el backend para que el POST funcione. Esta modificación del frontend no cambia esos archivos. La creación real debe verificarse después de corregirlos.

### Crear y editar rutas

El formulario de rutas sigue el diseño de Stitch y selecciona terminales del catálogo por ID, permitiendo nombres repetidos. Exige origen y destino diferentes y una distancia entre 0.01 y 999999.99 km con máximo dos decimales. Permite intercambiar terminales y previsualizar sus puntos GeoJSON en el mapa.

Solo envía a la API los IDs de origen y destino y la distancia. Duración, tarifa, puntos intermedios, borradores y activación operativa se identifican como pendientes; no se simula su guardado. Los errores de carga permiten reintentar y los envíos duplicados se bloquean durante el guardado.

### Demostraciones y servicios pendientes

- La búsqueda de reservas del inicio solo abre la combinación de ejemplo Bogotá Salitre → Medellín, 24 de octubre de 2026, un adulto y solo ida. Otras selecciones muestran un aviso. Esta fecha está fijada en el código y debe revisarse al actualizar la demostración.
- La compra permite cambiar horario, piso y asiento y recalcula el total. El inventario es local, no bloquea puestos en el servidor. Los datos están en [booking.data.ts](src/app/pages/booking/booking.data.ts).
- El perfil público de pasajero usa [client-panel.data.ts](src/app/pages/client-panel/client-panel.data.ts). Antes de mostrar datos personales reales debe conectarse y protegerse con autenticación de pasajeros.
- Los formularios de login y registro de pasajeros validan entradas, pero no envían credenciales ni crean cuentas. Google, Apple y recuperación de contraseña están pendientes.
- Boletín, redes sociales, WhatsApp, documentos legales y otras acciones sin integración muestran avisos; no simulan suscripciones ni envían mensajes.

### Mapa y GPS

El mapa utiliza Leaflet 1.9 y teselas de OpenStreetMap, que requieren internet. Las tres posiciones estáticas están en [bus-locations.mock.ts](src/app/core/data/bus-locations.mock.ts).

Cada ubicación usa GeoJSON `Point` con coordenadas **[longitud, latitud]**, en WGS84/SRID 4326. El flujo previsto es dispositivo GPS → `PointField` en el backend → API GeoJSON → mapa. El frontend todavía no consume lecturas reales.

Capacidad no equivale a puestos libres. Ocupación, velocidad, andenes, alertas y datos de telemetría ilustrativos no deben interpretarse como información operativa en vivo.

## Compilación y despliegue

```bash
npm run build
```

Los archivos para servir con Nginx se generan en:

```text
dist/sistema-gestion-transporte-frontend/browser/
```

En el servidor con Docker Compose, ejecutar desde el directorio del despliegue:

```bash
git pull --ff-only
docker compose up -d --build --no-deps frontend
```

Los archivos de Docker Compose, Dockerfile y configuración Nginx pertenecen al despliegue; no están incluidos en esta carpeta del frontend. Antes de desplegar, confirmar que las plantillas y hojas de estilos nuevas estén versionadas.

### Diagnóstico rápido

| Problema | Qué revisar |
| --- | --- |
| `Could not find stylesheet file` | Archivo presente en Git y en el checkout del servidor; contexto de build, `COPY` y `.dockerignore` |
| HTTP 401 | Sesión o token vencido; volver a iniciar sesión |
| HTTP 403 | Rol y permisos de la cuenta en Django |
| HTTP 404 en catálogos | Endpoint, versión del backend y configuración de `/api/` en el servidor |
| Fallo de conexión o respuesta HTML en vez de JSON | Backend, proxy de desarrollo, CORS o reglas de Nginx |
| Mapa base sin cargar | Acceso a internet para las teselas de OpenStreetMap |

## Verificación y pendientes técnicos

Última compilación registrada: **22 de octubre de 2026**, correcta. Hay advertencias por tamaño del paquete inicial, estilos de componentes y Leaflet en formato CommonJS. Los límites se definen en `angular.json`.

Se realizaron comprobaciones con servicios simulados sobre filtros, paginación, contratos de API, fechas, formularios, cambios de estado, conteos de rutas, puntos GeoJSON y exportaciones CSV; no sustituyen una prueba de integración con el backend desplegado. `package.json` no configura un comando `npm test`.

Pendientes prioritarios:

- Conectar autenticación, registro y perfil reales de pasajeros.
- Completar reservas y pagos en línea; verificar ventas administrativas y facturación contra el backend desplegado.
- Integrar el dispositivo y las lecturas GPS/IoT.
- Ampliar el backend para fotos, equipamiento y certificaciones.
- Resolver la diferencia del estado de mantenimiento: el frontend usa `mantenimiento` y el modelo del backend local define `Maintenance`; actualmente no hay adaptación entre ambos.
- Optimizar la carga inicial y los estilos para reducir las advertencias de compilación.

## Organización y mantenimiento

```text
src/app/
├── core/       # Configuración, modelos, servicios, guards y datos de ejemplo
├── pages/      # Módulos administrativos y vistas del portal de pasajeros
├── shared/     # Layout administrativo y barra de navegación
└── app.routes.ts
```

Actualizar este README junto con cada cambio funcional, de configuración o de integración. Mantener el estado actual y las instrucciones necesarias; evitar acumular reportes repetidos de pruebas, incidentes resueltos o una descripción de cada ajuste visual. El historial de cambios se consulta en Git.












