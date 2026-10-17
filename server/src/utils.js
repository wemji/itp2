export function handleDb(res, error) { if (error) { console.error(error); return res.status(400).json({ error: error.message }); } }
export function dayStart() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
