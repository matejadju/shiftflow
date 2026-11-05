BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Unavailability"
ADD CONSTRAINT "Unavailability_no_employee_overlap"
EXCLUDE USING gist (
    "employeeId" WITH =,
    tsrange(
        "date" + "startTime",
        "date" + "endTime",
        '[)'
    ) WITH &&
);

COMMIT;