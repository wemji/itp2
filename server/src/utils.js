export function handleDb(res, error, publicMessage = 'Unable to complete the database request. Please try again.') {
  if (error) {
    console.error(error);
    return res.status(400).json({ error: publicMessage });
  }
}
export function dayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
