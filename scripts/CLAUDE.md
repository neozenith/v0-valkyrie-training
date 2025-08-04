# Scripts

These are python helper scripts composed by me (human author) AND Claude.

## Script Guidelines


### Running Scripts

Each script should run independently using `uv` like:

```sh
uv run scripts/script_name_here.py
```

### Script Dependencies

They should leverage the [PEP-723](https://peps.python.org/pep-0723/#example) inline metadata to define library dependencies like this example which adds the `networkx` library:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "networkx",
# ]
# ///

import networkx as nx
```

### Handling Files

Always prefer using `pathlib` for handling files. For example reading a JSON files should be as simple as:

```python
from pathlib import Path
import json

data_path = Path("data/")

nodes = json.loads((data_path / "nodes.json").read_text(encoding="utf-8"))
edges = nodes = json.loads((data_path / "edges.json").read_text(encoding="utf-8"))
```

### Logging Output

All scripts should use the standard library logger and not `print` statements. eg,

```python
import logging
log = logging.getLoggerName(__name__)

# Body of code here

def main():
    ...

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s", 
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    main()

```

### Quality Assurance

Regularly run `ruff` for formatting and linting. eg:

```sh
uvx ruff format --line-length 120 scripts/*.py
uvx ruff check scripts/*.py --fix
```