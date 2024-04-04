import { parse } from "yaml";

export type RouteTree = {
    globalbasepath: string,
    schemebasepath: string,
    routes: {
        [route_id: string]: RouteSync[]
    }
}

export type RouteSync = {
    name: string,
    audio: string[]
}

let globals: any;

export async function loadIndex() {
    let raw_globals = await fetch("/data/globals.yaml");
    globals = parse(await raw_globals.text());

    let raw_index = await fetch("/data/index.yaml");
    let index = parse(await raw_index.text());

    return index;
}

export async function loadScheme(scheme: string) {
    let raw = await fetch(scheme);
    let raw_scheme = parse(await raw.text());

    let tree: RouteTree = {
        "globalbasepath": globals["BASEPATH"],
        "schemebasepath": raw_scheme["BASEPATH"],
        "routes": {}
    }

    Object.values(raw_scheme["ROUTE"] as string[][]).forEach((route: string[], route_index: number) => {
        let route_id = Object.keys(raw_scheme["ROUTE"])[route_index]
        // @ts-ignore
        tree.routes[route_id] = []
        route.forEach((sync_id: string) => {
            let sync;
            if (raw_scheme["SYNC"][sync_id]) {
                sync = raw_scheme["SYNC"][sync_id] as any
            } else {
                sync = raw_scheme["SYNC"]["DEFAULT"] as any
            }
            // @ts-ignore
            Object.values(sync).forEach((stage: string[], stage_index: number) => {
                // @ts-ignore
                let raw_sync_audios = Object.values(stage)[0] as string[]
                let sync_audios: string[] = []
                raw_sync_audios.forEach((audio_id: string) => {
                    if (audio_id.includes("*")) {
                        audio_id = audio_id.replaceAll("*", sync_id)
                    }
                    if (audio_id.startsWith("$")) {
                        if (audio_id.includes('[')) {
                            let audio_id_split = audio_id.split('[')
                            let audio_id_key = audio_id_split[0].replace("$", "")
                            let audio_id_args = audio_id_split[1].replace("]", "").split(",")
                            let audio_with_args = globals[audio_id_key].map((audio: string) => {
                                if (!audio.includes("ARG")) return globals["BASEPATH"] + audio
                                let audio_with_args = audio
                                audio_id_args.forEach((arg: string) => {
                                    audio_with_args = audio_with_args.replace("ARG[" + audio_id_args.indexOf(arg) + "]", raw_scheme["BASEPATH"] + arg)
                                })
                                return audio_with_args
                            })
                            sync_audios.push(...audio_with_args)
                        } else {
                            globals[audio_id.replace("$", "")].forEach((audio: string) => {
                                sync_audios.push(globals["BASEPATH"] + audio)
                            })
                        }
                    } else {
                        sync_audios.push(raw_scheme["BASEPATH"] + audio_id)
                    }
                })
                // @ts-ignore
                tree.routes[route_id].push({
                    name: sync_id + ":" + Object.keys(stage)[0],
                    audio: sync_audios
                })
            })
        })
    })

    return tree
}
