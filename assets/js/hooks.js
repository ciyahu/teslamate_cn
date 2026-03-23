const LANG = navigator.languages
  ? navigator.languages[0]
  : navigator.language || navigator.userLanguage;

function toLocalTime(dateStr, opts) {
  const date = new Date(dateStr);

  return date instanceof Date && !isNaN(date.valueOf())
    ? date.toLocaleTimeString(LANG, opts)
    : "–";
}

function toLocalDate(dateStr, opts) {
  const date = new Date(dateStr);

  return date instanceof Date && !isNaN(date.valueOf())
    ? date.toLocaleDateString(LANG, opts)
    : "–";
}

export const Dropdown = {
  mounted() {
    const $el = this.el;

    $el.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      $el.classList.toggle("is-active");
    });

    document.addEventListener("click", () => {
      $el.classList.remove("is-active");
    });
  },
};

export const LocalTime = {
  mounted() {
    this.el.innerText = toLocalTime(this.el.dataset.date);
  },

  updated() {
    this.el.innerText = toLocalTime(this.el.dataset.date);
  },
};

export const LocalTimeRange = {
  exec() {
    const date = toLocalDate(this.el.dataset.startDate, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const time = [this.el.dataset.startDate, this.el.dataset.endDate]
      .map((date) =>
        toLocalTime(date, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      )
      .join(" – ");

    this.el.innerText = `${date}, ${time}`;
  },

  mounted() {
    this.exec();
  },
  updated() {
    this.exec();
  },
};

export const ConfirmGeoFenceDeletion = {
  mounted() {
    const { id, msg } = this.el.dataset;

    this.el.addEventListener("click", () => {
      if (window.confirm(msg)) {
        this.pushEvent("delete", { id });
      }
    });
  },
};

import {
  Map as M,
  TileLayer,
  LatLng,
  Control,
  Marker,
  Icon,
  Circle,
  CircleMarker,
} from "leaflet";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const icon = new Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconAnchor: [12, 40],
  popupAnchor: [0, -25],
});

const DirectionArrow = CircleMarker.extend({
  initialize(latLng, heading, options) {
    this._heading = heading;
    CircleMarker.prototype.initialize.call(this, latLng, {
      fillOpacity: 1,
      radius: 5,
      ...options,
    });
  },

  setHeading(heading) {
    this._heading = heading;
    this.redraw();
  },

  _updatePath() {
    const { x, y } = this._point;

    if (this._heading === "")
      return CircleMarker.prototype._updatePath.call(this);

    this.getElement().setAttributeNS(
      null,
      "transform",
      `translate(${x},${y}) rotate(${this._heading})`,
    );

    const path = this._empty() ? "" : `M0,${3} L-4,${5} L0,${-5} L4,${5} z}`;

    this._renderer._setPath(this, path);
  },
});

const PI = 3.1415926535897932384626;
const A = 6378245.0;
const EE = 0.00669342162296594323;

function outOfChina(lat, lng) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function transformLat(x, y) {
  let ret =
    -100.0 +
    2.0 * x +
    3.0 * y +
    0.2 * y * y +
    0.1 * x * y +
    0.2 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) /
    3.0;
  ret +=
    ((160.0 * Math.sin((y / 12.0) * PI) +
      320.0 * Math.sin((y * PI) / 30.0)) *
      2.0) /
    3.0;
  return ret;
}

function transformLon(x, y) {
  let ret =
    300.0 +
    x +
    2.0 * y +
    0.1 * x * x +
    0.1 * x * y +
    0.1 * Math.sqrt(Math.abs(x));
  ret +=
    ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) /
    3.0;
  ret +=
    ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) /
    3.0;
  ret +=
    ((150.0 * Math.sin((x / 12.0) * PI) +
      300.0 * Math.sin((x / 30.0) * PI)) *
      2.0) /
    3.0;
  return ret;
}

function wgs84ToGcj02(lat, lng) {
  lat = Number.parseFloat(lat);
  lng = Number.parseFloat(lng);

  if (outOfChina(lat, lng)) {
    return { lat, lng };
  }

  const dLat = transformLat(lng - 105.0, lat - 35.0);
  const dLon = transformLon(lng - 105.0, lat - 35.0);
  const radLat = (lat * PI) / 180.0;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);

  const adjustedLat =
    (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI);
  const adjustedLon =
    (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI);

  return {
    lat: lat + adjustedLat,
    lng: lng + adjustedLon,
  };
}

function gcj02ToWgs84(lat, lng) {
  lat = Number.parseFloat(lat);
  lng = Number.parseFloat(lng);

  if (outOfChina(lat, lng)) {
    return { lat, lng };
  }

  const { lat: gcjLat, lng: gcjLng } = wgs84ToGcj02(lat, lng);

  return {
    lat: lat * 2 - gcjLat,
    lng: lng * 2 - gcjLng,
  };
}

function toLatLng(lat, lng) {
  return new LatLng(Number.parseFloat(lat), Number.parseFloat(lng));
}

function toGcjLatLng(lat, lng) {
  const coords = wgs84ToGcj02(lat, lng);
  return toLatLng(coords.lat, coords.lng);
}

function createMap(opts) {
  const map = new M(opts.elId != null ? `map_${opts.elId}` : "map", opts);

  // Detect dark mode to use appropriate tiles
  const isDarkMode =
    document.documentElement.getAttribute("data-theme") === "dark";

  const gaode = new TileLayer(
    "https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_CN&size=1&style=7&scl=1&x={x}&y={y}&z={z}",
    {
      maxZoom: 19,
      subdomains: ["1", "2", "3", "4"],
      className: isDarkMode ? "dark-mode-tiles" : "",
    },
  );

  map.addLayer(gaode);

  return map;
}

