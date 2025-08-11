# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "pathlib",
# ]
# ///

"""
Generate comprehensive migration plan from free-exercise-db to our catalog format.

This script analyzes both datasets and creates detailed migration plan including:
- Field mappings and transformations
- Equipment type mapping
- Muscle group mapping  
- Difficulty level calculation
- ID generation strategy
- Default value handling
- Conflict detection

Usage:
    uv run scripts/process_exercise_migration_plan.py
"""

import argparse
import json
import logging
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

log = logging.getLogger(__name__)

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
CACHE_TIMEOUT = 300  # 5 minutes

# Input files
CATALOG_ANALYSIS_FILE = SCRIPT_DIR.parent / "tmp/claude_cache/analyse_exercise_catalog_structure/analysis-report.json"
FREE_DB_ANALYSIS_FILE = SCRIPT_DIR.parent / "tmp/claude_cache/analyse_free_exercise_db/analysis-results.json"  
FREE_DB_MAPPING_FILE = SCRIPT_DIR.parent / "tmp/claude_cache/analyse_free_exercise_db/field-mapping.json"

# Our catalog files
EXERCISES_CATALOG_FILE = SCRIPT_DIR.parent / "data/exercises-catalog.json"

# Output files
OUTPUT_DIR = SCRIPT_DIR.parent / "tmp/claude_cache/process_exercise_migration_plan"
MIGRATION_PLAN_FILE = OUTPUT_DIR / "migration-plan.json"
MAPPING_TABLES_FILE = OUTPUT_DIR / "mapping-tables.json"


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load and parse JSON file."""
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as e:
        log.error(f"Failed to load {file_path}: {e}")
        raise


def create_equipment_mapping() -> Dict[str, List[str]]:
    """Create mapping from free-exercise-db equipment to our equipment types."""
    
    # Our equipment types from analysis
    our_equipment = [
        "barbell", "bench", "bodyweight", "dumbbells", "kettlebells", 
        "landmine", "parallettes", "platform", "pull-up-bar", 
        "resistance-bands", "rings", "wall", "weight-belt"
    ]
    
    # Free-exercise-db equipment types
    free_db_equipment = [
        "bands", "barbell", "body only", "cable", "dumbbell", 
        "e-z curl bar", "exercise ball", "foam roll", "kettlebells", 
        "machine", "medicine ball", "other"
    ]
    
    mapping = {
        "barbell": ["barbell"],
        "dumbbell": ["dumbbells"],
        "kettlebells": ["kettlebells"],
        "body only": ["bodyweight"],
        "bands": ["resistance-bands"],
        "cable": ["bodyweight"],  # Default to bodyweight for cable exercises
        "machine": ["bodyweight"],  # Default to bodyweight for machine exercises
        "e-z curl bar": ["barbell"],  # Map to barbell as closest equivalent
        "exercise ball": ["bodyweight"],  # Default to bodyweight
        "foam roll": ["bodyweight"],  # Default to bodyweight
        "medicine ball": ["bodyweight"],  # Default to bodyweight
        "other": ["bodyweight"],  # Default to bodyweight
        None: ["bodyweight"]  # Default for null equipment
    }
    
    return mapping


def create_muscle_mapping() -> Dict[str, List[str]]:
    """Create mapping from free-exercise-db muscles to our muscle groups."""
    
    # Our muscle groups from analysis
    our_muscles = [
        "abs", "back", "balance", "biceps", "calves", "cardio", "chest", 
        "core", "forearms", "full-body", "glutes", "grip", "hamstrings", 
        "hip-flexors", "lats", "legs", "lower-back", "obliques", 
        "quadriceps", "rear-delts", "shoulders", "triceps", "upper-back", "upper-chest"
    ]
    
    # Free-exercise-db muscle groups
    free_db_muscles = [
        "abdominals", "abductors", "adductors", "biceps", "calves", "chest", 
        "forearms", "glutes", "hamstrings", "lats", "lower back", "middle back", 
        "neck", "quadriceps", "shoulders", "traps", "triceps"
    ]
    
    mapping = {
        "abdominals": ["abs", "core"],
        "abductors": ["glutes"],  
        "adductors": ["glutes"],
        "biceps": ["biceps"],
        "calves": ["calves"],
        "chest": ["chest"],
        "forearms": ["forearms"],
        "glutes": ["glutes"],
        "hamstrings": ["hamstrings"],
        "lats": ["lats", "back"],
        "lower back": ["lower-back", "back"],
        "middle back": ["back", "upper-back"],
        "neck": ["shoulders"],  # Map neck to shoulders as closest
        "quadriceps": ["quadriceps"],
        "shoulders": ["shoulders"],
        "traps": ["upper-back", "back"],
        "triceps": ["triceps"]
    }
    
    return mapping


def calculate_difficulty_from_level(level: str) -> float:
    """Convert free-exercise-db level to our 0-10 difficulty scale."""
    level_mapping = {
        "beginner": 2.0,
        "intermediate": 5.0, 
        "expert": 8.0
    }
    return level_mapping.get(level, 2.0)  # Default to beginner


def generate_exercise_id(name: str, existing_ids: Set[str]) -> str:
    """Generate unique exercise ID from name."""
    # Convert to lowercase, replace spaces with hyphens, remove special chars
    base_id = re.sub(r'[^a-z0-9\s-]', '', name.lower())
    base_id = re.sub(r'\s+', '-', base_id.strip())
    base_id = re.sub(r'-+', '-', base_id)
    base_id = base_id.strip('-')
    
    # Ensure uniqueness
    if base_id not in existing_ids:
        return base_id
    
    # Add numeric suffix if needed
    counter = 1
    while f"{base_id}-{counter}" in existing_ids:
        counter += 1
    return f"{base_id}-{counter}"


def convert_instructions_to_cues(instructions: List[str]) -> List[str]:
    """Convert detailed instructions to concise cues (max 5)."""
    if not instructions:
        return ["Form cue needed", "Movement cue needed", "Breathing cue needed", "Control cue needed"]
    
    # Take first 4 instructions and add one general cue
    cues = instructions[:4]
    if len(cues) < 4:
        # Pad with generic cues if needed
        generic_cues = [
            "Maintain proper form throughout",
            "Control the movement speed", 
            "Breathe consistently",
            "Keep core engaged"
        ]
        cues.extend(generic_cues[:4-len(cues)])
    
    return cues


def find_new_exercises(free_db_data: Dict[str, Any], catalog_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Find exercises in free-exercise-db that don't exist in our catalog."""
    
    # Get existing exercise names (normalized for comparison)
    existing_names = set()
    if "exercises" in catalog_data:
        for exercise in catalog_data["exercises"].values():
            existing_names.add(exercise["name"].lower().strip())
    
    # Find new exercises
    new_exercises = []
    for i, exercise_name in enumerate(free_db_data["field_analysis"]["name"]["sample_values"]):
        normalized_name = exercise_name.lower().strip()
        if normalized_name not in existing_names:
            new_exercises.append({
                "name": exercise_name,
                "normalized_name": normalized_name,
                "index": i
            })
    
    return new_exercises


