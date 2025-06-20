const dropdownTemplate = document.createElement('template');

dropdownTemplate.innerHTML = `
  <style>
    /* --- ESTILOS (SIN CAMBIOS) --- */
    :host {
      --dropdown-color: #611232;
      --dropdown-timing: 0.3s;
      min-width: 12em;
      position: relative;
      display: inline-block;
      width: 100%;
      min-height: 2.5em;
      max-height: 2.5em;
      overflow: hidden;
      cursor: pointer;
      text-align: left;
      white-space: nowrap;
      color: #444;
      outline: none;
      border: 1px solid #ddd;
      border-radius: 8px;
      background-color: #f9f9f9;
      transition: var(--dropdown-timing) all ease-in-out;
      font-size: 14px;
      font-family: "Noto Sans", sans-serif;
    }
    :host(.expanded) {
      border: 1px solid var(--dropdown-color);
      background: #fff;
      border-radius: 8px;
      box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;
      max-height: 15em;
      z-index: 10;
      overflow-y: auto;
    }
    #options-container { position: relative; }
    ::slotted(input) { width: 1px; height: 1px; display: inline-block; position: absolute; opacity: 0.01; }
    ::slotted(label) { border-top: 1px solid #eee; display: block; height: 2.5em; line-height: 2.5em; padding-left: 1em; padding-right: 3em; cursor: pointer; position: relative; transition: var(--dropdown-timing) color ease-in-out; }
    :host(.expanded) ::slotted(label:hover) { color: var(--dropdown-color); }
    ::slotted(input:checked + label) { display: block; border-top: none; position: absolute; top: 0; width: 100%; font-weight: 600; }
    :host(.expanded) ::slotted(input:checked + label) { color: var(--dropdown-color); position: relative; }
    .arrow { content: ""; position: absolute; right: 1em; top: 1.1em; border: 0.3em solid var(--dropdown-color); border-color: var(--dropdown-color) transparent transparent transparent; transition: 0.4s all ease-in-out; }
    :host(.expanded) .arrow { transform: rotate(-180deg); top: 0.8em; }
  </style>
  <div id="options-container">
    <slot></slot>
  </div>
  <div class="arrow"></div>
`;

class CustomDropdown extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(dropdownTemplate.content.cloneNode(true));
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    // CAMBIO: Enlazar el nuevo manejador de eventos
    this._handleSelectionChange = this._handleSelectionChange.bind(this);
  }

  connectedCallback() {
    // CAMBIO: Se añade la lógica para "mejorar" las opciones del HTML
    this._upgradeFromOptions();

    this.addEventListener('click', this._handleClick);
    document.addEventListener('click', this._handleOutsideClick);
    // CAMBIO: El listener para 'change' se añade aquí, una sola vez.
    this.addEventListener('change', this._handleSelectionChange);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._handleClick);
    document.removeEventListener('click', this._handleOutsideClick);
    // CAMBIO: Se remueve el listener al desconectar el componente
    this.removeEventListener('change', this._handleSelectionChange);
  }

  // --- LÓGICA DE CLICS (SIN CAMBIOS) ---
  _handleClick(e) {
    e.stopPropagation();
    this.classList.toggle('expanded');
    if (e.target.nodeName === 'LABEL') {
      const input = this.querySelector(`#${e.target.getAttribute('for')}`);
      if (input && !input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }
  _handleOutsideClick() {
    if (this.classList.contains('expanded')) {
      this.classList.remove('expanded');
    }
  }

  // --- CAMBIO: NUEVO MÉTODO ---
  // Este método lee las etiquetas <option> y las convierte en la estructura interna del componente.
  _upgradeFromOptions() {
    const options = Array.from(this.querySelectorAll('option'));
    if (options.length === 0) return; // No hacer nada si no hay opciones

    const newElements = [];
    options.forEach((option, index) => {
      const value = option.value;
      const labelText = option.textContent;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'option';
      input.id = `opt-${value || index}`;
      input.value = value;
      // Selecciona el primer elemento por defecto
      if (index === 0) {
        input.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = labelText;

      newElements.push(input, label);
    });

    // Reemplaza las <option> originales con los nuevos elementos
    this.innerHTML = '';
    this.append(...newElements);
  }

  // --- CAMBIO: NUEVO MÉTODO ---
  // Esta es la lógica que antes estaba dentro de setOptions()
  _handleSelectionChange(e) {
    if (e.target.type === 'radio' && e.target.checked) {
      const selectedValue = e.target.value;
      const selectedLabel = this.querySelector(`label[for=${e.target.id}]`).textContent;

      // Mueve la opción seleccionada al principio para que sea visible
      const selectedInput = this.querySelector(`#${e.target.id}`);
      this.prepend(this.querySelector(`label[for=${e.target.id}]`));
      this.prepend(selectedInput);

      // Dispara el evento personalizado
      this.dispatchEvent(new CustomEvent('selection-change', {
        detail: { value: selectedValue, label: selectedLabel }
      }));
    }
  }

  // --- CAMBIO: MÉTODO ELIMINADO ---
  // El método setOptions() ya no es necesario y se ha eliminado.
}

window.customElements.define('custom-dropdown', CustomDropdown);