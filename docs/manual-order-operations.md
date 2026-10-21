# Operación manual de solicitudes por WhatsApp

## Alcance y estado

**S20a: procedimiento y recorrido simulado. S20b: entrada real en el backend
pendiente.** El catálogo mock y los mensajes DEMOSTRACIÓN son ejercicios, no
productos disponibles ni solicitudes comerciales reales.

La tienda prepara una solicitud; una persona confirma y registra el pedido en el
backend elegido. Astro no crea pedidos ni borradores automáticamente. El número
principal es **+57 310 8570230**; el alternativo de contacto +57 312 2777427 no
sustituye la ruta principal de solicitudes.

Los medios de pago, cobertura, tarifas, plazos y políticas definitivos siguen
pendientes de datos del negocio en S28. Este procedimiento no establece nuevas
condiciones comerciales para clientes.

## Responsables y registro

- **Atención:** recibe la conversación, identifica duplicados, confirma variantes,
  cotiza envío y solicita aceptación del valor final.
- **Operación:** comprueba inventario y registra el pedido aceptado en el backend.
- **Pago/despacho:** verifica el pago por el canal acordado y actualiza el estado
  y la entrega. Una persona puede asumir varios roles, registrando cada acción.

Usar la [ficha de solicitud](manual-order-template.md) en el registro privado del
equipo/backend. No guardar datos reales de clientes en el repositorio. El UUID
del mensaje identifica una solicitud, **no** un pedido ni un comprobante de pago.
El backend proporciona el ID de pedido.

## 1. Recibir y reconciliar

1. Recibir el mensaje efectivamente enviado. Un clic en Abrir WhatsApp no acredita
   que la persona haya enviado el texto.
2. Registrar referencia, responsable y fecha/hora. Buscar una solicitud/pedido
   existente antes de crear otro; pedir líneas faltantes si el texto está incompleto.
3. Buscar cada **SKU de variante** y comprobar presentación/cantidad. No sustituir
   presentaciones ni usar productos genéricos sin confirmación del cliente.
4. Consultar stock y precios actuales en el backend. El mensaje puede estar editado
   o desactualizado y no reserva inventario. Resolver agotados, faltantes, cantidades
   excesivas y cambios de precio antes de aceptar el pedido.
5. Confirmar contacto/destino y costo de envío. Revisar impuestos/descuentos según
   la configuración aprobada. No asumir envío gratis, contraentrega ni tasas.
6. Enviar cotización en COP: variantes, cantidades, unitarios, líneas, subtotal,
   descuentos/impuestos aplicables, envío, **valor final** y forma de pago acordada.
   Registrar aceptación y comprobar stock otra vez antes de guardar/asignar unidades.

Texto sugerido:

> Recibimos tu solicitud [referencia]. Vamos a confirmar disponibilidad, envío y
> valor final. La solicitud aún no confirma un pedido ni un pago.

Si falla la validación del sitio, el contacto general resuelve dudas y el equipo
consulta directamente el backend. El fallo no convierte precios guardados ni un
texto enviado manualmente en valores vigentes.

## 2. Inventario y aceptación

| Momento | Efecto esperado |
| --- | --- |
| Explorar, agregar al carrito o validar | Sin reserva ni reducción |
| Preparar/copiar/abrir/enviar WhatsApp | Sin reserva ni reducción automática |
| Cotización pendiente | Sin promesa de reserva |
| Cliente acepta; equipo registra/asigna stock | Registrar el movimiento real en backend |
| Pago verificado | Registrar pago/estado sin una segunda reducción |
| Cancelación o vencimiento de reserva | Comprobar liberación real antes de otro ajuste |

No prometer una reserva hasta verificarla en el backend. Cualquier vencimiento
debe acordarse y registrarse explícitamente: el minuto de vigencia de la
validación web **no es** una reserva. El backend es el único registro de stock.
No restar unidades manualmente si un estado/reserva ya las descontó; comprobar
también la restitución antes de ajustar de nuevo tras cancelar o devolver.

