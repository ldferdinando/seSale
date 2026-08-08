export function sesaleWhatsappHref(message: string): string {
  const number = (process.env.NEXT_PUBLIC_SESALE_WHATSAPP ?? "").replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
