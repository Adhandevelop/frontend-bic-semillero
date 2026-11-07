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
| Portal de pasajeros | Registro público, login, perfil editable e historial conectados a API; compra de hasta 10 boletas con Wompi; foto, carné y factura por API | Prueba integral contra el servidor y Wompi Sandbox |
| Ubicación | Mapa Leaflet/OpenStreetMap con tres buses estáticos en GeoJSON | Recepción de lecturas del dispositivo GPS y actualización en vivo |

**Generar venta** abre la venta administrativa conectada a la API. Registra un recaudo ya realizado; no procesa cobros electrónicos. La compra pública usa el token de cliente y el checkout de Wompi. El perfil y su historial consultan la API.

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

## Configuración de TypeScript

El proyecto utiliza TypeScript 5.5.4 declarado en `package.json`. `tsconfig.json` define `rootDir: ./src`; se retiraron `baseUrl` (no hay aliases que lo requieran) y `downlevelIteration` (innecesario con ES2022). Así no se necesitan silenciamientos `ignoreDeprecations: 6.0`, incompatibles con el compilador instalado.

Si VS Code muestra diagnósticos de otra versión, ejecutar **TypeScript: Select TypeScript Version → Use Workspace Version** y reiniciar el servidor TypeScript. La configuración usada por Angular sigue siendo `tsconfig.app.json`, que hereda del archivo raíz. No se actualizó TypeScript ni Angular como parte de este ajuste.

## Configuración de la API

La configuración está en [api.config.ts](src/app/core/config/api.config.ts):

```ts
export const API_BASE_URL = '/api';
```

Las peticiones usan el mismo origen que el frontend. En producción, el servidor web debe dirigir `/api/` a Django y servir las rutas de Angular mediante su `index.html`.

En desarrollo, este repositorio no incluye un proxy configurado para `ng serve`. Para conectar un Django local se debe configurar un proxy de Angular o cambiar la URL base, por ejemplo a `http://127.0.0.1:8000/api`, y permitir el origen del frontend en la configuración CORS del backend. Sin ese ajuste, las peticiones relativas a `/api` llegarán al servidor de Angular.

### Diagnóstico del login administrativo

El acceso distingue `POST /api/token/` de la consulta posterior del perfil. Los fallos registran en F12 → Consola `[Acceso administrativo]`, fase, endpoint y código HTTP, sin credenciales, tokens ni cuerpo de respuesta. Un 500 en `/api/token/` significa que el servidor falló antes de verificar el rol en Angular; debe revisarse el traceback del servicio de autenticación. La vista identifica ese paso y el estado HTTP. Un fallo no permite acceder ni conserva tokens de la tentativa. Se mantiene la validación administrativa por API.

### Recursos utilizados

| Recurso | Endpoint |
| --- | --- |
| Inicio de sesión | `/api/token/` |
| Renovación de token configurada | `/api/token/refresh/` |
| Clientes administrativos | `/api/accounts/customers/` y `/api/accounts/customers/search/` |
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
| `/` | Catálogo público de rutas y horarios reales, búsqueda por terminales y fecha |
| `/clientes/login` | Login por correo o documento con sesión propia de cliente |
| `/registro` | Registro público por API |
| `/clientes/panel` | Perfil propio editable e historial de compras; requiere cliente |
| `/clientes/comprar` | Compra de hasta 10 boletas, asignación de pasajeros y Wompi; requiere cliente |
| `/ubicacion` | Mapa de buses estáticos de ejemplo |
| `/login` | Acceso administrativo |

### Panel administrativo

| Ruta | Función |
| --- | --- |
| `/dashboard` | Resumen de operación |
| `/clientes` | Directorio de clientes reales, filtros, ficha y exportación |
| `/ventas/nueva` | Venta administrativa de 1–10 boletas, selección de sillas y emisión por API |
| `/buses` | Gestión de buses |
| `/conductores` | Gestión de conductores |
| `/rutas` | Gestión de rutas |
| `/viajes` | Dashboard, filtros, próximas salidas y gestión de viajes |

Formularios de creación: `/buses/nuevo`, `/conductores/nuevo`, `/rutas/nueva` y `/viajes/nuevo`. La edición usa `/<módulo>/editar/:id`.

La navegación está definida en [app.routes.ts](src/app/app.routes.ts). El acceso **Generar venta** del menú administrativo lleva a `/ventas/nueva`; programar servicios sigue disponible en Viajes.

## Comportamientos importantes

### Validación al registrar conductores

El formulario muestra los errores JSON por nombre, usuario asociado, licencia, dirección y teléfono al recibir HTTP 400/422, además de distinguir fallos de sesión, permisos, conexión y servidor. Conserva los datos para corregirlos. La consola identifica `[Conductores]`, la operación, HTTP y nombres de campos rechazados, sin imprimir tokens o datos personales. El ID `user` debe corresponder a una cuenta existente con rol `driver`; el motivo exacto proviene del cuerpo JSON de la API, no de los encabezados HTTP.

### Tipos de bus

`/buses/tipos` es una pantalla administrativa accesible desde Buses. Consulta todas las páginas de `/api/fleet/bus-types/` y permite crear nombre/código/capacidad máxima, editar mediante PATCH y eliminar con confirmación. Los errores de validación y restricciones del servidor se muestran sin eliminar registros localmente tras un fallo.

El formulario de buses carga el catálogo y permite asignar `bus_type` de forma opcional. Valida que `capacity` no supere `max_capacity`, muestra el límite y conserva `bus_type_detail` al editar. Buses existentes sin tipo siguen admitidos. No se envía el objeto de detalle al guardar. La validación definitiva, unicidad del código y restricciones de tipos asociados corresponden al backend. Angular no ejecuta migraciones ni modifica Django.

### Gestión administrativa

- Los formularios de buses guardan placa, modelo, capacidad y estado. Los de conductores guardan nombre completo, usuario asociado, licencia, dirección y teléfono. El usuario asociado debe existir previamente.
- Fotos PNG, JPG y WEBP de hasta 5 MB se previsualizan localmente. Fotos, equipamiento y datos complementarios de conductor no se envían a la API.
- El formulario de viajes selecciona una ruta existente, bus y conductor. Intercambiar origen y destino requiere una ruta inversa registrada. La salida es obligatoria y el fin, opcional, debe ser posterior.
- Horarios y filtros de fecha de viajes usan `America/Bogota` (UTC−05:00); los formularios envían fechas ISO UTC.
- Las exportaciones CSV incluyen los resultados filtrados, no solo la página visible. No generan manifiestos oficiales ni PDF.
- Los catálogos secundarios que fallen se identifican en pantalla; el listado de viajes puede conservar los registros mostrando sus referencias por ID.

El dashboard de viajes muestra como máximo **7 registros por página**. El número de páginas se calcula sobre los resultados filtrados y se ajusta al eliminar correctamente o sincronizar los datos. Si desaparece la última página, vuelve a la última disponible; un DELETE fallido conserva el registro y el conteo.

### Eliminación de viajes

El dashboard muestra el código HTTP y los motivos JSON que devuelve la API (`detail`, `message`, `reason`, errores de validación conocidos) en fallos al cargar viajes, eliminar o cambiar estado. Si la respuesta es HTML o no incluye un motivo, lo indica expresamente; no presenta una causa supuesta como diagnóstico confirmado. El botón de recuperación actualiza el listado sin repetir la eliminación.

El dashboard elimina una fila únicamente tras una respuesta exitosa del DELETE. Ante errores conserva la tabla, libera el bloqueo de acciones y distingue sesión, permisos, conflicto, registro inexistente, conexión y HTTP 5xx. Una respuesta HTML de error no se muestra como detalle de usuario; un 400/409 puede mostrar `detail` devuelto por la API. Después de un resultado incierto se debe actualizar el listado antes de reintentar.

En el backend local hay relaciones `PROTECT` desde ventas, tiquetes y registros operativos hacia viajes. Una excepción de eliminación protegida sin manejar puede causar HTTP 500, pero el diagnóstico de un viaje concreto requiere el traceback del servidor. El backend debe traducir el impedimento a una respuesta controlada (por ejemplo 409) y conservar el historial. Cancelar un viaje no equivale a eliminarlo ni anula automáticamente ventas o pagos. No borrar registros asociados para forzar el DELETE.

### Precio de cada viaje

El formulario de creación/edición permite asignar el precio por silla en COP, obligatorio, positivo y con máximo dos decimales (hasta 21.474.836,47 COP). Convierte pesos a centavos enteros: 25000 COP → `amount_cents: 2500000`. Al editar carga la tarifa del viaje; si no existe, requiere asignarla.

