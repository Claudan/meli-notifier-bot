## Meli Notifier Bot - Automatización de Envíos (MVP)

Notificador de MercadoLibre basado en arquitectura **event-driven**, construido con **AWS CDK (Lambda, API Gateway, SQS, DynamoDB y Secrets Manager)**.
Procesa webhooks y envía actualizaciones en tiempo real a Telegram.
Desarrollado con **Node.js** y **TypeScript**.

El objetivo es reducir drásticamente el tiempo de preparación de envíos, especialmente en flujos con alto volumen diario.

## Motivación del MVP

En la operación diaria de un vendedor en MercadoLibre, imprimir y ajustar etiquetas consume tiempo repetitivo:

### Flujo original (2–3 minutos por pedido)

1. Abrir MercadoLibre (web o app).

2. Ir a notificaciones o ventas.

3. Abrir el pedido correspondiente.

4. Descargar la etiqueta PDF.

5. Recortar la etiqueta (esta etiqueta pdf utiliza cerca de un 30% de la página y deja mucho espacio en blanco que debemos recortar antes de enviar a la impresora térmica).

<img src="docs/images/meli-original-shipping-label.jpg" width="200" />

6. Imprimir en app de impresora térmica.

### Flujo optimizado con este proyecto (< 1 minuto)

1. Abrir la notificación del bot en Telegram.

2. Descargar la etiqueta ya recortada por el backend.

3. Imprimir directamente en la app de la impresora térmica.

Con este MVP, el tiempo se reduce a **menos de 1 minuto**, lo que genera un ahorro significativo en operaciones diarias (ej. **20 pedidos → +40 minutos/día de eficiencia**).

## Ejemplo de Notificación en Telegram

Nota: Los datos personales fueron anonimizados por razones de privacidad.

<img src="docs/images/telegram-order-notification.jpg" width="500" />

## Resultado de Impresión Térmica

Etiqueta lista para imprimir directamente en impresora térmica, sin recortes manuales.

<img src="docs/images/shipping-label-anonymized.jpg" width="200" /> <img src="docs/images/telegram-meli-bot-print-result.jpg" width="200" />

## Arquitectura

- **AWS API Gateway**: recibe webhook de MercadoLibre.
- **AWS Lambda (Producer)**: valida y envía eventos a SQS.
- **AWS SQS**: desacopla el procesamiento.
- **AWS Lambda (Worker)**:
  - Obtiene órdenes y envíos desde la API de MercadoLibre.
  - Envia notificaciones a Telegram.
  - Descarga y recorta etiquetas PDF usando pdf-lib.
- **DynamoDB**: deduplicación de eventos (idempotencia).
- **Secrets Manager**: almacena tokens de la API de MercadoLibre.

## Features Principales

- Recepción de webhooks MercadoLibre.
- Procesamiento idempotente de eventos.
- Obtención de detalles de órdenes y envíos.
- Detección inteligente del tipo de logística.
- Mensajes enriquecidos para Telegram: Cliente, dirección, productos, tipo de logística.
- Recorte automático de la etiqueta PDF para impresoras térmicas.
- Envío de la etiqueta lista para imprimir.

## Estructura del Proyecto

```bash
    infra/                  # CDK: (Lambda, SQS, DynamoDB, Secrets Manager)
    src/
        application/        # Lógica de dominio y casos de uso
            mercadolibre/   # Integraciones ML: token, mensajes, label crop
        functions/          # Lambdas (producer y worker)
        infrastructure/     # Adaptadores a DynamoDB, HTTP, Telegram, ML API
        tests/              # Pruebas unitarias
```

## Tecnologías

- **Node.js + TypeScript**
- **AWS Lambda**
- **AWS SQS**
- **AWS DynamoDB**
- **AWS CDK**
- **AWS Secrets Manager**
- **pdf-lib**
- **Telegram Bot API**
- **MercadoLibre API**

## Características técnicas

- Arquitectura event-driven con AWS Lambda + SQS + API Gateway.
- Persistencia idempotente con DynamoDB.
- Secrets Manager para manejo seguro de credenciales.
- ML API Client tipado y modular.
- CI/CD con GitHub Actions ejecutando tests en cada push.
- Suite de tests unitarios en TypeScript.
- Envío de notificaciones a Telegram de manera desacoplada.
- Crop automático de etiquetas PDF usando `pdf-lib`.

## Autor

Claudio Andrade - Software Engineer

claudioandradecor@gmail.com
