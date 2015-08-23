﻿module tesp {
    export class Vec2 {
        constructor(public x: number, public y: number) { }

        distance(other: Vec2): number {
            return Math.sqrt(((other.x - this.x) * (other.x - this.x)) + ((other.y - this.y) * (other.y - this.y)));
        }

        static fromCell(x: number, y: number): Vec2 {
            return new Vec2(x * Cell.width + Cell.widthOffset, y * Cell.height + Cell.heightOffset);
        }
    }

    export class Cell {
        static width: number = 44.5;
        static height: number = 44.6;
        static widthOffset: number = 20;
        static heightOffset: number = 35;
        static fromPosition(pos: Vec2): Vec2 {
            return new Vec2((pos.x - Cell.widthOffset) / Cell.width, (pos.y - Cell.heightOffset) / Cell.height);
        }
    }

    export class Node {
        id: number;
        pos: Vec2;
        edges: Edge[];
        referenceId: number;

        private static identity: number = 1;
        constructor(public name: string, public longName: string, x: number, y: number, public type: string) {
            this.id = Node.identity++;
            this.pos = new Vec2(x, y);
            this.edges = [];
        }
    }

    export class Edge {
        constructor(public srcNode: Node, public destNode: Node, public cost: number) { }
    }

    export class CellRow {
        width: number;

        constructor(public y: number, public x1: number, public x2: number) {
            this.width = x2 - x1 + 1;
        }
    }
    export class Area {
        private minY: number;
        private maxY: number;

        constructor(public target: Node, public rows: CellRow[]) {
            this.minY = rows[0].y;
            this.maxY = rows[rows.length - 1].y;
        }

        public containsCell(pos: Vec2) {
            if (pos.y >= this.minY && pos.y < this.maxY + 1) {
                var row = this.rows[Math.floor(pos.y) - this.minY];
                return pos.x >= row.x1 && pos.x < row.x2 + 1;
            }
            return false;
        }
    }

    export interface WorldListener { (reason: WorldUpdate): void; }
    export enum WorldUpdate { ContextChange, SourceChange, DestinationChange, MarkChange, FeatureChange, PathUpdate }

    export class Feature {
        disabled: boolean;
        hidden: boolean;

        constructor(public name: string, public type: string, public icon: string, public affectsPath: boolean) { }
    }
    export interface FeatureList extends Array<Feature> {
        byName: {[key:string]:Feature};
    }

    export class PathEdge {
        constructor(public target: PathNode, public cost: number, public type: string) { }
    }
    export class PathNode {
        dist: number;
        prev: PathNode;
        prevEdge: PathEdge;
        edges: PathEdge[];

        constructor(public node: Node) {
            this.dist = Infinity;
        }
    }

    export class World {
        nodes: Node[];
        edges: Edge[];
        areas: Area[];
        regions: Area[];
        sourceNode: Node;
        destNode: Node;
        markNode: Node;
        pathEnd: PathNode;
        features: FeatureList;

        private static defaultTransportCost: number = 10;
        private static transportCost: { [key: string]: number } = { "mages-guild": 30 };
        private static spellCost: number = 5;

        private listeners: WorldListener[] = [];
        private nodesById: { [key: number]: Node } = {};

        constructor(data: any) {
            this.features = <FeatureList>[
                new Feature("Recall", "mark", "bolt", true),
                new Feature("Mages Guild", "mages-guild", "eye", true),
                new Feature("Silt Strider", "silt-strider", "bug", true),
                new Feature("Boat", "boat", "ship", true),
                new Feature("Holamayan Boat", "holamayan", "ship", true),
                new Feature("Propylon Chamber", "propylon", "cog", true),
                new Feature("Vivec Gondola", "gondola", "ship", true),
                new Feature("Divine Intervention", "divine", "bolt", true),
                new Feature("Almsivi Intervention", "almsivi", "bolt", true),
                new Feature("Transport lines", "edge", "", false),
                new Feature("Locations", "node", "", false),
                new Feature("Intervention area borders", "area", "", false),
                new Feature("Gridlines", "grid", "", false)
            ];
            var fIdx: { [key: string]: Feature } = this.features.byName = {};
            this.features.forEach(f => fIdx[f.type] = f);
            fIdx['edge'].hidden = fIdx['area'].hidden = fIdx['grid'].hidden = true;

            this.nodes = [];
            this.edges = [];
            this.areas = [];

            for (var k in data.transport) {
                this.loadTransport(data.transport, k);
            }
            this.regions = (<any[]>data.regions)
                .filter(a => a.cells.length > 0) // TODO: remove once all regions have cells
                .map(a => this.makeArea(new Node(a.name, a.name, 0, 0, "region"), a));

            // index by id
            this.nodesById = {};
            this.nodes.forEach(n => this.nodesById[n.id] = n);

            this.addListener(reason => {
                if (reason === WorldUpdate.SourceChange
                    || reason === WorldUpdate.DestinationChange
                    || reason === WorldUpdate.MarkChange
                    || reason === WorldUpdate.FeatureChange)
                    this.findPath();
            });
        }

        loadTransport(data: any, type: string) {
            var array: any[] = data[type];
            var typeName = this.features.byName[type].name;
            var nodes: Node[] = array.map(n => new Node(n.name, `${n.name} (${typeName})`, n.x, n.y, type));
            this.nodes = this.nodes.concat(nodes);
            var cost = World.transportCost[type] || World.defaultTransportCost;
            array.forEach((n, i1) => {
                var n1 = nodes[i1];
                if (n.edges) {
                    (<number[]>n.edges).forEach(i2 => {
                        var n2 = nodes[i2];
                        var edge = new Edge(n1, n2, cost);
                        n1.edges.push(edge);
                        n2.edges.push(edge);
                        this.edges.push(edge);
                    });
                }
                if (n.oneWayEdges) {
                    (<number[]>n.oneWayEdges).forEach(i2 => {
                        var edge = new Edge(n1, nodes[i2], cost);
                        n1.edges.push(edge);
                        this.edges.push(edge);
                    });
                }
                if (n.cells) {
                    this.areas.push(this.makeArea(n1, n));
                }
            });
        }

        makeArea(node: Node, data: any) {
            var y = data.top || 0;
            var rows = (<number[][]>data.cells).map(c => new CellRow(y++, c[0], c[1]));
            return new Area(node, rows);
        }

        addListener(listener: WorldListener) {
            this.listeners.push(listener);
        }
        trigger(reason: WorldUpdate) {
            this.listeners.forEach(fn => fn(reason));
        }

        findNodeById(id: number): Node {
            return this.nodesById[id] || null;
        }

        private findPath() {
            if (this.sourceNode == null || this.destNode == null || this.sourceNode === this.destNode) {
                this.pathEnd = null;
                this.trigger(WorldUpdate.PathUpdate);
                return;
            }

            // create nodes
            var nodeMap: { [key: number]: PathNode } = {};
            var feats = this.features.byName;
            var nodes: PathNode[] = this.nodes
                .filter(n => !feats[n.type].disabled && n !== this.sourceNode && n !== this.destNode)
                .map(n => nodeMap[n.id] = new PathNode(n));

            var source = new PathNode(this.sourceNode);
            source.dist = 0;
            nodes.push(source);
            nodeMap[this.sourceNode.id] = source;

            var dest = new PathNode(this.destNode);
            nodes.push(dest);
            nodeMap[this.destNode.id] = dest;

            var maxCost = this.sourceNode.pos.distance(this.destNode.pos);

            // explicit edges (services)
            nodes.forEach(n =>
                n.edges = n.node.edges.map(e =>
                    new PathEdge(nodeMap[(e.srcNode === n.node ? e.destNode : e.srcNode).id], e.cost, n.node.type)));

            // implicit edges (walking)
            nodes.forEach(n =>
                n.edges = n.edges.concat(nodes
                    .filter(n2 => n2 !== n && !n.edges.some(e => e.target === n2))
                    .map(n2 => new PathEdge(n2, n.node.pos.distance(n2.node.pos), "walk"))
                    .filter(e => e.cost <= maxCost)));

            // mark
            if (this.markNode != null && !feats['mark'].disabled) {
                var mn = new PathNode(this.markNode);
                mn.edges = nodes.filter(n => n !== source)
                    .map(n => new PathEdge(n, mn.node.pos.distance(n.node.pos), "walk"))
                    .filter(e => e.cost < maxCost);
                source.edges.push(new PathEdge(mn, World.spellCost, "mark"));
                nodes.push(mn);
            }

            // intervention
            nodes.forEach(n => {
                var cell = Cell.fromPosition(n.node.pos);
                this.areas.forEach(a => {
                    if (!feats[a.target.type].disabled) {
                        if (a.containsCell(cell)) {
                            // node inside area, teleport to temple/shrine
                            n.edges.push(new PathEdge(nodeMap[a.target.id], World.spellCost, a.target.type));
                        } else {
                            // node outside area, walk to edge
                            var dist: number = Infinity;
                            var closest: Vec2;
                            a.rows.forEach(r => {
                                // v is closest point (in cell units) from node to row
                                var v = new Vec2(
                                    Math.max(Math.min(cell.x, r.x1 + r.width), r.x1),
                                    Math.max(Math.min(cell.y, r.y + 1), r.y));
                                var alt = cell.distance(v);
                                if (alt < dist) {
                                    dist = alt;
                                    closest = v;
                                }
                            });
                            var pos = Vec2.fromCell(closest.x, closest.y);
                            var cost = n.node.pos.distance(pos);
                            if (cost < maxCost) {
                                // new node to allow us to teleport once we're in the area
                                var name = `${a.target.name} ${a.target.type} area`;
                                var an = new PathNode(new Node(name, name, pos.x, pos.y, "area"));
                                an.edges = [new PathEdge(nodeMap[a.target.id], World.spellCost, a.target.type)];
                                nodes.push(an);
                                n.edges.push(new PathEdge(an, cost, "walk"));
                            }
                        }
                    }
                });
            });

            var q: PathNode[] = nodes.slice();

            while (q.length > 0) {
                q.sort((a, b) => b.dist - a.dist);
                var u = q.pop();

                for (var i = 0; i < u.edges.length; i++) {
                    var e = u.edges[i];
                    var v = e.target;
                    var alt = u.dist + e.cost;
                    if (alt < v.dist) {
                        v.dist = alt;
                        v.prev = u;
                        v.prevEdge = e;
                    }
                }
            }

            this.pathEnd = dest;
            this.trigger(WorldUpdate.PathUpdate);
        }

        private _context: string;
        get context(): string {
            return this._context;
        }
        set context(value: string) {
            this._context = value;
            this.trigger(WorldUpdate.ContextChange);
        }

        contextClick(x: number, y: number) {
            if (!this.context)
                return;

            if (this.context === 'source') {
                var region = this.getRegionName(x, y);
                this.contextNode(new Node("You", region ? `You in ${region}` : "You", x, y, "source"));
            } else if (this.context === 'destination') {
                var region = this.getRegionName(x, y);
                this.contextNode(new Node("Your destination", region ? `Your destination in ${region}` : "Your destination", x, y, "destination"));
            } else if (this.context === 'mark') {
                var region = this.getRegionName(x, y);
                this.markNode = new Node("Mark", region ? `Mark in ${region}` : "Mark", x, y, "mark");
                this.trigger(WorldUpdate.MarkChange);
                this.context = null;
            }
        }
        private getRegionName(x: number, y: number) {
            var region: Area;
            var cell = Cell.fromPosition(new Vec2(x, y));
            return this.regions.some(r => r.containsCell(cell) && (region = r) != null)
                ? region.target.name
                : null;
        }

        contextNode(node: Node) {
            if (!this.context)
                return;

            if (this.context === 'source') {
                this.sourceNode = node;
                this.context = null;
                this.trigger(WorldUpdate.SourceChange);
            } else if (this.context === 'destination') {
                this.destNode = node;
                this.context = null;
                this.trigger(WorldUpdate.DestinationChange);
            } else if (this.context === 'mark') {
                var pos = node.pos;
                this.markNode = new Node(node.name, node.longName, pos.x, pos.y, "mark");
                this.markNode.referenceId = node.referenceId || node.id;
                this.context = null;
                this.trigger(WorldUpdate.MarkChange);
            }
        }

        clearContext(context: string) {
            if (context === 'source') {
                this.sourceNode = null;
                this.context = null;
                this.trigger(WorldUpdate.SourceChange);
            } else if (context === 'destination') {
                this.destNode = null;
                this.context = null;
                this.trigger(WorldUpdate.DestinationChange);
            } else if (context === 'mark') {
                this.markNode = null;
                this.context = null;
                this.trigger(WorldUpdate.MarkChange);
            }
        }
    }
}