Se guarda primero el viaje con el servicio existente (`POST /api/trips/trips/` o `PATCH /api/trips/trips/:id/`) y después se consulta `/api/trips/fares/`: crea con `{trip, amount_cents}` o actualiza la tarifa existente con `PATCH /api/trips/fares/:id/`. Se conserva el prefijo real de viajes configurado en el proyecto; el ejemplo `/api/trips/` no coincide con el router local. El JWT administrativo lo añade el interceptor.

Las solicitudes no son atómicas. Si falla la tarifa, la pantalla informa que el viaje ya se guardó y conserva su ID: reintentar actualiza ese viaje, consulta si ya existe tarifa y evita crear otro viaje. Si se abandona la pantalla, se puede completar desde editar. No se anuncia éxito completo ni se navega hasta guardar ambas partes. Ante un error de red en la primera solicitud, revisar el listado antes de reintentar. La venta continúa tomando el precio del backend; no envía `amount_cents`.

### Dashboard de rutas

`/rutas` muestra el catalogo real con busqueda por ID/origen/destino, filtros de origen y distancia, nueve registros por pagina, exportacion CSV, actualizacion, edicion y eliminacion confirmada. PDF permanece pendiente.

Los indicadores cuentan rutas, suman distancias validas y deduplican terminales por ID. La suma de tramos no equivale a longitud vial unica. Estado operativo, regiones, duraciones y reportes de Invias/DITRA no estan conectados; la tabla indica **Registrada**, sin presentar el estado de compatibilidad como disponibilidad real.

**Ver mapa** usa los GeoJSON `place_point` de las terminales de la ruta seleccionada. Muestra los puntos validos y una conexion recta entre ambos, no un trazado de carretera ni GPS en vivo. Si faltan coordenadas o el mapa base no carga, muestra un aviso. Leaflet se carga al iniciar el visor.

Archivos: `src/app/pages/rutas/ruta-list.component.*` y `ruta-map.component.ts`. El servicio conserva las coordenadas en `origen_punto` y `destino_punto`.

### Dashboard de clientes

El directorio de `/clientes` sigue el diseño de Stitch y consulta el recurso específico de clientes de todas las páginas de la API. Incluye indicadores de registros y clientes con contacto, búsqueda por nombre/usuario/documento/correo/teléfono, filtros de contacto, paginación de seis registros, ficha de consulta y exportación CSV de todos los resultados filtrados.

Historial, reservas, categorías VIP y puntos permanecen pendientes y se identifican en pantalla. La referencia de silletería es ilustrativa y enlaza a la compra real, cuya disponibilidad se valida por API. No se asumen tipo de documento, verificación de WhatsApp ni estado de cuenta.

### Administración de asientos

El acceso **Administración de asientos** (`/asientos`) hereda los guards del layout administrativo y consulta los buses reales para seleccionar una unidad. Su página `/buses/:id/asientos` permite consultar pasajeros de boletas, disponibilidad y registros físicos por viaje. Es de solo lectura y no modifica la configuración de sillas. No se añade al portal del cliente.

### Panel de ventas

El menú lateral incluye **Ventas**, con ruta administrativa protegida `/ventas`. Consulta todas las páginas de `GET /api/sales/sales/` y muestra cliente, documento, correo, viaje/ruta, silla, importe, método, origen, fecha, estado y factura. Incluye búsqueda, filtros por estado/origen/fecha de Colombia, siete registros por página e indicadores sobre los resultados filtrados; el total monetario suma solo ventas `paid`.

**Ver detalle** consulta `/api/sales/sales/:id/` y `/api/sales/sales/:id/invoice/`, y muestra comprador, importe, cada pasajero/silla y factura (número, CUFE, errores y enlaces HTTPS). Si falla la actualización conserva los datos disponibles. Las respuestas antiguas no sustituyen la venta seleccionada después de cerrar/cambiar el detalle. Los catálogos secundarios cargan por separado: si fallan, conserva las ventas y muestra IDs. La entrega permite descargar e imprimir boletas, solicitar reenvío y reintentar una factura fallida con confirmación explícita; no registra otra venta ni procesa pagos. **Generar venta** abre el formulario existente.

### Venta administrativa de tiquetes

`/ventas/nueva` implementa el diseño de venta en ventanilla bajo el guard administrativo. Se abre desde **Generar venta**, desde **Tiquete** en el directorio (cliente preseleccionado por ID) y después de registrar un cliente. La compra pública `/clientes/comprar` es un flujo independiente de Wompi para clientes.

Consulta viajes futuros programados, terminales, clientes, tarifas, sillas y tiquetes, incluyendo todas las páginas. Permite seleccionar y quitar **de 1 a 10 sillas para el mismo cliente**. Cambiar de viaje limpia la selección; cambiar sillas, cliente o método de pago obliga a confirmar nuevamente el recaudo. Se muestran los números reales de las sillas, la cantidad, la tarifa por boleta y el total estimado. Las sillas con tiquetes emitidos o utilizados no se pueden seleccionar; la disponibilidad final y las reservas vigentes las valida el backend.

El POST a /api/sales/admin-sales/ envía seats: [ID, ...], el viaje, datos del cliente y método cash, card o transfer. No envía seat ni precios. El backend calcula el importe y crea una sola venta, pago y factura, con un tiquete por silla. La respuesta muestra el total definitivo, cantidad, tarifa unitaria cuando esté incluida, sillas y códigos de todos los tiquetes. El listado administrativo también muestra todas las sillas de cada compra.

Cada intento envía una Idempotency-Key. Ante un error de red, timeout, respuesta incompleta o error del servidor, se bloquean los cambios y se ofrece **Reintentar la misma venta**, conservando exactamente la clave y el contenido. Ese intento se mantiene en memoria mientras la página siga abierta; antes de cerrarla o recargarla hay que comprobar el resultado en Ventas. Un conflicto 409 unavailable_seats informa las sillas afectadas, las bloquea y retira de la selección; exige revisar y confirmar el nuevo total. Un 409 sin esa lista no inicia otra venta automáticamente.

Una factura en error no invalida la venta pagada ni sus tiquetes. Actualizar la factura solo consulta la venta y no la duplica. Los reintentos con la misma clave dependen de la idempotencia y los bloqueos transaccionales implementados por el backend. La migración correspondiente debe estar aplicada en el servidor antes de usar el nuevo flujo.

Verificación: compilación de producción y comprobaciones de selección 1–10, total, confirmación de recaudo, envío sin precios, conflictos, resultado fiscal en error y reintentos con clave y datos idénticos. No se registraron ventas reales durante estas comprobaciones.

### Diagnóstico en consola de ventas

En F12 → Consola, filtrar por `[Ventas]` o `[Factus]`. Los fallos de registrar venta y consultar venta/factura usan `console.error` con operación, endpoint, HTTP y motivo general. Una venta sin `factus_invoice` o con factura pendiente genera `console.warn`; una factura con estado `error` genera `console.error`, aunque el HTTP sea exitoso. En errores fiscales se imprime `errorMessage`, el texto exacto de `factus_invoice.error_message` recibido del backend. No se imprime el cuerpo completo de la respuesta, el payload de la venta, cabeceras de autorización, tokens ni credenciales. Los errores originales siguen llegando a la vista y el registro no genera reintentos ni solicitudes adicionales.

La consola del navegador solo conoce lo que devuelve la API. Un HTTP 500 sin detalle exige revisar los logs de Django; estos registros no exponen excepciones internas del servidor.

### Facturación Factus

El backend existente solicita un token con `POST /oauth/token` (formulario `grant_type=password`, credenciales de aplicación y cuenta) y envía la factura con Bearer a `/v2/bills/validate`. Angular no solicita ni guarda credenciales o tokens de Factus.

El resultado de venta muestra `factus_invoice`: estado pendiente/emitida/error, número, CUFE, enlace público HTTPS y notificaciones recibidas en `raw_response.data.errors`. **Actualizar estado de factura** consulta `GET /api/sales/sales/:id/`, sin emitir otra venta ni reintentar la factura. Un error fiscal no implica que el tiquete no se haya emitido.

Para probar la integración, configurar en el servidor `FACTUS_BASE_URL`, `FACTUS_USERNAME`, `FACTUS_PASSWORD`, `FACTUS_CLIENT_ID`, `FACTUS_CLIENT_SECRET` y las variables fiscales existentes `FACTUS_NUMBERING_RANGE_ID`, `FACTUS_MUNICIPALITY_CODE`, `FACTUS_PRODUCT_CODE`, `FACTUS_PRODUCT_NAME`, `FACTUS_UNIT_MEASURE_CODE`, `FACTUS_STANDARD_CODE`, `FACTUS_TAX_CODE`, `FACTUS_TAX_RATE`, `FACTUS_TAX_EXCLUDED`, según la cuenta y el servicio. No copiar credenciales al frontend ni al repositorio. No se verificaron credenciales, configuración del servidor ni emisión real de sandbox desde esta sesión.

