# Sistema de Gestion de Transporte

Frontend academico desarrollado en Angular para consumir una API REST creada con Django REST Framework.

## Descripcion

La aplicacion permite gestionar:

- Buses
- Conductores
- Rutas
- Viajes
- Consulta publica de ubicacion de buses (actualmente con posiciones estaticas de ejemplo).

Incluye listado, creacion, edicion, eliminacion y cambio de estado para viajes.

## Tecnologias

- Angular
- TypeScript
- Componentes standalone
- Formularios reactivos
- HttpClient
- CSS propio
- Login con token Bearer
- Leaflet 1.9 para el mapa interactivo, con cartografia de OpenStreetMap.
- GeoJSON para representar las ubicaciones de los buses.

## Requisitos

- Node.js 20 o superior
- npm
- Angular CLI
- Backend activo en:

```text
http://127.0.0.1:8000/api/
```

## Instalacion

```bash
npm install
```

## Ejecutar el proyecto

```bash
ng serve
```

Abrir en el navegador:

```text
http://localhost:4200/
```

## Rutas del frontend

- `/`: pagina publica de inicio.
- `/login`: inicio de sesion administrativo.
- `/clientes/comprar`: simulacion de seleccion de horario, asiento, pasajero y resumen de compra.
- `/clientes/panel`: vista previa publica del panel de informacion del pasajero con datos de ejemplo.
- `/clientes/login`: inicio de sesion de pasajeros por correo o documento (autenticacion pendiente).
- `/registro`: registro publico de clientes, accesible desde el inicio y el login.
- `/ubicacion`: mapa publico con buses estaticos de ejemplo, accesible desde el inicio.

Las siguientes rutas requieren autenticacion:

- `/dashboard`
- `/buses`
- `/buses/nuevo`
- `/buses/editar/:id`
- `/conductores`
- `/conductores/nuevo`
- `/conductores/editar/:id`
- `/rutas`
- `/rutas/nueva`
- `/rutas/editar/:id`
- `/viajes`
- `/viajes/nuevo`
- `/viajes/editar/:id`

## Estructura principal

```text
src/app/
├── core/
│   ├── models/
│   ├── data/          # Posiciones GeoJSON de ejemplo
│   └── services/
├── pages/
│   ├── dashboard/
│   ├── home/
│   ├── login/
│   ├── registro/
│   ├── ubicacion/
│   ├── buses/
│   ├── conductores/
│   ├── rutas/
│   └── viajes/
├── shared/
│   ├── navbar/
│   └── layout/
├── app.config.ts
├── app.routes.ts
└── app.component.ts
```

## Backend

El proyecto consume los siguientes recursos desde Django REST Framework:

- `buses`
- `conductores`
- `rutas`
- `viajes`

URL base usada por los servicios:

```text
http://127.0.0.1:8000/api/
```

Endpoint de autenticacion configurado:

```text
http://127.0.0.1:8000/api/token/
```

Este endpoint corresponde al formato comun de Django REST Framework Simple JWT y espera `username` y `password`.

La configuracion se encuentra en `src/app/core/config/api.config.ts`. Modificar ese archivo para apuntar a otro entorno.

## Mapa y ubicaciones de buses

La vista `/ubicacion` adapta el diseno de Stitch a un componente Angular. El mapa SVG inicial fue reemplazado por Leaflet y OpenStreetMap.

- Muestra tres buses con posiciones fijas de ejemplo en Bogota.
- Permite seleccionar un bus desde la lista o su marcador, consultar su placa, conductor y coordenadas, acercar o alejar el mapa y ver todos los buses.
- Permite copiar el enlace de la vista. El contacto del operador muestra un aviso hasta disponer de datos reales.
- Los horarios, el itinerario y la telemetria del diseno son de ejemplo.
- Las posiciones no se actualizan automaticamente ni se consultan en la base de datos: el dispositivo GPS sigue en desarrollo.
- El mapa base requiere conexion a internet para cargar las teselas de OpenStreetMap; si falla, se muestra un aviso.

