# ✅ CHECKLIST DE INSTALACIÓN Y TESTING

## ANTES DE INSTALAR

- [ ] Tienes Chrome abierto
- [ ] Tienes tu Clave de Licencia a mano
- [ ] LinkedIn está abierto en otra pestaña (opcional pero recomendado)
- [ ] DevTools no están abiertos (opcional)

---

## INSTALACIÓN (5 minutos)

### Paso 1: Navega a extensiones
- [ ] Abre Chrome
- [ ] Ve a `chrome://extensions/` (puedes copiar/pegar en la barra)
- [ ] Deberías ver una página con tus extensiones actuales

### Paso 2: Activa Modo de Desarrollador
- [ ] Busca el toggle "Modo de desarrollador" (esquina superior derecha)
- [ ] Haz clic para activarlo (debería cambiar a azul)
- [ ] Deberías ver nuevos botones: "Cargar extensión sin empaquetar"

### Paso 3: Carga la extensión
- [ ] Haz clic en "Cargar extensión sin empaquetar"
- [ ] Una ventana de carpetas se abre
- [ ] Navega a: `/Users/tomas/Downloads/DOCUMENTOS/ProgramaMary/linkedin-extension/`
- [ ] Haz clic en "Seleccionar"
- [ ] La extensión debería aparecer en la lista

### Paso 4: Verifica instalación
- [ ] La extensión aparece en `chrome://extensions/`
- [ ] El estado es "Activado" (no hay error rojo)
- [ ] Ves un ícono de IngenIA en la esquina superior derecha de Chrome

---

## CONFIGURACIÓN (1 minuto)

### Paso 1: Abre popup
- [ ] Haz clic en el ícono de IngenIA (esquina superior derecha)
- [ ] Se abre una ventana pequeña

### Paso 2: Configura licencia
- [ ] Copias tu Clave de Licencia (desde donde la tengas)
- [ ] Haz clic en el campo de texto
- [ ] Pegas la clave
- [ ] Haz clic en "Guardar"
- [ ] Debería mostrar "✅ Clave Guardada"

### Paso 3: Prueba conexión (opcional)
- [ ] Haz clic en "Probar Conexión"
- [ ] Espera 2-3 segundos
- [ ] Debería mostrar "✅ ¡Conexión Exitosa!"
- [ ] Si muestra error, verifica que tu clave es correcta

---

## TESTING EN LINKEDIN (10 minutos)

### Preparación
- [ ] Abre LinkedIn en una pestaña nueva
- [ ] Scrollea el feed para ver posts
- [ ] Abre DevTools (Cmd+Option+I) en otra ventana

### Test 1: Verificar instalación
- [ ] En DevTools, ve a la pestaña "Console"
- [ ] Deberías ver `🚀 IngenIA V25 REBUILT - STARTING`
- [ ] Deberías ver `✅ IngenIA V25 Activo` (mensaje azul)

### Test 2: Botones en posts
- [ ] Scrollea el feed normalmente
- [ ] Busca un post con texto
- [ ] A la derecha del botón de "Like"/"Comment", debería haber dos botones nuevos:
  - 💬 (Comentar)
  - 📝 (Resumir)
- [ ] Si NO ves los botones:
  - [ ] Recarga (Cmd+R)
  - [ ] Espera 3 segundos
  - [ ] Scrollea lentamente
  - [ ] Revisa Console para errores

### Test 3: Click en "Comentar"
- [ ] Encuentra un post que te guste
- [ ] Haz clic en el botón 💬
- [ ] El botón debería mostrar "⏳" (loading)
- [ ] Después de 1-2 segundos, debería aparecer una modal con:
  - [ ] Título: "💬 Comentario"
  - [ ] Texto generado
  - [ ] Botones: "📋 Copiar", "✅ Insertar", "✕ Cerrar"
- [ ] Si hay error, revisa Console

