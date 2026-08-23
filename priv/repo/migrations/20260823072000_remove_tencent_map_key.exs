defmodule TeslaMate.Repo.Migrations.RemoveTencentMapKey do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE settings DROP COLUMN IF EXISTS tencent_map_key"
  end

  def down do
    execute "ALTER TABLE settings ADD COLUMN IF NOT EXISTS tencent_map_key VARCHAR(255)"
  end
end