## 3. Entrada en WooCommerce

Guía basada en documentación oficial; nombres varían por idioma/versión. Nuestra
instalación aún requiere S20b.

1. **WooCommerce → Pedidos → Añadir pedido**: completar cliente/invitado y
   contacto/dirección confirmados.
2. **Añadir artículos → Añadir productos**: elegir variaciones reales por SKU,
   no solo el padre. Revisar cantidades, unitarios y líneas en COP. El admin puede
   permitir elegir agotados: respetar el stock comprobado.
3. Añadir el envío acordado; recalcular con los impuestos configurados y comparar
   con la cotización aceptada. Resolver diferencias antes de confirmar pago.
4. Añadir nota **privada** con origen WhatsApp, referencia completa, responsable,
   aceptación, estado de pago y reserva acordada. Guardar y registrar el ID real.
5. Elegir un estado que refleje la situación:
   - **Pendiente de pago:** pago pendiente. Guardar un pedido manual no acredita
     por sí solo reserva; no extrapolar la retención del checkout a este flujo.
   - **En espera / On hold:** según WooCommerce, espera confirmación de pago y
     reduce stock. Usarlo cuando corresponda a la asignación acordada; comprobar
     notas/cantidades de nuestra instalación.
   - **Procesando / Processing:** pago recibido y stock reducido en el flujo
     normal. Cambiar aquí solo tras verificar pago y ausencia de doble descuento.
   - **Completado:** después de cumplir el pedido, no al recibir WhatsApp.
6. Reabrir y conciliar líneas, envío, impuestos, total, estado y stock antes/después.
   Comunicar el ID real del pedido al cliente.

Este MVP acuerda el pago con el equipo. El procedimiento no habilita pasarelas ni
envía enlaces del checkout nativo. Cambios de estado/notas públicas pueden generar
correos; usar canales de prueba al verificar la instalación local.

## 4. Entrada en Shopify

Guía documental **sin verificación en tienda real**; S27 requiere acceso, mercado
y permisos. El frontend no crea borradores por API.

1. **Orders → Drafts → Create order**: añadir variantes existentes por SKU y
   cantidades. No usar artículos personalizados que pierdan el vínculo de stock.
2. Añadir cliente/destino; verificar Colombia/COP, precios, impuestos y envío.
   Guardar origen `whatsapp`, referencia completa en nota y aceptación del total.
   Registrar ID del borrador.
3. Si se acordó reserva y el producto controla inventario, usar explícitamente
   **Reserve inventory**, registrar ubicación/vencimiento y comprobar
   Available/Committed. Un borrador sin esa acción no acredita reserva. El admin
   puede permitir añadir cantidades sin stock: verificarlas.
4. Mantener el pago pendiente hasta comprobarlo por el canal acordado. Registrar
   pago/completar el flujo administrativo cuando refleje lo ocurrido; guardar el
   ID de pedido resultante y la relación borrador/referencia. Borrador no es venta pagada.
5. Verificar total, inventario, pago y fulfillment. No marcar entregado antes de
   la operación correspondiente. No enviar facturas con checkout ni cobrar
   tarjeta por aplicar esta guía; pagos manuales y reservas se prueban en S20b/S27.

## 5. Duplicados y recuperación

| Caso | Acción |
| --- | --- |
| Mismo UUID dos veces | Abrir registro existente, sin segundo pedido |
| UUID nuevo, mismo cliente/líneas | Preguntar si reemplaza o agrega otro pedido; relacionar referencias |
| Carrito reenviado tras aceptación | Confirmar intención: el sitio conserva el carrito deliberadamente |
| Guardado incierto en admin | Buscar referencia/cliente antes de repetir Guardar/Añadir pedido |
| Agotado o precio distinto | Cotizar de nuevo y registrar aceptación |
| Pago anunciado sin verificar | Mantener pendiente; un mensaje/captura no acredita recepción de fondos |
| Cambio tras aceptación | Resolver con el cliente y registrar la nueva versión aceptada |
| Cancelación/reserva vencida | Actualizar estado y comprobar liberación real de stock |

