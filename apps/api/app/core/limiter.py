from slowapi import Limiter
from slowapi.util import get_remote_address

# Storage en memoria del proceso (slowapi sin storage_uri → `memory://`).
# Limitación conocida: con varios workers de uvicorn (Procfile,
# WEB_CONCURRENCY) cada uno cuenta por su lado, así que el límite real por IP
# es N × el configurado, y los contadores se reinician en cada deploy. Un
# storage compartido (Redis/Memcached) lo resolvería, pero es infraestructura
# nueva — ver a_revisar.md, "Performance backend".
#
# `get_remote_address` lee `request.client.host`: detrás de Vercel → Railway
# es la IP real del usuario solo porque uvicorn corre con `--proxy-headers
# --forwarded-allow-ips='*'` (Procfile).
limiter = Limiter(key_func=get_remote_address)
