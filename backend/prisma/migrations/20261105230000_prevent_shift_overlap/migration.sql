BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Shift"
ADD CONSTRAINT "Shift_no_employee_overlap"
EXCLUDE USING gist (
    "employeeId" WITH =,
    tsrange(
        "date" + "startTime",
        "date" + "endTime",
        '[)'
    ) WITH &&
);

COMMIT;