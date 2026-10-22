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
| Portal de pasajeros | Registro público, login, perfil editable e historial conectados a API; compra de una silla con checkout Wompi y confirmación por API | Prueba integral de sandbox y compra conjunta con varios pasajeros |
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
| `/` | Inicio, consulta de viajes y búsqueda de rutas de demostración |
| `/clientes/login` | Login por correo o documento con sesión propia de cliente |
| `/registro` | Registro público por API |
| `/clientes/panel` | Perfil propio editable e historial de compras; requiere cliente |
| `/clientes/comprar` | Compra de una silla mediante Wompi y confirmación por API; requiere cliente |
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

### Validación al registrar conductores

El formulario muestra los errores JSON por nombre, usuario asociado, licencia, dirección y teléfono al recibir HTTP 400/422, además de distinguir fallos de sesión, permisos, conexión y servidor. Conserva los datos para corregirlos. La consola identifica `[Conductores]`, la operación, HTTP y nombres de campos rechazados, sin imprimir tokens o datos personales. El ID `user` debe corresponder a una cuenta existente con rol `driver`; el motivo exacto proviene del cuerpo JSON de la API, no de los encabezados HTTP.

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

El último acceso del menú lateral administrativo es **Administración de asientos** (`/asientos`). La ruta hereda los guards del layout administrativo y muestra únicamente el anuncio **Esta función estará disponible pronto**, con regreso al dashboard. No consulta endpoints, no presenta datos operativos ni modifica sillas. No se añade al portal del cliente.

### Panel de ventas

El menú lateral incluye **Ventas**, con ruta administrativa protegida `/ventas`. Consulta todas las páginas de `GET /api/sales/sales/` y muestra cliente, documento, correo, viaje/ruta, silla, importe, método, origen, fecha, estado y factura. Incluye búsqueda, filtros por estado/origen/fecha de Colombia, siete registros por página e indicadores sobre los resultados filtrados; el total monetario suma solo ventas `paid`.

**Ver detalle** consulta `/api/sales/sales/:id/` y muestra contacto, tiquetes y factura (número, CUFE, errores y enlace HTTPS). Si falla la actualización conserva los datos disponibles. Las respuestas antiguas no sustituyen la venta seleccionada después de cerrar/cambiar el detalle. Los catálogos secundarios cargan por separado: si fallan, conserva las ventas y muestra IDs. No modifica ventas ni procesa pagos; **Generar venta** abre el formulario existente.

### Venta administrativa de tiquetes

`/ventas/nueva` implementa el diseño de venta en ventanilla bajo el guard administrativo. Se abre desde **Generar venta**, desde **Tiquete** en el directorio (cliente preseleccionado por ID) y después de registrar un cliente. La compra pública `/clientes/comprar` es un flujo independiente de Wompi para clientes.

Consulta viajes futuros programados, terminales, clientes, tarifas (`/api/trips/fares/`), sillas (`/api/fleet/seats/`) y tiquetes (`/api/sales/tickets/`), incluyendo todas las páginas. Ordena las sillas por fila/columna sin inventar pisos, categorías o un plano físico. Las sillas con tiquetes `issued` quedan bloqueadas; no hay reserva temporal ni seguimiento en vivo.

Para emitir exige cliente con documento/correo/teléfono, viaje, silla, tarifa positiva y confirmación de recaudo. Reconsulta tiquetes antes del POST a `/api/sales/admin-sales/`. Envía IDs de viaje/silla, datos del pasajero y método `cash`, `card` o `transfer`; el servidor calcula el importe y registra la venta pagada. No envía precios calculados en el navegador ni procesa PSE/Nequi. Muestra el número de venta y códigos de tiquete devueltos por el servidor.

Bloquea envíos simultáneos y nuevas emisiones después del éxito. Ante un resultado ambiguo (red/error del servidor), bloquea el reintento para evitar duplicados e indica verificar la operación en el servidor. La facturación Factus depende del backend; un fallo posterior al registro requiere conciliación. No se ejecutaron ventas reales durante las comprobaciones. Concurrencia y unicidad deben garantizarse también en el backend.

### Diagnóstico en consola de ventas

En F12 → Consola, filtrar por `[Ventas]` o `[Factus]`. Los fallos de registrar venta y consultar venta/factura usan `console.error` con operación, endpoint, HTTP y motivo general. Una venta sin `factus_invoice` o con factura pendiente genera `console.warn`; una factura con estado `error` genera `console.error`, aunque el HTTP sea exitoso. No se imprime el cuerpo completo, datos del pasajero, tokens, credenciales, CUFE ni códigos de tiquete. Los errores originales siguen llegando a la vista y el registro no genera reintentos ni solicitudes adicionales.

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

Login `/clientes/login` envía correo o documento como `username` a `/api/token/`, consulta `/api/accounts/me/` con el token recibido y exige `role: client` antes de almacenarlo. Esta comprobación requiere que la respuesta de perfil incluya `role`. Si falta, la vista informa expresamente que no pudo verificarlo, sin afirmar que la cuenta tenga otro rol; la consola registra `[Portal cliente]` y `rolePresent`, sin datos personales. Un rol distinto de `client` y un HTTP 403 del servidor muestran motivos separados. La entrada continúa denegada si no se puede comprobar el rol. La sesión usa claves `bic_passenger_access` y `bic_passenger_refresh`, distintas de las administrativas. **Recordar sesión** elige localStorage; sin marcarlo usa sessionStorage. El cierre de sesión de cliente no borra la sesión administrativa. La renovación automática no está implementada.

