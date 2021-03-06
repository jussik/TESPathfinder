﻿/// <reference path="_refs.ts"/>
module Tesp {
    /** The map UI */
    export class Map {
        private edgeContainer: HTMLElement;
        private nodeContainer: HTMLElement;
        private areaContainer: HTMLElement;
        private pathContainer: HTMLElement;
        private gridContainer: HTMLElement;
        private sourceElem: HTMLElement;
        private destElem: HTMLElement;
        private markElem: HTMLElement;

        constructor(private app: Application, private element: HTMLElement) {
            this.app.addChangeListener(ChangeReason.SourceChange, () => this.renderSource());
            this.app.addChangeListener(ChangeReason.DestinationChange, () => this.renderDestination());
            this.app.addChangeListener(ChangeReason.MarkChange, () => this.renderMark());
            this.app.addChangeListener(ChangeReason.PathUpdate, (reason, pathNode) => this.renderPath(<IPathNode>pathNode));
            this.app.addChangeListener(ChangeReason.FeatureChange, () => this.updateFeatures());

            element.onclick = ev => {
                var node = this.getEventNode(ev);
                if (node != null) {
                    this.triggerContextMenu(ev, node);
                }
            };

            element.oncontextmenu = ev => {
                if (!ev.shiftKey) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    this.triggerContextMenu(ev);
                }
            }

            this.renderNodes();
            this.renderMark();
            this.renderGrid();
            this.updateFeatures();
            this.initDragScroll();
        }

        private getEventNode(event: MouseEvent) {
            var target = <HTMLElement>event.target;
            if (target.classList.contains("map-node")) {
                var id = target.getAttribute("data-node-id");
                if (id !== undefined) {
                    return this.app.world.findNodeById(+id);
                }
            }
            return null;
        }

        private triggerContextMenu(ev: MouseEvent, node?: Node) {
            this.app.ctxMenu.open(new Vec2(ev.pageX, ev.pageY), node || this.getEventNode(ev));
        }

        private initDragScroll() {
            var img = <HTMLElement>this.element.querySelector("img");
            var mousedown = false, prevX: number, prevY: number;
            var stop = (ev: MouseEvent) => {
                mousedown = false;
                this.app.toggleBodyClass("scrolling", false);
                ev.preventDefault();
            };
            var start = (ev: MouseEvent) => {
                mousedown = true;
                prevX = ev.clientX;
                prevY = ev.clientY;
                this.app.toggleBodyClass("scrolling", true);
                ev.preventDefault();
            }
            img.onmousedown = ev => {
                if (ev.button === 0 && ev.target === img) {
                    start(ev);
                }
            };
            img.onmouseup = ev => {
                if (mousedown) {
                    stop(ev);
                }
            }
            img.onmousemove = ev => {
                if (!mousedown && (ev.buttons & 1) > 0) {
                    start(ev);
                }
                if (mousedown) {
                    if (ev.which !== 1) {
                        stop(ev);
                    } else {
                        scroll(pageXOffset + prevX - ev.clientX, pageYOffset + prevY - ev.clientY);
                        prevX = ev.clientX;
                        prevY = ev.clientY;
                        ev.preventDefault();
                    }
                }
            };
        }

        private renderNodes() {
            if (this.nodeContainer != null)
                this.nodeContainer.parentElement.removeChild(this.nodeContainer);
            this.nodeContainer = document.createElement("div");
            this.element.appendChild(this.nodeContainer);
            this.app.world.nodes
                //.concat(this.app.world.landmarks.map(l => l.target))
                .forEach(n => this.nodeContainer.appendChild(this.drawNode(n)));

            if (this.edgeContainer != null)
                this.edgeContainer.parentElement.removeChild(this.edgeContainer);
            this.edgeContainer = document.createElement("div");
            this.element.appendChild(this.edgeContainer);
            this.app.world.edges.forEach(e =>
                this.edgeContainer.appendChild(this.drawEdge(e.srcNode.pos, e.destNode.pos, e.srcNode.type, "map-transport-edge")));

            if (this.areaContainer != null)
                this.areaContainer.parentElement.removeChild(this.areaContainer);
            this.areaContainer = document.createElement("div");
            this.element.appendChild(this.areaContainer);
            this.app.world.areas
                //.concat(this.app.world.regions)
                //.concat(this.app.world.landmarks)
                .forEach(a => {
                    var type = a.target.type;
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
                    if(prev != null)
                        this.areaContainer.appendChild(this.drawCellEdge(prev.x1, prev.y + 1, prev.x2 + 1, prev.y + 1, type));
                });
        }

