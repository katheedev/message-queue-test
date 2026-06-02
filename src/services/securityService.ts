export class SecurityService {
  static async hashPassword(password: string): Promise<string> {
    const encoded = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
  }

  static async verifyPassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const nextHash = await this.hashPassword(password);
    return nextHash === passwordHash;
  }
}
