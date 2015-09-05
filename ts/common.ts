module Tesp {
    export interface IVec2 {
        x: number;
        y: number;
    }
    /** 2-dimensional floating point vector */
    export class Vec2 implements IVec2 {
        constructor(public x: number = 0, public y: number = 0) { }

        /** Calculate the euclidean distance between this vector and another */
        static distance(src: IVec2, dst: IVec2) {
            return Math.sqrt(((dst.x - src.x) * (dst.x - src.x)) + ((dst.y - src.y) * (dst.y - src.y)));
        }

        /** Calculate the top-left corner of a cell as a position vector */
        static fromCell(x: number, y: number): Vec2 {
            return new Vec2(x * Cell.width + Cell.widthOffset, y * Cell.height + Cell.heightOffset);
        }
    }

    export interface INode {
        id: number;
        referenceId: number;
        edges: Edge[];
        name: string;
        longName: string;
        pos: IVec2;
        type: string;
        permanent: boolean;
    }
    /** A single significant point in the world */
    export class Node implements INode {
        /** Globally unique identifier for this node */
        id: number;
        /** The id of a node this node was created on */
        referenceId: number;
        edges: Edge[];

        private static identity: number = 1;
        constructor(public name: string, public longName: string, public pos: IVec2, public type: string, public permanent: boolean = false) {
            this.id = Node.identity++;
            this.edges = [];
        }
    }

    /** A link between two nodes */
    export class Edge {
        constructor(public srcNode: Node, public destNode: Node, public cost: number) { }
    }

    /** A large area in the world */
    export class Cell {
        static width: number = 44.5;
        static height: number = 44.6;
        static widthOffset: number = 20;
        static heightOffset: number = 35;
        static fromPosition(pos: IVec2): Vec2 {
            return new Vec2((pos.x - Cell.widthOffset) / Cell.width, (pos.y - Cell.heightOffset) / Cell.height);
        }
    }

    export interface ICellRow {
        y: number;
        x1: number;
        x2: number;
        width: number;
    }
    /** A single row of cells */
    export class CellRow {
        width: number;

        constructor(public y: number, public x1: number, public x2: number) {
            this.width = x2 - x1 + 1;
        }
    }

    export interface IArea {
        target: INode;
        rows: ICellRow[];
        minY: number;
        maxY: number;
    }
    /** An area of one or more cells */
    export class Area implements IArea {
        minY: number;
        maxY: number;

        constructor(public target: Node, public rows: ICellRow[]) {
            this.minY = rows[0].y;
            this.maxY = rows[rows.length - 1].y;
        }

        /** Check if this cell contains the supplied coordinates */
        containsCell(pos: IVec2): boolean {
            return Area.containsCell(this, pos);
        }
        static containsCell(area: IArea, pos: IVec2) {
            if (pos.y >= area.minY && pos.y < area.maxY + 1) {
                var row = area.rows[Math.floor(pos.y) - area.minY];
                return pos.x >= row.x1 && pos.x < row.x2 + 1;
            }
            return false;
        }
    }
}