        private drawCellEdge(x1: number, y1: number, x2: number, y2: number, type: string) {
            return this.drawEdge(Vec2.fromCell(x1, y1), Vec2.fromCell(x2, y2), type, "map-area");
        }

        private renderPath(pathNode: IPathNode) {
            if (this.pathContainer != null)
                this.pathContainer.parentElement.removeChild(this.pathContainer);

            if (pathNode == null) {
                this.pathContainer = null;
                return;
            }

            this.pathContainer = document.createElement("div");
            this.element.appendChild(this.pathContainer);
            while (pathNode && pathNode.prev) {
                this.pathContainer.appendChild(this.drawEdge(pathNode.node.pos, pathNode.prev.node.pos, "path", "map-" + pathNode.prevEdge.type));
                pathNode = pathNode.prev;
            }
        }

        private renderMark() {
            this.markElem = this.addOrUpdateNodeElem(this.app.context.markNode, this.markElem);
        }
        private renderSource() {
            this.sourceElem = this.addOrUpdateNodeElem(this.app.context.sourceNode, this.sourceElem);
        }
        private renderDestination() {
            this.destElem = this.addOrUpdateNodeElem(this.app.context.destNode, this.destElem);
        }

        private addOrUpdateNodeElem(node: INode, elem: HTMLElement): HTMLElement {
            if (elem)
                elem.parentElement.removeChild(elem);
            return node != null
                ? <HTMLElement>this.element.appendChild(this.drawNode(node))
                : null;
        }

        private renderGrid() {
            if (!this.gridContainer) {
                this.gridContainer = document.createElement("div");
                this.element.appendChild(this.gridContainer);
                var i: number, el: HTMLDivElement;
                for (i = 0; i < 37; i++) {
                    el = document.createElement("div");
                    el.classList.add("map-grid");
                    el.classList.add("map-grid-v");
                    el.style.left = (i * Cell.width + Cell.widthOffset) + "px";
                    this.gridContainer.appendChild(el);
                }
                for (i = 0; i < 42; i++) {
                    el = document.createElement("div");
                    el.classList.add("map-grid");
                    el.classList.add("map-grid-h");
                    el.style.top = (i * Cell.height + Cell.heightOffset) + "px";
                    this.gridContainer.appendChild(el);
                }

                // show grid coordinates
                /*for (i = 0; i < 37; i++) {
                    for (var j = 0; j < 42; j++) {
                        var el = document.createElement('div');
                        el.textContent = i + ',' + j;
                        el.style.position = "absolute";
                        el.style.color = "rgba(255,255,255,0.75)";
                        el.style.left = (i * 44.5 + 22) + "px";
                        el.style.top = (j * 44.6 + 37) + "px";
                        el.style.zIndex = "10";
                        el.style.font = "7pt sans-serif";
                        this.gridContainer.appendChild(el);
                    }
                }*/
            }
        }

        private updateFeatures() {
            this.element.className = "";
            this.app.features.forEach(f => {
                if (f.hidden)
                    this.element.classList.add("hide-" + f.type);
            });
        }

        private drawNode(node: INode): HTMLElement  {
            var element = document.createElement("div");
            element.classList.add("map-node");
            element.classList.add("map-" + node.type);
            element.style.left = node.pos.x + "px";
            element.style.top = node.pos.y + "px";
            element.setAttribute("data-node-id", (node.referenceId || node.id) + "");
            return element;
        }

        private drawEdge(n1: IVec2, n2: IVec2, type: string, subtype?: string): HTMLElement {
            var element = document.createElement("div");
            element.classList.add("map-edge");
            element.classList.add("map-" + type);
            if (subtype)
                element.classList.add(subtype);
            var length = Vec2.distance(n1, n2);
            element.style.left = ((n1.x + n2.x) / 2) - (length / 2) + "px";
            element.style.top = ((n1.y + n2.y) / 2) - 1 + "px";
            element.style.width = length + "px";
            element.style.transform = `rotate(${Math.atan2(n1.y - n2.y, n1.x - n2.x)}rad)`;
            return element;
        }
    }
}