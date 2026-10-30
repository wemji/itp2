export function summarizePublicStats({ services = [], waitingQueues = [], completedToday = 0, updatedAt = new Date() } = {}) {
  const openServiceIds = new Set(services.map((service) => service.id));
  const publicWaitingQueues = waitingQueues.filter((queue) => openServiceIds.has(queue?.service_id));
  const waitingByService = new Map();

  for (const queue of publicWaitingQueues) {
    if (!queue?.service_id) continue;
    waitingByService.set(queue.service_id, (waitingByService.get(queue.service_id) || 0) + 1);
  }

  const estimatedWaits = services.map((service) => {
    const waiting = waitingByService.get(service.id) || 0;
    const averageServiceTime = Number(service.average_service_time) || 0;
    return waiting * Math.max(0, averageServiceTime);
  });

  return {
    openServices: services.length,
    peopleWaiting: publicWaitingQueues.length,
    typicalWaitMinutes: estimatedWaits.length
      ? Math.round(estimatedWaits.reduce((total, wait) => total + wait, 0) / estimatedWaits.length)
      : 0,
    completedToday: Math.max(0, Number(completedToday) || 0),
    updatedAt: new Date(updatedAt).toISOString(),
  };
}
