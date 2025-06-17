function initGeocoder() {
  geocoder = new MaplibreGeocoder({
    maplibregl: maplibregl,
    placeholder: "Buscar dirección...",
    marker: true,
    limit: 10,
    proximity: [-99.1332, 19.4326],

    forwardGeocode: async (config) => {
      const features = [];
      try {
        const request = `https://nominatim.openstreetmap.org/search?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1&countrycodes=MX&limit=10`;
        const response = await fetch(request);
        const geojson = await response.json();

        for (const feature of geojson.features) {
          const center = [
            feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
            feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2
          ];
          features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: center },
            place_name: feature.properties.display_name,
            properties: feature.properties,
            text: feature.properties.display_name,
            place_type: ['place'],
            center
          });
        }
      } catch (e) {
        console.error(`Error en la búsqueda: ${e}`);
      }
      return { features };
    }
  });

  document.getElementById('geocoder-container').appendChild(geocoder.onAdd(map));

  geocoder.on('result', function(e) {
    const lngLat = e.result.center;

    map.flyTo({ center: lngLat, zoom: 12 });

    seleccionarNivel('municipal');
    map.setLayoutProperty('municipio-bordes', 'visibility', 'visible');
    map.setLayoutProperty('escuelas-layer', 'visibility', 'visible');
    map.setLayoutProperty('parques-layer', 'visibility', 'visible');
    map.setLayoutProperty('homicidios-layer', 'visibility', 'visible');

    const layers = ['municipio-bordes', 'escuelas-layer', 'parques-layer','homicidios-layer'];
    layers.forEach(layer => {
      const checkbox = document.querySelector(`input[onchange*="${layer}"]`);
      if (checkbox) {
        checkbox.checked = true;
        const slider = checkbox.nextElementSibling;
        if (slider) slider.classList.add('active');
      }
    });

    if (geojsonMunicipios) {
      const point = turf.point(lngLat);

      const municipioEncontrado = geojsonMunicipios.features.find(mun =>
        turf.booleanPointInPolygon(point, mun)
      );

      if (municipioEncontrado) {
        const nom_ent = municipioEncontrado.properties.NOM_ENT;
        const nom_geo = municipioEncontrado.properties.NOMGEO;
        const cvegeo = municipioEncontrado.properties.CVEGEO;

        document.getElementById('selector-estado').value = nom_ent;
        filtrarPorEstado(nom_ent);

        setTimeout(() => {
          const selectorMunicipio = document.getElementById('select-municipio');
          selectorMunicipio.disabled = false;
          selectorMunicipio.value = cvegeo;
        }, 300);
      } else {
        console.warn('No se encontró municipio en el GeoJSON.');
      }
    } else {
      console.error('geojsonMunicipios no está cargado.');
    }
  });

  const icon = document.getElementById('geocoder-icon');
  const container = document.getElementById('geocoder-container');
  icon.addEventListener('click', function() {
    const visible = container.style.display === 'block';
    container.style.display = visible ? 'none' : 'block';
    if (!visible) {
      setTimeout(() => {
        const input = container.querySelector('input');
        if (input) input.focus();
      }, 100);
    }
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#geocoder-container') && !e.target.closest('#geocoder-icon')) {
      container.style.display = 'none';
    }
  });
}
