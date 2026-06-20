"""add users table

Revision ID: 20260620_0004
Revises: 20260603_0003
Create Date: 2026-06-20 12:35:00
"""

from __future__ import annotations

import json
import os

import bcrypt
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260620_0004"
down_revision = "20260603_0003"
branch_labels = None
depends_on = None


USER_ROLE_ENUM = postgresql.ENUM(
    "admin",
    "editor",
    "encuestador",
    name="user_role",
    create_type=False,
)


def _seed_admin_users() -> None:
    raw = (os.environ.get("NOSIGNAL_AUTH_USERS") or "").strip()
    if not raw:
        return
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return
    if not isinstance(payload, dict):
        return

    rows: list[dict[str, object]] = []
    for username, stored_value in payload.items():
        normalized_username = str(username).strip()
        if not normalized_username:
            continue
        password_hash = str(stored_value or "").strip()
        if not password_hash:
            continue
        if password_hash.startswith("plain:"):
            password_hash = bcrypt.hashpw(
                password_hash.removeprefix("plain:").encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")
        elif not password_hash.startswith(("$2a$", "$2b$", "$2y$", "bcrypt:")):
            password_hash = bcrypt.hashpw(
                password_hash.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")
        else:
            password_hash = password_hash.removeprefix("bcrypt:")
        rows.append(
            {
                "username": normalized_username,
                "password_hash": password_hash,
                "role": "admin",
                "is_active": True,
            }
        )

    if not rows:
        return

    users_table = sa.table(
        "users",
        sa.column("username", sa.String()),
        sa.column("password_hash", sa.String()),
        sa.column("role", USER_ROLE_ENUM),
        sa.column("is_active", sa.Boolean()),
    )
    op.bulk_insert(users_table, rows)


def upgrade() -> None:
    bind = op.get_bind()
    USER_ROLE_ENUM.create(bind, checkfirst=True)

    inspector = inspect(bind)
    if "users" in inspector.get_table_names():
        return

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=128), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", USER_ROLE_ENUM, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_role"), "users", ["role"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    _seed_admin_users()


def downgrade() -> None:
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_role"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
    USER_ROLE_ENUM.drop(op.get_bind(), checkfirst=True)
