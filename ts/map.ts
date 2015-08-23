/// <reference path="world.ts" />

module tesp {
    export class Map {
        private edgeContainer: HTMLElement;
        private nodeContainer: HTMLElement;
        private areaContainer: HTMLElement;
        private pathContainer: HTMLElement;
        private gridContainer: HTMLElement;
        private sourceElem: HTMLElement;
        private destElem: HTMLElement;
        private markElem: HTMLElement;

        constructor(private world: World, private element: HTMLElement) {
            world.addListener(reason => {
                if (reason === WorldUpdate.PathUpdate)
                    this.renderPath();
                else if (reason === WorldUpdate.SourceChange)
                    this.renderSource();
                else if (reason === WorldUpdate.DestinationChange)
                    this.renderDestination();
                else if (reason === WorldUpdate.MarkChange)
                    this.renderMark();
                else if (reason === WorldUpdate.FeatureChange)
                    this.updateFeatures();
            });

            element.onclick = ev => this.world.contextClick(ev.pageX, ev.pageY);

            this.renderNodes();
            this.renderPath();
            this.renderMark();
            this.renderGrid();
            this.updateFeatures();
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
            return this.drawEdge(Vec2.fromCell(x1, y1), Vec2.fromCell(x2, y2), type, "map-area");
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
            this.markElem = this.addOrUpdateNodeElem(this.world.markNode, this.markElem);
        }
        private renderSource() {
            this.sourceElem = this.addOrUpdateNodeElem(this.world.sourceNode, this.sourceElem);
        }
        private renderDestination() {
            this.destElem = this.addOrUpdateNodeElem(this.world.destNode, this.destElem);
        }

        private addOrUpdateNodeElem(node: Node, elem: HTMLElement): HTMLElement {
            if (node != null) {
                var pos = node.pos;
                if (elem) {
                    elem.style.left = pos.x + 'px';
                    elem.style.top = pos.y + 'px';
                } else {
                    elem = this.drawNode(pos, node.name, node.type);
                    this.element.appendChild(elem);
                }
                return elem;
            } else if (elem) {
                elem.parentElement.removeChild(elem);
                return null;
            }
        }

        private renderGrid() {
            if (!this.gridContainer) {
                this.gridContainer = document.createElement("div");
                this.element.appendChild(this.gridContainer);
                for (var i = 0; i < 37; i++) {
                    var el = document.createElement('div');
                    el.classList.add("map-grid");
                    el.classList.add("map-grid-v");
                    el.style.left = (i * Cell.width + Cell.widthOffset) + "px";
                    this.gridContainer.appendChild(el);
                }
                for (var i = 0; i < 42; i++) {
                    var el = document.createElement('div');
                    el.classList.add("map-grid");
                    el.classList.add("map-grid-h");
                    el.style.top = (i * Cell.height + Cell.heightOffset) + "px";
                    this.gridContainer.appendChild(el);
                }
            }
        }

        private updateFeatures() {
            this.element.className = "";
            this.world.features.forEach(f => {
                if (!f.visible)
                    this.element.classList.add("hide-" + f.type);
            });
        }

        private drawNode(pos: Vec2, name: string, type: string): HTMLElement {
            var element = document.createElement("div");
            element.classList.add("map-node");
            element.classList.add("map-" + type);
            element.title = name;
            element.style.left = pos.x + "px";
            element.style.top = pos.y + "px";
            return element;
        }

        private drawEdge(n1: Vec2, n2: Vec2, type: string, subtype?: string): HTMLElement {
            var element = document.createElement("div");
            element.classList.add("map-edge");
            element.classList.add("map-" + type);
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
}