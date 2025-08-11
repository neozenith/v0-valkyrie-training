# Roadmap

## Expand exercise catalog

### Workflow

#### Current State

- Read scripts/CLAUDE.md and leverage create-helper-script subagent to make as many helper scripts as need be.
- data/exercises.json is the production catalog. DO NOT MODIFY THIS.
- data/exercises-catalog.json and data/exercises-relationships.json are the new prototype catalog we are updating.
    - This catalog currently works with http://localhost:3000/dev/graph-visualiser/ and `pnpm test` will run playwright tests to verify.
- The playwright tests for Graph Visualiser already work. They should still be passing and rendering a valid graph of exercises and their relationships once you are done.
- Run the tests and take screenshots so you have a reference baseline.
- Use the Playwright MCP server to check your work.
- The dev server is already running on http://localhost:3000

#### Importing and Planning

- create-helper-script to analyse the structure of the current catalog and create a json schema file to assist with migration mapping
- Clone data from https://github.com/yuhonas/free-exercise-db/
    - You can use the local folder `tmp/` for any temporary files or cloning the repo since it is gitignored.
- create-helper-script to analyse the structure of the JSON files in the exercise catalog
- Use this information to create a plan as a design to create-helper-script to import the data into the existing catalog.

#### Migration and Verification

- With the information about the inbound exercise catalog and plan and the json schema of the existing catalog, now create-helper-script to perform the migration.
- Run the migration script
- Create a verification script with create-helper-script that iterates the source catalog we are importing and the newly migrated catalog to verify all the data came across into the updated catalog.
- Rerun the `pnpm test` to verify the changes to data/exercises-catalog.json and data/exercises-relationships.json did not break Graph Visualiser.
- You have completed this entire task before first go without failure. I am rerunning you to see how repatably you can solve this task.

#### Success Criteria

- Playright tests for Graph Visualiser still pass
- Audit file demonstrating that all exercises were migrated
- I can delete the audit file and manually run the verification script and get an accurate audit the exercises migrated

### Update Catalog Relationships



### Add React Protected Routes

Add protected routes to lock the app behind user login

### Add the concept of workout plans

- Add the concept of "Workout Plans". 
    - Which is a list of workout configs 
    - and we could jump to any workout in that array of workouts 
    - then layer the workout config to a set of dates and times where each datetime could be a calednar entry with the direct link to that workout in the series.