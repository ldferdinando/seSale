from slowapi import Limiter
from slowapi.util import get_remote_address

# Storage en memoria del proceso (slowapi sin storage_uri → `memory://`).
# Limitación conocida: con varios workers de uvicorn (Procfile,
# WEB_CONCURRENCY) cada uno cuenta por su lado, así que el límite real por IP
# es N × el configurado, y los contadores se reinician en cada deploy. Un
# storage compartido (Redis/Memcached) lo resolvería, pero es infraestructura
# nueva — ver a_revisar.md, "Performance backend".
#
# Por eso los `@limiter.limit(...)` de los routers declaran la MITAD del
# límite real deseado (calculado para WEB_CONCURRENCY=2): "30/minute"
# configurado = 60/minute real por IP. Los valores impares no se pueden
# partir al medio, así que se duplica la ventana: "3/2hours" ≈ 3/hour real,
# "5/2minutes" ≈ 5/minute real. Si cambia la cantidad de workers, recalcular
# todos (configurado = real deseado / N) — no "corregirlos" al doble.
#
# `get_remote_address` lee `request.client.host`: detrás de Vercel → Railway
# es la IP real del usuario solo porque uvicorn corre con `--proxy-headers
# --forwarded-allow-ips='*'` (Procfile).
limiter = Limiter(key_func=get_remote_address)