### Test 4: Click en "Copiar"
- [ ] En la modal, haz clic en "📋 Copiar"
- [ ] Debería mostrar toast "✅ Copiado"
- [ ] La modal se cierra
- [ ] Abre un editor de texto (Notes)
- [ ] Pega (Cmd+V)
- [ ] El comentario generado debería estar ahí

### Test 5: Click en "Insertar"
- [ ] Scrollea hasta encontrar otro post
- [ ] Haz clic en 💬
- [ ] Cuando aparezca la modal, haz clic en "✅ Insertar"
- [ ] Debería mostrar "✅ Insertado"
- [ ] Si LinkedIn tiene un editor abierto, el texto aparecerá ahí

### Test 6: "Resumir"
- [ ] Scrollea hasta otro post
- [ ] Haz clic en el botón 📝
- [ ] Espera 1-2 segundos
- [ ] Debería aparecer modal con título "📝 Resumen"
- [ ] El contenido debería ser un resumen (puntos clave)
- [ ] Prueba "Copiar" o "Insertar"

### Test 7: Responder a comentarios
- [ ] Abre cualquier post que tenga comentarios
- [ ] En cada comentario, busca el botón 💭 (es nuevo, de IngenIA)
- [ ] Haz clic en él
- [ ] Debería aparecer modal con "💭 Respuesta"
- [ ] El contenido debería ser una respuesta al comentario
- [ ] Prueba "Copiar" o "Insertar"

---

## VALIDACIÓN FINAL

### Tests completados ✅
- [ ] Extensión instalada en Chrome
- [ ] Licencia configurada y funcionando
- [ ] Botones 💬 y 📝 aparecen en posts
- [ ] Botón 💭 aparece en comentarios
- [ ] "Comentar" genera resultados
- [ ] "Resumir" genera resultados
- [ ] "Responder" genera resultados
- [ ] "Copiar" copia al portapapeles
- [ ] "Insertar" inserta en el editor
- [ ] No hay errores en Console

### Si TODO pasó ✅
**¡La extensión está funcionando perfectamente!**

Disfruta generando contenido con IA en LinkedIn 🚀

---

## TROUBLESHOOTING

### Problema: Botones no aparecen

**Solución 1:**
1. Recarga la página (Cmd+R)
2. Espera 3-5 segundos
3. Scrollea lentamente

**Solución 2:**
1. Abre DevTools (Cmd+Option+I)
2. Console tab
3. Busca mensajes `[IngenIA]`
4. ¿Dice algo como "✗ Action bar not found"?
5. Si sí, es un problema de estructura de LinkedIn
6. Reporta el error

**Solución 3:**
1. Desactiva y reactiva extensión en chrome://extensions
2. Recarga LinkedIn

### Problema: "Falta configuración"

**Solución:**
1. Abre popup de IngenIA (click en ícono)
2. Asegúrate de que pegaste la CLAVE COMPLETA
3. Verifica que no hay espacios extras al inicio/final
4. Haz clic en "Guardar"
5. Haz clic en "Probar Conexión"

### Problema: Error de conexión

**Solución:**
1. Verifica tu Clave de Licencia (está correcta)
2. Verifica que tienes internet
3. Intenta "Probar Conexión" de nuevo
4. Si sigue fallando, el API podría estar caído
5. Reporta el error

### Problema: No se inserta el texto

**Workaround:**
1. Haz clic en "Copiar" en lugar de "Insertar"
2. Abre LinkedIn
3. Haz clic en el campo de comentario/respuesta
4. Pega manualmente (Cmd+V)

---

## NEXT STEPS

Si todo funciona:
1. ✅ **DISFRUTA** - Los botones están ahí para cuando los necesites
2. 📚 **APRENDER** - Lee las instrucciones en INSTALACION.md
3. 🔄 **ITERAR** - Reporta cualquier mejora que necesites

---

**¿Necesitas ayuda?**

Abre DevTools y reporta:
- Qué hiciste
- Qué esperabas
- Qué pasó
- Qué dice Console (errores específicos)

---

*Versión: 2.5.1*  
*Fecha: 3 Febrero 2026*  
*Estado: Ready for Testing*
