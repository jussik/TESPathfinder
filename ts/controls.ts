module Tesp {
    /** UI controls for search and navigation */
    export class Controls {
        private pathContainer: HTMLElement;
        private featuresContainer: HTMLElement;
        private searchInput: HTMLInputElement;
        private searchBox: HTMLElement;

        constructor(private app: Application, private element: HTMLElement) {
            this.app.addChangeListener(reason => {
                if (reason === ChangeReason.PathUpdate)
                    this.updatePath();
                else if (reason === ChangeReason.SourceChange)
                    this.updateNodeInfo(".control-source-info", this.app.context.sourceNode);
                else if (reason === ChangeReason.DestinationChange)
                    this.updateNodeInfo(".control-destination-info", this.app.context.destNode);
                else if (reason === ChangeReason.MarkChange)
                    this.updateNodeInfo(".control-mark-info", this.app.context.markNode);
            });

            this.pathContainer = <HTMLElement>element.querySelector(".path-container");
            this.featuresContainer = <HTMLElement>element.querySelector(".features-container");
            this.searchInput = <HTMLInputElement>element.querySelector(".search-input");
            this.searchBox = <HTMLInputElement>element.querySelector(".search-results");

            var featuresVisible = false;
            (<HTMLElement>element.querySelector(".settings-icon")).onclick = () => 
                this.featuresContainer.style.display = (featuresVisible = !featuresVisible) ? "block" : "none";

            function prepTerm(text: string) {
                return text != null ? text.toLowerCase().replace(/[^a-z]+/g, " ") : null;
            }

            var searchNodes = this.app.world.nodes
                .concat(this.app.world.landmarks.map(a => a.target))
                .map(n => {
                    var feat = this.app.features.byName[n.type];
                    var featName = feat != null ? feat.location || feat.name : null
                    return {
                        name: prepTerm(n.name),
                        location: prepTerm(featName),
                        node: n,
                        feature: featName
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name))
                .sort((a, b) => (a.location || "").localeCompare(b.location || ""));

            this.drawFeatures();

            this.searchInput.oninput = () => {
                var child: Element;
                while ((child = this.searchBox.firstElementChild) != null) {
                    this.searchBox.removeChild(child);
                }

                var search = this.searchInput.value.toLowerCase();

                var starts: number[] = [];
                var terms: string[] = [];
                var alpha = false;
                for (var i = 0; i < search.length; i++) {
                    var c = search.charCodeAt(i);
                    if (c > 96 && c < 123) {
                        if (!alpha) {
                            starts.push(i);
                            alpha = true;
                        }
                    } else if (alpha) {
                        terms = terms.concat(starts.map(s => search.substring(s, i)));
                        alpha = false;
                    }
                }
                if (alpha) {
                    terms = terms.concat(starts.map(s => search.substring(s)));
                }

                var results = searchNodes
                    .filter(n => {
                        var c = 0;
                        return terms.some(t => {
                            if (n.name.indexOf(t) === 0 || n.location != null && n.location.indexOf(t) === 0)
                                c++;
                            return c >= starts.length;
                        });
                    });

                this.searchBox.style.display = results.length > 0 ? "inherit" : "none";
                results.forEach(n => {
                    var item = document.createElement("li");
                    item.className = "link";
                    item.textContent = n.feature ? `${n.node.name}, ${n.feature}` : n.node.name;
                    item.onclick = () => {
                        this.app.menu.openNode(n.node);
                        this.clearSearch();
                    };
                    item.onmousedown = ev => ev.stopPropagation();
                    this.searchBox.appendChild(item);
                });

                var input = this.searchInput.getBoundingClientRect();
                this.searchBox.style.top = (input.top + input.height) + "px";
                this.searchBox.style.left = input.left + "px";
            }
        }

        clearSearch() {
            this.searchInput.value = "";
            this.searchBox.style.display = "none";
        }

        private updateNodeInfo(selector: string, node: Node) {
            var el = <HTMLElement>this.element.querySelector(selector);
            if (node != null) {
                el.textContent = node.longName;
                el.onclick = () => this.app.menu.openNode(node);
            } else {
                el.textContent = "";
                el.onclick = null;
            }
        }

        private updatePath() {
            var child: Element;
            while ((child = this.pathContainer.firstElementChild)) {
                this.pathContainer.removeChild(child);
            }

            var pathNode: PathNode = this.app.context.pathEnd;
            this.pathContainer.style.display = pathNode ? "block" : "none";
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
                    var feat = this.app.features.byName[edge.type];
                    if (feat) {
                        action = feat.verb || feat.name;
                        icon = feat.icon;
                    } else {
                        action = edge.type;
                        icon = "question";
                    }
                }

                text = ` ${action} to `;
                linkText = node.type === edge.type ? node.name : node.longName;
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
            this.app.features.forEach(f => {
                var el = document.createElement("div");
                el.textContent = f.name + ":";

                el.appendChild(this.drawCheckbox(val => {
                    f.hidden = !val;
                    this.app.triggerChange(ChangeReason.FeatureChange);
                }, !f.hidden));
                if (!f.visualOnly)
                    el.appendChild(this.drawCheckbox(val => {
                        f.disabled = !val;
                        this.app.triggerChange(ChangeReason.FeatureChange);
                    }, !f.disabled));

                this.featuresContainer.appendChild(el);
            });
        }

        private drawCheckbox(onchange: (value: boolean) => void, initial: boolean): HTMLElement {
            var input = document.createElement("input");
            input.type = "checkbox";
            input.onchange = () => onchange(input.checked);
            input.checked = initial;
            return input;
        }
    }
}