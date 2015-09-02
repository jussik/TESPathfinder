module Tesp {
    export class Feature {
        name: string;
        verb: string;
        location: string;
        type: string;
        icon: string;
        disabled: boolean;
        hidden: boolean;
        visualOnly: boolean;
    }
    export interface IFeatureList extends Array<Feature> {
        byName: { [key: string]: Feature };
    }

    export class Features {
        static init(): IFeatureList {
            var features = <IFeatureList>[
                { name: "Mark/Recall", verb: "Recall", type: "mark", icon: "bolt" },
                { name: "Mages Guild", verb: "Guild Guide", type: "mages-guild", icon: "eye" },
                { name: "Silt Strider", verb: "Silt Strider", type: "silt-strider", icon: "bug" },
                { name: "Boat", location: "Docks", type: "boat", icon: "ship" },
                { name: "Holamayan Boat", location: "Docks", verb: "Boat", type: "holamayan", icon: "ship" },
                { name: "Propylon Chamber", type: "propylon", icon: "cog" },
                { name: "Gondola", type: "gondola", icon: "ship" },
                { name: "Divine Intervention", location: "Imperial Cult Shrine", type: "divine", icon: "bolt" },
                { name: "Almsivi Intervention", location: "Tribunal Temple", type: "almsivi", icon: "bolt" },
                { name: "Transport lines", type: "edge", visualOnly: true },
                { name: "Locations", type: "node", visualOnly: true },
                { name: "Intervention area border", type: "area", visualOnly: true },
                { name: "Gridlines", type: "grid", visualOnly: true }
            ];
            features.byName = {};
            var fIdx = features.byName;
            features.forEach(f => fIdx[f.type] = f);
            fIdx["edge"].hidden = fIdx["area"].hidden = fIdx["grid"].hidden = true;
            return features;
        }
    }
}