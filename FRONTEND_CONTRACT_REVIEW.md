# Revisión de contratos frontend

Fecha: 6 de noviembre de 2026. Alcance: Angular frente al `enpoints.md` actualizado. No se modificó Django ni se realizaron operaciones reales de venta, pago, correo, facturación o abordaje.

| Área | Resultado de la revisión |
| --- | --- |
| Sillas por bus | Se utiliza `GET /api/fleet/seats/?bus=ID`, que activa la completitud documentada en backend y recupera todos los asientos del bus. Se preservan sus IDs y posiciones. |
| Venta administrativa | El plano consulta `GET /api/trips/trips/ID/seats/`, reconoce disponibles/reservadas/vendidas y conserva 30/42 posiciones. El límite de 10 corresponde a cada venta. Consulta previa no sustituye la validación transaccional del POST. |
| Compra cliente | Misma disponibilidad completa; valida el viaje recibido y datos de filas/columnas antes de dibujar. No inventa asientos a partir de la capacidad. |
| Venta múltiple | Un POST con `seats`, sin precios y con `Idempotency-Key`. Resultados ambiguos conservan el intento para su recuperación. |
| Sesiones | Logout explícito llama `/api/accounts/logout/` con el refresh y acceso de esa sesión. Limpieza local inmediata y almacenes cliente/admin separados. Si falla la revocación remota se informa en consola y no se restaura la sesión local. |
| Cambio obligatorio | `password_change_required` con 401 o 403 dirige al cambio, sin renovar por error ni eliminar la sesión necesaria para cambiar contraseña. |
| Wompi | Firma nueva y vencimiento viajan juntos, sin reformatear la cadena. Reserva de 10 minutos con reloj del servidor. `refund_required` no muestra boletas/factura ni permite repetir ese pago. |
| QR y abordaje | Consulta pública separada de confirmación protegida, con ID de viaje, clave idempotente, auditoría y rechazo de resultados incompletos. |
| Entrega administrativa | Identidad de cada pasajero obtenida del detalle autenticado, verificación pública sin JWT, PDF de todas las boletas con estado real, impresión y reenvío confirmado por la API. |
| Factus | Estado y mensaje exactos de la venta/factura; reintento protegido y sin otra venta. Los enlaces se muestran solo cuando están disponibles y son HTTPS. |
| Orden de listas | Más recientes primero, inversión de orden y orden antes de paginar. |
| GPS y sensores | API y demostración separadas; consultas cancelables, coordenadas validadas, muestras explícitas y sin escrituras de telemetría. |

## Verificación local

Compilación de producción y 16 grupos de comprobaciones: completitud de sillas, logout, navegación, venta múltiple, renovación, cambio obligatorio, verificación pública, lector/abordaje, vencimiento Wompi, pago con atención requerida, dashboard, preparación PDF, acciones de entrega, GPS API, demostración y orden/paginación.

Se usaron respuestas controladas, no credenciales o dinero reales. Esta revisión confirma la compatibilidad de código con el documento; no certifica el despliegue ni la base de datos remota.

## Comprobaciones pendientes en el entorno desplegado

- Bus de capacidad 30: verificar que ambos endpoints de sillas devuelvan los 30 registros con IDs únicos y que el plano permita seleccionar hasta 10 por compra.
- Confirmar que el backend actualizado y sus migraciones estén aplicados.
- Ejecutar Wompi Sandbox: pago aprobado, vencimiento tras 10 minutos y pago tardío con atención requerida.
- Probar SMTP, emisión/reintento Factus y abordaje simultáneo con dos operadores en un entorno de prueba.
- Revisar visualmente móvil, cámara, lector USB e impresora. La sesión de trabajo no dispone de navegador conectado.

Para telemetría de alto volumen siguen siendo necesarios filtros de viaje/tiempo documentados en backend; el frontend recupera las páginas permitidas por el contrato actual y filtra las lecturas por viaje.
