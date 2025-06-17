function seleccionarNivel(nivel) {
  document.querySelectorAll('.mapa-tab').forEach(tab => tab.classList.remove('active'));
  const tabActiva = document.getElementById(`tab-${nivel}`);
  if (tabActiva) tabActiva.classList.add('active');

  if (nivel === 'nacional') {
    document.getElementById('dropdown-estatal').style.display = 'none';
    document.getElementById('dropdown-municipal').style.display = 'none';
  } else if (nivel === 'estatal') {
    document.getElementById('dropdown-estatal').style.display = 'block';
    document.getElementById('dropdown-municipal').style.display = 'none';
  } else if (nivel === 'municipal') {
    document.getElementById('dropdown-estatal').style.display = 'block';
    document.getElementById('dropdown-municipal').style.display = 'block';
    document.getElementById('select-municipio').disabled = true;
  }
}

function filtrarPorEstado(nombreEstado) {
  const cveEnt = nombreEstadoACveEnt[nombreEstado];
  if (!cveEnt) {
    console.error("No se encontró el código para el estado:", nombreEstado);
    return;
  }

  map.setFilter('escuelas', ['==', ['get', 'CVE_ENT'], cveEnt]);
  map.setFilter('parques', ['==', ['get', 'CVE_ENT'], cveEnt]);
  map.setLayoutProperty('escuelas', 'visibility', 'visible');
  map.setLayoutProperty('parques', 'visibility', 'visible');
  document.querySelector(`input[onchange*="escuelas"]`).checked = true;
  document.querySelector(`input[onchange*="parques"]`).checked = true;

  const municipioSelect = document.getElementById('select-municipio');
  if (document.getElementById('tab-municipal').classList.contains('active') && geojsonMunicipios) {
    municipioSelect.disabled = false;
    municipioSelect.innerHTML = '<option value="">-- Municipio --</option>';

    const municipiosDelEstado = geojsonMunicipios.features.filter(
      feature => feature.properties.CVEGEO.startsWith(cveEnt)
    );

    municipiosDelEstado.forEach(municipio => {
      const option = document.createElement('option');
      option.value = municipio.properties.CVEGEO;
      option.textContent = municipio.properties.NOMGEO;
      municipioSelect.appendChild(option);
    });
  }
}

function filtrarPorMunicipio(cvegeoMunicipio) {
  if (!cvegeoMunicipio || !geojsonMunicipios) {
    console.error("No hay municipio seleccionado o municipios no cargados.");
    return;
  }

  const municipio = geojsonMunicipios.features.find(
    feature => feature.properties.CVEGEO === cvegeoMunicipio
  );

  if (!municipio) {
    console.error("No se encontró el municipio con CVEGEO:", cvegeoMunicipio);
    return;
  }

  const bounds = turf.bbox(municipio);
  map.fitBounds(bounds, {
    padding: 40,
    maxZoom: 14,
    duration: 1000
  });

  map.setLayoutProperty('municipio-bordes', 'visibility', 'visible');

  const checkboxMunicipio = document.querySelector('input[onchange*="municipio-bordes"]');
  if (checkboxMunicipio) {
    checkboxMunicipio.checked = true;
    const slider = checkboxMunicipio.nextElementSibling;
    if (slider) {
      slider.classList.add('active');
    }
  }
}
