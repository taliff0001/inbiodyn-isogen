/**
 * Generate the canonical filename for an LTS weight image.
 *
 * Convention: {weight_3digit}_{snake_case_description}.png
 * Examples:
 *   025_bag_of_cat_litter.png
 *   050_bag_of_concrete_mix.png
 *   005_yapping_chihuahua.png
 */
export function generateFilename(weight: number, description: string): string {
  const weightStr = String(weight).padStart(3, "0");
  const slug = description
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_()-]/g, "")
    .replace(/\s+/g, "_");
  return `${weightStr}_${slug}.png`;
}

/**
 * Parse a filename back into weight + description.
 */
export function parseFilename(filename: string): { weight: number; description: string } | null {
  const match = filename.match(/^(\d{3})_(.+)\.png$/);
  if (!match) return null;
  return {
    weight: parseInt(match[1], 10),
    description: match[2].replace(/_/g, " "),
  };
}
