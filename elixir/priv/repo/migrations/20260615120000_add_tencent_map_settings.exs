defmodule TeslaMate.Repo.Migrations.AddTencentMapSettings do
  use Ecto.Migration

  def up do
    execute "ALTER TABLE settings ADD COLUMN IF NOT EXISTS tencent_map_enabled BOOLEAN NOT NULL DEFAULT false"
    execute "ALTER TABLE settings ADD COLUMN IF NOT EXISTS tencent_map_key VARCHAR(255)"
  end

  def down do
    alter table(:settings) do
      remove :tencent_map_enabled
      remove :tencent_map_key
    end
  end
end
