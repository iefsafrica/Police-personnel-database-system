export function normalizeRegistrationId(value: string): string {
  const cleaned = value.trim().toUpperCase();

  const npfMatch = cleaned.match(/^NPF[-\s_]*0*(\d+)$/);
  if (npfMatch) {
    return `NPF${npfMatch[1]}`;
  }

  return cleaned.replace(/[^A-Z0-9]/g, "");
}

export function canonicalizeRegistrationId(value: string): string {
  const normalized = normalizeRegistrationId(value);
  const match = normalized.match(/^NPF(\d+)$/);

  if (!match) {
    return value.trim().toUpperCase();
  }

  const digits = match[1] ?? "";
  const width = Math.max(4, digits.length);
  return `NPF-${digits.padStart(width, "0")}`;
}

export function buildRegistrationLookupExpression(columnName: string): string {
  return `regexp_replace(regexp_replace(upper(${columnName}), '[^A-Z0-9]', '', 'g'), '^NPF0+', 'NPF', '')`;
}

export function resolveRegistrationIdInput(
  headerValue?: string | null,
  bodyValue?: string | null
): string | null {
  const raw = headerValue?.trim() || bodyValue?.trim() || "";
  if (!raw) return null;
  return canonicalizeRegistrationId(raw);
}

export function hasRegistrationId(value?: string | null): value is string {
  return Boolean(value && value.trim());
}

export function buildRegistrationIdVariants(value: string): string[] {
  const raw = value.trim();
  const upper = raw.toUpperCase();
  const canonical = canonicalizeRegistrationId(raw);
  const normalized = normalizeRegistrationId(raw);
  const compact = normalized.replace(/^NPF0+/, "NPF");
  const digits = normalized.replace(/^NPF/, "") || "";
  const legacyDigits = digits.replace(/^0+/, "") || "0";

  const spaceVariant = digits ? `NPF ${digits.padStart(Math.max(3, digits.length), "0")}` : raw;
  const dashlessVariant = digits ? `NPF${digits.padStart(Math.max(4, digits.length), "0")}` : raw;
  const legacySpaceVariant = `NPF ${legacyDigits.padStart(3, "0")}`;

  return Array.from(
    new Set(
      [
        raw,
        upper,
        canonical,
        normalized,
        compact,
        spaceVariant,
        dashlessVariant,
        legacySpaceVariant,
      ].filter(Boolean)
    )
  );
}

