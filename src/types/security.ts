export interface CertDetails {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  protocol: string;
  cipherSuite: string;
  keyLength: number;
}

export interface HeaderAudit {
  name: string;
  present: boolean;
  value: string;
  status: "secure" | "warning" | "insecure";
  description: string;
}

export interface CookieAudit {
  name: string;
  domain: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  status: "secure" | "warning" | "insecure";
}

export interface InsecureHeaderReport {
  grade: string;
  score: number;
  headers: HeaderAudit[];
}

export interface ExposedKey {
  type: string;
  key: string;
  url: string;
  line?: number;
}

export interface SecurityReport {
  certificate?: CertDetails;
  headerReport: InsecureHeaderReport;
  cookies: CookieAudit[];
  mixedContent: string[];
  trackersCount: number;
  trackersList: string[];
  fingerprintingDetected: boolean;
  exposedKeys: ExposedKey[];
}