Queda pendiente almacenar y mapear el tipo de documento: el backend actual fija `identification_document_code` en `13`. También requiere revisar los datos fiscales y la relación entre tarifa, impuestos y total; no se debe copiar el IVA o los productos del ejemplo como regla del transporte. El cliente OAuth actual no envía explícitamente `Accept: application/json`; conviene añadirlo al revisar el backend.

### Registro rápido desde ventas

La búsqueda por documento usa `GET /api/accounts/customers/search/?identification_number=...`, con respuesta de un cliente `{id, name, email, telephone, identification_number, identification_document_code}`. El servicio adapta `name` a la vista existente. Solo el 404 con `detail: Cliente no encontrado.` se interpreta como ausencia y abre automáticamente el formulario con el documento precargado; otros errores no se presentan como clientes inexistentes.

**Guardar y seleccionar cliente** envía los cinco datos básicos mediante `POST /api/accounts/customers/`, incluyendo el código numérico del tipo de documento. No envía usuario, contraseña, rol ni credenciales externas. El cliente se selecciona y el éxito se anuncia únicamente después de la respuesta del servidor, conservando viaje y silla. La venta posterior sigue usando `/api/sales/admin-sales/`, sin `amount_cents`. Guardar cliente no registra una venta ni emite tiquetes.

Ambos endpoints requieren administrador. La consulta tiene límite de 15 segundos y el registro bloquea solicitudes duplicadas. Los errores conservan los campos y distinguen ruta no disponible, permisos y validación; ante un resultado incierto se indica buscar el documento antes de reintentar. El directorio general consulta `/api/accounts/customers/` de forma independiente, admitiendo arrays o paginación DRF y adaptando `name` a las vistas. Ya no descarga usuarios administradores o conductores desde `/accounts/users/`.

**Contrato actualizado:** `enpoints.md` documenta búsqueda, listado, alta, detalle y edición parcial en `/api/accounts/customers/`. El frontend usa búsqueda, listado y alta. La documentación no confirma por sí sola que el servidor esté actualizado; no se hicieron altas reales en producción. El formulario administrativo independiente `/clientes/nuevo` también usa el endpoint específico de clientes.

### Registrar cliente

`/clientes/nuevo` utiliza `POST /api/accounts/customers/`, igual que el alta rápida de ventas. Solicita tipo y número de documento, nombres, apellidos, teléfono y correo. Combina nombres/apellidos en `name` (máximo 150 caracteres) y envía únicamente los cinco campos básicos; no pide ni envía usuario o contraseña. Las cuentas se crean sin una contraseña utilizable; Angular no pide ni envía contraseñas. Elimina así la dependencia del antiguo POST de cuentas que producía HTTP 500 en sus validadores.

El guard protege el formulario. Valida campos obligatorios, formatos y longitudes, bloquea duplicados mientras guarda y distingue errores de red, sesión, permisos, validación y servidor. Muestra errores por `name`, documento, tipo, correo y teléfono. Solo vuelve al directorio o continúa a ventas con el ID seleccionado tras una respuesta exitosa. Datos adicionales y preferencias permanecen pendientes.

Las rutas `/accounts/customers/` y `/accounts/customers/search/` deben estar disponibles en el backend desplegado. Un error 500 de esas rutas todavía requiere revisar Django; cambiar Angular no corrige errores internos del servidor. Las comprobaciones de frontend usan servicios simulados.

### Crear y editar rutas

El formulario de rutas sigue el diseño de Stitch y selecciona terminales del catálogo por ID, permitiendo nombres repetidos. Exige origen y destino diferentes y una distancia entre 0.01 y 999999.99 km con máximo dos decimales. Permite intercambiar terminales y previsualizar sus puntos GeoJSON en el mapa.

Solo envía a la API los IDs de origen y destino y la distancia. Duración, tarifa, puntos intermedios, borradores y activación operativa se identifican como pendientes; no se simula su guardado. Los errores de carga permiten reintentar y los envíos duplicados se bloquean durante el guardado.

### Acceso y perfil del cliente online

El portal de pasajeros está separado del layout administrativo. Registro `/registro` envía a `POST /api/accounts/register/` los datos básicos, tipo de documento numérico y contraseña; no envía confirmación, promociones ni un rol elegido en el navegador. Valida los campos, bloquea envíos repetidos, muestra errores JSON y limpia las contraseñas tras el éxito. Después permite iniciar sesión; no anuncia autenticación automática.

Login `/clientes/login` envía correo o documento como `username` a `/api/token/`, consulta `/api/accounts/me/` con el token recibido y exige `role: client` antes de almacenarlo. Esta comprobación requiere que la respuesta de perfil incluya `role`. Si falta, la vista informa expresamente que no pudo verificarlo, sin afirmar que la cuenta tenga otro rol; la consola registra `[Portal cliente]` y `rolePresent`, sin datos personales. Un rol distinto de `client` y un HTTP 403 del servidor muestran motivos separados. La entrada continúa denegada si no se puede comprobar el rol. La sesión usa claves `bic_passenger_access` y `bic_passenger_refresh`, distintas de las administrativas. **Recordar sesión** elige localStorage; sin marcarlo usa sessionStorage. El cierre de sesión de cliente no borra la sesión administrativa. Las peticiones autenticadas del cliente renuevan el acceso tras HTTP 401 mediante `/api/token/refresh/`, con una sola renovación compartida entre solicitudes concurrentes y un solo reintento. Conserva la modalidad de almacenamiento y la rotación del refresh cuando existe. No renueva sesiones administrativas ni peticiones públicas. Un refresh inválido elimina únicamente la sesión de cliente; un fallo transitorio conserva las credenciales. Un logout durante la renovación impide restablecerlas.

`passengerGuard` protege perfil y compra mediante consulta del perfil, sin aceptar una sesión administrativa. Las peticiones de cliente envían explícitamente su token; token y registro públicos no reciben el token administrativo del interceptor. El perfil carga `/accounts/me/`, permite PATCH únicamente de nombre/correo/celular y muestra documentos de solo lectura. El historial reúne todas las páginas de `/sales/sales/`, con importes históricos, estados, tiquetes y factura cuando se devuelven. No presenta puntos, membresías ni viajes ficticios. El backend debe aplicar permisos por propietario.

La compra protegida usa el checkout real de Wompi y confirma el resultado mediante la API. Recuperar/restablecer contraseña, activación excepcional y cambio autenticado usan los endpoints de cuentas. El login y el perfil pueden devolver `password_change_required`; ese indicador redirige al cambio obligatorio antes de abrir panel, cuenta o compra. La aplicación no crea contraseñas provisionales. El acceso social sigue pendiente.

### Navegación interna del cliente

Los enlaces **Mis tiquetes** y **Mis compras** usan `routerLink` hacia `/clientes/panel` con fragmentos `tickets` e `history`. **Mi cuenta** abre `/clientes/mi-cuenta`, una ruta protegida por el guard de cliente. El enlace antiguo `/clientes/panel#personal` redirige a Mi cuenta. No usan `href="#..."`, que con el `<base href="/">` podía llevar al inicio del sitio. El Router tiene desplazamiento a anclas habilitado, también para los enlaces que vienen de compra o de una URL directa. En el propio perfil, repetir el clic desplaza y enfoca la sección aunque el fragmento ya esté seleccionado. **Comprar tiquete** conserva `/clientes/comprar` y su guard de cliente.

### Diseño del perfil de pasajero

`/clientes/panel` es el panel principal del cliente: cabecera con foto, resumen de compras y tiquetes, todos los tiquetes e historial tabular de siete compras por página. Los tiquetes se filtran por próximas salidas, salidas anteriores, emitidos, utilizados, cancelados o sin horario; se ordenan por salida conocida. El historial permite buscar compra/ruta/pasajero y filtrar por estado y fechas de compra en Colombia. Una salida anterior no marca automáticamente un tiquete como utilizado. `/clientes/mi-cuenta` muestra exclusivamente identidad, foto, datos personales y carné; no consulta el historial de ventas. **Editar perfil / Actualizar datos** habilita la edición; cancelar recupera los valores cargados y guardar usa el PATCH de perfil existente. El detalle de compra permite consultar los tiquetes y la factura, sin enlaces administrativos.

