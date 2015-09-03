module Tesp {
    export type ChangeListenerFunc = (reason: ChangeReason) => void;
    export enum ChangeReason {
        None = 0x0,
        SourceChange = 0x1,
        DestinationChange = 0x2,
        MarkChange = 0x4,
        ContextChange = SourceChange | DestinationChange | MarkChange,
        FeatureChange = 0x8,
        PathUpdate = 0x10,
        ClearMenus = 0x20,
        All = 0x3f
    }
    class ChangeListener {
        constructor(public reasons: ChangeReason, public func: ChangeListenerFunc) { }

        trigger(reason: ChangeReason) {
            if ((this.reasons & reason) !== 0)
                this.func(reason);
        }
    }

    /** Core TESPathfinder application */
    export class Application {
        loaded: Promise<Application>;
        context: Context;
        features: IFeatureList;
        world: World;
        controls: Controls;
        map: Map;
        menu: ContextMenu;

        private listeners: ChangeListener[] = [];

        constructor() {
            this.loaded = window.fetch("data/data.json")
                .then(res => res.json())
                .then(data => {
                    this.context = new Context(this);
                    this.features = Features.init();
                    this.world = new World(this, <IWorldSource><any>data);
                    this.map = new Map(this, document.getElementById("map"));
                    this.controls = new Controls(this, document.getElementById("controls"));
                    this.menu = new ContextMenu(this, document.getElementById("context-menu"));

                    document.body.onmousedown = document.body.oncontextmenu = () => this.triggerChange(ChangeReason.ClearMenus);
                    this.toggleBodyClass("loading", false);
                    return this;
                });
        }

        /** Listen for application level changes */
        addChangeListener(reasons: ChangeReason, func: ChangeListenerFunc) {
            this.listeners.push(new ChangeListener(reasons, func));
        }
        /** Inform all listeners about a new change */
        triggerChange(reason: ChangeReason) {
            this.listeners.forEach(l => l.trigger(reason));
        }

        /** Toggle a class attribute name in the document body */
        toggleBodyClass(name: string, enabled: boolean) {
            if (enabled) {
                document.body.classList.add(name);
            } else {
                document.body.classList.remove(name);
            }
        }
    }

    /** The current instance of the application, for debugging purposes only */
    export var app = new Application();
}