module tesp {
    export class Application {
        loaded: Promise<Application>;
        world: World;
        controls: Controls;
        map: Map;
        menu: ContextMenu;

        constructor() {
            this.loaded = window.fetch("data/data.json")
                .then(res => res.json())
                .then(data => {
                    this.world = new World(this, data);
                    this.map = new Map(this, document.getElementById("map"));
                    this.controls = new Controls(this, document.getElementById("controls"));
                    this.menu = new ContextMenu(this, document.getElementById("context-menu"));
                    document.body.onmousedown = document.body.oncontextmenu = document.body.onscroll = ev => this.menu.hide();
                    document.body.classList.remove("loading");
                    return this;
                });
        }
    }

    export var app = new Application();
}