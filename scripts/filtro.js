import { municipiosGeoJson } from './mapa_config.js';
import { estadosGeoJson } from './mapa_config.js';
import { activarVistaLocal } from './mapa_config.js';

// ==========================
// Diccionario de estados (CVE_ENT -> nombre y key)
// ==========================
const diccionarioEstados = {
  "01": { label: "Aguascalientes", value: "01" },
  "02": { label: "Baja California", value: "02" },
  "03": { label: "Baja California Sur", value: "03" },
  "04": { label: "Campeche", value: "04" },
  "05": { label: "Coahuila", value: "05" },
  "06": { label: "Colima", value: "06" },
  "07": { label: "Chiapas", value: "07" },
  "08": { label: "Chihuahua", value: "08" },
  "09": { label: "Ciudad de México", value: "09" },
  "10": { label: "Durango", value: "10" },
  "11": { label: "Guanajuato", value: "11" },
  "12": { label: "Guerrero", value: "12" },
  "13": { label: "Hidalgo", value: "13" },
  "14": { label: "Jalisco", value: "14" },
  "15": { label: "Estado de México", value: "15" },
  "16": { label: "Michoacán", value: "16" },
  "17": { label: "Morelos", value: "17" },
  "18": { label: "Nayarit", value: "18" },
  "19": { label: "Nuevo León", value: "19" },
  "20": { label: "Oaxaca", value: "20" },
  "21": { label: "Puebla", value: "21" },
  "22": { label: "Querétaro", value: "22" },
  "23": { label: "Quintana Roo", value: "23" },
  "24": { label: "San Luis Potosí", value: "24" },
  "25": { label: "Sinaloa", value: "25" },
  "26": { label: "Sonora", value: "26" },
  "27": { label: "Tabasco", value: "27" },
  "28": { label: "Tamaulipas", value: "28" },
  "29": { label: "Tlaxcala", value: "29" },
  "30": { label: "Veracruz", value: "30" },
  "31": { label: "Yucatán", value: "31" },
  "32": { label: "Zacatecas", value: "32" }
};

