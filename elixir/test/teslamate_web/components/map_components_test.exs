defmodule TeslaMateWeb.MapComponentsTest do
  use ExUnit.Case, async: true

  import Phoenix.LiveViewTest
  alias TeslaMateWeb.MapComponents

  test "both map providers preconnect to their actual tile hosts without a key" do
    for {enabled, host} <- [{false, "is.autonavi.com"}, {true, "map.gtimg.com"}] do
      settings = %{tencent_map_enabled: enabled}
      layer = MapComponents.tile_layer(settings) |> Jason.decode!()
      html = render_component(&MapComponents.tile_preconnect/1, settings: settings)
      document = Floki.parse_document!(html)
      origins = document |> Floki.find("link[rel=preconnect]") |> Floki.attribute("href")

      assert String.contains?(layer["url"], host)
      refute String.contains?(layer["url"], "key=")
      refute String.contains?(html, "openstreetmap.org")
      assert length(origins) == 4

      for subdomain <- layer["options"]["subdomains"] do
        %URI{scheme: scheme, host: host} =
          layer["url"] |> String.replace("{s}", subdomain) |> URI.parse()

        assert "#{scheme}://#{host}" in origins
      end

      if enabled do
        assert layer["options"]["tms"]
      else
        assert layer["options"]["maxZoom"] == 19
      end
    end
  end
end
