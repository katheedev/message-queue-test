export interface LocalBackupDocument<T = Record<string, unknown>> {
  id: string;
  data: T;
}

export interface LocalFirebaseBackup {
  applications?: LocalBackupDocument[];
  users?: LocalBackupDocument[];
  userAccess?: LocalBackupDocument[];
  testLogs?: LocalBackupDocument[];
}

export const localFirebaseBackup: LocalFirebaseBackup = {

};
