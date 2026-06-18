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
  
  // Also query by promotor: 29214 to see what comes back
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
  console.log('Total properties with promotor 29214:', json2.total);
}

run().catch(console.error);
