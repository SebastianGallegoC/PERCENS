"""add encuestador profiles relation

Revision ID: 20260529_0002
Revises: 20260505_0001
Create Date: 2026-05-29 16:58:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260529_0002"
down_revision = "20260520_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "encuestador_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username_owner", sa.String(), nullable=False),
        sa.Column("nombres_apellidos_encuestador", sa.String(), nullable=False),
        sa.Column("tipo_documento_encuestador", sa.String(), nullable=False),
        sa.Column("numero_documento_encuestador", sa.String(), nullable=False),
        sa.Column("telefono_encuestador", sa.String(), nullable=False),
        sa.Column("cargo_encuestador", sa.String(), nullable=False),
        sa.Column("empresa_entidad_encuestador", sa.String(), nullable=False),
        sa.Column("firma_encuestador", sa.String(), nullable=False),
        sa.Column("habilitado", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_encuestador_profiles_username_owner"),
        "encuestador_profiles",
        ["username_owner"],
        unique=False,
    )
    op.create_index(op.f("ix_encuestador_profiles_id"), "encuestador_profiles", ["id"], unique=False)

    op.add_column("forms", sa.Column("id_perfil_encuestador", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_forms_id_perfil_encuestador"), "forms", ["id_perfil_encuestador"], unique=False)
    op.create_foreign_key(
        "fk_forms_id_perfil_encuestador",
        "forms",
        "encuestador_profiles",
        ["id_perfil_encuestador"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint("fk_forms_id_perfil_encuestador", "forms", type_="foreignkey")
    op.drop_index(op.f("ix_forms_id_perfil_encuestador"), table_name="forms")
    op.drop_column("forms", "id_perfil_encuestador")

    op.drop_index(op.f("ix_encuestador_profiles_id"), table_name="encuestador_profiles")
    op.drop_index(op.f("ix_encuestador_profiles_username_owner"), table_name="encuestador_profiles")
    op.drop_table("encuestador_profiles")
