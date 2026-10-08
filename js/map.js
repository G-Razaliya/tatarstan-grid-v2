import { cities, schoolCity } from "./config.js";
import { curvedPath, quadraticPath, svgElement } from "./svg.js";

export function initializeMap() {
  const map = L.map("leafletMap", {
    zoomControl: false, attributionControl: false,
    center: [55.4, 51], zoom: 7.6, zoomSnap: 0.1,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
    dragging: false, touchZoom: false, doubleClickZoom: false,
    scrollWheelZoom: false, boxZoom: false, keyboard: false, inertia: false
  });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18, crossOrigin: true
  }).addTo(map);

  const overlay = document.getElementById("mapOverlay");
  const threadsLayer = document.getElementById("threadsLayer");
  const citiesLayer = document.getElementById("citiesLayer");
  const fxLayer = document.getElementById("fxLayer");
  const hub = cities.find(city => city.hub);
  const markers = [];
  const threads = [];
  let bounds;
  let schoolMarker;
  let schoolLink;
  let resizeFrame;

  function project(city) {
    const { x, y } = map.latLngToContainerPoint([city.lat, city.lon]);
    return [x, y];
  }

  function connectionPath() {
    return quadraticPath(project(hub), project(schoolCity));
  }

  function synchronize() {
    const { x: width, y: height } = map.getSize();
    overlay.setAttribute("viewBox", `0 0 ${width} ${height}`);
    overlay.setAttribute("width", width);
    overlay.setAttribute("height", height);
    markers.forEach(({ city, element }) => {
      const [x, y] = project(city);
      element.setAttribute("transform", `translate(${x}, ${y})`);
    });
    threads.forEach(({ city, index, element }) => {
      element.setAttribute("d", curvedPath(project(hub), project(city), index));
    });
    if (schoolLink) schoolLink.setAttribute("d", connectionPath());
    fxLayer.querySelectorAll(".impulse").forEach(element => {
      element.setAttribute("d", connectionPath());
    });
    const [x, y] = project(schoolCity);
    fxLayer.querySelectorAll(".school-effect").forEach(element => {
      element.setAttribute("transform", `translate(${x}, ${y})`);
    });
  }

  function fit() {
    if (!bounds) return;
    map.invalidateSize({ pan: false });
    const { x: width, y: height } = map.getSize();
    const stat = document.querySelector(".stat-panel").getBoundingClientRect();
    const school = document.querySelector(".school-panel").getBoundingClientRect();
    const title = document.querySelector(".title").getBoundingClientRect();
    map.fitBounds(bounds, {
      paddingTopLeft: [Math.min(stat.right + 40, width * 0.25), Math.min(title.bottom + 40, height * 0.25)],
      paddingBottomRight: [Math.min(width - school.left + 40, width * 0.25), height * 0.3],
      animate: false
    });
    synchronize();
  }

  function createMarker(city, school = false) {
    const element = svgElement("g", {
      class: school ? "school-marker" : `city${city.hub ? " hub" : ""}`
    });
    element.append(svgElement("circle", {
      class: school ? "school-glow" : "city-glow", r: school ? 30 : city.hub ? 42 : 22
    }));
    if (school) element.append(svgElement("circle", { class: "school-halo", r: 18 }));
    element.append(svgElement("circle", {
      class: school ? "school-core" : "city-core", r: school ? 6 : city.hub ? 9 : 5
    }));
    element.append(svgElement("text", {
      class: school ? "school-label" : "city-label",
      x: city.labelOffset[0], y: city.labelOffset[1], "text-anchor": city.anchor
    }, city.name));
    citiesLayer.append(element);
    markers.push({ city, element });
    return element;
  }

  function buildCities() {
    cities.forEach((city, index) => {
      if (!city.hub) {
        const element = svgElement("path", { class: "thread" });
        threadsLayer.append(element);
        threads.push({ city, index, element });
        setTimeout(() => element.classList.add("visible", "drawn"), 300);
      }
      const marker = createMarker(city);
      setTimeout(() => marker.classList.add("visible"), 500 + index * 200);
    });
    schoolMarker = createMarker(schoolCity, true);
    synchronize();
  }

  async function loadRegion() {
    const response = await fetch("tatarstan.geojson");
    if (!response.ok) throw new Error(`Не удалось загрузить карту: HTTP ${response.status}`);
    const data = await response.json();
    const region = data.type === "FeatureCollection" ? data.features[0] : data;
    bounds = L.geoJSON(region).getBounds();
    const flip = coordinates => typeof coordinates[0] === "number"
      ? [coordinates[1], coordinates[0]] : coordinates.map(flip);
    const coordinates = flip(region.geometry.coordinates);
    const rings = region.geometry.type === "Polygon" ? [coordinates[0]] : coordinates.map(polygon => polygon[0]);
    const world = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
    L.polygon([world, ...rings], {
      stroke: false, fillColor: "#010818", fillOpacity: 0.85, interactive: false
    }).addTo(map);
    L.polygon(rings, {
      color: "#00e8ff", weight: 3.5, fill: false,
      className: "tatar-glow-border", interactive: false
    }).addTo(map);
    fit();
    buildCities();
  }

  function addSchoolConnection() {
    if (schoolLink) return;
    schoolLink = svgElement("path", {
      class: "thread school-thread visible drawn", d: connectionPath()
    });
    threadsLayer.append(schoolLink);
  }

  function addSchoolEffect(element) {
    const group = svgElement("g", { class: "school-effect" });
    group.append(element);
    fxLayer.append(group);
    synchronize();
    return group;
  }

  map.on("move zoom resize", synchronize);
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fit);
  });

  return {
    ready: loadRegion(), fit, connectionPath, fxLayer, addSchoolConnection, addSchoolEffect,
    showSchool: () => schoolMarker.classList.add("show")
  };
}
