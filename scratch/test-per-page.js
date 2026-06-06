const fetch = require('node-fetch');

async function testCRMApi() {
  try {
    const email = 'Olga.Patricia';
    const password = 'Teamodios26';
    
    // 1. Login to v2.domus.la
    const homeRes = await fetch('https://v2.domus.la', { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const homeText = await homeRes.text();
    const csrfMatch = homeText.match(/<meta name="csrf-token-login" content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';
    const rawCookies = homeRes.headers.raw()['set-cookie'] || [];
    const sessionCookie = rawCookies.map(c => c.split(';')[0]).join('; ');
    
    const loginRes = await fetch('https://v2.domus.la/auth-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrfToken,
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({ user: email, password: password })
    });
    
    const loginData = await loginRes.json();
    if (loginData.mensaje === 'Login exitoso' || loginData.camb_clave !== undefined) {
        const authCookies = (loginRes.headers.raw()['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
        const finalCookies = sessionCookie + '; ' + authCookies;
        
        // 2. Fetch CRM SSO link
        const crmAuthRes = await fetch('https://v2.domus.la/crm/new/ingreso', {
            headers: { 'Cookie': finalCookies, 'User-Agent': 'Mozilla/5.0' },
            redirect: 'manual'
        });
        
        if (crmAuthRes.status === 302 || crmAuthRes.status === 301) {
            const redirectUrl = crmAuthRes.headers.get('location');
            
            // 3. Trade token for CRM session cookies
            const crmRes = await fetch(redirectUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'manual'
            });
            
            const crmRawCookies = crmRes.headers.raw()['set-cookie'] || [];
            const crmSessionCookie = crmRawCookies.map(c => c.split(';')[0]).join('; ');
            
            // Function to query a URL
            const queryCRM = async (url) => {
                const apiRes = await fetch('https://crm.domusweb.co/api/get', {
                    method: 'POST',
                    headers: { 
                        'Cookie': crmSessionCookie, 
                        'User-Agent': 'Mozilla/5.0',
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ url })
                });
                return apiRes.json();
            };

            console.log('--- Testing per_page=50 ---');
            const resPerPage = await queryCRM("contacts?page=1&per_page=50&contact_status_type=1");
            console.log('Result per_page=50:');
            console.log('total:', resPerPage.total);
            console.log('per_page:', resPerPage.per_page);
            console.log('current_page:', resPerPage.current_page);
            console.log('data length:', resPerPage.data ? resPerPage.data.length : 'undefined');

            console.log('\n--- Testing limit=50 ---');
            const resLimit = await queryCRM("contacts?page=1&limit=50&contact_status_type=1");
            console.log('Result limit=50:');
            console.log('total:', resLimit.total);
            console.log('per_page:', resLimit.per_page);
            console.log('data length:', resLimit.data ? resLimit.data.length : 'undefined');

            console.log('\n--- Testing pagination (fetching page 2) ---');
            const resPage2 = await queryCRM("contacts?page=2&contact_status_type=1");
            console.log('Result page=2:');
            console.log('total:', resPage2.total);
            console.log('per_page:', resPage2.per_page);
            console.log('current_page:', resPage2.current_page);
            console.log('data length:', resPage2.data ? resPage2.data.length : 'undefined');
        }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

testCRMApi();
