// src/lib/vcard.ts

/**
 * Genera y descarga un archivo .vcf para guardar el contacto en el celular.
 */
export function descargarVCard(nombre: string, telefono: string, inmuebleTitulo?: string) {
  // Limpiamos el nombre original
  const nombreLimpio = nombre.trim() || "Cliente Desconocido";
  
  // Limpiamos el título del inmueble para que no sea muy largo en el contacto
  // Ej: "Casa en Arriendo en Villa Magdala" -> "Casa en Arriendo en..."
  const prop = inmuebleTitulo ? inmuebleTitulo.substring(0, 30) : "";
  
  // Nombre estructurado: "Camilo - Casa en Arriendo..."
  const nombreContacto = prop 
    ? `${nombreLimpio} - ${prop}` 
    : nombreLimpio;
    
  // Formatear teléfono garantizando el "+" inicial
  const telLimpio = telefono.replace(/[^\d+]/g, '');
  const telFinal = telLimpio.startsWith('+') ? telLimpio : `+${telLimpio}`;

  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${nombreContacto}
N:;${nombreContacto};;;
TEL;TYPE=CELL:${telFinal}
END:VCARD`;

  // Crear archivo Blob y forzar descarga
  const blob = new Blob([vcard], { type: "text/vcard" });
  const filename = `${nombreContacto}.vcf`;
  const file = new File([blob], filename, { type: "text/vcard" });

  const descargarFallback = () => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert("Se descargó el contacto. Por favor abre el archivo desde tus notificaciones para guardarlo en tu agenda.");
  };

  // Intentar usar el menú de compartir nativo del celular (que permite "Añadir a Contactos" directo)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: "Guardar contacto"
    }).catch((err) => {
      console.log("El usuario canceló o falló share, usando fallback", err);
      descargarFallback();
    });
  } else {
    // Si el navegador no soporta share, hacemos la descarga normal
    descargarFallback();
  }
}
