# Shared Expense System - CSV Import & Anomaly Report

Generated on: 14/6/2026, 8:02:53 pm

## Summary of Import Sessions

| Session ID | File Name | Status | Total Rows | Anomalies Detected | Resolved | Pending |
|------------|-----------|--------|------------|--------------------|----------|---------|
| 2 | `Expenses Export.csv` | **REVIEW_REQUIRED** | 42 | 77 | 0 | 77 |
| 1 | `Expenses Export.csv` | **REVIEW_REQUIRED** | 42 | 77 | 1 | 76 |

---

## Detailed Anomaly Logs per Session

### Session #2: `Expenses Export.csv`

- **Status**: REVIEW_REQUIRED
- **Created At**: 14/6/2026, 8:00:26 pm
- **Total Rows**: 42

#### Anomalies Detected & Action Taken

| Row # | Anomaly Type | Severity | Description | Status | Action/Decision | Reviewed By | Resolution Notes |
|-------|--------------|----------|-------------|--------|-----------------|-------------|------------------|
| 1 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 1: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 2 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 2: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 3 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 3: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 4 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 4: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 4 | `FUTURE_DATE` | **MEDIUM** | Row 4: Date "08-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 5 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 5: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 5 | `FUTURE_DATE` | **MEDIUM** | Row 5: Date "08-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 5 | `DUPLICATE_ROW` | **MEDIUM** | Row 5: Appears to be a duplicate of row 4. | OPEN | `PENDING` | N/A | - |
| 6 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 6: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 6 | `FUTURE_DATE` | **MEDIUM** | Row 6: Date "10-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 7 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 7: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 7 | `FUTURE_DATE` | **MEDIUM** | Row 7: Date "12-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 8 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 8: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 8 | `INVALID_DATE_FORMAT` | **HIGH** | Row 8: Date value "14-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 9 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 9: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 9 | `INVALID_DATE_FORMAT` | **HIGH** | Row 9: Date value "15-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 10 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 10: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 10 | `INVALID_DATE_FORMAT` | **HIGH** | Row 10: Date value "18-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 11 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 11: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 11 | `INVALID_DATE_FORMAT` | **HIGH** | Row 11: Date value "20-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 12 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 12: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 12 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 12: Required field "paidby" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 12 | `INVALID_DATE_FORMAT` | **HIGH** | Row 12: Date value "22-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 13 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 13: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 13 | `INVALID_DATE_FORMAT` | **HIGH** | Row 13: Date value "25-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 14 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 14: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 14 | `INVALID_DATE_FORMAT` | **HIGH** | Row 14: Date value "28-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 15 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 15: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 16 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 16: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 17 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 17: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 18 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 18: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 18 | `FUTURE_DATE` | **MEDIUM** | Row 18: Date "08-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 19 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 19: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 19 | `FUTURE_DATE` | **MEDIUM** | Row 19: Date "09-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 20 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 20: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 20 | `FUTURE_DATE` | **MEDIUM** | Row 20: Date "10-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 21 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 21: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 21 | `FUTURE_DATE` | **MEDIUM** | Row 21: Date "10-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 22 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 22: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 22 | `FUTURE_DATE` | **MEDIUM** | Row 22: Date "11-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 23 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 23: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 23 | `FUTURE_DATE` | **MEDIUM** | Row 23: Date "11-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 24 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 24: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 24 | `FUTURE_DATE` | **MEDIUM** | Row 24: Date "11-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 25 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 25: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 25 | `FUTURE_DATE` | **MEDIUM** | Row 25: Date "12-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 25 | `INVALID_AMOUNT_VALUE` | **HIGH** | Row 25: Amount "-30" must be greater than zero. | OPEN | `PENDING` | N/A | - |
| 26 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 26: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 27 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 27: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 27 | `INVALID_DATE_FORMAT` | **HIGH** | Row 27: Date value "15-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 28 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 28: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 28 | `INVALID_DATE_FORMAT` | **HIGH** | Row 28: Date value "18-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 29 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 29: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 29 | `INVALID_DATE_FORMAT` | **HIGH** | Row 29: Date value "20-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 30 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 30: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 30 | `INVALID_DATE_FORMAT` | **HIGH** | Row 30: Date value "22-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 30 | `INVALID_AMOUNT_VALUE` | **HIGH** | Row 30: Amount "0" must be greater than zero. | OPEN | `PENDING` | N/A | - |
| 31 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 31: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 31 | `INVALID_DATE_FORMAT` | **HIGH** | Row 31: Date value "25-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 32 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 32: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 32 | `INVALID_DATE_FORMAT` | **HIGH** | Row 32: Date value "28-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 33 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 33: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 34 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 34: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 35 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 35: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 36 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 36: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 37 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 37: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 37 | `FUTURE_DATE` | **MEDIUM** | Row 37: Date "08-04-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 38 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 38: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 38 | `FUTURE_DATE` | **MEDIUM** | Row 38: Date "10-04-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 39 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 39: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 39 | `FUTURE_DATE` | **MEDIUM** | Row 39: Date "12-04-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 40 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 40: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 40 | `INVALID_DATE_FORMAT` | **HIGH** | Row 40: Date value "15-04-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 41 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 41: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 41 | `INVALID_DATE_FORMAT` | **HIGH** | Row 41: Date value "18-04-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 42 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 42: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 42 | `INVALID_DATE_FORMAT` | **HIGH** | Row 42: Date value "20-04-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |


