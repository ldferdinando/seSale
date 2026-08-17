import { z } from "zod";

/** Validación del modal de carga/edición de AdItem (Etapa 8d) — el slot y el
 * anunciante se validan aparte (selección obligatoria en el modal, no son
 * campos de texto libre). */
export const adItemFormSchema = z
  .object({
    user_id: z.string().min(1, "Elegí un anunciante"),
    img_url: z.string().min(1, "Subí una imagen o pegá una URL"),
    link_url: z.string().url("URL inválida").optional().or(z.literal("")),
    alt_text: z.string().max(255).optional().or(z.literal("")),
    advertiser_name: z.string().max(255).optional().or(z.literal("")),
    starts_at: z.string().min(1, "La fecha de inicio es obligatoria"),
    ends_at: z.string().optional().or(z.literal("")),
    display_order: z.number().int().min(0),
  })
  .refine((data) => !data.ends_at || data.ends_at >= data.starts_at, {
    message: "La fecha de fin no puede ser anterior a la de inicio",
    path: ["ends_at"],
  });

export type AdItemFormValues = z.infer<typeof adItemFormSchema>;