// ==========================
// Custom element: dropdown
// ==========================
class DropdownFiltrosUbicacion extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="dropdown-filtros-ubicacion">
        <div class="grupo-estado">
          <label for="select-estado">Selecciona un estado:</label>
          <select id="select-estado">
            <option value="">-- Estado --</option>
          </select>
        </div>
        <div class="grupo-municipio">
          <label for="select-municipio">Selecciona un municipio:</label>
          <select id="select-municipio" disabled>
            <option value="">-- Municipio --</option>
          </select>
        </div>
      </div>
    `;
    this.estadoSelect = this.querySelector('#select-estado');
    this.municipioSelect = this.querySelector('#select-municipio');
    this.estados = [];
    this._initListeners();
  }

  _initListeners() {
    this.estadoSelect.addEventListener('change', () => {
      if (!this.estadoSelect || !this.estadoSelect.value) {
        console.warn("El selector de estado no tiene un valor válido.");
        return;
      }

      const estado = this.estados.find(e => e.value === this.estadoSelect.value);
      if (estado) {
        this._poblarMunicipios(estado.municipios);
        this.municipioSelect.disabled = false;
      } else {
        this._poblarMunicipios([]);
        this.municipioSelect.disabled = true;
      }

      // Disparar evento personalizado
      this.dispatchEvent(new CustomEvent('estado-change', {
        detail: { value: this.estadoSelect.value },
        bubbles: true
      }));
    });

    this.municipioSelect.addEventListener('change', () => {
      this.dispatchEvent(new CustomEvent('municipio-change', {
        detail: { value: this.municipioSelect.value },
        bubbles: true
      }));
    });
  }

  setEstados(estados) {
    this.estados = estados;
    this.estadoSelect.innerHTML = '<option value="">-- Estado --</option>';
    estados.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.value;
      opt.textContent = e.label;
      this.estadoSelect.appendChild(opt);
    });
    this.municipioSelect.disabled = true;
    this._poblarMunicipios([]);
  }

  _poblarMunicipios(municipios) {
    this.municipioSelect.innerHTML = '<option value="">-- Municipio --</option>';
    municipios.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      this.municipioSelect.appendChild(opt);
    });
  }

  get value() {
    return {
      estado: this.estadoSelect.value,
      municipio: this.municipioSelect.value
    };
  }
}
customElements.define('dropdown-filtros-ubicacion', DropdownFiltrosUbicacion);

document.addEventListener("municipios-cargados", () => {
  if (!municipiosGeoJson || !municipiosGeoJson.features) {
    console.error("Los datos de municipios no están disponibles.");
    return;
  }
  console.log("Datos de municipios disponibles:", municipiosGeoJson);
  poblarFiltrosConMunicipios(municipiosGeoJson);
});

// Función para poblar los filtros con los municipios
function poblarFiltrosConMunicipios(data) {
  const estadosMap = new Map();

  data.features.forEach(f => {
    const cveEnt = f.properties.CVE_ENT; // Usar directamente la propiedad CVE_ENT
    const estadoInfo = diccionarioEstados[cveEnt];
    if (!estadoInfo) return;

    if (!estadosMap.has(estadoInfo.value)) {
      estadosMap.set(estadoInfo.value, {
        value: estadoInfo.value,
        label: estadoInfo.label,
        municipios: []
      });
    }

    estadosMap.get(estadoInfo.value).municipios.push({
      value: f.properties.CVEGEO,
      label: f.properties.NOMGEO
    });
  });

  const estados = Array.from(estadosMap.values());
  const filtro = document.querySelector('dropdown-filtros-ubicacion');
  if (filtro) {
    filtro.setEstados(estados);
    console.log("Estados y municipios configurados:", estados);
  } else {
    console.error("No se encontró el elemento <dropdown-filtros-ubicacion>.");
  }
}

document.addEventListener("municipios-cargados", () => {
  if (!municipiosGeoJson || !municipiosGeoJson.features) {
    console.error("Los datos de municipios no están disponibles.");
    return;
  }
  poblarFiltrosConMunicipios(municipiosGeoJson);
  console.log("Municipios cargados:", municipiosGeoJson);
});

// Escuchar el evento de cambio de estado
document.addEventListener('estado-change', (e) => {
  const codigoEntidad = e.detail.value;

  if (!codigoEntidad) {
    console.warn(`No se encontró un código de estado válido: ${codigoEntidad}`);
    return;
  }

  // Mover el mapa al estado seleccionado
  moverMapaAEstado(codigoEntidad);

  // Activar la vista local para el estado
  activarVistaLocal(codigoEntidad, 'estado');

  // Cargar calles dinámicamente según el estado seleccionado
  const source = map.getSource('calles');
  if (source) {
    source.setData(`https://fabulous-dodol-d03b96.netlify.app/calles${codigoEntidad}.geojson`);
  } else {
    console.warn('La fuente "calles" todavía no existe en el mapa.');
  }

  // Limpiar el dropdown de municipios
  const filtro = document.querySelector('dropdown-filtros-ubicacion');
  const selectMunicipio = filtro?.querySelector('#select-municipio');

  if (!selectMunicipio) {
    console.error("No se encontró el dropdown de municipios.");
    return;
  }

  selectMunicipio.innerHTML = '<option value="">-- Municipio --</option>';

  // Filtrar municipios por el estado seleccionado
  const municipios = municipiosGeoJson.features.filter(mun =>
    mun.properties.CVE_ENT === codigoEntidad.slice(-2) // Últimos 2 dígitos del código del estado
  );

  // Poblar el dropdown con los municipios del estado seleccionado
  municipios.forEach(mun => {
    const opt = document.createElement('option');
    opt.value = mun.properties.CVEGEO; // Código del municipio
    opt.textContent = mun.properties.NOMGEO; // Nombre del municipio
    selectMunicipio.appendChild(opt);
  });

  // Habilitar el dropdown de municipios
  selectMunicipio.disabled = false;
  console.log(`Dropdown de municipios actualizado para el estado: ${codigoEntidad}`);
});

// Escuchar el evento de cambio de municipio
document.addEventListener('municipio-change', (e) => {
  const cvegeo = e.detail.value;
  if (cvegeo) {
    moverMapaAMunicipio(cvegeo);
    activarVistaLocal(cvegeo, 'municipio');
  }
});


export function moverMapaAEstado(codigoEntidad) {
  const estadoFeature = estadosGeoJson.features.find(f => f.properties.CVE_ENT === codigoEntidad);
  if (estadoFeature) {
    const bbox = turf.bbox(estadoFeature); // Calcular el bounding box del estado
    window.map.fitBounds(bbox, { padding: 20, duration: 1000 });
  } else {
    console.warn(`No se encontró el estado con código: ${codigoEntidad}`);
  }
}

export function moverMapaAMunicipio(cvegeo) {
  const municipioFeature = municipiosGeoJson.features.find(f => f.properties.CVEGEO === cvegeo);
  if (municipioFeature) {
    const bbox = turf.bbox(municipioFeature); // Calcular el bounding box del municipio
    window.map.fitBounds(bbox, { padding: 20, duration: 1000 });
  } else {
    console.warn(`No se encontró el municipio con código: ${cvegeo}`);
  }
}