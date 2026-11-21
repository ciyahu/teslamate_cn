defmodule TeslaMateWeb.MapComponents do
  @moduledoc """
  Defines the tile layer of the maps once, for both its consumers: the map
  hooks, which read it from `data-tile-layer`, and the preconnect hint, which
  sets up the connection to the tile server before the hooks mount.
  """

  use Phoenix.Component

  defp layer(%{tencent_map_enabled: true}) do
    %{
      url: "https://rt{s}.map.gtimg.com/tile?z={z}&x={x}&y={y}&type=vector&styleid=0",
      options: %{maxZoom: 18, subdomains: ["0", "1", "2", "3"], tms: true}
    }
  end

  defp layer(_settings) do
    %{
      url: "https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_CN&size=1&style=7&scl=1&x={x}&y={y}&z={z}",
      options: %{maxZoom: 19, subdomains: ["1", "2", "3", "4"]}
    }
  end

  @doc "The tile layer as JSON for the `data-tile-layer` attribute of a map hook."
  def tile_layer(settings), do: settings |> layer() |> Jason.encode!()

  attr :settings, :map, required: true

  @doc "Starts DNS and TLS to the tile server while the page loads."
  def tile_preconnect(assigns) do
    %{url: url, options: %{subdomains: subdomains}} = layer(assigns.settings)
    origins =
      for subdomain <- subdomains do
        %URI{scheme: scheme, host: host} = URI.parse(String.replace(url, "{s}", subdomain))
        URI.to_string(%URI{scheme: scheme, host: host})
      end

    assigns = assign(assigns, :origins, origins)

    ~H"""
    <link :for={origin <- @origins} rel="preconnect" href={origin} />
    """
  end
end
