import { supabase } from './supabase.js';

export async function writeAudit({ actorId, action, targetType, targetId = null, metadata = {} }) {
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata,
  });
  if (error) console.warn('Audit log could not be written:', error.message);
}