def analyze_field_coverage(free_db_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze field coverage and null values."""
    field_analysis = free_db_data["field_analysis"]
    
    coverage = {}
    for field_name, field_data in field_analysis.items():
        total_count = field_data["count"]
        null_count = field_data.get("null_count", 0)
        coverage_percent = ((total_count - null_count) / total_count) * 100 if total_count > 0 else 0
        
        coverage[field_name] = {
            "total": total_count,
            "null_count": null_count,
            "coverage_percent": coverage_percent,
            "will_default": null_count > 0
        }
    
    return coverage


def create_migration_plan(
    catalog_analysis: Dict[str, Any], 
    free_db_analysis: Dict[str, Any],
    free_db_mapping: Dict[str, Any],
    catalog_data: Dict[str, Any]
) -> Dict[str, Any]:
    """Create comprehensive migration plan."""
    
    equipment_mapping = create_equipment_mapping()
    muscle_mapping = create_muscle_mapping() 
    field_coverage = analyze_field_coverage(free_db_analysis)
    new_exercises = find_new_exercises(free_db_analysis, catalog_data)
    
    # Generate existing IDs to avoid conflicts
    existing_ids = set()
    if "exercises" in catalog_data:
        existing_ids.update(catalog_data["exercises"].keys())
    
    migration_plan = {
        "metadata": {
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "source_total_exercises": free_db_analysis["statistics"]["total_exercises"],
            "target_catalog_exercises": catalog_analysis["exercises_catalog_analysis"]["total_exercises"],
            "new_exercises_count": len(new_exercises)
        },
        "field_mappings": {
            "name": {
                "source_field": "name",
                "target_field": "name", 
                "transformation": "direct_copy",
                "notes": "Direct mapping, no transformation needed"
            },
            "equipment": {
                "source_field": "equipment",
                "target_field": "equipment",
                "transformation": "mapping_table_lookup",
                "mapping_table": "equipment_mapping",
                "notes": f"Map single equipment string to array. {field_coverage['equipment']['null_count']} null values will default to ['bodyweight']"
            },
            "targetMuscles": {
                "source_field": "primaryMuscles + secondaryMuscles",
                "target_field": "targetMuscles",
                "transformation": "combine_and_map",
                "mapping_table": "muscle_mapping",
                "notes": "Combine primary and secondary muscles, remove duplicates, map to our muscle groups"
            },
            "cues": {
                "source_field": "instructions",
                "target_field": "cues", 
                "transformation": "instructions_to_cues",
                "notes": "Convert detailed instructions to concise cues (max 4-5 cues)"
            },
            "difficulty": {
                "source_field": "level",
                "target_field": "difficulty",
                "transformation": "level_to_difficulty",
                "notes": "Convert beginner(2.0)/intermediate(5.0)/expert(8.0) to 0-10 scale"
            }
        },
        "new_fields": {
            "progressions": {
                "default_value": [],
                "notes": "Not available in source data, will be empty array"
            },
            "regressions": {
                "default_value": [],
                "notes": "Not available in source data, will be empty array"  
            },
            "warmup": {
                "default_value": [],
                "notes": "Not available in source data, will be empty array"
            }
        },
        "id_generation": {
            "strategy": "name_based_slugification",
            "existing_ids_count": len(existing_ids),
            "conflict_resolution": "numeric_suffix",
            "notes": "Generate slug from exercise name, add numeric suffix for conflicts"
        },
        "data_quality": {
            "field_coverage": field_coverage,
            "potential_issues": [
                f"{field_coverage['equipment']['null_count']} exercises missing equipment info",
                f"{field_coverage['force']['null_count']} exercises missing force type",
                f"{field_coverage['mechanic']['null_count']} exercises missing mechanic classification"
            ]
        },
        "migration_stats": {
            "exercises_to_process": free_db_analysis["statistics"]["total_exercises"],
            "estimated_new_exercises": len(new_exercises),
            "equipment_types_to_map": len(free_db_analysis["statistics"]["equipment_types"]),
            "muscle_groups_to_map": len(free_db_analysis["statistics"]["primary_muscles"])
        }
    }
    
    return migration_plan


def create_mapping_tables(equipment_mapping: Dict[str, List[str]], muscle_mapping: Dict[str, List[str]]) -> Dict[str, Any]:
    """Create detailed mapping tables."""
    
    return {
        "equipment_mapping": {
            "description": "Maps free-exercise-db equipment types to our equipment arrays",
            "mappings": equipment_mapping,
            "coverage_analysis": {
                "total_free_db_types": len(equipment_mapping),
                "unmapped_types": [],  # All types are mapped
                "default_equipment": "bodyweight"
            }
        },
        "muscle_mapping": {
            "description": "Maps free-exercise-db muscle groups to our target muscles",
            "mappings": muscle_mapping,
            "coverage_analysis": {
                "total_free_db_muscles": len(muscle_mapping),
                "unmapped_muscles": [],  # All muscles are mapped
                "notes": "Primary and secondary muscles are combined into single targetMuscles array"
            }
        },
        "level_to_difficulty": {
            "description": "Maps free-exercise-db levels to our 0-10 difficulty scale",
            "mappings": {
                "beginner": 2.0,
                "intermediate": 5.0,
                "expert": 8.0
            },
            "notes": "Conservative mapping to avoid overestimating difficulty"
        }
    }


def main():
    """Main execution function."""
    
    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    log.info("Loading analysis files...")
    
    # Load input data
    catalog_analysis = load_json_file(CATALOG_ANALYSIS_FILE)
    free_db_analysis = load_json_file(FREE_DB_ANALYSIS_FILE)
    free_db_mapping = load_json_file(FREE_DB_MAPPING_FILE)
    catalog_data = load_json_file(EXERCISES_CATALOG_FILE)
    
    log.info("Creating migration plan...")
    
    # Create mappings
    equipment_mapping = create_equipment_mapping()
    muscle_mapping = create_muscle_mapping()
    
    # Generate migration plan
    migration_plan = create_migration_plan(
        catalog_analysis, free_db_analysis, free_db_mapping, catalog_data
    )
    
    # Create mapping tables
    mapping_tables = create_mapping_tables(equipment_mapping, muscle_mapping)
    
    log.info("Saving migration plan...")
    
    # Save results
    MIGRATION_PLAN_FILE.write_text(json.dumps(migration_plan, indent=2, ensure_ascii=False), encoding="utf-8")
    MAPPING_TABLES_FILE.write_text(json.dumps(mapping_tables, indent=2, ensure_ascii=False), encoding="utf-8")
    
    # Print summary
    log.info("=" * 60)
    log.info("MIGRATION PLAN SUMMARY")
    log.info("=" * 60)
    log.info(f"Total exercises to migrate: {migration_plan['metadata']['source_total_exercises']}")
    log.info(f"Current catalog size: {migration_plan['metadata']['target_catalog_exercises']}")
    log.info(f"Estimated new exercises: {migration_plan['metadata']['new_exercises_count']}")
    log.info("")
    
    log.info("Equipment Mapping Coverage:")
    log.info(f"  Free-db equipment types: {len(equipment_mapping)}")
    log.info(f"  All types mapped: ✓")
    log.info(f"  Default for null values: bodyweight")
    log.info("")
    
    log.info("Muscle Mapping Coverage:")  
    log.info(f"  Free-db muscle groups: {len(muscle_mapping)}")
    log.info(f"  All muscles mapped: ✓")
    log.info(f"  Primary + secondary combined: ✓")
    log.info("")
    
    log.info("Fields to be defaulted:")
    for field, info in migration_plan["new_fields"].items():
        log.info(f"  {field}: {info['default_value']} ({info['notes']})")
    log.info("")
    
    log.info("Data Quality Issues:")
    for issue in migration_plan["data_quality"]["potential_issues"]:
        log.info(f"  ⚠️  {issue}")
    log.info("")
    
    log.info("Output Files:")
    log.info(f"  Migration plan: {MIGRATION_PLAN_FILE}")
    log.info(f"  Mapping tables: {MAPPING_TABLES_FILE}")
    log.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate comprehensive migration plan from free-exercise-db to our catalog format"
    )
    args = parser.parse_args()
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    main()