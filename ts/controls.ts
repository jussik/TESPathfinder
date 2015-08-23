/// <reference path="world.ts" />

module tesp {
    export class Controls {
        private pathContainer: HTMLElement;
        private featuresContainer: HTMLElement;

        constructor(private world: World, private element: HTMLElement) {
            world.addListener(reason => {
                if (reason === WorldUpdate.PathUpdate)
                    this.updatePath();
                else if (reason === WorldUpdate.SourceChange)
                    this.updateNodeInfo('.control-source-info', this.world.sourceNode);
                else if (reason === WorldUpdate.DestinationChange)
                    this.updateNodeInfo('.control-destination-info', this.world.destNode);
                else if (reason === WorldUpdate.MarkChange)
                    this.updateNodeInfo('.control-mark-info', this.world.markNode);
            });

            var nodeSearchIndex: { [key: string]: Node } = {};
            var searchInput = <HTMLInputElement>element.querySelector('.search-input');
            var datalist = <HTMLDataListElement>element.querySelector('#search-list');
            this.world.nodes
                .concat(this.world.landmarks.map(a => a.target))
                .forEach(n => {
                    var opt: HTMLOptionElement = document.createElement("option");
                    var feat = this.world.features.byName[n.type];
                    var value = feat ? `${n.name} (${this.world.features.byName[n.type].name})` : n.name;
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

                    var csearch = data['contextSearch'];
                    if (csearch !== undefined) {
                        var node: Node = nodeSearchIndex[searchInput.value];
                        if (node !== undefined) {
                            this.world.context = csearch;
                            this.world.contextNode(node);
                            searchInput.value = "";
                        }
                    }
                }
            };
        }

        updateNodeInfo(selector: string, node: Node) {
            this.element.querySelector(selector).textContent = node != null ? node.longName : "";
        }

        private updatePath() {
            var child: Element;
            while (child = <Element>this.pathContainer.firstElementChild) {
                this.pathContainer.removeChild(child);
            }

            var pathNode: PathNode = this.world.pathEnd;
            while (pathNode) {
                this.pathContainer.insertBefore(this.drawPathNode(pathNode), this.pathContainer.firstElementChild);
                pathNode = pathNode.prev;
            }
        }

        private drawPathNode(node: PathNode): HTMLElement {
            var el = document.createElement("div");

            var icon: string, text: string;
            var edge = node.prevEdge;
            if (edge) {
                var action: string;
                if (edge.type === "walk") {
                    action = "Walk";
                    icon = "compass";
                } else {
                    var feat = this.world.features.byName[edge.type];
                    if (feat) {
                        action = feat.name;
                        icon = feat.icon;
                    } else {
                        action = edge.type;
                        icon = "question";
                    }
                }

                var loc = node.node.type == edge.type ? node.node.name : node.node.longName;
                text = `${action} to ${loc}`;
            } else {
                icon = "map-marker";
                text = node.node.longName;
            }

            var i = document.createElement("i");
            i.classList.add("path-icon");
            i.classList.add("fa");
            i.classList.add("fa-" + icon);
            el.appendChild(i);
            el.appendChild(document.createTextNode(" " + text));

            return el;
        }

        private drawFeatures() {
            this.world.features.forEach(f => {
                var el = document.createElement("div");
                el.textContent = f.name + ":";

                el.appendChild(this.drawCheckbox(val => {
                    f.hidden = !val;
                    this.world.trigger(WorldUpdate.FeatureChange);
                }, !f.hidden));
                if (f.affectsPath)
                    el.appendChild(this.drawCheckbox(val => {
                        f.disabled = !val;
                        this.world.trigger(WorldUpdate.FeatureChange);
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