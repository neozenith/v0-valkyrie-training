# /// script
# requires-python = ">=3.12"
# dependencies = [
#   "jsonschema>=4.0.0",
# ]
# ///

import argparse
import json
import logging
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List

import jsonschema

# Configuration
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
CACHE_DIR = PROJECT_ROOT / "tmp" / "claude_cache" / "analyse_exercise_catalog_structure"
CACHE_TIMEOUT = 300  # 5 minutes

# Input files
EXERCISES_CATALOG_FILE = DATA_DIR / "exercises-catalog.json"
EXERCISE_RELATIONSHIPS_FILE = DATA_DIR / "exercise-relationships.json"

# Output files
EXERCISES_SCHEMA_FILE = CACHE_DIR / "exercises-catalog-schema.json"
RELATIONSHIPS_SCHEMA_FILE = CACHE_DIR / "exercise-relationships-schema.json"
ANALYSIS_REPORT_FILE = CACHE_DIR / "analysis-report.json"

log = logging.getLogger(__name__)


def ensure_cache_dir() -> None:
    """Ensure the cache directory exists."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def load_json_data(file_path: Path) -> Dict[str, Any]:
    """Load JSON data from a file."""
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        log.error(f"File not found: {file_path}")
        raise
    except json.JSONDecodeError as e:
        log.error(f"Invalid JSON in {file_path}: {e}")
        raise


def analyze_exercise_structure(exercise_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze the structure of a single exercise."""
    return {
        "name": type(exercise_data.get("name", "")).__name__,
        "equipment": type(exercise_data.get("equipment", [])).__name__,
        "equipment_items": [type(item).__name__ for item in exercise_data.get("equipment", [])],
        "targetMuscles": type(exercise_data.get("targetMuscles", [])).__name__,
        "targetMuscles_items": [type(item).__name__ for item in exercise_data.get("targetMuscles", [])],
        "cues": type(exercise_data.get("cues", [])).__name__,
        "cues_items": [type(item).__name__ for item in exercise_data.get("cues", [])],
    }


