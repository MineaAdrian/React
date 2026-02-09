/**
 * Normalizes a string by converting to lowercase and removing diacritics (accents).
 * Helpful for searching regardless of Romanian special characters (ă, â, î, ș, ț).
 */
export function normalizeString(str: string): string {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        // Handle Romanian specific mappings that normalization might miss or that are common variations
        .replace(/ș/g, "s")
        .replace(/ț/g, "t")
        .replace(/ă/g, "a")
        .replace(/â/g, "a")
        .replace(/î/g, "i");
}
