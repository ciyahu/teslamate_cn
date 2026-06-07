defmodule TeslaMate.Repo.Migrations.AddTencentMapSettings do
  use Ecto.Migration

  def change do
    alter table(:settings) do
      add :tencent_map_enabled, :boolean, default: false, null: false
      add :tencent_map_key, :string
    end
  end
end
