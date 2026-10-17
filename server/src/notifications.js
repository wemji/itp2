import 'dotenv/config';

export async function sendExternalNotification({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFICATION_FROM;
  if (!apiKey || !from || !to) return { delivered: false, reason: 'not_configured' };
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text }), signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { delivered: false, reason: 'provider_error' };
    return { delivered: true };
  } catch (error) { console.warn('External notification failed:', error.message); return { delivered: false, reason: 'network_error' }; }
}
