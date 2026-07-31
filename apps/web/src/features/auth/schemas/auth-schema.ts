import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  full_name: z.string().min(1, "El nombre real es obligatorio").max(255),
  doc_type: z.enum(["dni", "cuit"]).optional().or(z.literal("")),
  doc_number: z.string().max(50).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  public_name: z.string().min(1, "El nombre público es obligatorio").max(255),
  public_whatsapp: z.string().max(50).optional().or(z.literal("")),
  city_id: z.string().uuid("Elegí una ciudad").optional().or(z.literal("")),
});

export type RegisterFormValues = z.infer<typeof registerFormSchema>;
