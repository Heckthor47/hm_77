// Configura el mapa base y carga Entidades.geojson

const map = new maplibregl.Map({
  container: "map",
  style: "https://www.datosgeoespaciales.atdt.gob.mx/api/style_white.json",
  center: [-99.1332, 19.4326],
  zoom: 5
});

let estadosGeoJson = null;
let bboxNacional = null;

map.on("load", () => {

  // Cargar Entidades.geojson
  fetch("https://fabulous-dodol-d03b96.netlify.app/entidades.geojson")
    .then(r => r.json())
    .then(data => {
      estadosGeoJson = data;
      bboxNacional = turf.bbox(estadosGeoJson);
    })
    .catch(err => console.error("Error al cargar Entidades.geojson:", err));

  // Cargar parques 
  // 1. Agrega la fuente "parques"
  map.addSource("parques", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/parques.geojson"
  });

// 2. Carga la imagen personalizada y crea la capa "symbol"
  map.loadImage('imagenes/tree-fill.png', (error, image) => {
    if (error) {
      console.error("Error al cargar la imagen tree-fill.png", error);
      return;
    }

    if (!map.hasImage('icono-parque')) {
      map.addImage('icono-parque', image);
    }

  // 3. Agrega la capa con icono
    map.addLayer({
      id: 'parques-layer',
      type: 'symbol',
      source: 'parques',
      layout: {
        'icon-image': 'icono-parque',
        'icon-size': 0.1
      },
      filter: ['==', 'CVE_ENT', '']
    });
    map.setLayoutProperty("parques-layer", "visibility", "none");
  });


  map.addSource("homicidios", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/homicidios.geojson"
  });


  // Añadir capa de homicidios
  map.addLayer({
    id: "homicidios-layer",
    type: "circle",
    source: "homicidios",
    paint: {
      "circle-radius": 3,
      "circle-color": "#F9EFA5",
      "circle-opacity": 0.8,
      "circle-stroke-color": "black",
      "circle-stroke-width": 1
    },
    filter: ["==", "CVE_ENT", ""]
  });


// Añadir capa de escuelas
  // 1. Fuente GeoJSON
  map.addSource("escuelas", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/escuelas.geojson"
  });

// 2. Cargar imagen personalizada y crear capa 'symbol'
  map.loadImage('imagenes/school1.png', (error, image) => {
    if (error) {
      console.error("Error al cargar escuela.png", error);
      return;
    }

    if (!map.hasImage('icono-escuela')) {
      map.addImage('icono-escuela', image);
    }

  // 3. Agregar la capa
    map.addLayer({
      id: 'escuelas-layer',
      type: 'symbol',
      source: 'escuelas',
      layout: {
        'icon-image': 'icono-escuela',
        'icon-size': 0.1,
        'icon-allow-overlap': true
      },
      filter: ['==', 'CVE_ENT', '']
    });

  // 4. Ocultar la capa al inicio
    map.setLayoutProperty('escuelas-layer', 'visibility', 'none');
  });


  //Poner el geocoder
  const geocoder = new MaplibreGeocoder({
  maplibregl: maplibregl,
  placeholder: "Buscar lugar o dirección...",
  // Usamos Nominatim como geocodificador
  forwardGeocode: async (config) => {
    const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(config.query)}&format=geojson&limit=5`;
    const response = await fetch(request);
    const geojson = await response.json();
    return {
      features: geojson.features.map((feature) => {
        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: feature.properties,
          place_name: feature.properties.display_name,
          center: feature.geometry.type === "Point" ? feature.geometry.coordinates : undefined
        };
      })
    };
  }
});

// Agregamos el control al mapa (posición: top-left)
map.addControl(geocoder, "top-right");

geocoder.on("result", (e) => {
  // 0) Recuperar coordenadas
  const lngLat = e.result.center;     // [lon, lat]
  const [lng, lat] = lngLat;

  // 1) Volar al punto
  map.flyTo({
    center: lngLat,
    zoom: 14,
    speed: 1.2,
    curve: 1
  });

  // 2) Activar visibilidad de capas
  const layersToShow = ["homicidios-layer", "parques-layer", "escuelas-layer"];
  layersToShow.forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", "visible");
    }
  });

  // 3) Sincronizar los checkboxes de la UI
  const toggles = ["toggle-homicidios", "toggle-parques", "toggle-escuelas"];
  toggles.forEach(toggleId => {
    const input = document.getElementById(toggleId);
    if (input && !input.checked) {
      input.checked = true;
      toggleLayer(toggleId, input);
    }
  });

  // 4) Determinar en qué estado cayó el punto
  const point = turf.point(lngLat);
  const feature = estadosGeoJson.features.find(f =>
    turf.booleanPointInPolygon(point, f)
  );

  if (!feature) {
    console.log("El punto NO cayó en ningún estado");
    removerCapaCalles();
    removerCapaEstado();
    map.setFilter("parques-layer",    ["==", "CVE_ENT", ""]);
    map.setFilter("homicidios-layer", ["==", "CVE_ENT", ""]);
    map.setFilter("escuelas-layer",   ["==", "CVE_ENT", ""]);
    return;
  }

  // 5) Si cayó en un estado, cargar calles y filtrar las demás capas
  const codigoEntidad = feature.properties.CVE_ENT;
  console.log("Estado:", codigoEntidad);

  // a) Calles https://.../calles${codigoEntidad}.geojson
  removerCapaCalles();
  const rutaCalles = `https://fabulous-dodol-d03b96.netlify.app/calles${codigoEntidad}.geojson`;
  map.addSource("calles", { type: "geojson", data: rutaCalles });
  // insertar la capa antes de las demás
  map.addLayer({
    id: "calles-layer",
    type: "line",
    source: "calles",
    paint: {
      "line-color": ["get", "colores"],
      "line-width": 1
    },
    minzoom: 12
  });

  // b) Filtrar parques, homicidios y escuelas
  ["parques-layer", "homicidios-layer", "escuelas-layer"]
    .forEach(id => map.setFilter(id, ["==", "CVE_ENT", codigoEntidad]));

  // c) Dibujar polígono del estado
  removerCapaEstado();
  map.addSource("estado-source", { type: "geojson", data: feature });
  map.addLayer({
    id: "estado-fill",
    type: "fill",
    source: "estado-source",
    paint: { "fill-color": "#088", "fill-opacity": 0.2 }
  });
  map.addLayer({
    id: "estado-outline",
    type: "line",
    source: "estado-source",
    paint: { "line-color": "#005", "line-width": 2 }
  });
});


geocoder.on("clear", () => {
  console.log("Búsqueda borrada → regresando a vista nacional");

  removerCapaCalles();
  removerCapaEstado();
  map.setFilter("parques-layer", ["==", "CVE_ENT", ""]);
  map.setFilter("homicidios-layer", ["==", "CVE_ENT", ""]);
  map.setFilter("escuelas-layer", ["==", "CVE_ENT", ""]);

  if (bboxNacional) {
    map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
  }
});

map.setLayoutProperty("parques-layer", "visibility", "none");
map.setLayoutProperty("homicidios-layer", "visibility", "none");
map.setLayoutProperty("escuelas-layer", "visibility", "none");

document.getElementById("toggle-parques").checked = false;
document.getElementById("toggle-homicidios").checked = false;
document.getElementById("toggle-escuelas").checked = false;

});