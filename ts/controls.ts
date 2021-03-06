﻿/// <reference path="_refs.ts"/>
module Tesp {
    /** UI controls for search and navigation */
    export class Controls {
        private pathContainer: HTMLElement;
        private featuresContainer: HTMLElement;
        private searchInput: HTMLInputElement;
        private searchBox: HTMLElement;
        private searchMenu: Menu;

        constructor(private app: Application, private element: HTMLElement) {
            this.app.addChangeListener(ChangeReason.SourceChange, () => this.updateNodeInfo(".control-source-info", this.app.context.sourceNode));
            this.app.addChangeListener(ChangeReason.DestinationChange, () => this.updateNodeInfo(".control-destination-info", this.app.context.destNode));
            this.app.addChangeListener(ChangeReason.MarkChange, () => this.updateNodeInfo(".control-mark-info", this.app.context.markNode));
            this.app.addChangeListener(ChangeReason.PathUpdate, (reason, pathNode) => this.updatePath(<IPathNode>pathNode));

            this.pathContainer = <HTMLElement>element.querySelector(".path-container");
            this.featuresContainer = <HTMLElement>element.querySelector(".features-container");
            this.searchInput = <HTMLInputElement>element.querySelector(".search-input");
            var overheadInput = <HTMLInputElement>element.querySelector(".feature-overhead input");
            overheadInput.value = Math.pow(app.features.nodeOverhead, 1 / 1.5) + "";
            overheadInput.oninput = () => {
                this.app.features.nodeOverhead = Math.pow(+overheadInput.value, 1.5);
                this.app.triggerChange(ChangeReason.FeatureChange);
            };

            var featuresVisible = false;
            (<HTMLElement>element.querySelector(".features-icon")).onclick = () => 
                this.featuresContainer.style.display = (featuresVisible = !featuresVisible) ? "block" : "none";

            this.initSearch();
        }

        initSearch() {
            var searchContainer = <HTMLInputElement>this.element.querySelector(".search-container");
            this.searchMenu = new Menu(this.app, true);
            var menuStyle = this.searchMenu.getStyle();
            var input = this.searchInput.getBoundingClientRect();
            menuStyle.minWidth = "200px";
            menuStyle.top = (input.top + input.height) + "px";
            menuStyle.right = (searchContainer.clientWidth - input.right) + "px";

            function prepTerm(text: string) {
                return text != null ? text.toLowerCase().replace(/[^a-z]+/g, " ") : null;
            }

            var searchNodes = this.app.world.nodes
                .concat(this.app.world.landmarks.map(a => a.target))
                .map(n => {
                    var feat = this.app.features.byName[n.type];
                    var featName = feat != null ? feat.location || feat.name : null;
                    var terms = [n.name];
                    if (featName != null)
                        terms.push(featName);
                    var landmark = this.app.world.getLandmarkName(n.pos);
                    if (landmark && landmark !== n.name)
                        terms.push(landmark);

                    return {
                        terms: terms,
                        searchTerms: terms.map(t => prepTerm(t)),
                        node: n
                    };
                })
                .sort((a, b) => {
                    var at = a.searchTerms, bt = b.searchTerms;
                    var ml = Math.max(at.length, bt.length);
                    for (var i = 0; i < ml; i++) {
                        var d = (at[i] || "").localeCompare(bt[i] || "");
                        if (d !== 0)
                            return d;
                    }
                    return 0;
                });

            this.drawFeatures();

            this.searchInput.onkeydown = (ev) => {
                if ((ev.which === 40 || ev.which === 38 || ev.which === 13) && this.searchMenu.isOpen()) {
                    this.searchMenu.focus(ev.which === 38 ? -1 : 0);
                    ev.stopPropagation();
                    return false;
                }
                return true;
            };
            this.searchInput.oninput = () => {
                var search = prepTerm(this.searchInput.value);

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
                            if (n.searchTerms.some(st => st.indexOf(t) === 0))
                                c++;
                            return c >= starts.length;
                        });
                    });

                this.searchMenu.setData(results.map(n =>
                    new MenuItem(n.terms.join(", "), () => {
                        this.app.ctxMenu.openNode(n.node);
                        this.clearSearch();
                    })));
                this.searchMenu.open();
            }
        }
        clearSearch() {
            this.searchInput.value = "";
            this.searchMenu.hide();
        }

        private updateNodeInfo(selector: string, node: Node) {
            var el = <HTMLElement>this.element.querySelector(selector);
            if (node != null) {
                el.textContent = node.longName;
                el.onclick = () => this.app.ctxMenu.openNode(node);
            } else {
                el.textContent = "";
                el.onclick = null;
            }
        }

        private updatePath(pathNode: IPathNode) {
            var child: Element;
            while ((child = this.pathContainer.firstElementChild)) {
                this.pathContainer.removeChild(child);
            }

            this.pathContainer.style.display = pathNode ? "block" : "none";
            while (pathNode) {
                this.pathContainer.insertBefore(this.drawPathNode(pathNode), this.pathContainer.firstElementChild);
                pathNode = pathNode.prev;
            }

        }

        private drawPathNode(pathNode: IPathNode): HTMLElement {
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
            a.onclick = () => this.app.ctxMenu.openNode(node);
            el.appendChild(a);

            return el;
        }

        private drawFeatures() {
            this.app.features.forEach(f => {
                var el = document.createElement("div");
                el.className = "feature-row";
                el.textContent = f.name + ":";

                var container = document.createElement("div");
                container.className = "feature-toggle-container";
                el.appendChild(container);

                container.appendChild(this.drawCheckbox(val => {
                    f.hidden = !val;
                    this.app.triggerChange(ChangeReason.FeatureChange);
                }, !f.hidden, "fa-eye", "fa-eye-slash"));
                if (!f.visualOnly) {
                    container.appendChild(this.drawCheckbox(val => {
                        f.disabled = !val;
                        this.app.triggerChange(ChangeReason.FeatureChange);
                    }, !f.disabled, "fa-check-circle-o", "fa-circle-o"));
                } else {
                    var i = document.createElement("i");
                    i.className = "fa fa-icon fa-circle-o feature-toggle hidden";
                    container.appendChild(i);
                }

                this.featuresContainer.appendChild(el);
            });
        }

        private drawCheckbox(onchange: (value: boolean) => void, initial: boolean, classOn: string, classOff: string): HTMLElement {
            var checked = initial;
            var i = document.createElement("i");
            i.className = "fa fa-icon feature-toggle";
            i.classList.add(checked ? classOn : classOff);
            i.onclick = ev => {
                ev.stopPropagation();
                checked = !checked;
                if (checked) {
                    i.classList.remove(classOff);
                    i.classList.add(classOn);
                } else {
                    i.classList.remove(classOn);
                    i.classList.add(classOff);
                }
                onchange(checked);
            }
            return i;
        }
    }
}