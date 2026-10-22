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

La vista de compra y el panel con su enlace compilaron por separado con comprobacion estricta de plantillas el 21 de octubre de 2026. Se verificaron el total inicial de 78.750 COP, los cupos por bus, el bloqueo de asientos ocupados o inexistentes, el reinicio de seleccion al cambiar de horario y las validaciones del pasajero y del envio simulado.

El panel de informacion del pasajero y el login con su enlace de vista previa compilaron por separado con comprobacion estricta de plantillas el 21 de octubre de 2026. La compilacion general sigue afectada por los errores de conductores descritos abajo.

El login de pasajeros y el registro compilaron por separado con comprobacion estricta de plantillas el 21 de octubre de 2026. Se verifico el cambio entre correo y documento, la validacion exclusiva del metodo activo, los identificadores invalidos y los avisos de autenticacion y recuperacion pendientes.

La vista de registro y el login actualizado compilaron por separado con el compilador Angular y comprobacion estricta de plantillas el 21 de octubre de 2026.

Se comprobaron las validaciones de campos obligatorios, nombres en blanco, correo, celular, reglas y confirmacion de contrasena, aceptacion de terminos y el aviso de envio pendiente.

En la verificacion del 21 de octubre de 2026, la vista de ubicacion compilo por separado con el compilador Angular y se validaron los tres puntos GeoJSON, sus identificadores y el orden de coordenadas.

La compilacion completa con `npm run build` sigue bloqueada por inconsistencias existentes entre el modelo `Conductor` y sus formularios y plantillas: se usan campos como `full_name` y `license_number` que no estan declarados en ese modelo. Tambien afecta al selector de conductores del formulario de viajes.

## Mantenimiento de la documentacion

Actualizar este README con cada modificacion del proyecto para reflejar los cambios de funcionalidad, rutas, dependencias, configuracion, datos de ejemplo y estado de verificacion que correspondan.

## Comandos utiles

```bash
npm install
ng serve
npm run build
```
