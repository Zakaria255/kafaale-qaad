import { prisma } from '../prisma/client';

// KM-<year>-<seq, zero-padded 6>. Sequential (not random) per the spec's numbering
// requirement. A naive count()-then-create() has a TOCTOU race under concurrent staff
// entry — callers must retry on the unique-constraint violation this can produce
// (mirrors the caseRef retry pattern in routes/cases.ts, adapted from a random-suffix
// scheme to a sequential one). Shared by routes/mothers.ts and motherImportService.ts.
export async function generateRegNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `KM-${year}-`;
  const count = await prisma.mother.count({ where: { regNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}
