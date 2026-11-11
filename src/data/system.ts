/** Database lifecycle helpers for UI code, which may not import `db/*` directly. */
export { onDbAlert, type DbAlert } from '../db/open';
export { exportRaw, exportSnapshot, list as listSnapshots } from '../db/snapshot';
