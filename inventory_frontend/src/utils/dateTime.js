export function formatLocalDateTime(value, timeZone) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(date);
}

export function getUserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}