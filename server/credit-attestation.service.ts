import { createHash, randomBytes } from "node:crypto";

type FinalAttestationPdfInput = {
  documentRef: string;
  creditPublicRef: string;
  decisionType: "APPROVED" | "REJECTED";
  decidedAt: Date;
  issuedAt: Date;
  verifyCode: string;
  verifyUrl: string;
  parcelReference?: string | null;
  summary?: string | null;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildVerificationMatrix(seed: string, size = 21) {
  const digest = createHash("sha256").update(seed).digest();
  const cells: boolean[] = [];
  for (let index = 0; index < size * size; index += 1) {
    const byte = digest[index % digest.length] ?? 0;
    const bit = (byte >> (index % 8)) & 1;
    const row = Math.floor(index / size);
    const col = index % size;
    const inFinder =
      (row < 5 && col < 5) ||
      (row < 5 && col >= size - 5) ||
      (row >= size - 5 && col < 5);
    cells.push(inFinder ? true : bit === 1);
  }
  return { size, cells };
}

function buildPdf(lines: string[], verifySeed: string) {
  const matrix = buildVerificationMatrix(verifySeed);
  const lineCommands = lines.flatMap((line, index) => {
    const y = 790 - index * 22;
    const fontSize = index === 0 ? 18 : index === 1 ? 12 : 10;
    return [
      "BT",
      `/F1 ${fontSize} Tf`,
      `50 ${y} Td`,
      `(${escapePdfText(line)}) Tj`,
      "ET",
    ];
  });

  const matrixCommands: string[] = [
    "0.2 0.2 0.2 rg",
    "370 595 160 160 re S",
  ];
  const cellSize = 6;
  matrix.cells.forEach((filled, index) => {
    if (!filled) return;
    const row = Math.floor(index / matrix.size);
    const col = index % matrix.size;
    const x = 378 + col * cellSize;
    const y = 603 + (matrix.size - 1 - row) * cellSize;
    matrixCommands.push(`${x} ${y} ${cellSize - 1} ${cellSize - 1} re f`);
  });

  const content = [
    "0.1 0.1 0.1 rg",
    ...lineCommands,
    "0.85 0.85 0.85 rg",
    "BT",
    "/F1 42 Tf",
    "120 380 Td",
    "(FONCIER225 - VERIFICATION) Tj",
    "ET",
    "0.1 0.1 0.1 rg",
    ...matrixCommands,
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach(offset => {
    pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "utf8");
}

export class CreditAttestationService {
  static generateDocumentRef() {
    const year = new Date().getFullYear();
    return `CAF-${year}-${randomBytes(3).toString("hex").toUpperCase()}`;
  }

  static generateVerifyCode() {
    return `VER-${randomBytes(12).toString("base64url")}`;
  }

  static hashVerifyCode(verifyCode: string) {
    return createHash("sha256").update(verifyCode).digest("hex");
  }

  static buildVerifyUrl(baseUrl: string, verifyCode: string) {
    const normalized = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalized}/verify?token=${encodeURIComponent(verifyCode)}`;
  }

  static buildFinalAttestationPdf(input: FinalAttestationPdfInput) {
    const decisionLabel = input.decisionType === "APPROVED" ? "APPROUVEE" : "REJETEE";
    const lines = [
      "Foncier225",
      "Attestation de decision de credit habitat",
      `Reference document : ${input.documentRef}`,
      `Reference dossier : ${input.creditPublicRef}`,
      `Decision finale : ${decisionLabel}`,
      `Date de decision : ${formatDateTime(input.decidedAt)}`,
      `Date d'emission : ${formatDateTime(input.issuedAt)}`,
      `Parcelle liee : ${input.parcelReference ?? "Non renseignee"}`,
      `Resume : ${input.summary ?? "Decision finale enregistree dans le workflow credit habitat."}`,
      `Code de verification : ${input.verifyCode}`,
      `Verification publique : ${input.verifyUrl}`,
      "Securite : ce document est verifiable publiquement via le code ci-dessus.",
    ];

    const pdf = buildPdf(lines, input.verifyUrl);
    const checksumSha256 = createHash("sha256").update(pdf).digest("hex");

    return {
      buffer: pdf,
      checksumSha256,
    };
  }
}
