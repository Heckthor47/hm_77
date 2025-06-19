// Estilo de mapas (se usa el de la agencia)
const map = new maplibregl.Map({
  container: "map",
  style: "https://www.datosgeoespaciales.atdt.gob.mx/api/style_white.json",
  center: [-99.1332, 19.4326],
  zoom: 5
});

let estadosGeoJson = null;
let bboxNacional = null;
let estadoSeleccionado = null;
let bboxEstadoSeleccionado = null;
let geocoder = null;

map.on("load", () => {
  // 1. ENTIDADES GEOJSON
  fetch("https://fabulous-dodol-d03b96.netlify.app/entidades.geojson")
    .then(r => r.json())
    .then(data => {
      estadosGeoJson = data;
      bboxNacional = turf.bbox(estadosGeoJson);
      
    })
    .catch(err => console.error("Error al cargar Entidades.geojson:", err));

  // 2. HOMICIDIOS
  map.addSource("homicidios", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/homicidios.geojson"
  });
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
  map.setLayoutProperty("homicidios-layer", "visibility", "none");
  document.getElementById("toggle-homicidios").checked = false;

  // 3. PARQUES
  map.addSource("parques", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/parques.geojson"
  });
  map.loadImage('imagenes/tree-fill.png', (error, image) => {
    if (error) return console.error("Error al cargar imagen de parques", error);
    if (!map.hasImage('icono-parque')) map.addImage('icono-parque', image);
    map.addLayer({
      id: 'parques-layer',
      type: 'symbol',
      source: 'parques',
      layout: { 'icon-image': 'icono-parque', 'icon-size': 0.1 },
      filter: ['==', 'CVE_ENT', '']
    });
    map.setLayoutProperty("parques-layer", "visibility", "none");
    document.getElementById("toggle-parques").checked = false;
  });

  // 4. ESCUELAS
  map.addSource("escuelas", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/escuelas.geojson"
  });
  map.loadImage('imagenes/school1.png', (error, image) => {
    if (error) return console.error("Error al cargar imagen de escuelas", error);
    if (!map.hasImage('icono-escuela')) map.addImage('icono-escuela', image);
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
    map.setLayoutProperty("escuelas-layer", "visibility", "none");
    document.getElementById("toggle-escuelas").checked = false;
  });

  // 5. Función para activar geocoder al seleccionar estado
  function activarGeocoderParaEstado(featureEstado) {
    if (geocoder) {
      map.removeControl(geocoder);
      geocoder = null;
    }

    bboxEstadoSeleccionado = turf.bbox(featureEstado);
    const nombreEstado = featureEstado.properties.NOM_ENT.toLowerCase();

    geocoder = new MaplibreGeocoder({
      maplibregl: maplibregl,
      placeholder: "Buscar lugar o dirección...",
      forwardGeocode: async (config) => {
        const bbox = bboxEstadoSeleccionado;
        const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(config.query)}&format=geojson&limit=10&viewbox=${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}&bounded=1`;
        const response = await fetch(request);
        const geojson = await response.json();
        const filtered = geojson.features.filter(f =>
          (f.properties.display_name || '').toLowerCase().includes(nombreEstado)
        );
        return {
          features: filtered.map(f => ({
            type: "Feature",
            geometry: f.geometry,
            properties: f.properties,
            place_name: f.properties.display_name,
            center: f.geometry.type === "Point" ? f.geometry.coordinates : undefined
          }))
        };
      }
    });
    console.log("Agregando geocoder...");
    map.addControl(geocoder, "top-right");

    geocoder.on("result", (e) => {
      const lngLat = e.result.center;
      const codigoEntidad = featureEstado.properties.CVE_ENT;
      map.flyTo({ center: lngLat, zoom: 14, speed: 1, curve: 1 });

      // Activar capas y filtros
      ["parques-layer", "homicidios-layer", "escuelas-layer"].forEach(id => {
        if (map.getLayer(id)) {
          map.setFilter(id, ["==", "CVE_ENT", codigoEntidad]);
          map.setLayoutProperty(id, "visibility", "visible");
        }
      });

      ["toggle-parques", "toggle-homicidios", "toggle-escuelas"].forEach(toggleId => {
        const input = document.getElementById(toggleId);
        if (input && !input.checked) {
          input.checked = true;
          toggleLayer(toggleId, input);
        }
      });

      // Cargar calles
      removerCapaCalles();
      map.addSource("calles", {
        type: "geojson",
        data: `https://fabulous-dodol-d03b96.netlify.app/calles${codigoEntidad}.geojson`
      });
      map.addLayer({
        id: "calles-layer",
        type: "line",
        source: "calles",
        paint: {
          "line-color": ["get", "colores"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 0, 0.2, 10, 1.2, 14, 2]
        }
      });
      map.once('idle', () => {
        map.setLayoutProperty("calles-layer", "visibility", "none");
        setTimeout(() => {
          map.setLayoutProperty("calles-layer", "visibility", "visible");
        }, 100);
      });

      // Polígono del estado
      removerCapaEstado();
      map.addSource("estado-source", { type: "geojson", data: featureEstado });
      map.addLayer({ id: "estado-fill", type: "fill", source: "estado-source", paint: { "fill-color": "#088", "fill-opacity": 0.2 } });
      map.addLayer({ id: "estado-outline", type: "line", source: "estado-source", paint: { "line-color": "#005", "line-width": 2 } });
    });

    geocoder.on("clear", () => {
      removerCapaCalles();
      removerCapaEstado();
      ["parques-layer", "homicidios-layer", "escuelas-layer"].forEach(id => {
        if (map.getLayer(id)) {
          map.setFilter(id, ["==", "CVE_ENT", ""]);
          map.setLayoutProperty(id, "visibility", "none");
        }
      });
      if (estadoSeleccionado && bboxEstadoSeleccionado) {
        map.fitBounds(bboxEstadoSeleccionado, { padding: 20, duration: 1000 });
      } else if (bboxNacional) {
        map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
      }
    });
  }

  map.on("click", (e) => {
    console.log("Se hizo clic en el mapa");
    if (!estadosGeoJson){
      console.warn("Estados GeoJSON no cargado aún");
      return;
    } 
    const point = turf.point([e.lngLat.lng, e.lngLat.lat]);
    const feature = estadosGeoJson.features.find(f => turf.booleanPointInPolygon(point, f));
    if (feature) {
      console.log("Se seleccionó un estado:", feature.properties.NOM_ENT);
      estadoSeleccionado = feature;
      activarGeocoderParaEstado(feature);
    } else {
      console.log("No se hizo clic dentro de un estado");
      estadoSeleccionado = null;
      bboxEstadoSeleccionado = null;
      if (geocoder) {
        map.removeControl(geocoder);
        geocoder = null;
      }
      removerCapaEstado();
      removerCapaCalles();
      ["parques-layer", "homicidios-layer", "escuelas-layer"].forEach(id => {
        if (map.getLayer(id)) {
          map.setFilter(id, ["==", "CVE_ENT", ""]);
          map.setLayoutProperty(id, "visibility", "none");
        }
      });
      if (bboxNacional) {
        map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
      }
    }
  });
});
