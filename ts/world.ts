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
    constructor(public target: Node, public rows: CellRow[]) { }
}

export interface WorldListener { (WorldUpdate): void; }
export enum WorldUpdate { Loaded, ContextChanged, SourceChange, DestinationChange, MarkChange, PathUpdated }

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

    private listeners: WorldListener[] = [];
    private nodesByName: Map<string, Node> = {};

    load(data: any) {
        this.nodes = [];
        this.edges = [];
        this.areas = [];

        for (var k in data) {
            this.loadTransport(data, k);
        }

        // index by name
        this.nodesByName = {};
        this.nodes.forEach(n => this.nodesByName[n.name.toLowerCase()] = n);

        this.onchange(WorldUpdate.Loaded);
    }

    loadTransport(data: any, type: string) {
        var array: any[] = data[type];
        var nodes: Node[] = array.map(n => new Node(n.name, n.x, n.y, type));
        this.nodes = this.nodes.concat(nodes);
        array.forEach((n, i1) => {
            var n1 = nodes[i1];
            if (n.edges) {
                n.edges.forEach(i2 => {
                    var n2 = nodes[i2];
                    var edge = new Edge(n1, n2, 10);
                    n1.edges.push(edge);
                    n2.edges.push(edge);
                    this.edges.push(edge);
                });
            }
            if (n.oneWayEdges) {
                n.oneWayEdges.forEach(i2 => {
                    var edge = new Edge(n1, nodes[i2], 10);
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
        var nodeMap: Map<number, PathNode> = {};
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
            source.edges.push(new PathEdge(mn, 1));
            nodes.push(mn);
        }

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