export const SimpleMap = {
  mounted() {
    const $position = document.querySelector(`#position_${this.el.dataset.id}`);
    const initialZoom = Number.parseInt(this.el.dataset.initialZoom ?? "15", 10);

    const map = createMap({
      elId: this.el.dataset.id,
      zoomControl: !!this.el.dataset.zoom,
      boxZoom: false,
      doubleClickZoom: true,
      keyboard: false,
      scrollWheelZoom: false,
      tap: true,
      dragging: true,
      touchZoom: true,
    });

    const isArrow = this.el.dataset.marker === "arrow";
    const [rawLat, rawLng, heading] = $position.value.split(",");
    const { lat, lng } = wgs84ToGcj02(
      Number.parseFloat(rawLat),
      Number.parseFloat(rawLng),
    );

    const marker = isArrow
      ? new DirectionArrow([lat, lng], heading)
      : new Marker([lat, lng], { icon });

    map.setView([lat, lng], initialZoom);
    marker.addTo(map);

    map.removeControl(map.zoomControl);

    map.on("mouseover", function (e) {
      map.addControl(map.zoomControl);
    });
    map.on("mouseout", function (e) {
      map.removeControl(map.zoomControl);
    });

    if (isArrow) {
      const setView = () => {
        const [rawLat, rawLng, heading] = $position.value.split(",");
        const { lat, lng } = wgs84ToGcj02(
          Number.parseFloat(rawLat),
          Number.parseFloat(rawLng),
        );
        marker.setHeading(heading);
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom());
      };

      $position.addEventListener("change", setView);
    }
  },
};

export const TriggerChange = {
  updated() {
    this.el.dispatchEvent(new CustomEvent("change"));
  },
};

import("leaflet-control-geocoder");
import("@geoman-io/leaflet-geoman-free");

export const Map = {
  mounted() {
    const geoFence = (name) =>
      document.querySelector(`input[name='geo_fence[${name}]']`);

    const $radius = geoFence("radius");
    const $latitude = geoFence("latitude");
    const $longitude = geoFence("longitude");

    const location = toGcjLatLng($latitude.value, $longitude.value);

    const controlOpts = {
      position: "topleft",
      cutPolygon: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawPolygon: false,
      drawPolyline: false,
      drawRectangle: false,
      removalMode: false,
    };

    const editOpts = {
      allowSelfIntersection: false,
      preventMarkerRemoval: true,
    };

    const map = createMap({});
    map.setView(location, 17, { animate: false });
    map.pm.setLang(LANG);
    map.pm.addControls(controlOpts);
    map.pm.enableGlobalEditMode(editOpts);

    const circle = new Circle(location, { radius: $radius.value })
      .addTo(map)
      .on("pm:edit", (e) => {
        const { lat, lng } = e.target.getLatLng();
        const radius = Math.round(e.target.getRadius());
        const { lat: wgsLat, lng: wgsLng } = gcj02ToWgs84(lat, lng);

        $radius.value = radius;
        $latitude.value = wgsLat;
        $longitude.value = wgsLng;

        const mBox = map.getBounds();
        const cBox = circle.getBounds();
        const bounds = mBox.contains(cBox) ? mBox : cBox;
        map.fitBounds(bounds);
      });

    new Control.geocoder({ defaultMarkGeocode: false })
      .on("markgeocode", (e) => {
        const { bbox, center } = e.geocode;
        const gcjCenter = toGcjLatLng(center.lat, center.lng);

        const poly = L.polygon([
          toGcjLatLng(bbox.getSouthEast().lat, bbox.getSouthEast().lng),
          toGcjLatLng(bbox.getNorthEast().lat, bbox.getNorthEast().lng),
          toGcjLatLng(bbox.getNorthWest().lat, bbox.getNorthWest().lng),
          toGcjLatLng(bbox.getSouthWest().lat, bbox.getSouthWest().lng),
        ]);

        circle.setLatLng(gcjCenter);

        const lBox = poly.getBounds();
        const cBox = circle.getBounds();
        const bounds = cBox.contains(lBox) ? cBox : lBox;

        map.fitBounds(bounds);
        map.pm.enableGlobalEditMode();

        $latitude.value = center.lat;
        $longitude.value = center.lng;
      })
      .addTo(map);

    map.fitBounds(circle.getBounds(), { animate: false });
  },
};

export const Modal = {
  _freeze() {
    document.documentElement.classList.add("is-clipped");
  },

  _unfreeze() {
    document.documentElement.classList.remove("is-clipped");
  },

  mounted() {
    // assumption: 'is-active' is always added after the initial mount
  },

  updated() {
    this.el.classList.contains("is-active") ? this._freeze() : this._unfreeze();
  },

  destroyed() {
    this._unfreeze();
  },
};

export const NumericInput = {
  mounted() {
    this.el.onkeypress = (evt) => {
      const charCode = evt.which ? evt.which : evt.keyCode;
      return !(charCode > 31 && (charCode < 48 || charCode > 57));
    };
  },
};

export const ThemeSelector = {
  mounted() {
    const select = this.el.querySelector("select");
    if (select) {
      select.addEventListener("change", (e) => {
        const themeMode = e.target.value;
        document.documentElement.setAttribute("data-theme-mode", themeMode);

        // Apply theme immediately
        let actualTheme = themeMode;
        if (themeMode === "system") {
          actualTheme = window.matchMedia("(prefers-color-scheme: dark)")
            .matches
            ? "dark"
            : "light";
        }
        document.documentElement.setAttribute("data-theme", actualTheme);
      });
    }
  },
};
