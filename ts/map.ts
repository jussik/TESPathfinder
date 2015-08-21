import {Component, View, Inject, ElementRef} from 'angular2/angular2';
import {Vec2, Node, World} from 'world';

class MapNode {
    id: number;
    element: HTMLElement;
    pos: Vec2;

    constructor(public node: Node, private parentElement: HTMLElement) {
        this.id = node.id;
        this.element = document.createElement("div");
        this.element.className = "map-node";
        this.element.title = node.name;
        parentElement.appendChild(this.element);
        this.pos = new Vec2(node.pos.x, node.pos.y);
        this.element.style.left = this.pos.x + "px";
        this.element.style.top = this.pos.y + "px";
    }

    update() {
        var newX = this.node.pos.x;
        if (newX !== this.pos.x) {
            this.element.style.left = newX + "px";
            this.pos.x = newX;
        }

        var newY = this.node.pos.y;
        if (newY !== this.pos.x) {
            this.element.style.top = newY + "px";
            this.pos.y = newY;
        }
    }

    remove() {
        this.parentElement.removeChild(this.element);
    }
}

@Component({ selector: 'map' })
@View({ template: '<img id="map" src="img/map.jpg" (click)="mapClick($event)">' })
export class MapComponent {
    nodes: MapNode[] = [];

    constructor( @Inject(World) private world: World, @Inject(ElementRef) private element: ElementRef) {
        world.addListener(() => this.render());
        this.render();
    }

    render() {
        var m = 0, v = 0;
        var modelNodes = this.world.nodes;

        var newNodes: Node[] = [];
        while (true) {
            var model = modelNodes[m];
            var view = this.nodes[v];
            if (model != null) {
                if (view != null) {
                    var d = model.id - view.id;
                    if (d === 0) {
                        // same node, just update coordinates
                        view.update();
                        m++;
                        v++;
                    } else if (d > 0) {
                        // remove obsolete view node
                        this.nodes.splice(v, 1);
                        view.remove();
                        // no need to increment v as next element is shifted back
                    } else {
                        // add node from model
                        newNodes.push(model);
                        m++;
                    }
                } else {
                    // model only
                    newNodes.push(model);
                    m++;
                }
            } else if (view != null) {
                // view only
                this.nodes.splice(v, 1);
                view.remove();
            } else {
                // both null
                break;
            }
        }

        if (newNodes.length > 0) {
            var elem = this.element.nativeElement;
            this.nodes = this.nodes.concat(newNodes.map(n => new MapNode(n, elem))).sort((a, b) => a.id - b.id);
        }
    }
    mapClick(ev: MouseEvent) {
        this.world.click(ev.pageX, ev.pageY);
    }
}