# Recorrido real 4.2

Se inició la demo con VITE_API=real, VITE_DEMO=true y DEMO_MODE=true, con Postgres de prueba y Redis. Se usaron exclusivamente datos semilla.

1. En /callcenter se inició una llamada y se cotizó Química sanguínea en Clínica Tepic. El botón de continuación abrió el hilo en WhatsApp.
2. En /wa el resumen mostró «Retomamos tu trámite: Química sanguínea en Clínica Tepic. Lo iniciaste por teléfono.». La lista preguntó «¿Qué horario prefieres?» y empezó con «mié 25 nov · 09:00» y «mié 25 nov · 09:30». Se eligió la primera fila. Los textos de preparación e identificación se mostraron en español. La fecha capturada quedó enmascarada en el chat.
3. WhatsApp mostró «Cita confirmada para miércoles 25 de noviembre, 09:00. Tu QR está en la App.». En /app se mostró CONFIRMADA y «25 de noviembre de 2026 a las 09:00 America/Mazatlan».
4. Al volver a Call Center se recargó la página para abrir una nueva sesión de la consola. Con el mismo número se pulsó «Llamada entrante» y se cotizó nuevamente. La ficha mostró COTIZADO y la nueva CotizacionGenerada. El trámite anterior conservó CONFIRMADA. No se ejecutó demo:reset.