Las tarjetas muestran los tiquetes de las compras, incluidos emitidos, utilizados y cancelados. No sustituyen la validación de abordaje. La ruta, horario, pasajero y número real de silla se consultan mediante el enlace firmado de verificación de cada tiquete, con un máximo de cuatro consultas concurrentes. Un fallo conserva las compras y permite reintentar, sin inventar horarios. Las fechas de la tabla son de compra, en hora Colombia. El carné digital y su QR están conectados a su endpoint. Se retiraron del portal las tarjetas sin función de beneficios, monedero y notificaciones; no se muestran puntos, saldos o datos personales ficticios. No hay seguimiento GPS en vivo.

### Plano de selección de sillas

La compra muestra un bus de un solo piso con distribución **2 + pasillo + 2**, sin cafetería, cabina de alimentos ni áreas inventadas. El plano agrupa asientos reales por `row`, posiciona `col` numérico (1–4 o 0–3) o A–D y conserva espacios de columnas faltantes. Si el catálogo tiene más de cuatro asientos en una fila, conserva todos en tramos adicionales de cuatro; no descarta IDs. La selección y el checkout siguen usando el ID real, nunca la posición visual. El botón **Quitar** limpia la selección.

Las sillas seleccionadas se resaltan en azul; `reserved` y `sold` muestran sus estados reales y bloquean la selección. `available` permite elegir; la disponibilidad vuelve a validarse al solicitar checkout.

### Catálogo público y compra múltiple

La página principal consulta todas las páginas de `/api/public/routes/` y `/api/public/trips/`, sin enviar el token administrativo. El buscador filtra terminales por ID y fecha de Colombia; las tarjetas muestran rutas publicadas, sin precios o duraciones inventadas. Cada horario enlaza al checkout con el ID real del viaje. Si hace falta iniciar sesión, el guard conserva el destino y el login solo admite retornos a perfil o compra del mismo sitio. Los viajes de regreso se consultan/compran por separado.

La compra usa exclusivamente el catálogo público y `/api/trips/trips/:id/seats/`; no descarga datos privados de flota, conductores o tiquetes ajenos. Mantiene el plano de un piso 2 + pasillo + 2 y muestra estados `available`, `reserved` y `sold`. Cambiar de viaje descarta las sillas anteriores; respuestas tardías no sustituyen la disponibilidad del viaje seleccionado.

Se pueden elegir entre una y diez sillas. **Todas las boletas a mi nombre** repite los datos del comprador; al desmarcar permite completar los cinco datos de cada pasajero y usar los propios individualmente. No se crean cuentas para terceros. El checkout envía `{trip, passengers, redirect_url}` con JWT de cliente y una `Idempotency-Key` aleatoria por intento; no envía `amount_cents`, precios, descuentos ni datos de tarjeta. Muestra la tarifa unitaria y el total estimado según las sillas seleccionadas, calculado en centavos. Al iniciar el pago muestra el total confirmado por el backend; el cálculo visual nunca se envía como precio. La API reserva todo o rechaza la compra.

Se conserva la integración con `WidgetCheckout`: llave pública, importe, referencia y firma vienen de Django. Solo `/api/sales/wompi/status/` o la consulta de venta pueden confirmar el estado pagado y habilitar tiquetes. `expires_at` y `server_time` se utilizan para el contador sin depender del reloj absoluto del navegador. El estado pendiente conserva en sessionStorage únicamente ID de venta, plazo, transacción y clave de idempotencia, por usuario; nunca datos personales de pasajeros. Redirigir/recargar recupera la consulta, sin repetir automáticamente pagos. Un resultado incierto bloquea nuevos intentos hasta revisar el historial.

