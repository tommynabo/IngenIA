# IngenIA V25 - Extensión de LinkedIn

## ¿Qué es nuevo?

**V25 - REBUILD COMPLETO**
- ✅ Lógica completamente reconstruida para adaptarse a cambios en LinkedIn
- ✅ Detección robusta de botones de acción (like, comment, share)
- ✅ Inyección de botones en la barra de acciones correcta
- ✅ Respuestas a comentarios funcionando al lado del pencil icon
- ✅ Sistema de polling inteligente que detecta posts nuevos automáticamente
- ✅ Mejor manejo de errores y desconexiones
- ✅ Interfaz modal mejorada para resultados
- ✅ Soporte para insertar directo o copiar al portapapeles

## Pasos de Instalación

### 1. Descargar la extensión
La extensión está en: `/Users/tomas/Downloads/DOCUMENTOS/ProgramaMary/linkedin-extension/`

### 2. Instalar en Chrome

#### Opción A: Desde la carpeta (Recomendado para desarrollo)
1. Abre Chrome y ve a `chrome://extensions/`
2. Activa **"Modo de desarrollador"** (arriba a la derecha)
3. Haz clic en **"Cargar extensión sin empaquetar"**
4. Selecciona la carpeta `/Users/tomas/Downloads/DOCUMENTOS/ProgramaMary/linkedin-extension/`

#### Opción B: Desde el ZIP
1. Extrae `linkedin-extension-v25.zip`
2. Sigue los pasos de la Opción A con la carpeta extraída

### 3. Configurar la licencia

1. Haz clic en el ícono de IngenIA en Chrome (esquina superior derecha)
2. Pega tu **Clave de Licencia** en el campo
3. Haz clic en **"Guardar"**
4. (Opcional) Haz clic en **"Probar Conexión"** para verificar que funciona

## Cómo Usar

### Botones en Posts
Cuando scrolleas por el feed de LinkedIn, verás dos botones nuevos junto a los de like/comentar:
- **💬 Comentar**: Genera un comentario profesional para el post
- **📝 Resumir**: Crea un resumen de los puntos clave

### Responder a Comentarios
En cada comentario, verás un botón **💭** que permite generar una respuesta automática.

### Usando los Resultados
Cuando generas un resultado, se abre una ventana modal con:
- **📋 Copiar**: Copia el texto al portapapeles
- **✅ Insertar**: Coloca el texto directamente en el editor (si está abierto)
- **✕ Cerrar**: Cierra la ventana

## Solución de Problemas

### Los botones no aparecen
1. Recarga la página (Cmd+R)
2. Espera 2-3 segundos para que se detecten los posts
3. Si sigue sin funcionar, verifica que:
   - La licencia esté configurada
   - La extensión esté activada en Chrome
   - No tengas navegación privada

### Error de licencia
- Asegúrate de copiar la clave completa
- Verifica que no haya espacios extras
- Prueba la conexión desde el popup de la extensión

### No funciona la inserción automática
- LinkedIn a veces requiere hacer clic en el campo de comentarios primero
- La alternativa es copiar (📋) e insertar manualmente
- Esto es normal con los controles de seguridad de LinkedIn

## Cambios Técnicos V25

### Selectors Mejorados
```javascript
// Posts
'article, .feed-shared-update-v2, [data-feed-item-id]'

// Comentarios
'article article, .comments-comment-item, [data-urn*="comment"]'

// Action bars
'[role="toolbar"], [class*="action"]'
```

### Polling vs Mutation Observer
- Ahora usa polling (cada 1 segundo) en lugar de Mutation Observer
- Más confiable en interfaces altamente dinámicas como LinkedIn
- Menos consumo de CPU gracias a `processedPosts` WeakSet

### Extracción de Contenido
- Múltiples estrategias de selector fallback
- Clonación segura del DOM para evitar modificaciones
- Límite de 2000 caracteres para evitar prompts muy largos

## Archivos de la Extensión

```
linkedin-extension/
├── manifest.json       # Configuración de la extensión
├── content.js         # Lógica principal (inyección de botones)
├── background.js      # Service worker (llamadas a API)
├── popup.html        # Interfaz de configuración
├── popup.js          # Lógica del popup
├── styles.css        # Estilos CSS
└── icons/            # Iconos de la extensión
```

## Support

Si hay problemas:
1. Abre Chrome DevTools (Cmd+Option+I)
2. Ve a la pestaña "Console"
3. Busca mensajes de error que empiecen con `[IngenIA]`
4. Reporta los errores al desarrollador

---

**Versión**: 2.5.0  
**Fecha**: 3 Febrero 2026  
**Estado**: ✅ Funcional y listo para producción
