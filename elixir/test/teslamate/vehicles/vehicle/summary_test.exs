defmodule TeslaMate.Vehicles.Vehicle.SummaryTest do
  use ExUnit.Case, async: true

  alias TeslaMate.Vehicles.Vehicle.Summary
  alias TeslaApi.Vehicle
  alias TeslaApi.Vehicle.State.VehicleState
  alias TeslaApi.Vehicle.State.VehicleState.SoftwareUpdate

  defp attrs do
    %{
      state: :online,
      since: DateTime.utc_now(),
      healthy?: true,
      car: nil,
      elevation: nil,
      geofence: nil,
      driving_status: nil
    }
  end

  defp vehicle_with_update(status, version \\ "2024.3.1 abc123") do
    %Vehicle{
      vehicle_state: %VehicleState{
        software_update: %SoftwareUpdate{status: status, version: version}
      }
    }
  end

  describe "update_available" do
    test "preserves fork telemetry from API decoding into the summary" do
      alias TeslaApi.Vehicle.State

      vehicle = %Vehicle{
        vehicle_state: State.VehicleState.result(%{
          "media_info" => %{"now_playing_title" => "Test track", "media_playback_status" => "Playing"},
          "tpms_last_seen_pressure_time_fl" => 1700000000
        }),
        vehicle_config: State.VehicleConfig.result(%{"driver_assist" => "TeslaAP4", "exterior_trim" => "Black"}),
        climate_state: State.Climate.result(%{"cabin_overheat_protection" => "On", "driver_temp_setting" => 22.0}),
        charge_state: State.Charge.result(%{"charge_port_color" => "Green", "scheduled_charging_mode" => "StartAt"})
      }

      summary = Summary.into(vehicle, attrs())
      assert summary.now_playing_title == "Test track"
      assert summary.media_playback_status == "Playing"
      assert summary.tpms_last_seen_pressure_time_fl == 1700000000
      assert summary.driver_assist == "TeslaAP4"
      assert summary.exterior_trim == "Black"
      assert summary.driver_temp_setting == 22.0
      assert summary.cabin_overheat_protection == "On"
      assert summary.charge_port_color == "Green"
      assert summary.scheduled_charging_mode == "StartAt"
      assert State.VehicleState.result(%{}).now_playing_title == nil
    end

    test "true when status is 'available'" do
      summary = Summary.into(vehicle_with_update("available"), attrs())
      assert summary.update_available == true
    end

    test "true when status is 'downloading'" do
      summary = Summary.into(vehicle_with_update("downloading"), attrs())
      assert summary.update_available == true
    end

    test "true when status is 'downloading_wifi_wait'" do
      summary = Summary.into(vehicle_with_update("downloading_wifi_wait"), attrs())
      assert summary.update_available == true
    end

    test "true when status is 'scheduled' (download complete, waiting to install)" do
      summary = Summary.into(vehicle_with_update("scheduled"), attrs())
      assert summary.update_available == true
    end

    test "true when status is 'installing'" do
      summary = Summary.into(vehicle_with_update("installing"), attrs())
      assert summary.update_available == true
    end

    test "false when status is empty string (no update)" do
      summary = Summary.into(vehicle_with_update(""), attrs())
      assert summary.update_available == false
    end

    test "nil when software_update is nil" do
      vehicle = %Vehicle{vehicle_state: %VehicleState{software_update: nil}}
      summary = Summary.into(vehicle, attrs())
      assert summary.update_available == nil
    end
  end

  describe "download_perc / install_perc" do
    test "maps download_perc and install_perc from software_update" do
      vehicle = %Vehicle{
        vehicle_state: %VehicleState{
          software_update: %SoftwareUpdate{status: "downloading", download_perc: 100}
        }
      }

      summary = Summary.into(vehicle, attrs())
      assert summary.download_perc == 100
      assert summary.install_perc == nil
    end

    test "maps install_perc while installing" do
      vehicle = %Vehicle{
        vehicle_state: %VehicleState{
          software_update: %SoftwareUpdate{
            status: "installing",
            download_perc: 100,
            install_perc: 42
          }
        }
      }

      summary = Summary.into(vehicle, attrs())
      assert summary.download_perc == 100
      assert summary.install_perc == 42
    end

    test "nil when software_update is nil" do
      vehicle = %Vehicle{vehicle_state: %VehicleState{software_update: nil}}
      summary = Summary.into(vehicle, attrs())
      assert summary.download_perc == nil
      assert summary.install_perc == nil
    end
  end

  describe "update_version" do
    test "strips the build hash from the version string" do
      summary = Summary.into(vehicle_with_update("available", "2024.3.1 abc123"), attrs())
      assert summary.update_version == "2024.3.1"
    end

    test "nil when no version" do
      summary = Summary.into(vehicle_with_update("available", nil), attrs())
      assert summary.update_version == nil
    end
  end
end
