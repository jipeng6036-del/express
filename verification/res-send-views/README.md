# Express ArrayBuffer view verification

Candidate `fca6bf6b44be148981340301e6f5ec37c1ff849c`, tree `fa54ffe979307f2606644849941d6085fd07b037`.
Baseline `1c6f1b0fe4000977b9a7b4f34097e4d527dd9824`.
Original fix by Prince Jain: expressjs/express#7542, commit `ca6d20298f21a751f55c596214a5feb3f8f4902f` (retained with author/source). The production fix is the original author's work. This version adds 78 real HTTP regression cases and replaces the original tests' little-endian literals with the view's actual storage bytes. No big-endian hardware run is claimed.

## Local validation

Native Node v24.14.0/Windows: `npm run lint` exits0; full `npm run test-ci` exits0 with1371 passing. The78 new Supertest cases open real HTTP servers: original master18PASS/60FAIL, original patch78PASS, candidate78PASS. They exercise byte windows, multiple TypedArray widths, DataView, cross-realm/shared buffers, large/empty views, weak/strong/no ETag, custom type/caller ETag, chunked transfer, HEAD and304 revalidation. The Buffer and Uint8Array controls remain successful. There are no skipped new cases.

Canonical Git archive: all217 file blobs match the candidate. Each npm tarball is built from canonical source and every packed file is compared to its source Git blob. The three arms are installed into independent consumers; the HTTP proof removes NODE_PATH and imports each installed package directly. No registry publication or source-alias replacement is used.

`package-http-proof.js <consumer-directory>` makes40 sequential native `http.request` calls on real127.0.0.1 sockets, including genuine HEAD and304 responses. Baseline15/40, original patch40/40, candidate40/40. Baseline transport parser errors are recorded as failed cases rather than aborting the comparison; the candidate has none. Each arm closes its own server and agent.

## Original fork workflows

All27 jobs succeed:20mainCI jobs (Node18–26 on Linux/Windows, lint and coverage),5legacy jobs (Node16/17 and coverage),2CodeQL jobs. Workflow files are unchanged. Dispatched on the exact candidate feature ref; the fork's default branch is untouched. CodeQL's inherited fork-disabled workflow was enabled normally through the own-fork API. Release, publication and non-PR Scorecard workflows were not triggered.

- CodeQL: https://github.com/jipeng6036-del/express/actions/runs/41214680451
- legacy: https://github.com/jipeng6036-del/express/actions/runs/41214585774
- ci: https://github.com/jipeng6036-del/express/actions/runs/41214580038

The source/candidate pass results overlap and are not added into a synthetic total. Fork CI success does not mean maintainer approval or merge. Prepared and validated with Codex; no human review is claimed.
