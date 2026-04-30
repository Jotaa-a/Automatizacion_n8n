# 📋 Sistema de Validación de Inasistencias con IA

Automatización construida en **n8n** para recibir, analizar con inteligencia artificial y gestionar justificaciones de inasistencia de estudiantes. Integra un formulario web, Google Gemini, Google Sheets, Telegram y Gmail en un único flujo.

---

## 🗂️ Archivos del Proyecto

| Archivo | Descripción |
|---|---|
| `index.html` | Formulario web para que el estudiante reporte su inasistencia |
| `style.css` | Estilos del formulario |
| `script.js` | Lógica de validación y envío del formulario |
| `Consulta_IA.json` | Flujo principal n8n — recepción, análisis IA y notificaciones |
| `Trigger_Telegram.json` | Flujo secundario n8n — consulta de radicados por Telegram |

---

## 🔄 Flujos de la Automatización

### Flujo 1: `Consulta_IA.json` — Procesamiento Principal

Este es el flujo central. Se activa cada vez que un estudiante envía el formulario.

```
Formulario Web
     │
     ▼
[Webhook] Recibir inasistencia
     │
     ▼
[AI Agent] Google Gemini — Analiza imagen del soporte
     │
     ▼
[Edit Fields] Extrae: Nivel, Confianza, Razón
     │
     ▼
[Switch] Clasifica por nivel de confianza
     │
     ├── > 80%  →  [Alta Confianza]  →  Google Sheets  →  Telegram ✅  →  Gmail "Recibido"
     │
     ├── 50–80% →  [Media Confianza] →  Google Sheets  +  Telegram ⚠️  →  Gmail "En revisión"
     │
     └── < 60%  →  [Baja Confianza]  →  Telegram 🚨   →  Gmail "En revisión"
```

**Nodos principales:**

- **Recibir inasistencia** — Webhook POST en `/Inasistencias`. Recibe el formulario como `multipart/form-data`, incluyendo la imagen del soporte (`imagencita`).
- **AI Agent** — Agente LangChain conectado a Google Gemini. Analiza la imagen del documento y los datos del estudiante. Devuelve un JSON con `nivel`, `confianza` (0–100) y `razon`.
- **Edit Fields** — Parsea la respuesta JSON del agente y extrae los tres campos como variables del flujo.
- **Switch** — Enruta según el porcentaje de confianza:
  - `> 80` → Alta Confianza
  - `> 50` → Confianza Media *(zona de solapamiento: si también es > 80, Alta Confianza tiene prioridad)*
  - `< 60` → Baja Confianza
- **Alta Confianza** → Se registra automáticamente en Google Sheets, se notifica al administrador por Telegram y al estudiante por Gmail con confirmación de éxito.
- **Media Confianza** → Se registra en Google Sheets, se alerta al administrador por Telegram (`Revisión Prev.`) y al estudiante se le informa por Gmail que su caso está en revisión.
- **Baja Confianza** → Se alerta al administrador por Telegram (`Requiere revisión`) y al estudiante se le notifica por Gmail que su caso está en revisión urgente. **No se guarda automáticamente en Sheets.**

---

### Flujo 2: `Trigger_Telegram.json` — Consulta por Telegram

Permite a un administrador consultar el estado de cualquier radicado directamente desde Telegram, usando comandos de chat.

```
Mensaje Telegram
     │
     ▼
[Switch1] Clasifica el mensaje
     │
     ├── "/info"        →  Pide contraseña al administrador
     │
     ├── "Admin2024"    →  Valida contraseña → Pide ID de radicado
     │
     └── Reply con ID  →  Busca en Google Sheets → Envía resultado o error
```

**Flujo paso a paso:**

1. El admin escribe `/info` en el bot de Telegram.
2. El bot responde solicitando la contraseña de administrador.
3. El admin escribe `Admin2024`.
4. Si es correcta, el bot solicita el ID del radicado (ej: `INS-123456`).
5. El flujo busca ese ID en Google Sheets.
6. Si lo encuentra, responde con los datos del estudiante y el análisis de la IA.
7. Si no lo encuentra, responde con un mensaje de error.

---

## 🛠️ Tecnologías y Servicios

