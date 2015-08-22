module tesp {
    export class Vec2 {
        x: number;
        y: number;
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }

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
            return new Vec2(Math.floor((pos.x - Cell.widthOffset) / Cell.width), Math.floor((pos.y - Cell.heightOffset) / Cell.height));
        }
    }

    export class Node {
        id: number;
        pos: Vec2;
        edges: Edge[];

        private static identity: number = 1;
        constructor(public name: string, x: number, y: number, public type: string) {
            this.id = Node.identity++;
            this.pos = new Vec2(x, y);
            this.edges = [];
        }
    }

    export class Edge {
        constructor(public srcNode: Node, public destNode: Node, public cost: number) { }
    }

    export class CellRow {
        constructor(public y: number, public x1: number, public x2: number) { }
    }
    export class Area {
        private minY: number;
        private maxY: number;

        constructor(public target: Node, public rows: CellRow[]) {
            this.minY = rows[0].y;
            this.maxY = rows[rows.length - 1].y;
        }

        public containsCell(pos: Vec2) {
            if (pos.y >= this.minY && pos.y <= this.maxY) {
                var row = this.rows[pos.y - this.minY];
                return pos.x >= row.x1 && pos.x <= row.x2;
            }
            return false;
        }
    }

    export interface WorldListener { (WorldUpdate): void; }
    export enum WorldUpdate { ContextChanged, SourceChange, DestinationChange, MarkChange, PathUpdated }

    export class Feature {
        enabled: boolean;
        visible: boolean;

        constructor(public name: string, public type: string, public affectsPath) {
            this.enabled = true;
            this.visible = true;
        }
    }

    class PathEdge {
        constructor(public target: PathNode, public cost: number) { }
    }
    class PathNode {
        dist: number;
        prev: PathNode;
        edges: PathEdge[];

        constructor(public node: Node) {
            this.dist = Infinity;
        }
    }

    export class World {
        nodes: Node[] = [];
        edges: Edge[] = [];
        areas: Area[] = [];
        sourceNode: Node;
        destNode: Node;
        markNode: Node;
        path: Node[];
        features: Feature[];

        static defaultTransportCost: number = 10;
        static transportCost = { "mages-guild": 30 };
        static spellCost: number = 5;

        private listeners: WorldListener[] = [];
        private nodesByName: {[key:string]: Node} = {};

        constructor(data: any) {
            this.features = [
                new Feature("Mark/Recall", "mark", true),
                new Feature("Mages Guild", "mages-guild", true),
                new Feature("Silt Striders", "silt-strider", true),
                new Feature("Boats", "boat", true),
                new Feature("Holamayan Boat", "holamayan", true),
                new Feature("Vivec Gondolas", "gondola", true),
                new Feature("Divine Intervention", "divine", true),
                new Feature("Almsivi Intervention", "almsivi", true),
                new Feature("Transport lines", "edge", false),
                new Feature("Locations", "node", false),
                new Feature("Area borders", "area", false),
                new Feature("Gridlines", "grid", false)
            ];

            this.nodes = [];
            this.edges = [];
            this.areas = [];

            for (var k in data) {
                this.loadTransport(data, k);
            }

            // index by name
            this.nodesByName = {};
            this.nodes.forEach(n => this.nodesByName[n.name.toLowerCase()] = n);
        }

        loadTransport(data: any, type: string) {
            var array: any[] = data[type];
            var nodes: Node[] = array.map(n => new Node(n.name, n.x, n.y, type));
            this.nodes = this.nodes.concat(nodes);
            var cost = World.transportCost[type] || World.defaultTransportCost;
            array.forEach((n, i1) => {
                var n1 = nodes[i1];
                if (n.edges) {
                    n.edges.forEach(i2 => {
                        var n2 = nodes[i2];
                        var edge = new Edge(n1, n2, cost);
                        n1.edges.push(edge);
                        n2.edges.push(edge);
                        this.edges.push(edge);
                    });
                }
                if (n.oneWayEdges) {
                    n.oneWayEdges.forEach(i2 => {
                        var edge = new Edge(n1, nodes[i2], cost);
                        n1.edges.push(edge);
                        this.edges.push(edge);
                    });
                }
                if (n.cells) {
                    var y = n.top || 0;
                    var rows = n.cells.map(c => new CellRow(y++, c[0], c[1]));
                    this.areas.push(new Area(n1, rows));
                }
            });
        }

        addListener(listener: WorldListener) {
            this.listeners.push(listener);
        }

        findNode(name: string): Node {
            return this.nodesByName[name.toLowerCase()] || null;
        }

        findPath() {
            if (this.sourceNode == null || this.destNode == null) {
                this.path = [];
                this.onchange(WorldUpdate.PathUpdated);
                return;
            }

            // create nodes
            var nodeMap: { [key: number]: PathNode } = {};
            var nodes: PathNode[] = this.nodes.map(n => {
                var pn = new PathNode(n);
                nodeMap[n.id] = pn;
                return pn;
            });

            var source = new PathNode(this.sourceNode);
            source.dist = 0;
            nodes.push(source);

            var dest = new PathNode(this.destNode);
            nodes.push(dest);

            // explicit edges (services)
            nodes.forEach(n =>
                n.edges = n.node.edges.map(e =>
                    new PathEdge(nodeMap[(e.srcNode === n.node ? e.destNode : e.srcNode).id], e.cost)));

            // implicit edges (walking)
            nodes.forEach(n =>
                n.edges = n.edges.concat(nodes
                    .filter(n2 => n2 !== n && !n.edges.some(e => e.target === n2))
                    .map(n2 => new PathEdge(n2, n.node.pos.distance(n2.node.pos)))));

            // mark
            if (this.markNode != null) {
                var mn = new PathNode(this.markNode);
                mn.edges = nodes.filter(n => n !== source).map(n =>
                    new PathEdge(n, mn.node.pos.distance(n.node.pos)));
                source.edges.push(new PathEdge(mn, World.spellCost));
                nodes.push(mn);
            }

            // intervention
            nodes.forEach(n => {
                var cell = Cell.fromPosition(n.node.pos);
                this.areas.forEach(a => {
                    if (a.containsCell(cell)) {
                        n.edges.push(new PathEdge(nodeMap[a.target.id], World.spellCost));
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
                    }
                }
            }

            this.path = [];
            var n = dest;
            while (n) {
                this.path.unshift(n.node);
                n = n.prev;
            }

            this.onchange(WorldUpdate.PathUpdated);
        }

        private _context: string;
        get context(): string {
            return this._context;
        }
        set context(value: string) {
            this._context = value;
            this.onchange(WorldUpdate.ContextChanged);
        }

        contextClick(x: number, y: number) {
            if (!this.context)
                return;

            if (this.context === 'source') {
                if (this.sourceNode != null) {
                    this.sourceNode.pos = new Vec2(x, y);
                } else {
                    this.sourceNode = new Node("You", x, y, "source");
                }
                this.onchange(WorldUpdate.SourceChange);
            } else if (this.context === 'destination') {
                if (this.destNode != null) {
                    this.destNode.pos = new Vec2(x, y);
                } else {
                    this.destNode = new Node("Your destination", x, y, "destination");
                }
                this.onchange(WorldUpdate.DestinationChange);
            } else if (this.context === 'mark') {
                if (this.markNode != null) {
                    this.markNode.pos = new Vec2(x, y);
                } else {
                    this.markNode = new Node("Recall", x, y, "mark");
                }
                this.onchange(WorldUpdate.MarkChange);
            }

            this.context = null;
            this.findPath();
        }

        clearContext(context: string) {
            if (context === 'source') {
                this.sourceNode = null;
                this.onchange(WorldUpdate.SourceChange);
            } else if (context === 'destination') {
                this.destNode = null;
                this.onchange(WorldUpdate.DestinationChange);
            } else if (context === 'mark') {
                this.markNode = null;
                this.onchange(WorldUpdate.MarkChange);
            }

            this.context = null;
            this.findPath();
        }

        private sortnodes() {
            this.nodes.sort((a, b) => a.id - b.id);
        }
        private onchange(reason: WorldUpdate) {
            this.listeners.forEach(fn => fn(reason));
        }
    }
}