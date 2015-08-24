module tesp {
    export class Controls {
        private pathContainer: HTMLElement;
        private featuresContainer: HTMLElement;

        constructor(private app: Application, private element: HTMLElement) {
            this.app.world.addListener(reason => {
                if (reason === WorldUpdate.PathUpdate)
                    this.updatePath();
                else if (reason === WorldUpdate.SourceChange)
                    this.updateNodeInfo('.control-source-info', this.app.world.sourceNode);
                else if (reason === WorldUpdate.DestinationChange)
                    this.updateNodeInfo('.control-destination-info', this.app.world.destNode);
                else if (reason === WorldUpdate.MarkChange)
                    this.updateNodeInfo('.control-mark-info', this.app.world.markNode);
            });

            var nodeSearchIndex: { [key: string]: Node } = {};
            var searchInput = <HTMLInputElement>element.querySelector('.search-input');
            var datalist = <HTMLDataListElement>element.querySelector('#search-list');

            this.app.world.nodes
                .concat(this.app.world.landmarks.map(a => a.target))
                .forEach(n => {
                    var opt: HTMLOptionElement = document.createElement("option");
                    var feat = this.app.world.features.byName[n.type];
                    var value = feat ? `${n.name} (${this.app.world.features.byName[n.type].name})` : n.name;
                    nodeSearchIndex[value] = n;
                    opt.value = value;
                    datalist.appendChild(opt);
                });

            for (var child: HTMLElement = <HTMLElement>element.firstElementChild; child; child = <HTMLElement>child.nextElementSibling) {
                var name = child.dataset['controlContainer'];
                if (name === "path") {
                    this.pathContainer = child;
                } else if (name === "features") {
                    this.featuresContainer = child;
                }
            }

            this.drawFeatures();

            searchInput.oninput = ev => {
                var node: Node = nodeSearchIndex[searchInput.value];
                if (node !== undefined) {
                    this.app.menu.openNode(node);
                } else {
                    this.app.menu.hide();
                }
            }
        }

        updateNodeInfo(selector: string, node: Node) {
            var el = <HTMLElement>this.element.querySelector(selector);
            if (node != null) {
                el.textContent = node.longName;
                el.onclick = ev => this.app.menu.openNode(node);
            } else {
                el.textContent = "";
                el.onclick = null;
            }
        }

        private updatePath() {
            var child: Element;
            while (child = <Element>this.pathContainer.firstElementChild) {
                this.pathContainer.removeChild(child);
            }

            var pathNode: PathNode = this.app.world.pathEnd;
            while (pathNode) {
                this.pathContainer.insertBefore(this.drawPathNode(pathNode), this.pathContainer.firstElementChild);
                pathNode = pathNode.prev;
            }
        }

        private drawPathNode(pathNode: PathNode): HTMLElement {
            var el = document.createElement("div");

            var icon: string, text: string, linkText: string;
            var node = pathNode.node;
            var edge = pathNode.prevEdge;
            if (edge) {
                var action: string;
                if (edge.type === "walk") {
                    action = "Walk";
                    icon = "compass";
                } else {
                    var feat = this.app.world.features.byName[edge.type];
                    if (feat) {
                        action = feat.verb || feat.name;
                        icon = feat.icon;
                    } else {
                        action = edge.type;
                        icon = "question";
                    }
                }

                text = ` ${action} to `;
                linkText = node.type == edge.type ? node.name : node.longName;
            } else {
                icon = "map-marker";
                text = " ";
                linkText = node.longName;
            }

            var i = document.createElement("i");
            i.classList.add("path-icon");
            i.classList.add("fa");
            i.classList.add("fa-" + icon);
            el.appendChild(i);

            el.appendChild(document.createTextNode(text));

            var a = document.createElement("a");
            a.textContent = linkText;
            a.onclick = () => this.app.menu.openNode(node);
            el.appendChild(a);

            return el;
        }

        private drawFeatures() {
            this.app.world.features.forEach(f => {
                var el = document.createElement("div");
                el.textContent = f.name + ":";

                el.appendChild(this.drawCheckbox(val => {
                    f.hidden = !val;
                    this.app.world.trigger(WorldUpdate.FeatureChange);
                }, !f.hidden));
                if (!f.visualOnly)
                    el.appendChild(this.drawCheckbox(val => {
                        f.disabled = !val;
                        this.app.world.trigger(WorldUpdate.FeatureChange);
                    }, !f.disabled));

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