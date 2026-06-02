import { LocalEnvironmentOverride } from "@/types/environment";

const buildKey = (userId: string, applicationId: string, environmentId: string) =>
  `mq-tester:local-config:${userId}:${applicationId}:${environmentId}`;

export class LocalConfigService {
  static getOverride(
    userId: string,
    applicationId: string,
    environmentId: string,
  ): LocalEnvironmentOverride {
    const rawValue = localStorage.getItem(
      buildKey(userId, applicationId, environmentId),
    );

    if (!rawValue) {
      return {};
    }

    try {
      return JSON.parse(rawValue) as LocalEnvironmentOverride;
    } catch {
      return {};
    }
  }

  static saveOverride(
    userId: string,
    applicationId: string,
    environmentId: string,
    value: LocalEnvironmentOverride,
  ) {
    localStorage.setItem(
      buildKey(userId, applicationId, environmentId),
      JSON.stringify(value),
    );
  }

  static clearOverride(
    userId: string,
    applicationId: string,
    environmentId: string,
  ) {
    localStorage.removeItem(buildKey(userId, applicationId, environmentId));
  }
}
