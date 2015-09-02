module Tesp {
    export type TransportSource = { [key: string]: INodeSource[] };
    export interface IWorldSource {
        transport: TransportSource;
        regions: INodeSource[];
        landmarks: INodeSource[];
    }
    export interface INodeSource {
        name: string;
        x: number;
        y: number;
        edges: number[];
        oneWayEdges: number[];
        top: number;
        cells: number[][];
    }

    /** Static assets and locations */
    export class World {
        nodes: Node[];
        edges: Edge[];
        areas: Area[];
        regions: Area[];
        landmarks: Area[];

        private nodesById: { [key: number]: Node } = {};
        private static transportCost: number = 10;

        constructor(private app: Application, data: IWorldSource) {
            this.nodes = [];
            this.edges = [];
            this.areas = [];

            Object.getOwnPropertyNames(data.transport).forEach(k => this.loadTransport(data.transport, k));
            this.regions = data.regions.map(a => World.makeArea(new Node(a.name, a.name, new Vec2(0, 0), "region"), a));
            this.landmarks = data.landmarks.map(a => {
                var node = new Node(a.name, a.name, new Vec2(0, 0), "landmark");
                var area = World.makeArea(node, a);
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
        }

        loadTransport(data: TransportSource, type: string) {
            var array: INodeSource[] = data[type];
            var feat = this.app.features.byName[type];
            var typeName = feat.location || feat.name;
            var nodes: Node[] = array.map(n => new Node(n.name, `${typeName}, ${n.name}`, new Vec2(n.x, n.y), type, true));
            this.nodes = this.nodes.concat(nodes);
            var cost = World.transportCost;
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
                    this.areas.push(World.makeArea(n1, n));
                }
            });
        }

        private static makeArea(node: Node, data: INodeSource) {
            var y = data.top || 0;
            var rows = data.cells.map(c => new CellRow(y++, c[0], c[1]));
            return new Area(node, rows);
        }

        findNodeById(id: number): Node {
            return this.nodesById[id] || null;
        }

        getRegionName(pos: Vec2): string {
            var area = World.getAreaByCell(this.regions, Cell.fromPosition(pos));
            return area != null ? area.target.name : null;
        }
        getLandmarkName(pos: Vec2): string {
            var area = World.getAreaByCell(this.landmarks, Cell.fromPosition(pos));
            return area != null ? area.target.name : null;
        }
        private static getAreaByCell(source: Area[], cell: Vec2): Area {
            var area: Area;
            if (source.some(r => r.containsCell(cell) && (area = r) != null))
                return area;
            return null;
        }
    }
}