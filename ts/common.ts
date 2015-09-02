module Tesp {
    export class Vec2 {
        constructor(public x: number, public y: number) { }

        distance(other: Vec2): number {
            return Math.sqrt(((other.x - this.x) * (other.x - this.x)) + ((other.y - this.y) * (other.y - this.y)));
        }

        static fromCell(x: number, y: number): Vec2 {
            return new Vec2(x * Cell.width + Cell.widthOffset, y * Cell.height + Cell.heightOffset);
        }
    }

    export class Node {
        id: number;
        edges: Edge[];
        referenceId: number;

        private static identity: number = 1;
        constructor(public name: string, public longName: string, public pos: Vec2, public type: string, public permanent: boolean = false) {
            this.id = Node.identity++;
            this.edges = [];
        }
    }

    export class Edge {
        constructor(public srcNode: Node, public destNode: Node, public cost: number) { }
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

        containsCell(pos: Vec2) {
            if (pos.y >= this.minY && pos.y < this.maxY + 1) {
                var row = this.rows[Math.floor(pos.y) - this.minY];
                return pos.x >= row.x1 && pos.x < row.x2 + 1;
            }
            return false;
        }
    }
}