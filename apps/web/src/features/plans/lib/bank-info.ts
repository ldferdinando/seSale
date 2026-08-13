export interface BankInfoField {
  label: string;
  value: string;
}

/**
 * Parsea NEXT_PUBLIC_BANK_INFO: pares "Label:valor" separados por "|".
 * Ej: "Alias:sesale.pagos|CBU:0000003100000000000000|Titular:seSALE SRL|Banco:Banco Patagonia"
 */
export function parseBankInfo(raw: string | undefined): BankInfoField[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [label, ...rest] = chunk.split(":");
      return { label: label.trim(), value: rest.join(":").trim() };
    })
    .filter((field) => field.label && field.value);
}