## 6. Medición

La implementación actual no envía analítica externa. Si se añade:

- Agregar, validar, copiar o solicitar abrir WhatsApp son interacciones.
- `cart:add-request` es intención del formulario, no prueba de persistencia o
  validación. `cart:validated` es verificación, no venta.
- Un mensaje recibido es una solicitud. Un pedido aceptado necesita aceptación y
  registro administrativo, deduplicado por ID del backend.
- Ingreso/pago requiere la verificación registrada; fulfillment/entrega es otro
  estado. No inferir ventas desde clics en WhatsApp.
- Relacionar referencia → borrador/pedido → pago/despacho. Varias referencias o
  aperturas pueden corresponder a un único pedido.

## Recorrido S20a — 2026-10-21

**Simulado: sin mensaje enviado, pedido creado ni pago.** Se ejecutó el handler
real de validación con el adaptador mock mediante Node y se completó manualmente
esta ficha de entrada propuesta:

1. Entrada: `mock-001-30` × 2 a COP 65.000 y `mock-001-50` × 1 con precio guardado
   COP 100.000. El servidor detectó COP 110.000 para 50 ml: `changed=true`, sin handoff.
2. Se aceptó el precio actual en el ejercicio y se volvió a validar: `valid=true`,
   `changed=false`, subtotal COP 240.000. Referencia generada:
   `cc13fea5-2ca6-44ab-8f30-b1fd7bed09c1`; mensaje marcado DEMOSTRACIÓN.
3. Transcripción a la ficha:

   | SKU | Presentación | Cantidad | Unitario COP | Total COP | Stock mock antes | Stock después **simulado** |
   | --- | --- | ---: | ---: | ---: | ---: | ---: |
   | KH-DEMO-001-030 | 30 ml | 2 | 65.000 | 130.000 | 5 | 3 |
   | KH-DEMO-001-050 | 50 ml | 1 | 110.000 | 110.000 | 6 | 5 |

4. Solo para aritmética: **envío ficticio COP 15.000**, sin descuento ni impuesto
   adicional en el ejercicio: 240.000 + 15.000 = 255.000. No es una tarifa aprobada
   ni una definición tributaria/comercial.
5. Aceptación: representada en la ficha del ejercicio. Pago verificado: **no**.
   ID de pedido/borrador en backend: **ninguno**. Inventario realmente modificado:
   **ninguno**; las cantidades de la tabla son cálculo.
6. Reenvío: decisión de reutilizar la ficha de la referencia existente, sin segunda
   ficha ni segundo descuento simulado. Un UUID nuevo exige confirmar intención.

El comando ejecutado comprobó con aserciones cambio de precio, ausencia de handoff
inicial, subtotal vigente, aviso de demostración y total simulado. La revisión de
duplicados es un ejercicio documental, no un sistema automático de deduplicación.

## Evidencia pendiente S20b

Tras S21–S22, repetir en el admin de prueba con el catálogo sembrado: registrar
versiones, fecha, operador, referencia, ID real del pedido de prueba, líneas,
total, aceptación simulada y estado pendiente de pago. Anotar stock antes/después
de guardar, asignar y cancelar/liberar. Reabrir y probar reenvío sin duplicados ni
doble reducción. Usar notificaciones de prueba y evidencia sin datos personales.

Con esas observaciones se podrá completar S20b y S20. Shopify necesita además
ejecución con acceso S27. No hay evidencia administrativa real en este checkpoint.

## Fuentes oficiales consultadas (2026-10-21)

- [WooCommerce: entrada manual](https://woocommerce.com/document/managing-orders/view-edit-or-add-an-order/)
- [WooCommerce: estados e inventario](https://woocommerce.com/document/managing-orders/order-statuses/)
- [Shopify: borradores](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders)
- [Shopify: creación, reserva y mercado](https://help.shopify.com/en/manual/fulfillment/managing-orders/create-orders/create-draft)

Las fuentes describen plataformas; no prueban la configuración de nuestras tiendas.
