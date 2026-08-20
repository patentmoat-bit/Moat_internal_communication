const EPO_BASE = 'https://ops.epo.org/3.2/rest-services';

export async function searchEPO(keywords: string, ipcClass?: string, dateFrom?: string) {
  const clientId = process.env.EPO_CLIENT_ID;
  const clientSecret = process.env.EPO_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("EPO credentials missing. Skipping EPO search.");
    return null;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://ops.epo.org/3.2/auth/accesstoken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenRes.ok) {
      console.warn("Failed to get EPO access token.");
      return null;
    }

    const { access_token } = await tokenRes.json();
    
    // Construct CQL query
    let cql = `ti="${keywords}"`;
    if (ipcClass) {
      cql += ` AND ic=${ipcClass}`;
    }
    if (dateFrom) {
      cql += ` AND pd>=${dateFrom.replace(/-/g, '')}`;
    }

    const searchRes = await fetch(
      `${EPO_BASE}/published-data/search?q=${encodeURIComponent(cql)}&Range=1-10`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!searchRes.ok) {
      console.warn("EPO Search request failed.");
      return null;
    }

    return await searchRes.json();
  } catch (error) {
    console.error("EPO search error:", error);
    return null;
  }
}
