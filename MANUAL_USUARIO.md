# Manual de uso — Buses Universal

Este manual explica cómo utilizar Buses Universal desde el portal público, la cuenta de pasajero y el panel administrativo. Algunas funciones de GPS y sensores se presentan como demostración hasta que los dispositivos físicos estén conectados.

## 1. Antes de comenzar

- Use un navegador actualizado y una conexión estable.
- El portal público está disponible sin iniciar sesión. Las compras, el historial y la cuenta requieren una cuenta de cliente.
- El panel administrativo requiere una cuenta con rol de administrador. No comparta su contraseña ni sus códigos QR de verificación.
- La disponibilidad de una silla, el importe y el resultado de un pago siempre los confirma el servidor. La información visible puede cambiar mientras otra persona compra.

## 2. Portal público

### Buscar un viaje

1. Entre a la página principal.
2. Seleccione **origen**, **destino**, fecha de ida y número de pasajeros.
3. Pulse **Buscar rutas**.
4. Elija un horario disponible y seleccione **Reservar asiento**.

Solo se muestran salidas que todavía permiten ventas. Si no hay horarios, revise la fecha, la dirección de la ruta o consulte nuevamente más tarde.

La sección de rutas destacadas es un acceso rápido al catálogo; no garantiza por sí sola que exista una salida disponible para comprar.

### Consultar ubicación

En **Ubicación del bus** puede abrir el seguimiento de demostración. El mapa, los iconos de buses y el recorrido azul muestran el funcionamiento esperado de la plataforma, pero no confirman una ubicación real mientras el GPS no esté instalado y enviando lecturas.

## 3. Cuenta de pasajero

### Registrarse e iniciar sesión

1. Seleccione **Registrarse** para crear una cuenta, o **Iniciar sesión** si ya la tiene.
2. Ingrese el correo electrónico o documento permitido por la pantalla y su contraseña.
3. Al entrar verá el panel del pasajero.

Si la cuenta fue creada por un administrador y el sistema solicita cambiar la contraseña, hágalo antes de comprar. Por seguridad, el sistema puede limitar temporalmente otras acciones hasta completar ese cambio.

Use **¿Olvidaste tu contraseña?** para solicitar la recuperación y siga las instrucciones recibidas por el canal configurado por la empresa.

### Panel del pasajero

El panel reúne estas secciones:

- **Mis tiquetes:** boletas emitidas, silla, estado y datos del viaje.
- **Mis compras:** historial de pagos, detalle de cada compra, factura y descarga de boletas.
- **Mi información:** datos personales, foto de perfil y carné digital.

Para revisar una compra, abra **Ver detalle**. Allí encontrará los pasajeros, sillas, importe, estado de pago, tiquetes y el resultado de la factura electrónica.

Un error o una espera en Factus no elimina una compra ya pagada ni los tiquetes emitidos. Revise el detalle y use la actualización disponible antes de intentar pagar de nuevo.

### Foto y carné digital

En **Mi información** puede actualizar sus datos y cargar una foto de perfil. Use imágenes JPG, PNG o WEBP dentro de los límites indicados en pantalla.

El **carné digital** muestra un QR de identificación. Este QR sirve para verificar el carné; no equivale a una boleta ni autoriza el abordaje.

### Comprar tiquetes con Wompi

1. Abra **Comprar tiquete** desde el portal o el panel.
2. Seleccione el viaje y las sillas disponibles.
3. Indique los datos de los pasajeros. Puede comprar varias sillas en una misma operación si están disponibles.
4. Revise tarifa por boleta y total.
5. Seleccione **Pagar con Wompi** y complete el pago dentro de la pasarela.
6. Espere la confirmación del sistema antes de cerrar la página.

No modifique el precio ni comparta datos de tarjeta fuera de la pasarela de Wompi. Una silla queda temporalmente reservada durante el proceso de pago; si se agota el tiempo o otra operación la ocupa, el sistema le informará qué hacer.

Después de un pago aprobado, abra **Ver compra, descargar boletas y consultar factura**. Allí puede descargar un PDF con una página por tiquete y su QR de verificación. Cada QR debe conservarse legible: al escanearlo se consulta el estado actual del tiquete en el portal.

### Estados frecuentes de compra

| Estado | Significado |
| --- | --- |
| Pagada / emitida | El pago fue confirmado y se generaron los tiquetes. |
| Pendiente | El pago o su confirmación aún está en proceso. No repita el pago sin verificar la compra. |
| Fallida o expirada | No se emitieron tiquetes. Puede iniciar una nueva compra si aún hay disponibilidad. |
| Requiere reembolso | El pago fue recibido fuera de la ventana disponible y no se emitieron tiquetes. El equipo debe gestionar reubicación o devolución. |

## 4. Panel administrativo

### Ingreso y tablero principal

Entre por **Acceso administrativo**. El tablero muestra el resumen operativo, salidas próximas, disponibilidad de sillas y accesos a las tareas principales. Cierre sesión al terminar, especialmente en equipos compartidos.

El sistema asigna funciones según la cuenta: administrador, vendedor, despachador, conductor o auditor. El menú muestra solamente los módulos permitidos para cada rol. Si el sistema solicita cambiar una contraseña provisional, complete ese proceso antes de operar.

### Buses y tipos de bus

En **Buses** puede crear, editar, buscar y consultar unidades.

1. Registre placa, modelo, tipo de bus, capacidad real y estado.
2. Defina el tipo de bus para establecer la capacidad máxima permitida.
3. Abra el detalle de una unidad para consultar su configuración, plano de sillas y dispositivo GPS asignado.

