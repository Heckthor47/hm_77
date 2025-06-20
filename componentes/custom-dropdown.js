const dropdownTemplate = document.createElement('template');

dropdownTemplate.innerHTML = `
  <style>
    /* --- ESTILOS REFACTORIZADOS --- */
    :host {
      --dropdown-color: #611232;
      --dropdown-timing: 0.3s;
      position: relative;
      display: block;
      width: 100%;
      font-size: 14px;
      font-family: "Noto Sans", sans-serif;
    }

    /* 1. El "rostro" del componente */
    #selected-display {
      display: flex;
      align-items: center;
      height: 2.5em;
      padding-left: 1em;
      padding-right: 3em;
      border: 1px solid #ddd;
      border-radius: 1.25em;
      /* CAMBIO 1: Se establece el color de fondo y de texto para el estado cerrado. */
      background-color: var(--dropdown-color);
      color: #fff;
      cursor: pointer;
      transition: var(--dropdown-timing) all ease-in-out;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    :host(.expanded) #selected-display {
      border-color: var(--dropdown-color);
      border-radius: 8px 8px 0 0;
      /* CAMBIO 2: Se establece el color de fondo y de texto para el estado abierto. */
      background-color: #fff;
      color: var(--dropdown-color);
    }

    /* 2. El contenedor de las opciones, oculto por defecto */
    #options-container {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #fff;
      border: 1px solid var(--dropdown-color);
      border-top: none;
      border-radius: 0 0 8px 8px;
      box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px;
      z-index: 10;
      
      max-height: 0;
      opacity: 0;
      visibility: hidden;
      overflow: hidden;
      transition: max-height var(--dropdown-timing) ease-in-out,
                  opacity var(--dropdown-timing) ease-in-out,
                  visibility 0s linear var(--dropdown-timing);
    }
    :host(.expanded) #options-container {
      max-height: 12.5em;
      opacity: 1;
      visibility: visible;
      overflow-y: auto;
      transition-delay: 0s;
    }

    /* 3. Estilo de cada opción en la lista */
    ::slotted(label) {
      display: block;
      height: 2.5em;
      line-height: 2.5em;
      padding: 0 1em;
      cursor: pointer;
      transition: var(--dropdown-timing) color ease-in-out;
    }
    ::slotted(label:hover) {
      color: var(--dropdown-color);
      background-color: #f5f5f5;
    }
    ::slotted(input) {
      display: none;
    }
    ::slotted(input:checked + label) {
      font-weight: 600;
      color: var(--dropdown-color);
    }

    /* 4. La flecha */
    .arrow {
      position: absolute;
      right: 1em;
      top: 50%;
      transform: translateY(-50%) rotate(0deg);
      /* CAMBIO 3: El color de la flecha ahora debe ser blanco cuando está cerrado. */
      border: 0.3em solid #fff;
      border-color: #fff transparent transparent transparent;
      transition: 0.4s all ease-in-out;
      pointer-events: none;
    }
    :host(.expanded) .arrow {
      transform: translateY(-50%) rotate(-180deg);
      /* CAMBIO 4: El color de la flecha vuelve al color principal cuando está abierto. */
      border-color: var(--dropdown-color) transparent transparent transparent;
    }
  </style>
  
  <div id="selected-display"></div>
  <div class="arrow"></div>
  <div id="options-container">
    <slot></slot>
  </div>
`;

class CustomDropdown extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(dropdownTemplate.content.cloneNode(true));

    this.displayElement = this.shadowRoot.getElementById('selected-display');
    
    this._handleClick = this._handleClick.bind(this);
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    this._handleSelectionChange = this._handleSelectionChange.bind(this);
  }

  connectedCallback() {
    this._upgradeFromOptions();
    this.displayElement.addEventListener('click', this._handleClick);
    document.addEventListener('click', this._handleOutsideClick);
    this.addEventListener('change', this._handleSelectionChange);
  }

  disconnectedCallback() {
    this.displayElement.removeEventListener('click', this._handleClick);
    document.removeEventListener('click', this._handleOutsideClick);
    this.removeEventListener('change', this._handleSelectionChange);
  }

  _handleClick(e) {
    e.stopPropagation();
    this.classList.toggle('expanded');
  }

  _handleOutsideClick() {
    if (this.classList.contains('expanded')) {
      this.classList.remove('expanded');
    }
  }

  _upgradeFromOptions() {
    const options = Array.from(this.querySelectorAll('option'));
    if (options.length === 0) return;

    const newElements = [];
    let initialLabel = '';
    options.forEach((option, index) => {
      const value = option.value;
      const labelText = option.textContent;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'option';
      input.id = `opt-${value || index}`;
      input.value = value;
      
      if (index === 0) {
        input.checked = true;
        initialLabel = labelText;
      }

      const label = document.createElement('label');
      label.htmlFor = input.id;
      label.textContent = labelText;

      newElements.push(input, label);
    });

    this.innerHTML = '';
    this.append(...newElements);
    
    this.displayElement.textContent = initialLabel;
  }

  _handleSelectionChange(e) {
    if (e.target.type === 'radio' && e.target.checked) {
      const selectedValue = e.target.value;
      const selectedLabel = this.querySelector(`label[for=${e.target.id}]`).textContent;

      this.displayElement.textContent = selectedLabel;

      this.dispatchEvent(new CustomEvent('selection-change', {
        detail: { value: selectedValue, label: selectedLabel }
      }));

      this.classList.remove('expanded');
    }
  }
}

window.customElements.define('custom-dropdown', CustomDropdown);