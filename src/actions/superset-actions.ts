'use server'

const SUPERSET_URL = process.env.SUPERSET_URL || 'http://10.0.1.216:8088';
const SUPERSET_USERNAME = process.env.SUPERSET_USERNAME || 'admin';
const SUPERSET_PASSWORD = process.env.SUPERSET_PASSWORD || 'admin';


// Helper to get Admin Token
export async function getSupersetAdminToken() {
    try {
        const loginResponse = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: SUPERSET_USERNAME,
                password: SUPERSET_PASSWORD,
                provider: 'db',
                refresh: true,
            }),
        });

        if (!loginResponse.ok) {
            console.error('Superset Login Failed', await loginResponse.text());
            throw new Error('Failed to login to Superset');
        }

        const loginData = await loginResponse.json();
        return { accessToken: loginData.access_token };
    } catch (error) {
        console.error('Error fetching Superset Admin token:', error);
        throw error;
    }
}

export async function getSupersetGuestToken(dashboardId: string) {
    try {
        // 1. Login to get Access Token & Cookies
        const { accessToken } = await getSupersetAdminToken();


        // Capture cookies from login response to pass to subsequent requests

        // 2. Fetch CSRF Token explicitly (More reliable than parsing cookies)
        const csrfResponse = await fetch(`${SUPERSET_URL}/api/v1/security/csrf_token/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,

            },
        });
        const cookies = csrfResponse.headers.get('set-cookie');

        let csrfToken = null;
        if (csrfResponse.ok) {
            const csrfData = await csrfResponse.json();
            csrfToken = csrfData.result;
        } else {
            console.warn('Failed to fetch CSRF token explicitily', await csrfResponse.text());
        }

        // 3. Get Guest Token
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        };

        if (cookies) {
            headers['Cookie'] = cookies;
        }

        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        console.log(headers)
        const guestTokenResponse = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                user: {
                    username: 'guest',
                    first_name: 'Guest',
                    last_name: 'User',
                },
                resources: [
                    {
                        type: 'dashboard', // embedded sdk works best with dashboards
                        id: dashboardId,
                    },
                ],
                rls: [],
            }),
        });

        if (!guestTokenResponse.ok) {
            console.error('Superset Guest Token Failed', await guestTokenResponse.text());
            throw new Error('Failed to get guest token');
        }

        const guestTokenData = await guestTokenResponse.json();

        return {
            token: guestTokenData.token,
            supsersetDomain: SUPERSET_URL
        };

    } catch (error) {
        console.error('Error fetching Superset token:', error);
        throw error;
    }
}


// Fetch all dashboards and their Embedded UUIDs
export async function getAllAvailableReports() {
    const { accessToken } = await getSupersetAdminToken(); // Your existing login logic

    // 1. Get the list of all dashboards

    const temp = `${SUPERSET_URL}/api/v1/dashboard/?q=(columns:!(id,dashboard_title,slug))`
    const response = await fetch(`${SUPERSET_URL}/api/v1/dashboard/?q=(columns:!(id,dashboard_title,slug))`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    console.log(response.body, 'KOKSOSKO')
    const { result } = await response.json();
    console.log(result, 'OKOKSOKS')
    // 2. For each dashboard, fetch its Embedded UUID
    const reports = await Promise.all(result.map(async (dash: any) => {
        const embedRes = await fetch(`${SUPERSET_URL}/api/v1/dashboard/${dash.id}/embedded`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log(embedRes, 'KOKSOSKO')
        if (embedRes.ok) {
            const embedData = await embedRes.json();
            return {
                id: dash.id,
                title: dash.dashboard_title,
                sid: embedData.result.uuid, // This is the UUID required by the SDK
                type: 'dashboard'
            };
        }
        return null; // Skip dashboards that don't have "Allow Embedding" enabled
    }));

    return reports.filter(r => r !== null);
}
