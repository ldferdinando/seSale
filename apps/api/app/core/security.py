"""JWT/auth utilities.

Etapa 1 no implementa autenticación real (llega en Etapa 3 con Supabase Auth).
Este módulo queda preparado para alojar la validación del JWT de Supabase
cuando corresponda.
"""


def decode_supabase_jwt(token: str) -> dict:
    raise NotImplementedError("Auth se implementa en la Etapa 3 (Supabase Auth)")
