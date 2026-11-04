export function isValidDate(value: string): boolean {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function toDatabaseDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDatabaseTime(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

export function getWeekEnd(weekStart: string): Date {
  const end = toDatabaseDate(weekStart);
  end.setUTCDate(end.getUTCDate() + 7);

  return end;
}

export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function formatTime(value: Date): string {
  return value.toISOString().slice(11, 16);
}