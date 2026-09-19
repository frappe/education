import type { EnrollResult } from "@lms/shared";
import { fill } from "@/features/text";

export interface EnrollWords {
  resultAdded: string;
  resultAlready: string;
  resultFull: string;
  resultMissing: string;
}

/** Turns the answer of an "add students" request into one sentence, like "3 added, 1 already in the course". */
export function describeEnroll(result: EnrollResult, words: EnrollWords): string {
  const count = (r: string) => result.results.filter((x) => x.result === r).length;
  const parts: [number, string][] = [
    [count("enrolled"), words.resultAdded],
    [count("already_enrolled"), words.resultAlready],
    [count("full"), words.resultFull],
    [count("not_found"), words.resultMissing],
  ];
  return parts
    .filter(([n]) => n > 0)
    .map(([n, text]) => fill(text, { n }))
    .join(", ");
}
