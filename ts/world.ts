export class Vec2 {
    x: number;
    y: number;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Node {
    name: string;
    pos: Vec2;
    edges: Edge[];

    constructor(src: NodeSource) {
        this.name = src.name;
        this.pos = new Vec2(src.x, src.y);
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
    constructor(public node: Node, src: EdgeSource) {
        this.type = src.type;
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

export class World {
    nodes: Node[];
    nodesByName: Map<string, Node>;

    load(data: WorldSource) {
        this.nodes = data.nodes.map(s => new Node(s));
        // index by name
        this.nodesByName = {};
        this.nodes.forEach(n => this.nodesByName[n.name.toLowerCase()] = n);
        // process edges
        data.edges.forEach(e => {
            var src = this.nodes[e.src],
                dest = this.nodes[e.dest];
            src.edges.push(new Edge(dest, e));
            dest.edges.push(new Edge(src, e));
        });
    }

    findNode(name: string): Node {
        return this.nodesByName[name.toLowerCase()] || null;
    }
    findPath(loc: Node, dest: Node) {
        return "Path between " + loc.name + " and " + dest.name;
    }
}