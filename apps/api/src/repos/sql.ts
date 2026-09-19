/**
 * The only SQL built from pieces. It makes "?,?,?" for an IN (...) list. The values themselves
 * are always passed with bind(), never put in the text.
 */
export const placeholders = (count: number): string => Array.from({ length: count }, () => "?").join(",");
