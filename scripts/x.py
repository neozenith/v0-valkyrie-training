# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "networkx",
# ]
# ///

from pathlib import Path
import json
import networkx as nx
import logging

log = logging.getLogger(__name__)

data_path = Path(__file__).parent.parent / "data" 
exercises = data_path / "exercises.json"
exercise_relationships = data_path / "exercise-relationships.json"
exercises_catalog = data_path / "exercise-catalog.json"
exercise_modifiers = data_path / "exercise-modifiers.json"


def main():
    d = {}
    ids = {}
    json_files = data_path.glob("*.json")
    for json_file in json_files:
        k = json_file.stem
        d[k] = json.loads(json_file.read_text(encoding="utf-8"))
        log.info(f"{k=} {type(d[k])=} {len(d[k])=}")
        if k in ['exercises', 'exercises-catalog']:
            x = d[k]['exercises']
            if k == 'exercises':
                x = {e['id']: e for e in d[k]['exercises']}
            log.info(f"{k} {type(x)=} {len(x)=}")
            ids[k] = set(x.keys())
        if k in ['exercise-relationships']:
            x = d[k]['relationships']
            log.info(f"{k} {type(x)=} {len(x)=}")
            ids[k] = set(x.keys())

    all = set()
    for k, v in ids.items():
        all = all.union(v)
        for j, u in ids.items():
            if k == j:
                continue
            intersect = v.intersection(u)
            not_in_k = u - v
            not_in_j = v - u
            log.info(f"{k} -> {j} :: \n{len(intersect)=}\n{len(not_in_k)=}\n{len(not_in_j)=}")
        
    
    print("Total unique IDs:", len(all))
        

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, 
                        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                        datefmt="%Y-%m-%d %H:%M:%S")
    main()