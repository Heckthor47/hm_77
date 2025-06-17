let estadosGeoJson = null;
let bboxNacional = null;

function cargarEstadosGeoJson() {
  fetch("https://incandescent-biscochitos-5bb3b9.netlify.app/entidades.geojson")
    .then(response => {
      if (!response.ok) throw new Error("Error al cargar estados.geojson");
      return response.json();
    })
    .then(data => {
      estadosGeoJson = data;
      bboxNacional = turf.bbox(estadosGeoJson);
    })
    .catch(error => {
      console.error("No se pudo obtener estados.geojson:", error);
    });
}

function removerCapaYCapaFuente(nombreCapa, nombreFuente) {
  if (map.getLayer(nombreCapa)) {
    map.removeLayer(nombreCapa);
  }
  if (map.getSource(nombreFuente)) {
    map.removeSource(nombreFuente);
  }
}

function removerCapaCalles() {
  removerCapaYCapaFuente("calles-layer", "calles");
}

function removerCapaEstado() {
  removerCapaYCapaFuente("estado-fill", "estado-source");
  removerCapaYCapaFuente("estado-outline", "estado-source");
}

function manejarCambioEstado() {
  const seleccion = document.getElementById("selector-estado").value;
  
  if (!seleccion) {
    removerCapaCalles();
    removerCapaEstado();

    if (bboxNacional) {
      map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
    }
    return;
  }

  const codigoEntidad = seleccion.replace("calles", "");
  if (!estadosGeoJson) {
    console.warn("Aún no se ha cargado estadosGeoJson");
    return;
  }

  const featureSeleccionado = estadosGeoJson.features.find(f => {
    return f.properties.CVE_ENT == codigoEntidad;
  });

  if (!featureSeleccionado) {
    console.error("No se encontró la entidad con CVE_ENT =", codigoEntidad);
    return;
  }

  removerCapaCalles();
  removerCapaEstado();

  map.addSource("estado-source", {
    type: "geojson",
    data: featureSeleccionado
  });

  map.addLayer({
    id: "estado-fill",
    type: "fill",
    source: "estado-source",
    paint: {
      "fill-color": "#088",
      "fill-opacity": 0.2
    }
  });

  map.addLayer({
    id: "estado-outline",
    type: "line",
    source: "estado-source",
    paint: {
      "line-color": "#005",
      "line-width": 2
    }
  });

  const bboxEstado = turf.bbox(featureSeleccionado);
  map.fitBounds(bboxEstado, { padding: 20, duration: 1000 });

  const rutaCalles = `https://incandescent-biscochitos-5bb3b9.netlify.app/${seleccion}.geojson`;
  map.addSource("calles", {
    type: "geojson",
    data: rutaCalles
  });

  map.addLayer({
    id: "calles-layer",
    type: "line",
    source: "calles",
    paint: {
      "line-color": ["get", "colores"],
      "line-width": 1
    }
  });
}
