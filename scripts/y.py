# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "networkx",
# ]
# ///


from time import time
import logging
import argparse
from textwrap import dedent
import subprocess
from shlex import split
from pathlib import Path

log = logging.getLogger(__name__)

_run = lambda cmd: subprocess.check_output(split(cmd), text=True).strip()  # noqa: E731
_is_cache_valid = lambda time_tuple: all(x > 0 for x in time_tuple)  # noqa: E731 

GIT_ROOT = Path(_run("git rev-parse --show-toplevel"))
GIT_BRANCH = _run("git rev-parse --abbrev-ref HEAD")

SCRIPT = Path(__file__)
SCRIPT_NAME = SCRIPT.stem
SCRIPT_DIR = SCRIPT.parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent  # Common parent of SCRIPTS_DIR and CACHE_DIR

CACHE_DIR = PROJECT_ROOT / "tmp" / "claude_cache" / SCRIPT_NAME
OUTPUT_SUMMARY = CACHE_DIR / "output_summary.json"
OUTPUT_ANALYSIS = [CACHE_DIR / f.relative_to(SCRIPT_DIR).with_suffix(".json") for f in SCRIPT_DIR.rglob("*.py") if f.is_file()]
ALL_OUTPUTS = [OUTPUT_SUMMARY, *OUTPUT_ANALYSIS]

DATA_DIR = PROJECT_ROOT / "data"
INPUT_EXERCISE_CATALOG = DATA_DIR / "exercise-catalog.json"
INPUT_EXERCISE_RELATIONSHIPS = DATA_DIR / "exercise-relationships.json"
ALL_INPUTS = [INPUT_EXERCISE_CATALOG, INPUT_EXERCISE_RELATIONSHIPS] # This can be a mixture of single files and `rglobs`


def check_cache(cache_dir: Path, all_input_files: list[Path], timeout: int = 300, force:bool = False) -> tuple[int, int]:
    """Check if cache is invalid, 'dirty' or expired. Allow manual cache override with force flag.

    Return tuple of timestamp deltas.
    - The first is the time difference between output and input files. Positive times are NOT dirty.
    - The second is the time remaining for the cache to be considered valid. Positive times are NOT expired.

    Dirty conditions:
    - If input files are newer than cache files then it is dirty
    - If the cache dir does not exist then it is dirty
    - If the input files are older than cache dir AND the timeout has expired then it is dirty too.
    - If the force flag is used then it is always dirty.
    """
    if force or not cache_dir.exists():
        return (-1, -1)  # Both negative = forced dirty

    cache_mtime = max([0] + [f.stat().st_mtime for f in cache_dir.rglob('*') if f.is_file()])
    all_inputs_mtime = max([0] + [f.stat().st_mtime for f in all_input_files if f.is_file()])

    delta = int(cache_mtime - all_inputs_mtime)  # Positive = cache is newer (not dirty)
    remaining = int(timeout - (time() - cache_mtime))  # Positive = not expired

    return (delta, remaining)


def _format_file_list(files: list[Path], max_show: int = 5) -> str:
    """Format paths relative to project root."""
    formatted = '\n        '.join(f"- {p.relative_to(PROJECT_ROOT)}" for p in files[:max_show])
    if len(files) > max_show:
        formatted += f"\n        ... and {len(files) - max_show} more files"
    return formatted

def main(dry_run: bool = False, force: bool = False):
    cache_status = check_cache(CACHE_DIR, ALL_INPUTS, force=force)
    if not _is_cache_valid(cache_status):
        log.info("Cache is invalid or expired, processing...")
        # Main processing logic here
    else:
        log.info("Cache is valid, skipping processing.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        formatter_class=argparse.RawDescriptionHelpFormatter,
        description=dedent(f"""\
        {SCRIPT_NAME} - Always implement a minimal argument parser that includes a definition of the script itself.

        INPUTS:
        {_format_file_list(ALL_INPUTS)}

        OUTPUTS:
        {_format_file_list(ALL_OUTPUTS)}
        
        CACHE: tmp/claude_cache/{SCRIPT_NAME}/
        """)
    )
    parser.add_argument("-q", "--quiet", action="store_true", help="Run script in quiet mode")
    parser.add_argument("-v", "--verbose", action="store_true", help="Run script in verbose mode")
    parser.add_argument("--cache-check", action="store_true", help="ONLY Check if cache is up to date. Does not run main processing.")
    parser.add_argument("-f", "--force", action="store_true", help="Force reprocessing of all inputs.")
    parser.add_argument("-n", "--dry-run", action="store_true", help="Run the script without making any output changes.")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.ERROR if args.quiet else logging.INFO,
        format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s", 
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    if args.cache_check:
        delta, remaining = check_cache(CACHE_DIR, ALL_INPUTS, force=args.force)
        if _is_cache_valid((delta, remaining)):
            log.info(f"Cache is up to date. Delta: {delta}s, Remaining: {remaining}s")
        else:
            log.warning(f"Cache is not up to date. Delta: {delta}s, Remaining: {remaining}s")
            log.warning("Consider running the script without --cache-check.")
    else:
        main()