La capacidad real determina cuántas sillas se pueden configurar. No reduzca la capacidad sin revisar tiquetes y sillas existentes. Asignar un GPS prepara la asociación con el bus, pero no confirma que el dispositivo esté conectado ni que envíe datos.

### Conductores

En **Conductores** registre licencia, contacto y estado. Un conductor inactivo no debe asignarse a una salida. Use los filtros y la búsqueda para encontrar registros rápidamente.

### Rutas y viajes

1. En **Rutas**, cree el trayecto con terminal de origen, terminal de destino y distancia.
2. En **Viajes**, asigne bus, conductor, ruta, fecha, hora y tarifa.
3. Desde el detalle del viaje consulte bus, conductor, pasajeros, sillas, QR y monitoreo.

Los estados operativos se calculan automáticamente con la hora del servidor:

- **Programado:** antes de la ventana de salida.
- **En curso:** desde 30 minutos antes de la salida hasta el cierre operativo.
- **Finalizado:** al llegar la hora de finalización o el cierre automático configurado.
- **Cancelado:** decisión registrada por un administrador.

El administrador puede **postergar**, **finalizar** o **cancelar** desde la gestión del viaje. Al postergar, indique el nuevo horario y el motivo. Estas acciones afectan la operación y las ventas, por lo que conviene verificar el estado después de enviarlas.

Las ventas están permitidas únicamente durante la ventana definida por el servidor, incluso si el viaje aparece en el catálogo. Si se muestra “ventas cerradas”, no intente forzar una nueva venta.

### Venta en taquilla o administrativa

1. Abra **Ventas** y elija **Generar venta**.
2. Busque un cliente existente por documento o registre uno nuevo.
3. Seleccione viaje, una o varias sillas reales y método de pago.
4. Revise el total calculado por el sistema.
5. Confirme la venta una sola vez y espere el resultado.

El precio se toma de la tarifa del viaje. No debe editarse manualmente. Una venta puede generar varios tiquetes, uno por silla. Si una silla está vendida o reservada, el sistema indicará las sillas no disponibles.

En la lista de ventas, use **Ver detalle** para revisar pasajeros, sillas, tiquetes, pago e información de Factus. Si la factura falla, la venta y los tiquetes pueden seguir siendo válidos; use el reintento o la consulta de factura según corresponda, sin crear otra venta por el mismo recaudo.

### Clientes y soporte

En **Clientes** consulte el directorio, filtros y ficha individual. Desde el contexto del viaje de un cliente puede abrir las sillas para comprobar su asignación comercial.

En **Soporte** revise solicitudes, filtre por estado o categoría, responda y actualice su progreso. No incluya contraseñas, tokens ni datos de pago completos en una respuesta de soporte.

### Personal y bitácora

Solo un **administrador** puede crear o activar/desactivar cuentas de personal. Las cuentas no se eliminan desde la interfaz, para preservar la trazabilidad. Si se deja vacía la contraseña inicial, la persona deberá reemplazarla al iniciar sesión.

La **Bitácora de auditoría** registra acciones importantes de viajes, ventas, flota, soporte y cuentas. Use sus filtros para revisar quién realizó una acción y cuándo. Los registros son de consulta: no se editan ni se borran desde el portal.

### Validar QR y registrar abordaje

Abra **Validar QR** para leer con cámara, lector USB o pegando el enlace del QR.

- Un QR de **boleta** muestra viaje, silla y estado. Si es válido y corresponde al viaje, el operador puede confirmar el abordaje.
- Un QR de **carné** solo verifica la identidad/carné; no debe usarse para abordar.
- Una boleta ya utilizada, cancelada, vencida o de otro viaje no debe aceptarse.

Espere siempre la respuesta del servidor. Si hay un problema de conexión, no considere el abordaje como registrado hasta ver la confirmación. El sistema evita que dos escaneos registren el mismo abordaje dos veces.

### Mapa, GPS y sensores

Desde el detalle de un viaje abra **Mapa y recorrido del viaje**. Cuando haya lecturas reales, se muestran en orden cronológico con la hora de recepción y el recorrido asociado.

El botón **Ver demostración proyectada** reproduce un escenario visual de GPS y ocupación de asientos. Es útil para mostrar el objetivo del proyecto, pero no es evidencia de ubicación, presencia física, venta ni identidad de pasajeros.

En los asientos, **ocupado**, **libre** y **sin señal** pertenecen a la lectura del sensor. “Sin señal” no significa asiento libre. La venta y el estado físico de un asiento son datos distintos.

## 5. Recomendaciones de operación

- Actualice la información antes de tomar una decisión operativa importante.
- No elimine ni modifique buses, viajes o capacidad sin verificar sus ventas y tiquetes relacionados.
- Utilice los filtros, búsqueda y orden de las listas para evitar actuar sobre un registro equivocado.
- Para errores de servidor, conserve el número de venta, viaje o tiquete y comuníquelo al equipo técnico. No comparta tokens, contraseñas, CVV ni números completos de tarjeta.
- Si el sistema muestra datos de demostración, identifíquelos claramente ante pasajeros y operadores.

## 6. Glosario breve

| Término | Descripción |
| --- | --- |
| Tiquete o boleta | Documento emitido para una silla y un viaje concretos. |
| Venta | Operación de pago que puede contener uno o varios tiquetes. |
| Factura electrónica | Documento gestionado con Factus; su resultado puede llegar después de emitir los tiquetes. |
| Reserva temporal | Bloqueo breve de una silla mientras se completa un pago en línea. |
| Carné digital | Identificación del cliente mediante QR; no sustituye el tiquete. |
| Datos proyectados | Simulación visual de GPS o sensores mientras el hardware no está conectado. |
