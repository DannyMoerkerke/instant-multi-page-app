export class MaterialDropdown extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({mode: 'open'});

    shadowRoot.innerHTML = `
      <style>
        :host {
          --menu-width: 24px;
          --menu-height: 24px;
          --menu-background: #ffffff;
          --icon-width: 24px;
          --icon-height: 24px;
          --font-color: #000000;
          --hover-color: #cecece;
          display: block;
          width: var(--menu-width);
          height: var(--menu-height);
        }

        #dropdown-container {
          position: relative;
          display: inline-block;
          width: var(--menu-width);
          height: var(--menu-height);
        }

        @keyframes menu-open {
          0% {
            opacity: 0;
            height: 0;
          }
          80% {
            opacity: 0.5;
          }
          90% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
            height: var(--menu-height);
          }
        }

        @keyframes fadein {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        #dropdown-menu-container {
          position: absolute;
          top: 0;
          min-width: var(--menu-width);
          height: 0;
          opacity: 0;
          overflow: hidden;
          box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px;
        }

        #dropdown-menu {
          background: var(--menu-background);
          position: absolute;
          bottom: 0;
          left: 0;
          opacity: inherit;
        }

        :host([open]) #dropdown-menu-container {
          animation-name: menu-open;
          animation-duration: .2s;
          animation-fill-mode: forwards;
          animation-timing-function: ease-out;
        }

        ::slotted([slot="option"]), li {
          padding: 10px;
          cursor: pointer;
          list-style-type: none;
          display: flex;
          flex-direction: row;
          color: var(--font-color);
        }

        ::slotted([slot="option"]:hover), li:hover {
          background: var(--hover-color);
        }

        ::slotted([slot="icon"]) {
          display: block;
          cursor: pointer;
          outline: none;
          width: var(--icon-width);
          height: var(--icon-height);
        }
      </style>

      <div id="dropdown-container">
        <slot name="icon"></slot>

        <div id="dropdown-menu-container">
          <div id="dropdown-menu">
            <slot name="option"></slot>
          </div>
        </div>
      </div>
    `;

    this.open = this.hasAttribute('open');
    this.container = this.shadowRoot.querySelector('#dropdown-container');
    this.menuContainer = this.shadowRoot.querySelector('#dropdown-menu-container');
    this.menu = this.shadowRoot.querySelector('#dropdown-menu');
    this.iconSlot = this.shadowRoot.querySelector('slot[name="icon"]');
    this.menuInitialized = false;
  }

  connectedCallback() {
    this.icon = this.iconSlot.assignedNodes()[0];
    this.options = this.shadowRoot.querySelector('slot[name="option"]').assignedNodes();

    this.observer = new MutationObserver((mutations) => {
      if([...mutations].some(mutation => mutation.addedNodes.length)) {
        this.setupMenu();
        this.options = this.shadowRoot.querySelector('slot[name="option"]').assignedNodes();
      }
    });

    this.observer.observe(this.menu, {childList: true});

    this.setupMenu();

    this.container.addEventListener('mousedown', this.handleClick.bind(this));
    this.icon.addEventListener('blur',() => {
      setTimeout(() => this.closeMenu(), 100);
    });
  }

  get open() {
    return this.hasAttribute('open');
  }

  set open(isOpen) {
    isOpen ? this.setAttribute('open', '') : this.removeAttribute('open');
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  setupMenu() {
    const {width, height} = this.shadowRoot.querySelector('#dropdown-menu').getBoundingClientRect();

    // if height = 0 then the dropdown is probably hidden and the menu dimensions cannot be determined
    // this.menuInitialized will be false and setupMenu() will be called when the menu is opened with openMenu()
    if(height === 0) {
      return;
    }

    this.menuContainer.style.setProperty('--menu-height', `${height}px`);
    this.menuContainer.style.setProperty('--menu-width', `${width}px`);

    const {x, width: w} = this.menu.getBoundingClientRect();

    x + w >= screen.width ? this.menuContainer.style.right = 0 : this.menuContainer.style.left = 0;

    this.menuInitialized = true;
  }

  setData(data, {value, label} = {value: 'value', label: 'label'}) {
    this.menu.innerHTML = `${data.reduce((acc, item) => `${acc}<li value="${item[value]}">${item[label]}</li>`, ``)}`;
  }

  openMenu() {
    // if the menu is not initialized yet, initialize it now
    if(!this.menuInitialized) {
      this.setupMenu();
    }

    this.open = true;
  }

  closeMenu() {
    this.open = false;
  }

  handleClick(e) {
    const nodes = e.composedPath();
    const option = nodes.find(node => this.options.includes(node));

    const icon = nodes.find(node => node === this.icon);

    if(option) {
      this.notifyChange(option.getAttribute('value'));
      setTimeout(() => this.closeMenu(), 100);
    }
    else if(icon) {
      this.open = !this.open;

      if(this.open) {
        this.openMenu();
      }
      else {
        this.closeMenu();
      }
    }
  }

  notifyChange(value) {
    this.setAttribute('value', value);
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        value
      }
    }));
  }
}

if(!customElements.get('material-dropdown')) {
  customElements.define('material-dropdown', MaterialDropdown);
}
