import { fetchDomusProperties } from "./src/services/domusService";

async function run() {
  const data = await fetchDomusProperties();
  if (data.inmuebles.length > 0) {
    console.log("Primer Inmueble Mapeado:");
    console.log(JSON.stringify(data.inmuebles[0], null, 2));
    console.log("Tiene", data.inmuebles[0].imagenes?.length, "imagenes mapeadas");
  } else {
    console.log("No se encontraron inmuebles");
  }
}

run();
