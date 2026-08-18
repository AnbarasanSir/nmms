export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function generateRandomExamNumber(): string {
  const states = ['TN', 'KA', 'AP', 'MH', 'KL', 'DL', 'UP', 'WB'];
  const state = states[Math.floor(Math.random() * states.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `NMMS-2026-${state}-${num}`;
}
