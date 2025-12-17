/**
 * Generate a stable, deterministic ID for a study objective based on its name.
 * This ensures that objectives with the same name always get the same ID.
 */
export function generateStableObjectiveId(name: string, index: number = 0): string {
  if (!name.trim()) {
    return `obj-temp-${Date.now()}`;
  }

  // Normalize the name: lowercase, replace non-alphanumeric with single dash
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace sequences of non-alphanumeric with single dash
    .replace(/^-+|-+$/g, '')      // Remove leading/trailing dashes
    .substring(0, 50)
    .replace(/-+$/g, '');          // Remove trailing dashes again after substring (in case it cut mid-word)

  return `${normalized}-${index}`;
}