Archivos principales:

- `src/app/core/data/bus-locations.mock.ts`: coleccion de posiciones estaticas.
- `src/app/core/models/bus-location.model.ts`: tipos para la coleccion GeoJSON y las propiedades de cada bus.
- `src/app/pages/ubicacion/`: componente, plantilla y estilos de la vista.
- `angular.json`: incluye los estilos de Leaflet.

Cada bus se representa como una `Feature` con geometria `Point`. Las coordenadas GeoJSON usan el orden **[longitud, latitud]**, en WGS84 (SRID 4326):

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-74.0841, 4.6982]
  },
  "properties": {
    "id": 1042,
    "unit": "1042",
    "plate": "WTL-402",
    "driver": "Carlos Restrepo"
  }
}
```

La integracion futura prevista es: dispositivo GPS -> base de datos con `PointField` -> API que serializa a GeoJSON -> mapa. `PointField` pertenece al backend; este frontend consume la geometria. El endpoint de ubicaciones y las actualizaciones automaticas aun no estan implementados.

## Dashboard: panel de conductores

La ruta protegida `/conductores` adapta el diseno de Stitch al layout administrativo. Usa los registros reales de `/fleet/drivers/` y conserva registro, edicion y eliminacion.

- `ConductorService.listarTodos()` carga todas las paginas para conteos, busqueda, paginacion local y exportacion coherentes.
- Indicadores globales de total de conductores y registros con licencia, telefono y direccion. La existencia de licencia no certifica su vigencia.
- Busqueda por nombre, ID, usuario asociado, licencia y telefono; filtro con/sin telefono y opcion de limpiar.
- Tabla y tarjetas con cinco registros por pagina, navegacion anterior/siguiente y ficha de datos en la misma pantalla.
- Contacto telefonico mediante enlace `tel:` solo cuando el numero tiene un formato compatible; no envia mensajes ni inicia llamadas automaticamente.
- Exportacion CSV de todos los resultados filtrados, incluyendo los que no estan en la pagina visible; escapa comillas y neutraliza valores que pudieran interpretarse como formulas. PDF no implementado.
- Estados de carga, error y reintento, sin registros y sin coincidencias; eliminacion confirmada, bloqueo de solicitudes duplicadas y recarga tras exito.
- El contrato actual no contiene estado operativo, documento de identidad, turnos, rutas asignadas, categoria/vencimiento de licencia, RH, fotos ni evaluaciones. No se inventan esos campos ni se ofrecen filtros sin datos.

Archivos: `src/app/pages/conductores/conductor-list.component.ts`, `conductor-list.component.html`, `conductor-list.component.css` y `src/app/core/services/conductor.service.ts`. Los estilos del formulario de conductor siguen separados.

## Agregar y editar buses

Las rutas protegidas `/buses/nuevo` y `/buses/editar/:id` usan el diseno de registro de unidad de Stitch: formulario de informacion general a la izquierda y previsualizacion a la derecha, dentro del layout administrativo compartido.

- Placa y modelo obligatorios, con rechazo de valores en blanco y eliminacion de espacios externos antes de enviar.
- Capacidad obligatoria, entera y mayor que cero. Estados compatibles con la API: `Active`, `Inactive` y `mantenimiento` (corregido el valor anterior `Maintenance` del selector).
- Guarda los cuatro campos soportados mediante `BusService.crear` o `actualizar` y vuelve a `/buses` al recibir respuesta correcta. No simula registros exitosos.
- Previsualizacion reactiva de placa, modelo, capacidad, estado y progreso de los cuatro campos obligatorios; imagen ilustrativa inicial tomada del HTML de referencia.
- Seleccion de PNG, JPG o WEBP de hasta 5 MB con previsualizacion local, opcion de quitarla y liberacion de la URL temporal al reemplazarla o salir.
- Wi-Fi, aire acondicionado, GPS, camaras y bano pueden seleccionarse para la previsualizacion. La pantalla indica que foto y equipamiento no se guardan: el contrato actual de la API no incluye esos campos y no se envian como datos adicionales.
- Bloqueo de envios duplicados, errores de carga con reintento y errores de guardado. No permite sobrescribir un bus si fallo la carga de sus datos.

Archivos: `src/app/pages/buses/bus-form.component.ts`, `bus-form.component.html` y `bus.component.css`. Pendiente: ampliar el backend para almacenar imagen y equipamiento; no se presupone una auditoria tecnica automatica.

## Dashboard: apartado de buses

La ruta protegida `/buses` adapta el diseno de tarjetas de Stitch dentro del layout administrativo existente, conservando la navegacion compartida y las acciones de crear, editar y eliminar.

- Carga todos los registros mediante `BusService.listarTodos()`, incluyendo las paginas de la API `/fleet/buses/`.
- Busqueda local por ID, placa o modelo, filtro de activos y opcion de limpiar filtros. Los indicadores se calculan sobre toda la flota cargada, sin cambiar al filtrar tarjetas.
- Indicadores de activos, inactivos y mantenimiento; porcentaje de registros activos y total registrado. Activo no significa que un bus este en movimiento.
- Tarjetas con ID, placa, modelo, capacidad y estado. La ocupacion se muestra sin datos; el backend aun no entrega telemetria para esta vista.
- El enlace de mapa abre la demostracion GeoJSON existente y se etiqueta como ejemplo, sin asociar una ubicacion ficticia al registro real.
- Se conservan los formularios `/buses/nuevo` y `/buses/editar/:id`. Eliminar requiere confirmacion, bloquea solicitudes duplicadas y recarga la flota tras el exito.
- Estados de carga, error con reintento, flota vacia y busqueda sin resultados. Un error de eliminacion conserva las tarjetas visibles.
- Reporte tecnico y contacto con central muestran avisos pendientes. No se inventan ocupaciones, rutas, tendencias ni valoraciones del conductor.

Archivos: `src/app/pages/buses/bus-list.component.ts`, `bus-list.component.html` y `bus-list.component.css`. Los estilos del formulario de buses permanecen separados.

## Compra de tiquetes (simulacion)

La ruta publica `/clientes/comprar` adapta la vista de Stitch a Angular y CSS propio, sin integrar una pasarela de pago. Se accede desde **Comprar tiquetes** en el panel y **Ver todos los viajes** en el inicio.

- Tres horarios de ejemplo Bogota - Medellin para el 24 de octubre de 2026, con servicios, tarifas y cupos calculados desde el inventario local de asientos.
- Selector de piso cuando el vehiculo tiene dos pisos; puestos disponibles, ocupados y seleccionados. Solo se admite un asiento para un adulto.
- Cambiar de horario borra el asiento anterior; los puestos ocupados estan deshabilitados y se validan tambien en el componente.
- Resumen sincronizado con bus, horario y asiento. Total calculado como tarifa base + 6.500 COP de tasas - 15% de descuento de ejemplo UNIVERSAL15. El horario Premier inicial suma 78.750 COP.
- Formulario sin datos personales prellenados: nombre, tipo y numero de documento, celular colombiano, correo y aceptacion de terminos inicialmente desmarcada.
- Confirmar valida datos y asiento, y muestra un aviso de simulacion. No reserva puestos, envia datos, guarda informacion ni cobra. Los medios de pago son ilustrativos.
- Modificar busqueda muestra un aviso pendiente; origen, destino y fecha son fijos en esta vista previa.
- Pendiente: busqueda real, disponibilidad y bloqueo de puestos en servidor, reglas de tarifas y cupones, textos legales, creacion de reservas, pagos y expedicion de tiquetes.

Archivos: `src/app/pages/booking/booking.data.ts` (horarios e inventario), `booking.component.ts`, `booking.component.html` y `booking.component.css`.

## Panel de informacion del pasajero

La ruta `/clientes/panel` integra el diseno de Mi Cuenta de Stitch en Angular y CSS propio. Se accede desde el enlace **Ver vista previa del portal de pasajeros** del login de clientes, sin simular una autenticacion correcta.

- Perfil y contacto del pasajero, categoria Oro, puntos, viajes realizados, ahorro y proximo viaje.
- Tiquete de ejemplo Bogota - Medellin, reserva, horarios, vehiculo y asiento; tabla adaptable con tres viajes recientes.
- Informacion personal, contacto de emergencia, preferencias, beneficios y monedero con metodos de pago enmascarados de ejemplo.
- Navegacion a secciones del panel y al mapa de buses estaticos. El mapa no representa el seguimiento real del tiquete de muestra.
- Editar perfil, notificaciones, carne, QR, PDF, facturas, repetir viajes, extracto, terminos del club y pagos muestran avisos de funcionalidad pendiente. No generan documentos, cargos ni cambios de datos.
- Todos los datos provienen de `src/app/pages/client-panel/client-panel.data.ts`; no se leen datos privados ni se guardan cambios o tarjetas.
- Pendiente: servicios de perfil, tiquetes, puntos y pagos; autenticacion y autorizacion de pasajeros. Por ahora la ruta es publica exclusivamente para revisar datos ficticios. Antes de usar datos reales debe protegerse con la sesion y permisos del cliente.

Archivos: `src/app/pages/client-panel/`. El acceso administrativo continua en `/login`.

## Inicio de sesion de clientes

La ruta publica `/clientes/login` adapta el diseno de Stitch al portal de pasajeros con CSS propio: formulario a la izquierda, fotografia de bus, testimonio de ejemplo y beneficios a la derecha. La fotografia usa la URL incluida en el HTML original y requiere internet. El login administrativo y su servicio JWT permanecen en `/login`.

- Selector de acceso por correo o documento (CC, CE y pasaporte). Solo se validan los campos del metodo activo.
- Validacion de correo, documento alfanumerico de 5 a 20 caracteres y contrasena obligatoria; permite mostrar u ocultar la clave.
- La opcion de recordar sesion es parte del formulario; no persiste credenciales ni activa sesiones.
- El formulario muestra un aviso al enviar: falta integrar la autenticacion de pasajeros. No hace peticiones ni almacena datos. No se reutiliza el endpoint administrativo, cuyo contrato actual requiere `username` y `password`.
- Recuperar contrasena muestra un aviso de disponibilidad futura; Google y Apple estan deshabilitados.
- Enlaces al registro y al mapa estatico; el acceso por codigo de reserva sigue pendiente. Beneficios y testimonios son contenido de muestra, sin servicios asociados.
- El enlace principal de inicio de sesion en la pagina de inicio y los enlaces del registro llevan al login de pasajeros. El acceso administrativo sigue disponible en el pie del portal de pasajeros.

Archivos: `src/app/pages/client-login/` y ruta en `src/app/app.routes.ts`.

## Registro de clientes

La vista publica `/registro` adapta el HTML de Stitch a un componente Angular standalone con CSS propio, sin scripts ni Tailwind desde CDN. Incluye formulario de pasajero, tarjeta de bienvenida, beneficios y testimonio de ejemplo. El inicio y el login enlazan a esta vista.

- Campos: nombres, apellidos, tipo y numero de documento, celular colombiano (+57), correo, contrasena y confirmacion.
- Validaciones: nombres no vacios, documento de 5 a 20 caracteres alfanumericos o guiones, celular de 10 digitos comenzando por 3, correo valido y contrasena de al menos 8 caracteres con mayuscula, minuscula y numero.
- Confirmacion de contrasena, visibilidad independiente de ambas claves, indicador de seguridad y errores por campo.
- Aceptacion obligatoria de terminos y consentimiento opcional para promociones, inicialmente desmarcados.
- Google y Apple estan deshabilitados y marcados como proximamente; no hay integracion OAuth.
- Al enviar se validan los datos y se avisa que la creacion de cuentas sigue pendiente. No se hacen peticiones ni se guardan datos personales o contrasenas en almacenamiento local.
- Pendiente: acordar e integrar el endpoint de registro, publicar los textos legales y conectar los beneficios reales. El cupon y el testimonio son de ejemplo.

Archivos: `src/app/pages/registro/registro.component.ts`, `registro.component.html` y `registro.component.css`.

## Estado de verificacion

La compilacion completa del panel de conductores paso el 21 de octubre de 2026, con advertencias de estilos y Leaflet. Se verificaron con servicios simulados los conteos, filtros, paginacion de pantalla y carga de todas las paginas de la API, enlaces telefonicos, bloqueo de eliminaciones duplicadas, conservacion de datos tras un error y exportacion CSV con escape de comillas y neutralizacion de formulas. No se eliminaron conductores reales durante las pruebas.

La compilacion completa paso el 21 de octubre de 2026 con el nuevo formulario de unidades, con advertencias de estilos y Leaflet. Se comprobaron con servicios simulados creacion y edicion, datos enviados, limpieza de espacios, capacidad entera, estado de mantenimiento, validacion de tipo y tamano de imagen, liberacion de su URL, bloqueo de duplicados y errores de carga y guardado. No se crearon ni modificaron buses reales durante estas pruebas.

La compilacion completa con `npm run build` finalizo correctamente el 21 de octubre de 2026 tras integrar el apartado de buses. Quedan advertencias por estilos de componentes mayores que el umbral de aviso de 4 kB (sin superar el limite de error de 8 kB) y por el formato CommonJS de Leaflet. Tambien compilo la vista de buses por separado; se comprobaron carga y reintento con servicio simulado, conteos globales, filtros, confirmacion de eliminacion, bloqueo de solicitudes duplicadas y manejo de errores. Estas comprobaciones no ejecutaron eliminaciones contra el backend.

La vista de compra y el panel con su enlace compilaron por separado con comprobacion estricta de plantillas el 21 de octubre de 2026. Se verificaron el total inicial de 78.750 COP, los cupos por bus, el bloqueo de asientos ocupados o inexistentes, el reinicio de seleccion al cambiar de horario y las validaciones del pasajero y del envio simulado.

El panel de informacion del pasajero y el login con su enlace de vista previa compilaron por separado con comprobacion estricta de plantillas el 21 de octubre de 2026. En esa verificacion anterior la compilacion general estaba afectada por errores de conductores; la verificacion completa mas reciente ya finaliza correctamente.

El login de pasajeros y el registro compilaron por separado con comprobacion estricta de plantillas el 21 de octubre de 2026. Se verifico el cambio entre correo y documento, la validacion exclusiva del metodo activo, los identificadores invalidos y los avisos de autenticacion y recuperacion pendientes.

La vista de registro y el login actualizado compilaron por separado con el compilador Angular y comprobacion estricta de plantillas el 21 de octubre de 2026.

Se comprobaron las validaciones de campos obligatorios, nombres en blanco, correo, celular, reglas y confirmacion de contrasena, aceptacion de terminos y el aviso de envio pendiente.

En la verificacion del 21 de octubre de 2026, la vista de ubicacion compilo por separado con el compilador Angular y se validaron los tres puntos GeoJSON, sus identificadores y el orden de coordenadas.

En verificaciones anteriores hubo inconsistencias del modelo `Conductor` con sus formularios y plantillas. El modelo actual incluye los campos correspondientes y ese bloqueo no aparece en la compilacion completa mas reciente.

## Mantenimiento de la documentacion

Actualizar este README con cada modificacion del proyecto para reflejar los cambios de funcionalidad, rutas, dependencias, configuracion, datos de ejemplo y estado de verificacion que correspondan.

## Comandos utiles

```bash
npm install
ng serve
npm run build
```
