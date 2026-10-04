export interface SiteSettings {
  /** Alias de pago por transferencia — null mientras el admin no lo cargue. */
  payment_alias: string | null;
}

export interface AdminSiteSettings extends SiteSettings {
  updated_at: string;
}

export interface SiteSettingsUpdateInput {
  payment_alias: string | null;
}
