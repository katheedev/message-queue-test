const isTruthy = (value: string | undefined) =>
  ["1", "true", "yes", "on"].includes((value || "").trim().toLowerCase());

export const isLocalEnvironment = () =>
  isTruthy(import.meta.env.VITE_LOCAL_ENVIRONMENT) ||
  isTruthy(import.meta.env.VITE_LOCAL_ENVIRONEMNT) ||
  isTruthy(import.meta.env.VITE_LOCAL_ENVIRONENT);
