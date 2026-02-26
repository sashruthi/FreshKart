export function formatUnitAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return String(value ?? "").trim();
  }

  // Show up to 3 decimals, but trim trailing zeros and any dangling dot.
  const fixed = n.toFixed(3);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

/**
 * Standardizes units based on user requirements:
 * - Changes "pcs" to "g" by default.
 * - Uses "packet" specifically for biscuit categories.
 */
export function formatUnitDisplay(unit, category = "") {
  if (!unit) return "";

  const unitLower = unit.toLowerCase().trim();
  const catLower = category.toLowerCase().trim();

  // rule: for biscuits, use "packet"
  if (catLower.includes("biscuit")) {
    return "packet";
  }

  // rule: change "pcs" to "g"
  if (unitLower === "pcs" || unitLower === "pieces") {
    return "g";
  }

  return unit;
}

/**
 * Capitalizes the first letter of each word in a string.
 */
export function capitalize(str) {
  if (!str) return "";
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
