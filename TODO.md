# Roadmap

### Expand exercise catalog

Read scripts/CLAUDE.md and make as many helper scripts as need be in there.
Expand the exercise catalog using the data from https://github.com/yuhonas/free-exercise-db/
You can use the local folder `tmp/` for any temporary files or cloning the repo since it is gitignored.
The playwright tests for Graph Visualiser already work. They should still be passing and rendering a valid graph of exercises and their relationships once you are done.
Use the Playwright MCP server to check your work.
The dev server is already running on http://localhost:3000

### Add React Protected Routes

Add protected routes to lock the app behind user login

### Add the concept of workout plans

- Add the concept of "Workout Plans". 
    - Which is a list of workout configs 
    - and we could jump to any workout in that array of workouts 
    - then layer the workout config to a set of dates and times where each datetime could be a calednar entry with the direct link to that workout in the series.