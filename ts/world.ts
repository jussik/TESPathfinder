export class Vec2 {
    x: number;
    y: number;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Node {
    id: number;
    name: string;
    pos: Vec2;
    edges: Edge[];

    private static identity: number = 1;
    constructor(src: string, x: number, y: number) {
        this.id = Node.identity++;
        this.name = src;
        this.pos = new Vec2(x, y);
        this.edges = [];
    }
}

export enum EdgeType {
    Location = 1,
    SiltStrider,
    Boat,
    Guild,
    Propylon,
    Mark,
    Divine,
    Almsivi
};

export class Edge {
    type: EdgeType;
    constructor(public node: Node, type: EdgeType) {
        this.type = type;
    }
}

export class NodeSource {
    name: string;
    x: number;
    y: number;
}
export class EdgeSource {
    src: number;
    dest: number;
    type: EdgeType;
}
export class WorldSource {
    nodes: NodeSource[];
    edges: EdgeSource[];
}

export interface WorldListener { (): void; }

export class World {
    nodes: Node[] = [];
    nodesByName: Map<string, Node> = {};
    activeNode: Node;

    listeners: WorldListener[] = [];

    load(data: WorldSource) {
        this.nodes = data.nodes.map(s => new Node(s.name, s.x, s.y));
        if (this.activeNode != null)
            this.nodes.push(this.activeNode);

        // index by name
        this.nodesByName = {};
        this.nodes.forEach(n => this.nodesByName[n.name.toLowerCase()] = n);

        // process edges
        data.edges.forEach(e => {
            var src = this.nodes[e.src],
                dest = this.nodes[e.dest];
            src.edges.push(new Edge(dest, e.type));
            dest.edges.push(new Edge(src, e.type));
        });

        this.onchange();
    }
    sortnodes() {
        this.nodes.sort((a, b) => a.id - b.id);
    }

    findNode(name: string): Node {
        return this.nodesByName[name.toLowerCase()] || null;
    }
    findPath(loc: Node, dest: Node) {
        return "Path between " + loc.name + " and " + dest.name;
    }

    click(x: number, y: number) {
        if (this.activeNode != null) {
            this.activeNode.pos = new Vec2(x, y);
        } else {
            this.activeNode = new Node("You", x, y);
            this.nodes.push(this.activeNode);
            this.sortnodes();
        }

        this.onchange();
    }

    onchange() {
        this.listeners.forEach(fn => fn());
    }
    addListener(listener: WorldListener) {
        this.listeners.push(listener);
    }
}