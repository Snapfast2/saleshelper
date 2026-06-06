import { fetchCrmClients } from "./src/services/crmService";

async function run() {
  try {
    const clients = await fetchCrmClients(1, { noCache: true });
    console.log("----------------------------------");
    clients.forEach(c => {
      console.log(`${c.nombre} -> ${c.origen}`);
    });
    console.log("----------------------------------");
  } catch (err) {
    console.error(err);
  }
}

run();
