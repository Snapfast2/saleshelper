import { getAuthCookies } from './src/services/auth';

async function run() {
  const { cookies, ua } = await getAuthCookies();
  const res = await fetch('https://v2.domus.la/api/v1/properties/filter?page=1', {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'User-Agent': ua,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ data: { buscar: '1073026' } })
  });
  const json = await res.json();
  console.log('Found:', json.data?.length);
  if(json.data && json.data.length > 0) {
    const p = json.data[0];
    console.log('Estado:', p.estado_inmueble?.estado_inmueble);
    console.log('Promotor:', JSON.stringify(p.promotor, null, 2));
    console.log('Captador:', JSON.stringify(p.captador, null, 2));
  }
}
run().catch(console.error);
