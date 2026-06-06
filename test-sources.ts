import { fetchCrmClients } from "./src/services/crmService";

async function run() {
  const clients = await fetchCrmClients(1, { noCache: true }); // Fetch fresh
  console.log("Fetched", clients.length, "clients");
}

run();