| Servicio | Uso |
|---|---|
| **n8n** | Motor de automatización |
| **Google Gemini (PaLM API)** | Análisis de imagen del soporte con IA |
| **Google Sheets** | Base de datos de radicados |
| **Telegram Bot** | Notificaciones y consultas para el administrador |
| **Gmail** | Notificaciones al estudiante |
| **Webhook n8n** | Punto de entrada desde el formulario web |

---

## ⚙️ Requisitos Previos

Antes de importar los flujos en n8n, necesitas configurar las siguientes credenciales:

- [ ] **Google Gemini API** — Cuenta de Google Cloud con acceso a la API de Gemini (PaLM).
- [ ] **Google Sheets OAuth2** — Cuenta de Google con acceso a la hoja de cálculo.
- [ ] **Gmail OAuth2** — Cuenta de Gmail para enviar notificaciones a estudiantes.
- [ ] **Telegram Bot** — Token del bot creado con [@BotFather](https://t.me/BotFather).

---

## 🚀 Instrucciones de Instalación

### 1. Configurar Google Sheets

En el siguiente link encontraras la hoja de calculo con la informacón de las justificaciones.

```
https://docs.google.com/spreadsheets/d/1c7nxbYbOYs04PNVqoZB7Vwrt6VR0XYXIbiL5-NfYdTk/edit?usp=sharing
```

### 2. Importar los flujos en n8n

1. Abre tu instancia de n8n.
2. Ve a **Workflows → Import from file**.
3. Importa primero `Consulta_IA.json` y luego `Trigger_Telegram.json`.
4. En cada nodo, asigna las credenciales correspondientes.

### 3. Configurar el formulario web

En `script.js`, verifica que la URL del webhook apunte a tu instancia de n8n:

```javascript
const response = await fetch('https://TU-INSTANCIA.n8n.cloud/webhook/Inasistencias', {
  method: 'POST',
  body: formData
});
```

### 4. Activar los flujos

En n8n, activa ambos flujos usando el toggle de cada uno. El webhook de `Consulta_IA` quedará escuchando en la ruta `/Inasistencias`.

---

## 📊 Lógica de Clasificación de la IA

El agente de IA recibe la imagen del documento adjunto junto con los datos declarados por el estudiante (nombre, motivo, fechas) y retorna este JSON:

```json
{
  "nivel": "alta confianza",
  "confianza": 85,
  "razon": "El documento médico es legible y las fechas coinciden con el período declarado."
}
```

| Nivel de Confianza | Rango | Guardado en Sheets | Acción Automática |
|---|---|---|---|
| Alta Confianza | > 80% | ✅ Automático | Telegram admin + Gmail "Recibido con éxito" |
| Confianza Media | 50–80% | ✅ Automático | Telegram admin (`Revisión Prev.`) + Gmail "En revisión" |
| Baja Confianza | < 60% | ❌ No se guarda | Telegram admin (`Requiere revisión`) + Gmail "En revisión" |

> ⚠️ **Nota sobre solapamiento:** Los rangos de Alta (> 80) y Media (> 50) se solapan entre 50–80. El nodo Switch de n8n evalúa las condiciones en orden, por lo que una confianza de 85 entra por Alta y nunca llega a evaluar Media.

---

## 📁 Estructura de Campos en Google Sheets

| Columna | Origen |
|---|---|
| `ID_solicitud` | Generado automáticamente (`INS-` + timestamp) |
| `Nombre` | Campo `fullname` del formulario |
| `Correo` | Campo `email` del formulario |
| `Curso` | Campo `course` del formulario |
| `Telefono` | Campo `phone` del formulario |
| `ID_estudiante` | Campo `studentId` del formulario |
| `Tipo de justificacion` | Campo `reason` del formulario |
| `Nivel de confianza` | Resultado del análisis IA (ej: `Alta confianza: 92`) |
| `Resultados del analisis` | Razón textual devuelta por la IA |

---

## ⚠️ Notas Importantes

- La contraseña del bot de Telegram está en texto plano (`Admin2024`). Para producción, se recomienda reemplazarla por una variable de entorno o un sistema de autenticación más robusto.
- El modelo de IA puede tener variaciones en la precisión dependiendo de la calidad de la imagen enviada.
- El formulario acepta imágenes de máximo **10 MB** en formato JPG o PNG.
- El ID de radicado se genera con los últimos 6 dígitos del timestamp Unix, por lo que es único pero no secuencial.

---

## 👤 Autor

Desarrollado como proyecto de automatización educativa con n8n + IA.