def generate_exercises_schema(exercises_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate JSON schema for exercises catalog."""
    # Analyze equipment types and muscles
    all_equipment = set()
    all_muscles = set()

    for exercise in exercises_data["exercises"].values():
        all_equipment.update(exercise.get("equipment", []))
        all_muscles.update(exercise.get("targetMuscles", []))

    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "exercises": {
                "type": "object",
                "patternProperties": {
                    "^[a-z0-9-]+$": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string", "description": "Display name of the exercise"},
                            "equipment": {
                                "type": "array",
                                "items": {"type": "string", "enum": sorted(list(all_equipment))},
                                "description": "Equipment required for the exercise",
                            },
                            "targetMuscles": {
                                "type": "array",
                                "items": {"type": "string", "enum": sorted(list(all_muscles))},
                                "description": "Primary muscle groups targeted",
                            },
                            "cues": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Form cues and instructions",
                            },
                        },
                        "required": ["name", "equipment", "targetMuscles", "cues"],
                        "additionalProperties": False,
                    }
                },
                "additionalProperties": False,
            }
        },
        "required": ["exercises"],
        "additionalProperties": False,
    }

    return schema


def analyze_relationship_structure(relationship_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze the structure of exercise relationships."""
    relationship_types = set()
    difficulty_range = {"min": float("inf"), "max": float("-inf")}
    relationship_fields = set()

    for relationships in relationship_data.get("relationships", {}).values():
        for rel_type, rel_list in relationships.items():
            relationship_types.add(rel_type)

            for relationship in rel_list:
                relationship_fields.update(relationship.keys())

                if "difficulty" in relationship:
                    diff = relationship["difficulty"]
                    difficulty_range["min"] = min(difficulty_range["min"], diff)
                    difficulty_range["max"] = max(difficulty_range["max"], diff)

    return {
        "relationship_types": sorted(list(relationship_types)),
        "difficulty_range": difficulty_range,
        "relationship_fields": sorted(list(relationship_fields)),
    }


def generate_relationships_schema(relationships_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate JSON schema for exercise relationships."""
    # Analyze the structure first
    analyze_relationship_structure(relationships_data)

    schema = {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            "relationships": {
                "type": "object",
                "patternProperties": {
                    "^[a-z0-9-]+$": {
                        "type": "object",
                        "properties": {
                            "regressions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "exerciseId": {"type": "string", "description": "ID of the easier exercise"},
                                        "reason": {
                                            "type": "string",
                                            "description": "Why this is an easier progression",
                                        },
                                        "difficulty": {
                                            "type": "number",
                                            "minimum": 0,
                                            "maximum": 3.0,
                                            "description": "Difficulty multiplier relative to base exercise",
                                        },
                                    },
                                    "required": ["exerciseId", "reason", "difficulty"],
                                    "additionalProperties": False,
                                },
                                "description": "Easier variations of the exercise",
                            },
                            "progressions": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "exerciseId": {"type": "string", "description": "ID of the harder exercise"},
                                        "reason": {"type": "string", "description": "Why this is a harder progression"},
                                        "difficulty": {
                                            "type": "number",
                                            "minimum": 1.0,
                                            "maximum": 3.0,
                                            "description": "Difficulty multiplier relative to base exercise",
                                        },
                                    },
                                    "required": ["exerciseId", "reason", "difficulty"],
                                    "additionalProperties": False,
                                },
                                "description": "Harder variations of the exercise",
                            },
                        },
                        "additionalProperties": False,
                    }
                },
                "additionalProperties": False,
            }
        },
        "required": ["relationships"],
        "additionalProperties": False,
    }

    return schema


def validate_schema(data: Dict[str, Any], schema: Dict[str, Any], data_type: str) -> Dict[str, Any]:
    """Validate data against schema and return validation results."""
    try:
        jsonschema.validate(data, schema)
        return {"valid": True, "errors": []}
    except jsonschema.ValidationError as e:
        log.warning(f"{data_type} validation error: {e.message}")
        return {"valid": False, "errors": [{"message": e.message, "path": list(e.absolute_path)}]}
    except Exception as e:
        log.error(f"Unexpected validation error for {data_type}: {e}")
        return {"valid": False, "errors": [{"message": str(e), "path": []}]}


def analyze_exercises_catalog(exercises_data: Dict[str, Any]) -> Dict[str, Any]:
    """Perform comprehensive analysis of exercises catalog."""
    exercises = exercises_data.get("exercises", {})

    # Basic statistics
    total_exercises = len(exercises)

    # Equipment analysis
    all_equipment = []
    equipment_usage: Counter[str] = Counter()

    # Muscle group analysis
    all_muscles = []
    muscle_usage: Counter[str] = Counter()

    # Cues analysis
    cues_count = []

    for exercise in exercises.values():
        # Equipment
        equipment_list = exercise.get("equipment", [])
        all_equipment.extend(equipment_list)
        for eq in equipment_list:
            equipment_usage[eq] += 1

        # Muscles
        muscles_list = exercise.get("targetMuscles", [])
        all_muscles.extend(muscles_list)
        for muscle in muscles_list:
            muscle_usage[muscle] += 1

        # Cues
        cues_list = exercise.get("cues", [])
        cues_count.append(len(cues_list))

    unique_equipment = set(all_equipment)
    unique_muscles = set(all_muscles)

    return {
        "total_exercises": total_exercises,
        "unique_equipment_count": len(unique_equipment),
        "unique_equipment_types": sorted(list(unique_equipment)),
        "equipment_usage": dict(equipment_usage.most_common()),
        "unique_muscle_groups_count": len(unique_muscles),
        "unique_muscle_groups": sorted(list(unique_muscles)),
        "muscle_group_usage": dict(muscle_usage.most_common()),
        "cues_statistics": {
            "min_cues": min(cues_count) if cues_count else 0,
            "max_cues": max(cues_count) if cues_count else 0,
            "avg_cues": sum(cues_count) / len(cues_count) if cues_count else 0,
        },
    }


def analyze_exercise_relationships(relationships_data: Dict[str, Any]) -> Dict[str, Any]:
    """Perform comprehensive analysis of exercise relationships."""
    relationships = relationships_data.get("relationships", {})

    # Basic statistics
    total_exercises_with_relationships = len(relationships)

    # Relationship type analysis
    relationship_type_counts: Counter[str] = Counter()
    total_relationships = 0

    # Difficulty analysis
    difficulties = []
    regression_difficulties = []
    progression_difficulties = []

    # Exercise connectivity analysis
    exercises_with_regressions = 0
    exercises_with_progressions = 0

    for exercise_rels in relationships.values():
        # Count relationship types
        for rel_type, rel_list in exercise_rels.items():
            relationship_type_counts[rel_type] += len(rel_list)
            total_relationships += len(rel_list)

            # Track which exercises have which types
            if rel_type == "regressions" and rel_list:
                exercises_with_regressions += 1
            elif rel_type == "progressions" and rel_list:
                exercises_with_progressions += 1

            # Analyze difficulties
            for rel in rel_list:
                if "difficulty" in rel:
                    diff = rel["difficulty"]
                    difficulties.append(diff)

                    if rel_type == "regressions":
                        regression_difficulties.append(diff)
                    elif rel_type == "progressions":
                        progression_difficulties.append(diff)

    # Calculate difficulty statistics
    def calc_stats(values: List[float]) -> Dict[str, float]:
        if not values:
            return {"min": 0, "max": 0, "avg": 0, "count": 0}
        return {
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "count": len(values),
        }

    return {
        "total_exercises_with_relationships": total_exercises_with_relationships,
        "total_relationships": total_relationships,
        "relationship_types": dict(relationship_type_counts),
        "exercises_with_regressions": exercises_with_regressions,
        "exercises_with_progressions": exercises_with_progressions,
        "difficulty_statistics": {
            "all_difficulties": calc_stats(difficulties),
            "regression_difficulties": calc_stats(regression_difficulties),
            "progression_difficulties": calc_stats(progression_difficulties),
        },
    }


def generate_comprehensive_report(
    exercises_analysis: Dict[str, Any],
    relationships_analysis: Dict[str, Any],
    exercises_validation: Dict[str, Any],
    relationships_validation: Dict[str, Any],
) -> Dict[str, Any]:
    """Generate comprehensive analysis report."""
    return {
        "timestamp": "2024-01-01T00:00:00Z",  # Will be set by logging
        "exercises_catalog_analysis": exercises_analysis,
        "exercise_relationships_analysis": relationships_analysis,
        "validation_results": {
            "exercises_catalog": exercises_validation,
            "exercise_relationships": relationships_validation,
        },
        "summary": {
            "total_exercises": exercises_analysis["total_exercises"],
            "exercises_with_relationships": relationships_analysis["total_exercises_with_relationships"],
            "total_relationships": relationships_analysis["total_relationships"],
            "unique_equipment_types": exercises_analysis["unique_equipment_count"],
            "unique_muscle_groups": exercises_analysis["unique_muscle_groups_count"],
            "schemas_valid": exercises_validation["valid"] and relationships_validation["valid"],
        },
    }


def main() -> None:
    """Main function to analyze exercise catalog structure."""
    log.info("Starting exercise catalog structure analysis")

    # Ensure cache directory exists
    ensure_cache_dir()

    try:
        # Load data files
        log.info("Loading data files...")
        exercises_data = load_json_data(EXERCISES_CATALOG_FILE)
        relationships_data = load_json_data(EXERCISE_RELATIONSHIPS_FILE)

        # Generate schemas
        log.info("Generating JSON schemas...")
        exercises_schema = generate_exercises_schema(exercises_data)
        relationships_schema = generate_relationships_schema(relationships_data)

        # Save schemas
        log.info("Saving schemas to cache...")
        EXERCISES_SCHEMA_FILE.write_text(json.dumps(exercises_schema, indent=2), encoding="utf-8")
        RELATIONSHIPS_SCHEMA_FILE.write_text(json.dumps(relationships_schema, indent=2), encoding="utf-8")

        # Validate data against schemas
        log.info("Validating data against schemas...")
        exercises_validation = validate_schema(exercises_data, exercises_schema, "exercises_catalog")
        relationships_validation = validate_schema(relationships_data, relationships_schema, "exercise_relationships")

        # Perform analysis
        log.info("Analyzing exercises catalog...")
        exercises_analysis = analyze_exercises_catalog(exercises_data)

        log.info("Analyzing exercise relationships...")
        relationships_analysis = analyze_exercise_relationships(relationships_data)

        # Generate comprehensive report
        log.info("Generating comprehensive report...")
        report = generate_comprehensive_report(
            exercises_analysis, relationships_analysis, exercises_validation, relationships_validation
        )

        # Save report
        ANALYSIS_REPORT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")

        # Print summary to console
        log.info("Analysis complete! Summary:")
        log.info(f"  Total exercises: {report['summary']['total_exercises']}")
        log.info(f"  Exercises with relationships: {report['summary']['exercises_with_relationships']}")
        log.info(f"  Total relationships: {report['summary']['total_relationships']}")
        log.info(f"  Unique equipment types: {report['summary']['unique_equipment_types']}")
        log.info(f"  Unique muscle groups: {report['summary']['unique_muscle_groups']}")
        log.info(f"  Schemas valid: {report['summary']['schemas_valid']}")

        # Display top equipment and muscle groups
        log.info("\nTop 5 equipment types:")
        for equipment, count in list(exercises_analysis["equipment_usage"].items())[:5]:
            log.info(f"  {equipment}: {count} exercises")

        log.info("\nTop 5 muscle groups:")
        for muscle, count in list(exercises_analysis["muscle_group_usage"].items())[:5]:
            log.info(f"  {muscle}: {count} exercises")

        # Display relationship statistics
        log.info("\nRelationship types:")
        for rel_type, count in relationships_analysis["relationship_types"].items():
            log.info(f"  {rel_type}: {count} relationships")

        log.info(f"\nOutput files saved to: {CACHE_DIR}")
        log.info(f"  - Exercises schema: {EXERCISES_SCHEMA_FILE.name}")
        log.info(f"  - Relationships schema: {RELATIONSHIPS_SCHEMA_FILE.name}")
        log.info(f"  - Analysis report: {ANALYSIS_REPORT_FILE.name}")

    except Exception as e:
        log.error(f"Analysis failed: {e}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Analyze the structure of exercise catalog files and generate JSON schemas"
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s|%(name)s|%(levelname)s|%(filename)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    main()
