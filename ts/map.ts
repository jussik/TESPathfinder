import {Component, View, Inject, ElementRef} from 'angular2/angular2';
import {Vec2, Node, CellRow, World, WorldUpdate} from './world';

@Component({ selector: 'map' })
@View({ template: '<img id="map" src="img/map.jpg" (click)="mapClick($event)">' })
export class MapComponent {
    private element: HTMLElement;
    private edgeContainer: HTMLElement;
    private nodeContainer: HTMLElement;
    private areaContainer: HTMLElement;
    private pathContainer: HTMLElement;
    private gridContainer: HTMLElement;
    private markElem: HTMLElement;

    constructor(@Inject(World) private world: World, @Inject(ElementRef) element: ElementRef) {
        this.element = element.nativeElement;

        world.addListener(reason => {
            if (reason === WorldUpdate.Loaded)
                this.renderNodes();
            else if (reason === WorldUpdate.PathUpdated)
                this.renderPath();
            else if (reason === WorldUpdate.MarkChange)
                this.renderMark();
        });

        this.renderNodes();
        this.renderPath();
        this.renderMark();
        this.renderGrid();
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
            this.edgeContainer.appendChild(this.drawEdge(e.srcNode.pos, e.destNode.pos, e.srcNode.type, "map-transport-edge")));

        if (this.areaContainer != null)
            this.areaContainer.parentElement.removeChild(this.areaContainer);
        this.areaContainer = document.createElement("div");
        this.element.appendChild(this.areaContainer);
        this.world.areas.forEach(a => {
            var type: string = a.target.type;
            var prev: CellRow = null;
            for (var i = 0; i < a.rows.length; i++) {
                var row = a.rows[i];
                if (prev != null) {
                    if (row.x1 !== prev.x1) {
                        this.areaContainer.appendChild(this.drawCellEdge(row.x1, row.y, prev.x1, row.y, type));
                    }
                    if (row.x2 !== prev.x2) {
                        this.areaContainer.appendChild(this.drawCellEdge(row.x2 + 1, row.y, prev.x2 + 1, row.y, type));
                    }
                } else {
                    this.areaContainer.appendChild(this.drawCellEdge(row.x1, row.y, row.x2 + 1, row.y, type));
                }
                this.areaContainer.appendChild(this.drawCellEdge(row.x1, row.y, row.x1, row.y + 1, type));
                this.areaContainer.appendChild(this.drawCellEdge(row.x2 + 1, row.y, row.x2 + 1, row.y + 1, type));
                prev = row;
            }
            this.areaContainer.appendChild(this.drawCellEdge(prev.x1, prev.y + 1, prev.x2 + 1, prev.y + 1, type));
        });
    }

    private drawCellEdge(x1: number, y1: number, x2: number, y2: number, type: string) {
        return this.drawEdge(this.cell2vec(x1, y1), this.cell2vec(x2, y2), type, "map-area");
    }
    private cell2vec(x: number, y: number): Vec2 {
        return new Vec2(x * 44.5 + 20, y * 44.6 + 35);
    }

    private renderPath() {
        if (this.pathContainer != null)
            this.pathContainer.parentElement.removeChild(this.pathContainer);

        var path: Node[] = this.world.path;
        if (path == null || path.length < 2) {
            this.pathContainer = null;
            return;
        }

        this.pathContainer = document.createElement("div");
        this.element.appendChild(this.pathContainer);
        var n1 = path[0]
        for (var i = 1; i < path.length; i++) {
            var n2 = path[i];
            this.pathContainer.appendChild(this.drawEdge(n1.pos, n2.pos, 'path'));
            n1 = n2;
        }
    }

    private renderMark() {
        var markNode = this.world.markNode;
        if (markNode != null) {
            var markPos = markNode.pos;
            if (this.markElem) {
                this.markElem.style.left = markPos.x + 'px';
                this.markElem.style.top = markPos.y + 'px';
            } else {
                this.markElem = this.drawNode(markPos, markNode.name, markNode.type);
                this.element.appendChild(this.markElem);
            }
        } else if (this.markElem) {
            this.markElem.parentElement.removeChild(this.markElem);
            this.markElem = null;
        }
    }

    private renderGrid() {
        if (!this.gridContainer) {
            this.gridContainer = document.createElement("div");
            this.element.appendChild(this.gridContainer);
            for (var i = 0; i < 37; i++) {
                var el = document.createElement('div');
                el.classList.add("map-grid", "map-grid-v");
                el.style.left = (i * 44.5 + 20) + "px";
                this.gridContainer.appendChild(el);
            }
            for (var i = 0; i < 42; i++) {
                var el = document.createElement('div');
                el.classList.add("map-grid", "map-grid-h");
                el.style.top = (i * 44.6 + 35) + "px";
                this.gridContainer.appendChild(el);
            }
            /*for (var i = 0; i < 37; i++) {
                for (var j = 0; j < 42; j++) {
                    var el = document.createElement('div');
                    el.textContent = i + ',' + j;
                    el.style.position = "absolute";
                    el.style.color = "white";
                    el.style.left = (i * 44.5 + 25) + "px";
                    el.style.top = (j * 44.6 + 40) + "px";
                    el.style.zIndex = "10";
                    this.gridContainer.appendChild(el);
                }
            }*/
        }
    }

    private drawNode(pos: Vec2, name: string, type: string): HTMLElement {
        var element = document.createElement("div");
        element.classList.add("map-node", "map-" + type);
        element.title = name;
        element.style.left = pos.x + "px";
        element.style.top = pos.y + "px";
        return element;
    }

    private drawEdge(n1: Vec2, n2: Vec2, type: string, subtype?: string): HTMLElement {
        var element = document.createElement("div");
        element.classList.add("map-edge", "map-" + type);
        if (subtype)
            element.classList.add(subtype);
        var length = n1.distance(n2);
        element.style.left = ((n1.x + n2.x) / 2) - (length / 2) + "px";
        element.style.top = ((n1.y + n2.y) / 2) - 1 + "px";
        element.style.width = length + "px";
        element.style.transform = "rotate(" + Math.atan2(n1.y - n2.y, n1.x - n2.x) + "rad)";
        return element;
    }

    private mapClick(ev: MouseEvent) {
        this.world.contextClick(ev.pageX, ev.pageY);
    }
}