# Biometrics import — sample files

Test files for **Attendance → Import Biometrics Record** (Company Admin portal). Dates are 2026-09-30 and
2026-10-01. Device User IDs map to the demo company's employee IDs by number (User 6 / Badge 0006 → FR-0006).

## Punch logs

| File | Layout | Columns |
|---|---|---|
| `1_attlog.dat` | ZKTeco ZK3969 USB attendance log — headerless, tab separated | User ID · Date-Time · Device ID · In/Out State · Verify Mode · Work Code |
| `GLG_001.TXT` | ZKTeco ZK3969 USB GLog export — tab separated with header | No · Mchn (device) · EnNo (user) · Name · Mode (verify) · IOMd (state) · DateTime |
| `ZK3969_attendance_export.csv` | ZKTeco CSV / software export | User ID · Name · Timestamp · Verification Mode · In/Out State · Device ID |
| `generic_device_export.csv` | Generic device (semicolon, split date + time, 12-hour clock) | Badge_No · Employee_Name · Punch_Date · Punch_Time · In_Out · Verify_Type · Terminal_ID |
| `custom_headers_needs_mapping.csv` | Unrecognised headers — use **Map columns** | Worker → User ID · When → Date-Time · Gate → Device · Direction → In/Out State |

ZKTeco codes — In/Out State: 0 Check-In, 1 Check-Out, 2 Break-Out, 3 Break-In, 4 OT-In, 5 OT-Out.
Verify Mode: 0/3 Password, 1 Fingerprint, 2/4 Card, 15 Face, 25 Palm. Words (IN/OUT, C/In, FP, Face, Card) also work.

Every file deliberately contains lines the importer must report and skip without stopping the batch —
unmapped IDs, malformed or missing timestamps, repeated taps, exact duplicates. Valid lines still import,
and re-importing a file changes nothing.

## Leave records (`sample_leave_records.csv`)

The demo seeds these leaves relative to the current date (today / yesterday), so they line up with the
in-app **Preview with Sample Data** log. They exercise the leave override:

- Approved full-day leave with no punches → **On Leave**, never Absent.
- Approved full-day leave **with** punches → stays **On Leave**; punches are recorded for audit and the day
  is flagged **Review** (confirm the leave or the punches).
- Approved half-day leave → **On Leave – Half Day (AM/PM)**, checked against the working half only
  (no punches / late / early out for that half → Review).
- Pending or rejected leave → no override.
