module Tesp {
    export type ChangeListenerFunc = (reason: ChangeReason) => void;
    export enum ChangeReason {
        None = 0x0,
        /** The selected source node has changed */
        SourceChange = 0x1,
        /** The selected destination node has changed */
        DestinationChange = 0x2,
        /** The mark node location has changed */
        MarkChange = 0x4,
        /** The either the source, destination or mark location has changed */
        ContextChange = SourceChange | DestinationChange | MarkChange,
        /** The enabled state or visibility of a feature has changed */
        FeatureChange = 0x8,
        /** A new path has been calculated */
        PathUpdate = 0x10,
        /** An input event has triggered menus to close */
        ClearMenus = 0x20,
        Any = 0x3f
    }
    export class ChangeListener {
        constructor(public reasons: ChangeReason, public func: ChangeListenerFunc) { }

        trigger(reason: ChangeReason) {
            if ((this.reasons & reason) !== 0)
                this.func(reason);
        }
    }

    /** Core TESPathfinder application */
    export class Application {
        loaded: Promise<Application>;
        element: HTMLElement;
        context: Context;
        features: IFeatureList;
        world: World;
        controls: Controls;
        map: Map;
        ctxMenu: ContextMenu;

        private listeners: ChangeListener[] = [];

        constructor() {
            this.element = document.body;
            this.loaded = window.fetch("data/data.json")
                .then(res => res.json())
                .then(data => {
                    this.context = new Context(this);
                    this.features = Features.init();
                    this.world = new World(this, <IWorldSource><any>data);
                    this.map = new Map(this, document.getElementById("map"));
                    this.controls = new Controls(this, document.getElementById("controls"));
                    this.ctxMenu = new ContextMenu(this);

                    document.body.onmousedown = document.body.oncontextmenu = () => this.triggerChange(ChangeReason.ClearMenus);
                    this.toggleBodyClass("loading", false);
                    return this;
                });
        }

        /** Listen for application level changes */
        addChangeListener(reasons: ChangeReason, func: ChangeListenerFunc): ChangeListener {
            var listener = new ChangeListener(reasons, func);
            this.listeners.push(listener);
            return listener;
        }
        /** Remove a previously added listener */
        removeChangeListener(listener: ChangeListener) {
            var ix = this.listeners.indexOf(listener);
            if (ix > -1)
                this.listeners.splice(ix, 1);
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