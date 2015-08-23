/// <reference path="world.ts" />

module tesp {
    class PathSegment {
        constructor(private mode: string, private type: string, public text?: string) { }
    }
    class PathNode extends PathSegment {
        constructor(node: Node) {
            super('node', node.type, node.name);
        }
    }
    class PathEdge extends PathSegment {
        constructor(n1: Node, n2: Node) {
            super('edge', n1.type === n2.type ? n1.type : (n2.type === 'mark' ? n2.type : 'walk'));
        }
    }

    export class Controls {
        private pathContainer: HTMLElement;
        private featuresContainer: HTMLElement;

        constructor(private world: World, private element: HTMLElement) {
            world.addListener(reason => {
                if (reason === WorldUpdate.PathUpdate)
                    this.updatePath();
                else if (reason === WorldUpdate.MarkChange)
                    element.querySelector('.search-mark').textContent = this.world.markNode != null
                        ? `[${this.world.markNode.pos.x}-${this.world.markNode.pos.y}]` : "";
            });

            element.onclick = ev => {
                if (ev.target instanceof HTMLButtonElement) {
                    var data = (<HTMLButtonElement>ev.target).dataset;

                    var cset = data['contextSet'];
                    if (cset !== undefined) {
                        this.world.context = cset;
                    }

                    var cunset = data['contextUnset'];
                    if (cunset !== undefined) {
                        this.world.clearContext(cunset);
                    }
                }
            };

            for (var child: HTMLElement = <HTMLElement>element.firstElementChild; child; child = <HTMLElement>child.nextElementSibling) {
                var name = child.dataset['searchContainer'];
                if (name === "path") {
                    this.pathContainer = child;
                } else if (name === "features") {
                    this.featuresContainer = child;
                }
            }

            this.drawFeatures();
        }

        private updatePath() {
            var child: Element;
            while (child = <Element>this.pathContainer.firstElementChild) {
                this.pathContainer.removeChild(child);
            }

            var path = this.world.path;
            if (path != null && path.length > 1) {
                var n1 = path[0];
                this.pathContainer.appendChild(this.drawPathNode(n1));
                for (var i = 1; i < path.length; i++) {
                    var n2 = path[i];
                    this.pathContainer.appendChild(this.drawPathEdge(n1, n2));
                    this.pathContainer.appendChild(this.drawPathNode(n2));
                    n1 = n2;
                }
            }
        }

        private drawPathNode(node: Node): HTMLElement {
            var el = document.createElement("div");
            el.textContent = `${node.name} (${node.type})`;
            return el;
        }
        private static teleportTypes: { [key: string]: boolean } = { mark: true, divine: true, almsivi: true };
        private drawPathEdge(n1: Node, n2: Node): HTMLElement {
            var el = document.createElement("div");
            el.textContent = n1.type === n2.type ? n1.type : (Controls.teleportTypes[n2.type] ? n2.type : 'walk');
            return el;
        }

        private drawFeatures() {
            this.world.features.forEach(f => {
                var el = document.createElement("div");
                el.textContent = f.name + ":";

                el.appendChild(this.drawCheckbox(val => {
                    f.visible = val;
                    this.world.trigger(WorldUpdate.FeatureChange);
                }, f.visible));
                if (f.affectsPath)
                    el.appendChild(this.drawCheckbox(val => {
                        f.enabled = val;
                        this.world.trigger(WorldUpdate.FeatureChange);
                    }, f.enabled));

                this.featuresContainer.appendChild(el);
            });
        }

        private drawCheckbox(onchange: (value: boolean) => void, initial: boolean): HTMLElement {
            var input = document.createElement("input");
            input.type = "checkbox";
            input.onchange = ev => onchange(input.checked);
            input.checked = initial;
            return input;
        }
    }
}