## Workflow: spec → plan → implement

This is the standing process for any non-trivial feature in this repo:

1. **Create spec** — write to `.docs/specs/<area>/<feature>.md`, following `.docs/specs/template.md`.
2. **Review spec** with the user before moving on.
3. **Generate plan from spec** — ALWAYS write the plan as a real file at `.docs/plans/<feature>-plan.md` (not just the ephemeral plan-mode scratch file under `~/.claude/plans/`). The plan-mode scratch file is a draft; the `.docs/plans/` file is the durable deliverable and must be written before considering "create the plan" done.
4. **Manually review the plan** with the user before implementing.
5. **Implement the plan on a separate branch**, per the branch name/rules the _spec itself_ specifies in its own "Git & Version Control Rules" section (§5 of the template) — e.g. `feature/app-theme`, `feature/app-login`.

Existing spec/plan pairs, for reference on format: `.docs/specs/api/jwt-auth.md` + `.docs/plans/jwt-auth-plan.md`, `.docs/specs/app/login.md` + `.docs/plans/app-login-plan.md`.

## Dev servers

Always kill any server/process you started (`npm run dev`, `keystone dev`, manual `nohup`/background runs, etc.) once you're done with it — check `ps`/`lsof -i :<port>` and kill the actual listening PID, not just a shell wrapper around it (a wrapper PID can exit while the real node process it spawned keeps listening and blocks the port for the user's next run).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
