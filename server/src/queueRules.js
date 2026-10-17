export const queueTransitions = { CALLED: ['WAITING'], SERVING: ['CALLED'], COMPLETED: ['SERVING'], 'NO-SHOW': ['WAITING', 'CALLED'] };
export function canTransition(from, to) { return queueTransitions[to]?.includes(from) === true; }
