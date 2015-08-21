import {Component, View, Inject, ElementRef} from 'angular2/angular2';
import {Vec2, Node, World} from 'world';

class MapNode {
    id: number;

    private pos: Vec2;
    private element: HTMLElement;

    constructor(private node: Node, private parentElement: HTMLElement) {
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

enum Op { Update, Add, Remove, Done };

@Component({ selector: 'map' })
@View({ template: '<img id="map" src="img/map.jpg" (click)="mapClick($event)">' })
export class MapComponent {
    private nodes: MapNode[] = [];

    constructor(@Inject(World) private world: World, @Inject(ElementRef) private element: ElementRef) {
        world.addListener(() => this.render());
        this.render();
    }

    private render() {
        var m = 0,
            v = 0,
            modelNodes: Node[] = this.world.nodes,
            newNodes: Node[] = [];

        var model: Node,
            view: MapNode,
            op: Op;
        do {
            // iterate through view and model
            // we only need one shared pass as both arrays are sorted by node id
            model = modelNodes[m];
            view = this.nodes[v];
            if (model !== undefined) {
                if (view !== undefined) {
                    var d = model.id - view.id;
                    if (d === 0) { // same node, just update coordinates
                        op = Op.Update;
                    } else if (d < 0) { // add new node from model
                        op = Op.Add;
                    } else { // remove obsolete view node
                        op = Op.Remove;
                    }
                } else { // model only, add
                    op = Op.Add;
                }
            } else if (view !== undefined) { // view only, remove
                op = Op.Remove;
            } else { // both null, we're done here
                op = Op.Done;
            }

            switch (op) {
                case Op.Update:
                    view.update();
                    m++;
                    v++;
                    break;
                case Op.Add:
                    newNodes.push(model);
                    m++;
                    break;
                case Op.Remove:
                    this.nodes.splice(v, 1);
                    view.remove();
                    // no need to increment v as next element is shifted back
                    break;
            }
        } while (op !== Op.Done);

        if (newNodes.length > 0) {
            var elem = this.element.nativeElement;
            this.nodes = this.nodes.concat(newNodes.map(n => new MapNode(n, elem))).sort((a, b) => a.id - b.id);
        }
    }
    private mapClick(ev: MouseEvent) {
        this.world.click(ev.pageX, ev.pageY);
    }
}