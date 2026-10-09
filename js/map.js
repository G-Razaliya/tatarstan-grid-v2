import { cities, schoolCity } from "./config.js";
import { curvedPath, quadraticPath, svgElement } from "./svg.js";

// Создаёт карту и SVG-слой с городами и соединениями.
export function initializeMap() {
  // Карта служит фоном презентации: ручная навигация отключена.
  const map = L.map("leafletMap", {
    zoomControl: false, attributionControl: false,
    center: [55.4, 51], zoom: 7.6, zoomSnap: 0.1,
    zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false,
    dragging: false, touchZoom: false, doubleClickZoom: false,
    scrollWheelZoom: false, boxZoom: false, keyboard: false, inertia: false
  });
  // Спутниковые тайлы загружаются из внешнего сервиса ArcGIS.
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 18, crossOrigin: true
  }).addTo(map);

  // SVG-группы разделяют постоянные элементы и временные эффекты.
  const overlay = document.getElementById("mapOverlay");
  const threadsLayer = document.getElementById("threadsLayer");
  const citiesLayer = document.getElementById("citiesLayer");
  const fxLayer = document.getElementById("fxLayer");
  const hub = cities.find(city => city.hub);
  // Сохраняем элементы, чтобы при масштабировании менять только координаты.
  const markers = [];
  const threads = [];
  let bounds;
  let schoolMarker;
  let schoolLink;
  let resizeFrame;

  // Переводит широту и долготу в пиксели контейнера Leaflet.
  function project(city) {
    const { x, y } = map.latLngToContainerPoint([city.lat, city.lon]);
    return [x, y];
  }

  // Кривая соединяет Казань с лицеем в текущем масштабе.
  function connectionPath() {
    return quadraticPath(project(hub), project(schoolCity));
  }

  // Совмещает SVG с картой, сохраняя текущие анимации.
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
    // Перемещаем также подключённую линию и ещё активные эффекты.
    if (schoolLink) schoolLink.setAttribute("d", connectionPath());
    fxLayer.querySelectorAll(".impulse").forEach(element => {
      element.setAttribute("d", connectionPath());
    });
    const [x, y] = project(schoolCity);
    fxLayer.querySelectorAll(".school-effect").forEach(element => {
      element.setAttribute("transform", `translate(${x}, ${y})`);
    });
  }

  // Вписывает Татарстан в свободное место между панелями.
  function fit() {
    if (!bounds) return;
    // Обновляем размер Leaflet перед расчётом границ и отступов.
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

  // Собирает свечение, точку и подпись города либо лицея.
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

  // Один раз создаёт сеть; появление городов идёт с задержкой.
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

  // Загружает контур, затем подготавливает фон и сеть городов.
  async function loadRegion() {
    const response = await fetch("tatarstan.geojson");
    if (!response.ok) throw new Error(`Не удалось загрузить карту: HTTP ${response.status}`);
    const data = await response.json();
    const region = data.type === "FeatureCollection" ? data.features[0] : data;
    bounds = L.geoJSON(region).getBounds();
    // GeoJSON хранит [долготу, широту], Leaflet ожидает обратный порядок.
    const flip = coordinates => typeof coordinates[0] === "number"
      ? [coordinates[1], coordinates[0]] : coordinates.map(flip);
    const coordinates = flip(region.geometry.coordinates);
    // Для Polygon и MultiPolygon берём внешние кольца.
    const rings = region.geometry.type === "Polygon" ? [coordinates[0]] : coordinates.map(polygon => polygon[0]);
    const world = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
    // Многоугольник с вырезом затемняет территорию вне региона.
    L.polygon([world, ...rings], {
      stroke: false, fillColor: "#010818", fillOpacity: 0.85, interactive: false
    }).addTo(map);
    // Отдельная линия создаёт светящийся контур Татарстана.
    L.polygon(rings, {
      color: "#00e8ff", weight: 3.5, fill: false,
      className: "tatar-glow-border", interactive: false
    }).addTo(map);
    fit();
    buildCities();
  }

  // Добавляет постоянную зелёную линию без дублирования.
  function addSchoolConnection() {
    if (schoolLink) return;
    schoolLink = svgElement("path", {
      class: "thread school-thread visible drawn", d: connectionPath()
    });
    threadsLayer.append(schoolLink);
  }

  // Привязывает временную группу эффектов к координатам лицея.
  function addSchoolEffect(element) {
    const group = svgElement("g", { class: "school-effect" });
    group.append(element);
    fxLayer.append(group);
    synchronize();
    return group;
  }

  // Движение карты обновляет SVG, resize пересчитывает масштаб раз за кадр.
  map.on("move zoom resize", synchronize);
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(fit);
  });

  // Внешний код получает готовность сцены и действия подключения.
  return {
    ready: loadRegion(), fit, connectionPath, fxLayer, addSchoolConnection, addSchoolEffect,
    showSchool: () => schoolMarker.classList.add("show")
  };
}