`passengerGuard` protege perfil y compra mediante consulta del perfil, sin aceptar una sesión administrativa. Las peticiones de cliente envían explícitamente su token; token y registro públicos no reciben el token administrativo del interceptor. El perfil carga `/accounts/me/`, permite PATCH únicamente de nombre/correo/celular y muestra documentos de solo lectura. El historial reúne todas las páginas de `/sales/sales/`, con importes históricos, estados, tiquetes y factura cuando se devuelven. No presenta puntos, membresías ni viajes ficticios. El backend debe aplicar permisos por propietario.

La compra protegida usa el checkout real de Wompi y confirma el resultado mediante la API. Cambiar/recuperar contraseña y acceso social siguen pendientes de API. En particular, el acceso de cuentas creadas por administrativos depende del mecanismo de contraseña/activación que implemente el backend; no se asignan contraseñas desde Angular.

### Diseño del perfil de pasajero

`/clientes/panel` adapta el diseño de Stitch con cabecera de cuenta e iniciales reales, tiquete destacado, historial tabular de siete compras por página y datos personales en la columna lateral. **Editar perfil / Actualizar datos** habilita la edición; cancelar recupera los valores cargados y guardar usa el PATCH de perfil existente. El detalle de compra permite consultar los tiquetes y la factura, sin enlaces administrativos.

El tiquete destacado se toma de compras `paid` con tiquetes `issued`; no se presenta como próximo viaje ni como permiso de abordaje, porque el historial no proporciona aquí la agenda detallada del viaje. Las fechas de la tabla son de compra, en hora Colombia. QR digital, notificaciones, categoría Oro, beneficios, monedero, tarjetas y recargas están pendientes; no se muestran puntos, saldos o datos personales ficticios. Los botones pendientes muestran avisos o permanecen deshabilitados. No hay seguimiento GPS en vivo.

### Compra real con Wompi

`/clientes/comprar` consulta viajes futuros programados, sillas del bus, tarifas, rutas y terminales reales, usando el token de cliente en todas las páginas. Conserva el diseño de selección/resumen y elimina los horarios, pisos, descuentos y cargos ficticios. El checkout actual solo admite una silla y usa los datos del titular de la cuenta; varios pasajeros requieren ampliar el contrato. Las sillas son candidatas del catálogo, no una promesa de disponibilidad: la API verifica reservas y ventas al hacer checkout. El cliente no consulta tiquetes de otros usuarios ni estados IoT restringidos.

El botón **Pagar por Wompi** carga `https://checkout.wompi.co/widget.js` y envía `POST /api/sales/wompi/checkout/` con únicamente `trip`, `seat`, `redirect_url`. Abre `WidgetCheckout` usando `public_key`, `reference`, `currency`, `amount_in_cents` y `signature.integrity` del servidor; nunca envía un precio, secretos ni datos de tarjeta a nuestra API. El callback solo entrega el ID para `POST /api/sales/wompi/status/`; únicamente el estado `paid` confirmado por backend permite mostrar tiquetes. La venta/factura se actualiza mediante GET de la venta. No se consulta Wompi directamente desde el navegador para verificar transacciones.

La operación pendiente guarda en sessionStorage, por ID de usuario, solo referencia de venta, plazo e ID de transacción; no datos de tarjeta ni perfil. Al volver del widget a `/clientes/comprar?venta=ID&id=TRANSACCION` verifica la operación con el backend autenticado. El contador usa `expires_at` cuando existe; en otro caso muestra una aproximación conservadora de cinco minutos. El contador no acredita pago ni libera sillas: eso corresponde al servidor. Las suscripciones y el contador se limpian al salir.

Bloquea nuevos checkout mientras hay una operación pendiente o incierta. Los conflictos 400/409 se muestran y permiten corregir la selección. Ante red/5xx no repite el POST automáticamente: exige revisar el historial antes de iniciar otra compra. **He cerrado Wompi** permite recuperar controles si se cierra el widget sin callback; no confirma ni cancela el pago. Tras recargar puede consultar la venta; no recrea automáticamente el widget ni genera otra venta. Los reintentos de consulta son explícitos.

Referencia de integración: [Widget y Checkout Web de Wompi](https://docs.wompi.co/docs/colombia/widget-checkout-web/). Deben estar disponibles en el servidor los catálogos para clientes, tarifa, llaves públicas/firma y endpoints checkout/status. Se verificó con servicios simulados y compilación; no se hicieron pagos reales ni una prueba integral contra Wompi Sandbox en esta sesión.

### Demostraciones y servicios pendientes

- La búsqueda de reservas del inicio solo abre la combinación de ejemplo Bogotá Salitre → Medellín, 24 de octubre de 2026, un adulto y solo ida. Otras selecciones muestran un aviso. Esta fecha está fijada en el código y debe revisarse al actualizar la demostración.
- Se retiraron los archivos antiguos `booking.data.ts` y `client-panel.data.ts`, que contenían buses y posiciones de dos pisos ficticios. La compra muestra placa, modelo y capacidad de `/api/fleet/buses/`, según el bus del viaje creado en administración. No hay selector de pisos. Los precios se obtienen de las tarifas reales y el checkout devuelve el importe definitivo.
- El perfil usa `PassengerService` y `passengerGuard`; los datos antiguos de ejemplo se retiraron.
- Login y registro de pasajeros están conectados a API. Google, Apple y recuperación de contraseña permanecen pendientes.
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

- Verificar registro, acceso, edición de perfil e historial contra el backend desplegado y añadir renovación de sesión del pasajero.
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






























