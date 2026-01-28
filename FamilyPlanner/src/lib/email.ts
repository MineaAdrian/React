export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
    const apiKey = process.env.RESEND_API_KEY;

    if (process.env.NODE_ENV !== 'production') {
        console.log('--- DEVELOPMENT EMAIL BYPASS ---');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('--------------------------------');
        return { dev: true };
    }

    if (!apiKey) {
        console.warn('RESEND_API_KEY not found in .env.local. Skipping email sending.');
        return;
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                from: 'Family Planner <onboarding@resend.dev>',
                to: [to],
                subject,
                html,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Resend API Error:', data);
        }

        return data;
    } catch (error) {
        console.error('Failed to send email via fetch:', error);
    }
}
