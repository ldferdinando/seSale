"""Guardia de CI: compara los enums nativos de Postgres contra los modelos.

`alembic revision --autogenerate` no compara los valores de los enums, así
que un tipo al que le falta una etiqueta pasa desapercibido (caso
`subscriptionstatus` sin `pending_payment`, ver 0030 y a_revisar.md). Este
script recorre `SQLModel.metadata`, toma cada columna con Enum nativo y
compara las etiquetas que espera el modelo (`column.type.enums`, tal como se
persisten) contra las del tipo que la columna usa realmente en la base
(`pg_attribute` → `pg_type` → `pg_enum`).

- Etiqueta que el modelo espera y la DB no tiene → FALLA (exit 1).
- Columna ausente, que no es enum, o que usa otro tipo → FALLA (exit 1).
- Etiqueta que la DB tiene y el modelo no → WARNING (Postgres no permite
  quitar valores de un enum, así que puede quedar alguno histórico).

Correr después de `alembic upgrade head`, desde `apps/api`:

    uv run python scripts/check_pg_enums.py

Si `DATABASE_URL` no es Postgres (SQLite), se saltea con exit 0.
"""

import sys
from dataclasses import dataclass

import sqlalchemy as sa
from sqlalchemy.engine import Connection
from sqlmodel import SQLModel

import app.models  # noqa: F401 — registra todos los modelos en SQLModel.metadata
from app.core.config import settings

# Columnas de tablas del schema actual cuyo tipo es un enum, con sus
# etiquetas en orden. Sin parámetros de usuario: SQL fijo.
ACTUAL_ENUMS_QUERY = sa.text(
    """
    SELECT c.relname AS table_name,
           a.attname AS column_name,
           t.typname AS type_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_type t ON t.oid = a.atttypid
    JOIN pg_enum e ON e.enumtypid = t.oid
    WHERE n.nspname = current_schema()
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
    GROUP BY c.relname, a.attname, t.typname
    """
)


@dataclass(frozen=True)
class EnumColumn:
    table: str
    column: str
    type_name: str
    labels: tuple[str, ...]


def expected_native_enums(metadata: sa.MetaData) -> list[EnumColumn]:
    """Columnas con Enum nativo según los modelos."""
    result: list[EnumColumn] = []
    for table in metadata.sorted_tables:
        for column in table.columns:
            col_type = column.type
            if isinstance(col_type, sa.Enum) and col_type.native_enum and col_type.name:
                result.append(EnumColumn(table.name, column.name, col_type.name, tuple(col_type.enums)))
    return result


def fetch_actual_enums(conn: Connection) -> dict[tuple[str, str], EnumColumn]:
    """Columnas con enum en la DB, indexadas por (tabla, columna)."""
    rows = conn.execute(ACTUAL_ENUMS_QUERY).all()
    return {
        (row.table_name, row.column_name): EnumColumn(
            row.table_name, row.column_name, row.type_name, tuple(row.labels)
        )
        for row in rows
    }


def compare_enums(
    expected: list[EnumColumn], actual: dict[tuple[str, str], EnumColumn]
) -> tuple[list[str], list[str]]:
    """Devuelve (errores, warnings)."""
    errors: list[str] = []
    warnings: list[str] = []
    for exp in expected:
        where = f"{exp.table}.{exp.column}"
        act = actual.get((exp.table, exp.column))
        if act is None:
            errors.append(
                f"{where}: el modelo espera el enum '{exp.type_name}' pero la columna no existe "
                "en la DB o no es de un tipo enum"
            )
            continue
        if act.type_name != exp.type_name:
            errors.append(f"{where}: la DB usa el tipo '{act.type_name}' y el modelo espera '{exp.type_name}'")
            continue
        missing = [label for label in exp.labels if label not in act.labels]
        extra = [label for label in act.labels if label not in exp.labels]
        if missing:
            errors.append(
                f"{where}: al tipo '{exp.type_name}' le faltan los valores {missing} "
                f"(DB: {list(act.labels)}, modelo: {list(exp.labels)})"
            )
        if extra:
            warnings.append(
                f"{where}: el tipo '{exp.type_name}' tiene valores que el modelo no usa: {extra}"
            )
    return errors, warnings


def main() -> int:
    engine = sa.create_engine(settings.database_url)
    if engine.dialect.name != "postgresql":
        print(f"check_pg_enums: la DB es '{engine.dialect.name}', no Postgres — se saltea.")
        return 0

    expected = expected_native_enums(SQLModel.metadata)
    with engine.connect() as conn:
        actual = fetch_actual_enums(conn)
    engine.dispose()

    errors, warnings = compare_enums(expected, actual)
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)

    if errors:
        print(f"check_pg_enums: {len(errors)} error(es) en enums nativos.", file=sys.stderr)
        return 1
    print(f"check_pg_enums: OK — {len(expected)} columnas con enum nativo coinciden con los modelos.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