---

### Session #1: `Expenses Export.csv`

- **Status**: REVIEW_REQUIRED
- **Created At**: 14/6/2026, 7:54:18 pm
- **Total Rows**: 42

#### Anomalies Detected & Action Taken

| Row # | Anomaly Type | Severity | Description | Status | Action/Decision | Reviewed By | Resolution Notes |
|-------|--------------|----------|-------------|--------|-----------------|-------------|------------------|
| 1 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 1: Required field "title" is missing or empty. | FIXED | `MANUAL_FIX` | Tia | Manual correction applied to record attributes. |
| 2 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 2: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 3 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 3: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 4 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 4: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 4 | `FUTURE_DATE` | **MEDIUM** | Row 4: Date "08-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 5 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 5: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 5 | `FUTURE_DATE` | **MEDIUM** | Row 5: Date "08-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 5 | `DUPLICATE_ROW` | **MEDIUM** | Row 5: Appears to be a duplicate of row 4. | OPEN | `PENDING` | N/A | - |
| 6 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 6: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 6 | `FUTURE_DATE` | **MEDIUM** | Row 6: Date "10-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 7 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 7: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 7 | `FUTURE_DATE` | **MEDIUM** | Row 7: Date "12-02-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 8 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 8: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 8 | `INVALID_DATE_FORMAT` | **HIGH** | Row 8: Date value "14-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 9 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 9: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 9 | `INVALID_DATE_FORMAT` | **HIGH** | Row 9: Date value "15-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 10 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 10: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 10 | `INVALID_DATE_FORMAT` | **HIGH** | Row 10: Date value "18-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 11 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 11: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 11 | `INVALID_DATE_FORMAT` | **HIGH** | Row 11: Date value "20-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 12 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 12: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 12 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 12: Required field "paidby" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 12 | `INVALID_DATE_FORMAT` | **HIGH** | Row 12: Date value "22-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 13 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 13: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 13 | `INVALID_DATE_FORMAT` | **HIGH** | Row 13: Date value "25-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 14 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 14: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 14 | `INVALID_DATE_FORMAT` | **HIGH** | Row 14: Date value "28-02-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 15 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 15: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 16 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 16: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 17 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 17: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 18 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 18: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 18 | `FUTURE_DATE` | **MEDIUM** | Row 18: Date "08-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 19 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 19: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 19 | `FUTURE_DATE` | **MEDIUM** | Row 19: Date "09-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 20 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 20: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 20 | `FUTURE_DATE` | **MEDIUM** | Row 20: Date "10-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 21 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 21: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 21 | `FUTURE_DATE` | **MEDIUM** | Row 21: Date "10-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 22 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 22: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 22 | `FUTURE_DATE` | **MEDIUM** | Row 22: Date "11-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 23 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 23: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 23 | `FUTURE_DATE` | **MEDIUM** | Row 23: Date "11-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 24 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 24: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 24 | `FUTURE_DATE` | **MEDIUM** | Row 24: Date "11-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 25 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 25: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 25 | `FUTURE_DATE` | **MEDIUM** | Row 25: Date "12-03-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 25 | `INVALID_AMOUNT_VALUE` | **HIGH** | Row 25: Amount "-30" must be greater than zero. | OPEN | `PENDING` | N/A | - |
| 26 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 26: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 27 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 27: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 27 | `INVALID_DATE_FORMAT` | **HIGH** | Row 27: Date value "15-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 28 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 28: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 28 | `INVALID_DATE_FORMAT` | **HIGH** | Row 28: Date value "18-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 29 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 29: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 29 | `INVALID_DATE_FORMAT` | **HIGH** | Row 29: Date value "20-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 30 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 30: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 30 | `INVALID_DATE_FORMAT` | **HIGH** | Row 30: Date value "22-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 30 | `INVALID_AMOUNT_VALUE` | **HIGH** | Row 30: Amount "0" must be greater than zero. | OPEN | `PENDING` | N/A | - |
| 31 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 31: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 31 | `INVALID_DATE_FORMAT` | **HIGH** | Row 31: Date value "25-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 32 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 32: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 32 | `INVALID_DATE_FORMAT` | **HIGH** | Row 32: Date value "28-03-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 33 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 33: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 34 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 34: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 35 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 35: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 36 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 36: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 37 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 37: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 37 | `FUTURE_DATE` | **MEDIUM** | Row 37: Date "08-04-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 38 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 38: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 38 | `FUTURE_DATE` | **MEDIUM** | Row 38: Date "10-04-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 39 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 39: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 39 | `FUTURE_DATE` | **MEDIUM** | Row 39: Date "12-04-2026" is in the future. | OPEN | `PENDING` | N/A | - |
| 40 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 40: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 40 | `INVALID_DATE_FORMAT` | **HIGH** | Row 40: Date value "15-04-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 41 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 41: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 41 | `INVALID_DATE_FORMAT` | **HIGH** | Row 41: Date value "18-04-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |
| 42 | `MISSING_REQUIRED_FIELD` | **HIGH** | Row 42: Required field "title" is missing or empty. | OPEN | `PENDING` | N/A | - |
| 42 | `INVALID_DATE_FORMAT` | **HIGH** | Row 42: Date value "20-04-2026" could not be parsed as a valid date. | OPEN | `PENDING` | N/A | - |


---

