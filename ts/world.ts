module tesp {
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
        constructor(public name: string, public longName: string, x: number, y: number, public type: string, public permanent: boolean = false) {
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
    export enum WorldUpdate { SourceChange, DestinationChange, MarkChange, FeatureChange, PathUpdate }

    export class Feature {
        name: string;
        verb: string;
        location: string;
        type: string;
        icon: string;
        disabled: boolean;
        hidden: boolean;
        visualOnly: boolean;
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
        landmarks: Area[];
        sourceNode: Node;
        destNode: Node;
        markNode: Node;
        pathEnd: PathNode;
        features: FeatureList;

        private static transportCost: number = 10;
        private static spellCost: number = 5;

        private listeners: WorldListener[] = [];
        private nodesById: { [key: number]: Node } = {};

        constructor(private app: Application, data: any) {
            this.features = <FeatureList>[
                { name: "Mark/Recall", verb: "Recall", type: "mark", icon: "bolt" },
                { name: "Mages Guild", verb: "Guild Guide", type: "mages-guild", icon: "eye" },
                { name: "Silt Strider", verb: "Silt Strider", type: "silt-strider", icon: "bug" },
                { name: "Boat", location: "Docks", type: "boat", icon: "ship" },
                { name: "Holamayan Boat", location: "Docks", verb: "Boat",  type: "holamayan", icon: "ship" },
                { name: "Propylon Chamber", type: "propylon", icon: "cog" },
                { name: "Gondola", type: "gondola", icon: "ship" },
                { name: "Divine Intervention", location: "Imperial Cult Shrine", type: "divine", icon: "bolt" },
                { name: "Almsivi Intervention", location: "Tribunal Temple", type: "almsivi", icon: "bolt" },
                { name: "Transport lines", type: "edge", visualOnly: true },
                { name: "Locations", type: "node", visualOnly: true },
                { name: "Intervention area border", type: "area", visualOnly: true },
                { name: "Gridlines", type: "grid", visualOnly: true }
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
                .map(a => this.makeArea(new Node(a.name, a.name, 0, 0, "region"), a));
            this.landmarks = (<any[]>data.landmarks).map(a => {
                var node = new Node(a.name, a.name, 0, 0, "landmark");
                var area = this.makeArea(node, a);
                // set node location to average center point of all cells
                var sumX: number = 0;
                var sumY: number = 0;
                var count: number = 0;
                area.rows.forEach(r => {
                    sumX += (r.x1 + r.width / 2) * r.width;
                    sumY += (r.y + 0.5) * r.width;
                    count += r.width;
                });
                node.pos = Vec2.fromCell(sumX / count, sumY / count);
                return area;
            });

            // index by id
            this.nodesById = {};
            this.nodes.forEach(n => this.nodesById[n.id] = n);

            this.addListener(reason => {
                if (reason === WorldUpdate.SourceChange
                    || reason === WorldUpdate.DestinationChange
                    || reason === WorldUpdate.MarkChange
                    || reason === WorldUpdate.FeatureChange)
                    this.findPath();
                if (reason === WorldUpdate.MarkChange)
                    this.app.toggleClass("has-mark", this.markNode != null);
            });
        }

        loadTransport(data: any, type: string) {
            var array: any[] = data[type];
            var feat = this.features.byName[type];
            var typeName = feat.location || feat.name;
            var nodes: Node[] = array.map(n => new Node(n.name, `${typeName}, ${n.name}`, n.x, n.y, type, true));
            this.nodes = this.nodes.concat(nodes);
            var cost = World.transportCost;
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
                n.edges = n.node.edges
                    .filter(e => !feats[e.srcNode.type].disabled)
                    .map(e => new PathEdge(nodeMap[(e.srcNode === n.node ? e.destNode : e.srcNode).id], e.cost, n.node.type)));

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
                                var feat = this.features.byName[a.target.type];
                                var name = `${feat.name} range of ${a.target.name}`;
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

        getRegionName(x: number, y: number): string {
            var area: Area;
            var cell = Cell.fromPosition(new Vec2(x, y));
            return this.regions.some(r => r.containsCell(cell) && (area = r) != null)
                ? area.target.name
                : null;
        }
        getLandmarkName(x: number, y: number): string {
            var area: Area;
            var cell = Cell.fromPosition(new Vec2(x, y));
            return this.landmarks.some(r => r.containsCell(cell) && (area = r) != null)
                ? area.target.name
                : null;
        }

        setContextLocation(context: string, x: number, y: number) {
            var areaName = this.getLandmarkName(x, y) || this.getRegionName(x, y);
            if (context === 'source') {
                var name = areaName || "You";
                this.setContextNode(context, new Node(name, name, x, y, "source"));
            } else if (context === 'destination') {
                var name = areaName || "Your destination";
                this.setContextNode(context, new Node(name, name, x, y, "destination"));
            } else if (context === 'mark') {
                var name = areaName ? `Mark in ${areaName}` : "Mark";
                this.markNode = new Node(name, name, x, y, "mark");
                this.trigger(WorldUpdate.MarkChange);
            }
        }
        setContextNode(context: string, node: Node) {
            if (context === 'source') {
                this.sourceNode = node;
                this.trigger(WorldUpdate.SourceChange);
            } else if (context === 'destination') {
                this.destNode = node;
                this.trigger(WorldUpdate.DestinationChange);
            } else if (context === 'mark') {
                var pos = node.pos;
                this.markNode = new Node(node.name, node.longName, pos.x, pos.y, "mark");
                this.markNode.referenceId = node.referenceId || node.id;
                this.trigger(WorldUpdate.MarkChange);
            }
        }
        clearContext(context: string) {
            if (context === 'source') {
                this.sourceNode = null;
                this.trigger(WorldUpdate.SourceChange);
            } else if (context === 'destination') {
                this.destNode = null;
                this.trigger(WorldUpdate.DestinationChange);
            } else if (context === 'mark') {
                this.markNode = null;
                this.trigger(WorldUpdate.MarkChange);
            }
        }
    }
}