const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const DOMUS_HOME_URL       = "https://v2.domus.la";
const DOMUS_LOGIN_URL      = "https://v2.domus.la/auth-login";
const DOMUS_FILTER_URL     = "https://v2.domus.la/properties/filter";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractCookies(headers) {
  const raw = headers.get("set-cookie") ?? "";
  return raw.split(",").map(c => c.split(";")[0].trim()).join("; ");
}

async function doFreshV2Login() {
  const username = process.env.DOMUS_USERNAME;
  const password = process.env.DOMUS_PASSWORD;
  
  const homeRes = await fetch(DOMUS_HOME_URL, {
    headers: {
      "User-Agent":     UA,
      "Accept":         "text/html,application/xhtml+xml,*/*",
      "Accept-Language":"es-CO,es;q=0.9",
    },
    cache: "no-store",
  });
  const homeText    = await homeRes.text();
  const csrfToken   = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/)?.[1] ?? "";
  let sessionCookie = extractCookies(homeRes.headers);
  if (!sessionCookie && typeof homeRes.headers.getSetCookie === 'function') {
      sessionCookie = homeRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }

  const loginRes = await fetch(DOMUS_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type":    "application/json",
      "X-CSRF-TOKEN":    csrfToken,
      "Cookie":          sessionCookie,
      "User-Agent":      UA,
      "Accept":          "application/json",
      "Accept-Language": "es-CO,es;q=0.9",
      "Referer":         "https://v2.domus.la/",
    },
    body: JSON.stringify({ user: username, password }),
    cache: "no-store",
  });

  const loginData = await loginRes.json();
  let authCookies = extractCookies(loginRes.headers);
  if (!authCookies && typeof loginRes.headers.getSetCookie === 'function') {
      authCookies = loginRes.headers.getSetCookie().map(c => c.split(';')[0]).join('; ');
  }
  const cookies = [sessionCookie, authCookies].filter(Boolean).join("; ");
  return cookies;
}

async function run() {
  const cookies = await doFreshV2Login();
  console.log("Login successful");
  
  const res = await fetch(DOMUS_FILTER_URL + '?page=1', {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ data: { buscar: '1073026' } })
  });
  
  const json = await res.json();
  console.log('Found with 1073026:', json.data?.length);
  if(json.data && json.data.length > 0) {
    const p = json.data[0];
    console.log('Estado:', p.estado_inmueble?.estado_inmueble);
    console.log('Captador ID:', p.captador?.id, 'Name:', p.captador?.name);
    console.log('Promotor ID:', p.promotor?.id, 'Name:', p.promotor?.name);
    console.log('Promotores array?', Array.isArray(p.promotores) ? p.promotores.map(pr => pr.id) : 'No');
  }
  
  const res2 = await fetch(DOMUS_FILTER_URL + '?page=1', {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'User-Agent': UA,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ data: { buscar: '', promotor: 29214 } })
  });
  const json2 = await res2.json();
  let raw = json2.data || [];
  const totalPages = json2.last_page ?? 1;
  
  // 1. Fetch from L2L to see which 18 IDs she should have
  const resL2L = await fetch('https://www.l2lbienesraices.com/busqueda/pagina/1/agente/29214', { headers: { 'User-Agent': UA } });
  const htmlL2L1 = await resL2L.text();
  const resL2L2 = await fetch('https://www.l2lbienesraices.com/busqueda/pagina/2/agente/29214', { headers: { 'User-Agent': UA } });
  const htmlL2L2 = await resL2L2.text();
  
  const l2lMatches = [...htmlL2L1.matchAll(/\/propiedad\/(\d+)/g), ...htmlL2L2.matchAll(/\/propiedad\/(\d+)/g)];
  const l2lIds = [...new Set(l2lMatches.map(m => m[1]))];
  console.log('L2L exact IDs (' + l2lIds.length + '):', l2lIds);

  // 2. Fetch from Domus API
  const res2 = await fetch(DOMUS_FILTER_URL + '?page=1', {
    method: 'POST',
    headers: { Cookie: cookies, 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ data: { buscar: '', promotor: 29214 } })
  });
  const json2 = await res2.json();
  let raw = json2.data || [];
  const totalPages = json2.last_page ?? 1;
  
  if(totalPages > 1) {
      for(let i=2; i<=totalPages; i++) {
          const resP = await fetch(DOMUS_FILTER_URL + '?page=' + i, {
            method: 'POST',
            headers: { Cookie: cookies, 'User-Agent': UA, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ data: { buscar: '', promotor: 29214 } })
          });
          raw = raw.concat((await resP.json()).data || []);
      }
  }

  const domusIds = raw.filter(p => {
    const estado = p.estado_inmueble?.estado_inmueble ?? "";
    return estado === "Disponible" || estado === "En proceso";
  }).map(p => p.id?.toString());
  
  console.log('Domus Active IDs (' + domusIds.length + '):', domusIds);
  
  const missingInDomus = l2lIds.filter(id => !domusIds.includes(id));
  const extraInDomus = domusIds.filter(id => !l2lIds.includes(id));
  console.log('Missing in Domus (in L2L but not in Domus):', missingInDomus);
  console.log('Extra in Domus (in Domus but not in L2L):', extraInDomus);
}

run().catch(console.error);