Referencia: [Widget de Wompi](https://docs.wompi.co/docs/colombia/widget-checkout-web/). Las pruebas usan respuestas simuladas; no se hicieron cobros ni se verificó una compra real en sandbox.

### Foto, carné digital y factura del cliente

La foto usa POST multipart a `/api/accounts/me/photo/` y DELETE sobre la misma ruta. Angular valida JPG/PNG/WEBP, máximo 5 MB y 2000 × 2000 px antes de subir; luego recarga `/accounts/me/` para mostrar `photo_url` en la cabecera, identidad y Mi cuenta. Las URL HTTP del mismo dominio se resuelven con el origen seguro del portal. La imagen local incluye una versión de caché que cambia al recargar el perfil; un fallo de carga muestra las iniciales y permite reintentar la imagen desde Mi cuenta sin volver a subirla. Los errores de POST/DELETE muestran el código HTTP, distinguen tamaño/formato/método y JSON inválido, y registran solo método, estado y formato de respuesta en consola, sin tokens, archivos ni datos personales. Si falla la URL de la imagen, revisar la petición GET de photo_url: no basta con que el endpoint de perfil responda correctamente. No envía ID de usuario y los errores no simulan éxito.

**Carné Digital / QR** consulta `/api/accounts/me/card/` y presenta identidad, estado y vigencia devueltos por el servidor. Genera localmente la imagen QR con `qrcode`, cargado bajo demanda: codifica la URL de verificación del mismo origen con el token firmado recibido, nunca el JWT de sesión. No usa un generador externo. El aviso aclara que no sustituye un tiquete ni acredita una compra. El QR abre `/verificar/carne#token=...`; esa vista consulta el token en `/api/accounts/cards/verify/`. Se reconstruye con el origen del portal cuando el servidor devuelve el mismo dominio con HTTP, sin aceptar dominios externos. Si falla, distingue datos incompletos, URL no admitida, uso incorrecto del token de sesión y fallo de renderizado. La consola registra únicamente la etapa y presencia de campos; nunca el token ni la URL firmada.

Al abrir una compra se consulta `/api/sales/sales/:id/invoice/`. Muestra `pending`/`error`/`issued`, número, CUFE y enlaces HTTPS público/PDF/XML cuando existen; no inventa facturas ni reintenta su emisión desde una cuenta cliente. Respuestas antiguas no reemplazan la factura de otra compra seleccionada. La verificación de propietario corresponde al backend.

### Demostraciones y servicios pendientes

- El inicio ya no utiliza la combinación fija de octubre de 2026; los horarios y terminales provienen del catálogo público. La consulta GPS del inicio sigue pendiente y el mapa conserva posiciones de ejemplo.
- Se retiraron los archivos antiguos `booking.data.ts` y `client-panel.data.ts`, que contenían buses y posiciones de dos pisos ficticios. La compra muestra placa, modelo y capacidad de `/api/fleet/buses/`, según el bus del viaje creado en administración. No hay selector de pisos. Los precios se obtienen de las tarifas reales y el checkout devuelve el importe definitivo.
- El perfil usa `PassengerService` y `passengerGuard`; los datos antiguos de ejemplo se retiraron.
- Login y registro de pasajeros están conectados a API. Google y Apple permanecen pendientes; recuperación y cambio de contraseña están conectados.
- Boletín, redes sociales y otras acciones del inicio sin integración muestran avisos. El panel cliente obtiene contactos oficiales y políticas desde `/api/public/customer-service/`; solo ofrece los enlaces configurados.

### Mapa y monitoreo administrativo

`/monitoreo` pertenece al panel protegido de administración y está separado de `/ubicacion`, que permanece como mapa público de pasajeros. Los accesos desde dashboard, buses, viajes, rutas y navegación administrativa abren el mapa administrativo; la barra superior permite entrar también desde móvil. Administración de asientos abre el listado real de buses y permite entrar a la consulta de pasajeros y sensores; crear/editar la configuración de sillas no forma parte de esa pantalla.

La vista separada `/monitoreo/demostracion` contiene tres unidades de muestra con posiciones GPS GeoJSON `Point`, recorrido `LineString` construido con muestras ordenadas por fecha y selector para explorar el historial de cada viaje. La presentación usa ficha e itinerario lateral, mapa amplio con marcadores de bus y trazado azul, y una barra flotante de ocupación. El itinerario representa lecturas GPS y su progreso dentro del registro, no paradas oficiales ni una predicción de llegada. El historial de sensores sigue disponible debajo y la tabla GPS se puede desplegar. La línea representa la unión de mediciones de ejemplo; no acredita el trazado exacto por carretera entre puntos. Los sensores muestran un bus de un piso con distribución 2 + pasillo + 2 y distinguen ocupado, libre o sin lectura. El corte temporal se aplica a todas las unidades del mapa; los sensores sin lectura o con más de dos minutos de antigüedad se muestran sin señal en esta muestra. Ese umbral es demostrativo y debe acordarse con la frecuencia de transmisión del dispositivo. Ocupación física no equivale a silla vendida o reservada y no se realizan ventas desde este módulo.

Los datos de `/monitoreo/demostracion` son simulados y no se escriben en la base de datos. `/monitoreo` abre por defecto los viajes y registros de `/api/trips/readings/`, sin sustituir una ausencia de lecturas por muestras. Las lecturas físicas de asientos se consultan en su propia gestión. Leaflet usa teselas OpenStreetMap, que requieren internet. GeoJSON conserva coordenadas `[longitud, latitud]` en WGS84/SRID 4326.
### Mapa público de pasajeros (/ubicacion)

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

Última compilación registrada: **4 de noviembre de 2026**, correcta. Hay advertencias por tamaño del paquete inicial, estilos de componentes, Leaflet y QR en formato CommonJS. Los límites se definen en `angular.json`.

Se realizaron comprobaciones con servicios simulados sobre filtros, paginación, contratos de API, fechas, formularios, cambios de estado, conteos de rutas, puntos GeoJSON y exportaciones CSV; no sustituyen una prueba de integración con el backend desplegado. `package.json` no configura un comando `npm test`.

Pendientes prioritarios:

- Verificar registro, acceso, renovación de sesión, edición de perfil e historial contra el backend desplegado.
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

Los botones de detalle de compra del perfil desplazan el foco hasta el detalle, consultan la venta actualizada y su factura por separado, y muestran errores de cada consulta. Cerrar invalida respuestas pendientes. Los enlaces de factura solo aparecen cuando la API los devuelve.

### Descarga de boletas del cliente

El detalle de compras pagadas con tiquetes emitidos incluye **Descargar boletas en PDF**. Reconsulta la venta y verifica cada tiquete en el endpoint público antes de descargar. Genera un único PDF con una página por boleta: pasajero, documento, terminales, salida/llegada en hora Colombia, silla, estado, emisión y código. El QR abre `/verificar/boleta#token=...` con exactamente el token firmado extraído de `verification_url`; nunca contiene el JWT ni se crea o modifica el token en Angular. La consulta pública no recibe Authorization. Un fallo de verificación impide descargar un archivo parcial. jsPDF y qrcode se cargan bajo demanda. El PDF no sustituye la factura electrónica ni confirma validez futura: al abordar debe verificarse el estado actual en el backend.

### Ayuda después del pago

Compra y detalle muestran orientación para operaciones pendientes, pagos confirmados y fallos de facturación, con acceso al historial y a las boletas descargables. No se recomienda repetir el pago mientras su resultado sea incierto. El frontend no cancela compras ni reintenta emitir facturas desde el rol cliente.

Diagnóstico de fotos: si el GET de /media/profile_photos/... devuelve 404, comprobar en el despliegue que el archivo exista, el almacenamiento de media sea persistente y el servidor publique /media/ desde esa misma ubicación. Un perfil con photo_url no garantiza que el archivo esté disponible. Esta configuración corresponde al servidor, no a Angular.

### Recuperación, cambio de contraseña y activación

Rutas públicas: /clientes/recuperar-contrasena, /clientes/restablecer-contrasena, /clientes/solicitar-activacion y /clientes/activar-cuenta. Las confirmaciones leen el token del fragmento #token=... y lo retiran de la URL; no lo guardan ni registran. Solicitudes por correo mantienen mensajes genéricos. Se valida coincidencia de contraseñas, se bloquean envíos simultáneos y se limpian los campos secretos después de la respuesta. La ruta protegida /clientes/cambiar-contrasena utiliza contraseña actual y nueva; tras el éxito se cierra únicamente la sesión cliente para volver a autenticar. El guard comprueba el indicador de cambio obligatorio recibido del login/perfil. La activación es excepcional para cuentas inactivas, conforme al contrato actual.

### Soporte, condiciones y confirmaciones

La sección **Ayuda** del panel reúne contactos y políticas oficiales, formulario de solicitudes, listado paginado a siete filas y detalle con estado. Consume /api/support/requests/ con JWT explícito de cliente y /api/public/customer-service/ sin credenciales. Permite asociar solo una compra del historial; no envía propietario ni estado. Los límites de 60 segundos y HTTP 429 conservan los datos. Los fallos inciertos invitan a revisar el listado antes de reintentar. Solicitar cancelación no cancela ni reembolsa la venta. El contrato actual no incluye conversaciones/respuestas del equipo, así que no se simulan.

En compras pagadas, **Reenviar confirmación por correo** llama a /api/sales/sales/:id/resend-confirmation/ sin destinatario personalizado. El éxito informa solicitud de envío; email_unavailable permite seguir descargando boletas y no cambia el estado de pago. El envío automático tras el pago corresponde al backend. Solo se muestran enlaces oficiales HTTPS, correo, teléfono y WhatsApp configurados; no se inventan políticas ni contactos.

### Revisión de seguridad

Consulta [SECURITY_REVIEW.md](SECURITY_REVIEW.md) para el análisis del 4 de noviembre de 2026: alcance, hallazgos, evidencia, prioridades y validaciones pendientes. La revisión no modifica la aplicación ni Django y no equivale a una prueba de penetración. Los avisos de dependencias se separan entre producción y desarrollo.

### Acceso administrativo a pasajeros y asientos

Los caminos **Clientes → Ver detalles → Viaje y bus → Detalles del bus → Asientos** y **Buses → Ver detalles → Asientos** convergen en /buses/:id/asientos. /asientos permite elegir directamente un bus. Todo pertenece al layout administrativo y sus guards; no se abre la compra del portal cliente.

La ficha del cliente relaciona boletas por documento de pasajero, incluso si el comprador es otra persona, y distingue las compras propias sin atribuirle todos sus asientos. Conserva cliente, viaje y asiento único en la navegación. El detalle del bus consulta la unidad real; la página de asientos valida que el viaje pertenezca a ese bus y muestra plano de un piso 2 + pasillo + 2, pasajeros de boletas emitidas/utilizadas, disponibilidad comercial, última lectura física y su historial. Los datos faltantes o errores parciales se identifican; no se sustituyen por demostraciones.

Se consultan todas las páginas y se filtran los asientos por bus y registros por viaje en Angular, porque el contrato no documenta esos filtros de servidor. Se usan /api/fleet/seats/, /api/trips/trips/, /api/sales/tickets/, /api/trips/current-seat-states/, /api/trips/seat-state-history/ y la disponibilidad del viaje. El nombre del pasajero viene de la boleta; la lectura física no identifica a quien está sentado ni demuestra presencia en tiempo real. Sin dispositivo o registros se muestra **Sin lectura**. Estas pantallas son de consulta y no crean ni modifican sillas, ventas o telemetría. El monitoreo con datos simulados está separado en /monitoreo/demostracion.

## Operación administrativa: viajes y consulta QR

El menú administrativo incorpora todas las secciones y una navegación desplegable para pantallas pequeñas. Se cierra al navegar, pulsar Escape o salir. El formulario administrativo de clientes enlaza con la venta administrativa y la gestión de asientos.

- **Viajes → Ver detalles** (`/viajes/:id`): consulta la programación, ruta, bus, conductor, tarifa y boletas del viaje. El manifiesto presenta pasajeros y números de silla reales. Cada consulta secundaria informa sus fallos sin ocultar el resto del detalle. Incluye accesos al bus, asientos y lector QR con el viaje seleccionado.
- **Lector QR** (`/validar-qr`): permite abrir la cámara tras una acción del operador, pegar un enlace o introducirlo mediante un lector USB que funcione como teclado. La cámara se detiene al obtener una lectura, detenerla o abandonar la vista. Requiere HTTPS y permiso del navegador para usar cámara; la entrada manual funciona sin ese permiso.
- Solo se aceptan enlaces del mismo origen a `/api/sales/tickets/verify/` y `/api/accounts/cards/verify/`. La consulta pública no añade el JWT administrativo, no guarda el token del QR y no abre enlaces externos. El resultado distingue boleta emitida, utilizada, cancelada, viaje diferente y error de conexión. Los carnés identifican al cliente y no sustituyen una boleta.
- El ID de viaje esperado permite comprobar la correspondencia. Sin ese contexto la consulta no confirma a qué salida se permitirá abordar. **Consultar no registra abordaje ni cambia el estado de un tiquete**: esa operación necesita un contrato de backend de check-in con permisos y control de duplicados.
- GPS y sensores continúan en **demostración**. El acceso desde un viaje al mapa conserva el viaje y abre sus datos API; las unidades simuladas solo aparecen tras abrir Ver demostración proyectada. La gestión real de asientos conserva la distinción entre boleta y lectura física.

El estado de mantenimiento de buses se envía como `Maintenance`, de acuerdo con el contrato de la API. Las respuestas antiguas con `mantenimiento` se normalizan al leer para conservar la compatibilidad con registros existentes.

La descarga de boletas en PDF utiliza la identidad del pasajero obtenida en el detalle autenticado de la venta. La verificación pública comprueba autenticidad y estado; no reemplaza esos datos por la identidad del comprador ni por documentos parcialmente ocultos. Si faltan datos completos o la verificación no coincide, se detiene la descarga antes de crear un PDF parcial.

Verificación de este bloque: compilación de producción y comprobaciones de navegación, identidad de PDF, detalle operativo y lector QR. La lectura con cámara física debe comprobarse en el navegador del dispositivo de operación. Se mantienen avisos existentes de tamaño de bundles y dependencias CommonJS, sin ampliar presupuestos.

### Contraseña provisional de clientes

Cuando el backend devuelve `password_change_required: true` en el login o el perfil, el cliente se dirige a `/clientes/cambiar-contrasena`. Mientras esté pendiente puede abrir `/clientes/mi-cuenta` para consultar su perfil, foto y carné, cambiar su contraseña y cerrar sesión; las rutas de compra y panel permanecen restringidas. La cuenta ya está activa y puede iniciar sesión con correo o documento.

Un HTTP 401 con `code: password_change_required` se distingue de una sesión vencida: no intenta renovar el token, conserva la sesión para permitir el cambio y dirige a la pantalla correspondiente. El cambio usa `POST /api/accounts/me/password/` con `current_password` y `new_password`. Al completarse elimina acceso, renovación y la marca de contraseña provisional de ambos almacenamientos del cliente, y solicita iniciar sesión con la nueva contraseña. La sesión administrativa es independiente.

### Plano de asientos en venta administrativa

El selector administrativo comparte con la compra de clientes la lógica de posiciones por fila/columna y los estilos del plano: un piso, dos sillas a cada lado de un pasillo central, frente y parte trasera identificados. Los huecos del catálogo se conservan para evitar desplazar las sillas. Cada puesto muestra su número real y si está junto a la ventana o al pasillo; los estados comercial y de selección se distinguen por color. Se mantiene la selección múltiple de hasta 10 boletas y la validación de disponibilidad en el backend.

### Detalle operativo del viaje y continuidad de navegación

Desde **Viajes → Ver detalles** se abre `/viajes/:id` con bus, conductor, terminales/ruta, horario colombiano, tarifa y manifiesto completo de boletas. Las consultas secundarias muestran errores parciales y permiten reintentar sin presentar datos faltantes como si fueran resultados vacíos confirmados. Los cambios de ID cancelan las consultas anteriores.

Los accesos a bus, asientos y lector QR conservan el viaje. Cada pasajero incluye **Ver silla**, que abre el bus y asiento exactos de su tiquete dentro del viaje. Bus, asientos, QR y mapa ofrecen regreso al detalle operativo. El lector recibe el viaje esperado para contrastarlo con la boleta escaneada.

El mapa conserva el ID del viaje de origen para consultar sus lecturas API. La demostración se abre de forma explícita y conserva ese contexto para regresar; no asocia una unidad ficticia al viaje ni presenta muestras como datos del dispositivo real. La confirmación de abordaje sigue requiriendo su endpoint específico.

### Validar QR: consulta de boletas y carnés

El acceso administrativo **Validar QR** (`/validar-qr`) ofrece cámara, enlace pegado o lector USB que se comporte como teclado. En USB se enfoca el campo del enlace; si el lector envía Enter, se ejecuta el formulario. También funciona el botón Consultar QR. La cámara se abre solo bajo acción del operador y se detiene al leer, cancelar o salir. La consulta no registra abordaje ni modifica tiquetes.

El resultado identifica **boleta de viaje** o **carné de identificación**, muestra la hora de consulta y utiliza verde para confirmaciones, amarillo cuando falta contrastar el viaje y rojo para estados no habilitados o fallos. Las boletas muestran ruta, salida en Colombia, silla, pasajero, código y estado. Reconoce `issued`, `used`, `cancelled` y `expired` cuando ese estado es devuelto por el servidor, además de detectar discrepancia con el viaje esperado. El carné muestra estado y vigencia disponibles; nunca acredita compra o abordaje. **Leer otro QR** limpia el resultado y devuelve el foco al lector, conservando el viaje esperado.

El contrato actual de verificación documenta `issued`, `used`, `cancelled` y un HTTP 404 para enlaces no válidos o registros inexistentes. Para distinguir con certeza una boleta o token vencido, el servidor debe devolver un estado explícito `expired` o un contrato de error diferenciado; Angular no lo deduce de la hora local ni convierte cualquier 404 en vencimiento. Un fallo de red no se presenta como una validación confirmada.

Verificación: comprobaciones de boletas, carnés, otro viaje, vencimiento explícito, resultado 404, limpieza entre lecturas, rechazo de enlaces externos/tokens duplicados y liberación de cámara/peticiones. La cámara y el lector USB físicos deben verificarse en el equipo del operador.

### Confirmar abordaje desde Validar QR

Después de consultar una boleta emitida que corresponda al viaje esperado, el administrador puede pulsar **Confirmar abordaje** y aceptar la confirmación. Un carné, una boleta utilizada/cancelada, una de otro viaje o una consulta sin viaje esperado no habilitan esta acción. Escanear por sí solo continúa sin modificar estados.

La operación usa `POST /api/sales/tickets/check-in/` con `verification_token`, `trip` y `Idempotency-Key`. La sesión administrativa se adjunta mediante el interceptor; no se envían operador, hora ni estado deseado. El backend autoriza, valida venta pagada y viaje `scheduled`/`in_progress`, evita duplicados y guarda el cambio a `used` junto con su auditoría. No hay reglas horarias adicionales calculadas por Angular.

Solo se anuncia **Abordaje registrado** después de recibir `used`, código de boleta, viaje, silla y auditoría coherentes con el intento. Se muestran fecha del servidor y operador. Una respuesta repetida idempotente se identifica como resultado recuperado. El manifiesto de `/viajes/:id` muestra la auditoría de cada tiquete cuando está disponible en la API; se actualiza con Actualizar información.

Ante red, timeout, sesión vencida, conflicto de idempotencia o respuesta incompleta, el resultado queda **sin confirmar**, no como éxito. Se conserva en memoria el mismo token QR, viaje y clave, se bloquea otra lectura y se ofrece **Reintentar el mismo abordaje**. No cerrar o recargar hasta aclarar el resultado; puede consultarse el detalle del viaje en otra pestaña. Los rechazos conocidos (`already_used`, `wrong_trip`, `ticket_cancelled`, `sale_not_paid`, `trip_not_boardable`, entre otros) no anuncian un abordaje nuevo y permiten leer otra boleta.

El token del QR no se registra en consola ni se guarda en almacenamiento del navegador. La consulta pública conserva sus permisos y nunca recibe el JWT administrativo. Requiere desplegar el backend actualizado y aplicar su migración `0011_ticketcheckin_ticketcheckinidempotency.py` antes de utilizar la confirmación.

Comprobaciones: consulta QR, confirmación explícita, bloqueo de doble envío, datos y clave idénticos al reintentar, rechazo de respuestas incompletas o de otro viaje, errores de negocio y limpieza entre lecturas. Las pruebas de simultaneidad en base de datos corresponden al backend; no se registraron abordajes reales desde estas comprobaciones.

### Compatibilidad con QR generados con HTTP

El lector administrativo acepta enlaces de verificación HTTP o HTTPS únicamente del mismo dominio y puerto del portal, conservando las rutas permitidas de boletas y carnés. Así pueden consultarse PDF antiguos cuyo `verification_url` haya sido generado con `http://` detrás del proxy. El lector extrae el token y consulta la ruta relativa desde el origen actual del portal: en producción se utiliza HTTPS y no se abre ni se consulta directamente la URL HTTP escaneada. Continúa rechazando dominios externos, otros puertos, credenciales en la URL, protocolos ajenos a HTTP(S) y tokens duplicados.

Abrir un QR antiguo desde la cámara general del teléfono lleva al endpoint público de Django y puede mostrar su respuesta navegable. Un carné con `valid: true` y `status: active` se verificó correctamente; para visualizarlo en la interfaz administrativa hay que escanearlo dentro de **Validar QR**. La apariencia de la respuesta pública no indica un fallo del carné.

Comprobación: QR HTTP de boleta y carné aceptados, token conservado, consulta mediante ruta relativa, rechazo de enlaces externos/otros puertos y regresión del flujo de abordaje.

### Vista pública visual al escanear un QR

Los nuevos carnés y PDF abren una página de Angular sin autenticación: `/verificar/carne#token=...` o `/verificar/boleta#token=...`. Muestra identidad pública, estado, vigencia del carné o ruta/fecha/silla de la boleta, y permite volver a consultar. La presentación utiliza únicamente los datos autorizados del endpoint público, incluidos nombre/documento enmascarados cuando corresponda. Un error de red no se muestra como documento válido y una consulta no registra abordaje.

Para ofrecer esta presentación, el QR ahora contiene la ruta pública del portal con el mismo token firmado recibido del backend en el fragmento, en lugar de abrir directamente la URL de la API. Angular no crea ni modifica tokens. El fragmento no se envía al servidor al cargar la página; después se consulta el endpoint público fijo correspondiente con `Accept: application/json`, sin usar la sesión de cliente o administrador. No se guarda el token en almacenamiento del navegador. Los enlaces externos, protocolos no permitidos y tokens duplicados se rechazan.

El lector administrativo acepta tanto estos enlaces visuales como los enlaces anteriores a `/api/.../verify/`, y mantiene la confirmación de abordaje protegida. Para obtener los enlaces visuales hay que abrir nuevamente el carné o descargar un PDF nuevo después de desplegar Angular. Los PDF/QR impresos anteriores siguen abriendo Django al escanearlos con la cámara general; cambiar ese comportamiento requiere una redirección del servidor y no se modificó Django ni el proxy.

El servidor del frontend debe servir `index.html` al abrir directamente `/verificar/boleta` o `/verificar/carne`, igual que para el resto de rutas Angular. Verificación: compilación, preservación del token firmado, consulta anónima, estados públicos, cancelación de peticiones y regresión de identidad PDF/abordaje.

### Motivo del fallo de factura en administración

El panel de ventas muestra `factus_invoice.error_message` debajo de Error/Sin número, y vuelve a mostrarlo con su etiqueta en el detalle. Si falta, informa que el backend no devolvió el motivo. Las consultas de venta y sus errores fiscales registran el mismo campo en F12 → Consola como `errorMessage`, junto al ID de venta y estado; no se imprime `raw_response` ni el payload de la venta.

El mensaje procede de `GET /api/sales/sales/:id/` o de la respuesta de creación; Angular no llama directamente a Factus ni solicita sus credenciales. Si el backend responde solo «Factus no pudo validar la factura», ese es todo el detalle disponible para Angular y hay que ampliar el diagnóstico en backend. Mostrar o actualizar el error no reintenta una factura ni crea otra venta.

### Orden de los listados

Los listados de buses, conductores, rutas, viajes, clientes, ventas, tipos de bus, selección de unidades para asientos y boletas del detalle operativo muestran los registros más recientes primero. El dashboard incorpora el mismo criterio para buses y conductores, ordenando antes de limitar sus tarjetas. El historial de compras y las solicitudes del cliente también disponen del control compartido **Orden: Más recientes / Más antiguos**.

El botón invierte el orden y, en listas paginadas, vuelve a la primera página. El orden se aplica después de filtrar y antes de paginar, incluyendo las exportaciones que usan el conjunto filtrado. No modifica los arreglos originales ni los registros del servidor. Cuando todos los registros consultados incluyen una fecha `created_at` válida se usa esa fecha, con ID como desempate; en catálogos sin esa fecha o con fechas incompletas se utiliza el ID como referencia del orden de registro. No se confunde fecha de salida con fecha de creación.

Se conservan los órdenes operativos del plano físico de sillas, paradas y próximas salidas. La API debe mantener un orden estable al paginar para evitar duplicados u omisiones entre sus páginas; el orden visual de Angular se aplica a los registros recuperados y no corrige esas inconsistencias del servidor.

Verificación: compilación de producción y comprobaciones de orden descendente/ascendente, fechas coincidentes o inválidas, ausencia de mutación y orden previo a paginación.

### Entrega completa desde el detalle de venta administrativo

**Ventas → Ver detalle** desplaza el foco al detalle con importe definitivo, comprador, contacto y tarjetas para todos los pasajeros y sus sillas. No sustituye al pasajero por el comprador cuando faltan datos de una boleta. Cada tarjeta muestra el estado real y enlaza con la operación del viaje.

- **Descargar boletas en PDF** reconsulta la venta pagada y verifica todas sus boletas contra el endpoint público. Genera un archivo con una página por boleta y QR a la vista pública visual. Se conservan estados emitida/utilizada/cancelada; imprimir no reactiva un tiquete. Nombre y documento completos proceden del detalle autenticado. Si falta identidad o una verificación no coincide, no se descarga un PDF parcial.
- **Imprimir boletas** prepara el mismo PDF y lo abre en una pestaña solicitada por el operador. Si el visor no abre automáticamente el diálogo, permite usar su opción Imprimir. Si el navegador bloquea la pestaña, muestra la alternativa de descargar. Preparar el archivo no confirma que una impresora haya terminado.
- **Reenviar confirmación** usa `POST /api/sales/sales/:id/resend-confirmation/`, permitido a administradores. Solicita confirmación, bloquea duplicados y aplica una espera local de un minuto. Una respuesta aceptada no se presenta como correo recibido. Un fallo de correo conserva la venta y boletas.
- **Factura** consulta su endpoint específico y muestra número, CUFE, error y enlaces públicos/PDF/XML cuando la API los devuelve como HTTPS. Si la consulta falla, conserva la información incluida en la venta y muestra el fallo.
- **Reintentar factura** solo aparece para facturas en error de ventas pagadas. Usa `POST /api/sales/factus/invoices/:id/retry/`, requiere confirmación y bloquea envíos simultáneos. Un HTTP exitoso con estado fiscal `error` sigue mostrándose como error. Ante resultado ambiguo se pide actualizar y revisar Factus; no se ejecutan reintentos automáticos ni otra venta/cobro.

Todas estas acciones usan el contexto y sesión administrativos. Las verificaciones públicas del PDF no llevan JWT y solo consultan rutas permitidas del mismo portal. El PDF se distingue de la factura electrónica. Se conservan filtros, orden y paginación del listado al abrir el detalle.

Verificación: compilación de producción y comprobaciones con varias identidades/estados, rechazo de boletas incompletas o ajenas, PDF/impresión, bloqueo de doble acción, reenvío aceptado/enfriamiento y factura fallida o sin confirmar. No se enviaron correos ni se reintentaron facturas reales durante estas comprobaciones. La impresión final depende del visor y la impresora del operador.

### Control de viajes pendientes desde el dashboard

La pantalla principal incorpora **Viajes pendientes y disponibilidad** con totales de viajes programados, programados para hoy y viajes en curso. Cada tarjeta muestra ruta, salida en hora Colombia, bus, conductor y sillas disponibles, reservadas y vendidas según `/api/trips/trips/:id/seats/`. Los accesos abren operación, asientos o QR conservando el viaje.

Se puede buscar por viaje/ruta/placa/conductor, filtrar fecha, consultar Hoy y ordenar por proximidad de salida. Se muestran seis viajes por página y se consultan únicamente los visibles, con hasta tres solicitudes simultáneas. Las consultas anteriores se cancelan al cambiar de página o filtros. Se actualiza disponibilidad cada minuto mientras la pestaña está visible y también mediante botón; no se guarda ni modifica disponibilidad.

El total de sillas libres indica cuántos viajes de la página se pudieron consultar: no es un total global de toda la operación. Un fallo muestra disponibilidad sin confirmar, nunca cero sillas libres. Se avisa si falta configurar sillas, si su número no coincide con la capacidad del bus o si una salida sigue programada después de su hora. Son datos comerciales, separados de GPS y ocupación física del dispositivo.

El dashboard también avisa de ventas `refund_required` y enlaza al panel de ventas con ese filtro. Los datos generales y alertas se actualizan con Actualizar; cada tarjeta informa la hora de disponibilidad devuelta por el servidor.

### Wompi: vencimiento y atención de pagos tardíos

El widget envía la pareja `signature_integrity_with_expiration` / `expiration_time` recibida del backend. Se conserva exactamente la cadena de vencimiento, incluidos milisegundos y Z, y no se utiliza la firma anterior. Si falta cualquiera de los dos campos se bloquea la apertura, conservando la referencia de la venta para su consulta. El contador utiliza la diferencia entre `expires_at` y `server_time`; la reserva es ahora de 10 minutos. Referencia: [documentación oficial de Wompi](https://docs.wompi.co/docs/colombia/widget-checkout-web/).

`refund_required` se presenta como **Pago recibido · Requiere atención** en compra online, historial y administración, con el mensaje de reubicación/devolución. No se muestran boletas ni factura, no se habilita entrega/reenvío fiscal y no se reabre el widget para ese pago. No se promete una devolución automática: el equipo debe resolverla por su procedimiento correspondiente.

Verificación: firma nueva y vencimiento sin reformatear, rechazo de pareja incompleta, contador con desfase de reloj, flujo `refund_required`, disponibilidad real de sillas, datos inválidos/duplicados, consultas limitadas, cancelación al cambiar de página y errores parciales. La prueba integral de pago aprobado y expiración tras 10 minutos debe completarse contra Wompi Sandbox; no se realizaron pagos reales durante estas comprobaciones.


### Demostración proyectada y regreso a datos API

Mapa y monitoreo abre `/monitoreo`, con selector de viajes, consulta paginada a `/api/trips/readings/`, puntos GeoJSON validados, recorrido cronológico y tabla de lecturas. Las respuestas se filtran por el viaje solicitado y se cancelan al cambiar de selección o salir. Errores de conexión/permisos se distinguen de ausencia de datos; las coordenadas inválidas o duplicadas se descartan e informan. No se afirma que existan lecturas del dispositivo ni una conexión en vivo: el hardware continúa en desarrollo y la API puede contener pruebas. Para un volumen grande de telemetría será necesario documentar filtros de viaje/tiempo en backend; el contrato actual obliga a recuperar páginas y filtrar en Angular.

**Ver demostración proyectada** está disponible en mapa, selección de buses para asientos y detalle de asientos de un bus. Abre `/monitoreo/demostracion`, con tres unidades de ejemplo, banner permanente de datos simulados, reproducción a una muestra por segundo, pausa y reinicio. El mismo corte avanza GPS y sensores. Seleccionar un punto o unidad pausa la reproducción; termina al alcanzar la última muestra y se detiene al abandonar la página o esconder la pestaña. No envía lecturas, modifica ventas ni registra abordajes.

**Volver a datos reales** regresa a mapa o asientos conservando bus, viaje, cliente y silla cuando forman parte del contexto. La ruta de regreso se construye con destinos internos y IDs válidos; no acepta URLs externas. La ocupación de muestra sigue usando un piso con 2 + pasillo + 2.

### Revisión de presentación móvil y mensajes

Se revisaron 33 plantillas y los estilos de las vistas. Se añadieron estados accesibles de carga (`aria-busy` / `role=status`) y errores (`role=alert`) donde faltaban, ajuste de anchos mínimos de formularios, controles táctiles de al menos 44 px en administración, entradas móviles de 16 px y desplazamiento horizontal confinado a tablas. Los mensajes largos pueden partir línea, el banner de demostración permanece visible y se respeta reducción de movimiento. Las nuevas pantallas ofrecen estados explícitos de carga, vacío, error y reintento, conservando los datos de contexto.

Verificación: compilación de producción, paginación/filtrado/validación del GPS API, errores parciales, cancelación de solicitudes, reproducción/pausa/reinicio/fin, liberación de mapa/timers y retorno al bus/viaje/asiento. No se realizaron escrituras en telemetría. La revisión visual en navegador móvil sigue pendiente porque esta sesión no dispone de navegador conectado; no se afirma una validación visual completa en dispositivos físicos.

### Revisión frente a endpoints actualizados (6 de noviembre de 2026)

Se corrigieron tres diferencias del frontend: consulta de sillas con filtro por bus para recuperar/completar todo el plano documentado, disponibilidad del viaje en la venta administrativa con reservas incluidas y cierre de sesión con revocación del refresh en servidor. El cambio obligatorio de contraseña reconoce 401 y 403. Los botones de salida muestran el proceso y evitan envíos repetidos; los tokens locales se eliminan aunque la revocación remota falle.

La venta administrativa carga todas las posiciones del viaje al seleccionarlo, bloquea las reservadas/vendidas, cancela consultas anteriores y permite reintentar una lectura fallida. Una respuesta de otro viaje o con sillas duplicadas/incompletas no habilita la venta. El endpoint de disponibilidad tiene prioridad frente a un catálogo de tiquetes antiguo. Un bus de 30 o 42 plazas no queda reducido a 10; ese límite corresponde únicamente a cuántas boletas se venden en una operación.

Se ejecutaron 16 grupos de comprobaciones locales con respuestas controladas. Ver [FRONTEND_CONTRACT_REVIEW.md](FRONTEND_CONTRACT_REVIEW.md) para contratos revisados, validaciones y pasos pendientes contra el servidor. La compilación y los tests locales no confirman por sí solos el despliegue de backend, datos remotos, correo, Factus o Wompi Sandbox.

### Integridad del plano: numeración duplicada

Un plano que contiene `01` y `1` con IDs distintos se considera inconsistente, igual que dos sillas en la misma posición física. El generador del backend debe reconocer esas equivalencias antes de completar hasta la capacidad. Se identificó un caso de 49 registros para un plano de 40 al añadir `1` a `9` aunque ya existían `01` a `09`.

Angular ya no desplaza sillas a posiciones libres ni crea filas ficticias para acomodar colisiones. Detecta duplicados numéricos, IDs repetidos, columnas fuera de la distribución 2 + pasillo + 2 y posiciones equivalentes repetidas. La venta y compra se bloquean hasta resolver el plano; la consulta administrativa muestra el diagnóstico sin modificar registros. El dashboard tampoco publica la disponibilidad de un plano inflado como confirmada.

La corrección de datos requiere backend: comparar numeración canónica y conciliar IDs/referencias existentes sin borrar boletas vendidas. Ver [SEAT_PLAN_DATA_ISSUE.md](SEAT_PLAN_DATA_ISSUE.md). La protección de interfaz no sustituye una validación del backend ni resuelve automáticamente conflictos de boletas ya emitidas.

Verificación: reproducción del caso 49, detección `01`/`1` y posición `A`/`1`, ausencia de mutaciones, bloqueo de compra/venta, rechazo de conteos inflados y mantenimiento del plano correcto de 40 sillas y los casos de 30/42.

### Capacidad del tipo y sillas del vehículo

«Capacidad máxima permitida» define el límite del tipo. «Número de sillas del vehículo» representa su capacidad real y define el plano. El formulario muestra el límite seleccionado y bloquea guardar si se supera o los datos son inválidos; no cambia automáticamente la capacidad al elegir tipo. Reducir capacidad requiere validación del backend sobre sillas y tiquetes existentes.

El detalle consulta las sillas filtradas por bus y muestra registros/capacidad, tipo y límite. Advierte sobre sillas faltantes, exceso, numeración equivalente duplicada, IDs o posiciones repetidas y distribución inválida. Incluye carga, error y actualización; cancela consultas al cambiar de bus. Un fallo no se presenta como cero sillas. No elimina ni reubica registros; este diagnóstico no representa disponibilidad comercial ni lecturas de sensores.

### Conductores independientes de cuentas

Según el contrato actualizado de `enpoints.md`, crear/editar un conductor envía exclusivamente `full_name`, `license_number`, `address` y `phone_number`. Se retiró el usuario asociado del formulario, modelo, búsqueda, ficha y CSV. No se crea una cuenta ni se solicitan credenciales; si el conductor compra boletas, utiliza una cuenta de cliente independiente. El progreso del formulario corresponde a sus cuatro campos obligatorios.

### Operación de buses y conductores

El detalle de cada bus y la nueva ficha `/conductores/:id` incorporan viajes asociados reales: programados/en curso e historial de finalizados/cancelados, siete por página. Cada viaje enlaza a su operación, mapa con `trip` y asientos del bus con el mismo contexto. La consulta usa el catálogo paginado existente y filtra por bus/conductor; una consulta fallida no se presenta como ausencia de viajes. Si fallan los nombres de terminales se muestran IDs con aviso. Para grandes volúmenes convendrá un filtro de backend.

Eliminar buses y conductores muestra los mensajes de validación JSON disponibles y el HTTP, conserva el registro ante fallos y aplica tiempo límite. Un HTTP 500 sin detalle requiere logs del servidor. Los formularios muestran exclusivamente los campos que persisten: se retiraron fotos ilustrativas, cargas locales, equipamiento, certificaciones y datos personales no soportados. No se borran datos existentes en el backend.

La lista de buses incorpora tipo, filtros por tipo/estado, siete unidades por página y CSV de todos los resultados filtrados y ordenados. Conductores pasa también a siete por página. Los botones de reportes/contacto pendientes se sustituyen por accesos a operaciones reales. GPS y sensores siguen sujetos a los datos de API o a demostración explícita, sin afirmar conexión del dispositivo.

Verificación local: filtros, orden y paginación, CSV completo independiente de la página, conservación del registro ante rechazo al eliminar, mensajes de API/timeout, asociación y clasificación de viajes, errores parciales de terminales, cancelación de consultas antiguas y parámetros de ficha del conductor. Se comprobaron también el formulario de cuatro campos y el diagnóstico de capacidad/sillas. No se realizaron eliminaciones ni escrituras en producción. La revisión visual móvil queda pendiente por ausencia de navegador conectado.
