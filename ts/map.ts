﻿import {Component, View, Inject, ElementRef} from 'angular2/angular2';
import {Vec2, Node, World, WorldUpdate} from 'world';

@Component({ selector: 'map' })
@View({ template: '<img id="map" src="img/map.jpg" (click)="mapClick($event)">' })
export class MapComponent {
    private element: HTMLElement;
    private edgeContainer: HTMLElement;
    private nodeContainer: HTMLElement;
    private pathElem: HTMLElement;

    constructor(@Inject(World) private world: World, @Inject(ElementRef) element: ElementRef) {
        this.element = element.nativeElement;

        world.addListener(reason => {
            if (reason === WorldUpdate.Loaded)
                this.renderNodes();
            else if (reason === WorldUpdate.PathUpdated)
                this.renderPath();
        });

        this.renderNodes();
        this.renderPath();
    }

    private renderNodes() {
        if (this.nodeContainer != null)
            this.nodeContainer.parentElement.removeChild(this.nodeContainer);
        this.nodeContainer = document.createElement("div");
        this.element.appendChild(this.nodeContainer);
        this.world.nodes.forEach(n =>
            this.nodeContainer.appendChild(this.drawNode(n.pos, n.name, n.type)));

        if (this.edgeContainer != null)
            this.edgeContainer.parentElement.removeChild(this.edgeContainer);
        this.edgeContainer = document.createElement("div");
        this.element.appendChild(this.edgeContainer);
        this.world.edges.forEach(e =>
            this.edgeContainer.appendChild(this.drawEdge(e.srcNode.pos, e.destNode.pos, e.srcNode.type)));
    }

    private renderPath() {
        if (this.pathElem != null)
            this.pathElem.parentElement.removeChild(this.pathElem);

        var path: Node[] = this.world.path;
        if (path == null || path.length < 2)
            return;

        this.pathElem = document.createElement("div");
        this.element.appendChild(this.pathElem);
        var n1 = path[0]
        for (var i = 1; i < path.length; i++) {
            var n2 = path[i];
            this.pathElem.appendChild(this.drawEdge(n1.pos, n2.pos, 'path'));
            n1 = n2;
        }
    }

    drawNode(pos: Vec2, name: string, type: string): HTMLElement {
        var element = document.createElement("div");
        element.classList.add("map-node", "map-" + type);
        element.title = name;
        element.style.left = pos.x + "px";
        element.style.top = pos.y + "px";
        return element;
    }

    drawEdge(n1: Vec2, n2: Vec2, type: string): HTMLElement {
        var element = document.createElement("div");
        element.classList.add("map-edge", "map-" + type);
        var length = n1.distance(n2);
        element.style.left = ((n1.x + n2.x) / 2) - (length / 2) + "px";
        element.style.top = ((n1.y + n2.y) / 2) - 1 + "px";
        element.style.width = length + "px";
        element.style.transform = "rotate(" + Math.atan2(n1.y - n2.y, n1.x - n2.x) + "rad)";
        return element;
    }

    private mapClick(ev: MouseEvent) {
        this.world.click(ev.pageX, ev.pageY);
    }
}