export function isUnavailabilityOverlapError(error: unknown): boolean {
  const visited = new WeakSet<object>();

  function inspect(value: unknown): boolean {
    if (typeof value === "string") {
      return (
        value === "23P01" ||
        value.includes("Unavailability_no_employee_overlap")
      );
    }

    if (typeof value !== "object" || value === null) {
      return false;
    }

    if (visited.has(value)) {
      return false;
    }

    visited.add(value);

    const record = value as Record<string, unknown>;

    return [
      "code",
      "originalCode",
      "constraint",
      "message",
      "originalMessage",
      "cause",
      "meta",
      "driverAdapterError"
    ].some((key) => inspect(record[key]));
  }

  return inspect(error);
}